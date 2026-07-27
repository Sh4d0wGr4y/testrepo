import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

const REQUIRED_FILES = [
  'index.html',
  'app.js',
  'styles.css',
  '404.html',
  'favicon.svg',
  '_headers',
  'vendor/leaflet.js',
  'vendor/leaflet.css',
  'data/processed/manifest.json',
  'data/processed/hu_prefix1.geojson',
  'data/processed/de_prefix2.geojson',
  'data/processed/it_prefix2.geojson',
  'flags/hu.svg',
  'flags/de.svg',
  'flags/it.svg'
];

const EXPECTED = {
  hu_prefix1: { min: 9, digits: 1 },
  de_prefix2: { min: 95, digits: 2 },
  it_prefix2: { min: 93, digits: 2 }
};

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

for (const rel of REQUIRED_FILES) {
  const full = path.join(publicDir, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size < 20) fail(`Hiányzó vagy üres fájl: ${rel}`);
  else ok(`fájl megléte – ${rel}`);
}

const worker = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
assert.match(worker, /__health/);
assert.match(worker, /APP_VERSION = '3\.3\.45'/);
ok('worker /__health és verzió');

const app = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');
for (const needle of [
  'AbortController',
  'loadToken',
  'pointInGeometry',
  'mergeGeometries',
  'activateRange',
  'preferCanvas: false',
  'fadeAnimation: true',
  'flightDurationSeconds',
  'retryButton',
  'api.zippopotam.us',
  'postcodeRangeForPrefix',
  'citiesInZone',
  'detailPostcodeLabel',
  'selectedPrefixes',
  'colorsToggle',
  'updateFullscreenFlags',
  'showLabelColors',
  'syncLabelColorToggle'
]) {
  assert.ok(app.includes(needle), `app.js hiányzó rész: ${needle}`);
}
ok('frontend védelmi minták');

const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('/vendor/leaflet.js'));
assert.ok(indexHtml.includes('retryButton'));
assert.ok(!/GeoJSON|FeatureCollection|prefix assignment/i.test(indexHtml.replace(/<script[\s\S]*?<\/script>/g, '')));
ok('index felhasználói feliratok');
assert.ok(indexHtml.includes('country-flag-button'));
assert.ok(indexHtml.includes('citiesToggle'));
assert.ok(indexHtml.includes('colorsToggle'));
assert.ok(indexHtml.includes('labelsToggle'));
assert.ok(indexHtml.includes('labelColorsToggle'));
assert.ok(indexHtml.includes('rangeColorsToggle'));
assert.ok(indexHtml.includes('quickColorsToggle'));
assert.ok(!indexHtml.includes('mapLegend'));
assert.ok(!app.includes('updateLegend'));
assert.ok(indexHtml.includes('fsCountryFlags'));
assert.ok(indexHtml.includes('fs-flag-code'));
assert.ok(indexHtml.includes('fs-flag-img'));
assert.ok(indexHtml.includes('/flags/hu.svg'));
assert.ok(!indexHtml.includes('fs-flag-emoji'));
assert.ok(indexHtml.includes('clear-filters-button'));
assert.ok(!indexHtml.includes('systemStatus'));
assert.ok(indexHtml.includes('clearFiltersButton'));
assert.ok(!indexHtml.includes('countrySelect'));
assert.ok(!indexHtml.includes('data-map-mode'));
assert.ok(!indexHtml.includes('copyButton'));
assert.ok(!indexHtml.includes('Másolás'));
assert.ok(!app.includes('copyResult'));
assert.ok(app.includes('softFitBounds'));
assert.ok(app.includes('fitActiveRange'));
assert.ok(app.includes('fitSelectedZones'));
assert.ok(app.includes('showRangeColors'));
assert.ok(app.includes('showQuickColors'));
assert.ok(app.includes('activeRanges'));
assert.ok(app.includes('toggleActiveRange'));
assert.ok(app.includes('fitFocus'));
ok('ország zászlók, városok pipa, szűrő törlés');
assert.ok(indexHtml.includes('openFiltersButton'));
assert.ok(indexHtml.includes('mobile-dock'));
assert.ok(app.includes('setFiltersOpen'));
assert.ok(app.includes('isMobileLayout'));
ok('mobil szűrőpanel');



const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'data/processed/manifest.json'), 'utf8'));
assert.equal(manifest.appVersion, '3.3.45');
ok('manifest appVersion');

for (const [name, spec] of Object.entries(EXPECTED)) {
  const file = path.join(publicDir, 'data/processed', `${name}.geojson`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.ok(Array.isArray(data.features));
  assert.ok(data.features.length >= spec.min, `${name}: feature-szám ${data.features.length} < ${spec.min}`);

  const prefixes = new Set();
  for (const feature of data.features) {
    const prefix = String(feature.properties?.prefix ?? '');
    assert.ok(prefix, `${name}: üres prefix`);
    assert.equal(prefix.length, spec.digits, `${name}: prefix hossz ${prefix}`);
    assert.ok(/^\d+$/.test(prefix), `${name}: nem numerikus prefix ${prefix}`);
    assert.ok(!prefixes.has(prefix), `${name}: duplikált prefix ${prefix}`);
    prefixes.add(prefix);

    const geometry = feature.geometry;
    assert.ok(geometry, `${name}/${prefix}: nincs geometry`);
    assert.ok(geometry.type === 'Polygon' || geometry.type === 'MultiPolygon', `${name}/${prefix}: rossz geometry típus`);
    assert.ok(geometry.coordinates?.length, `${name}/${prefix}: üres coordinates`);
  }

  ok(`${name}: ${data.features.length} zóna, egyedi prefixek`);
}

// IT 00 jelenlét – adat alapján
const it = JSON.parse(fs.readFileSync(path.join(publicDir, 'data/processed/it_prefix2.geojson'), 'utf8'));
assert.ok(it.features.some((f) => String(f.properties.prefix) === '00'), 'IT 00 prefix hiányzik');
ok('IT 00 prefix megvan – csoportozás 00–09-cel indítható');

// DE tartománycímkék elvárt mintája
assert.ok(app.includes('padStart(2'), 'DE/IT csoportozás kódja megvan');
assert.ok(app.includes('DECADE_COLORS'), 'tízes csoport-színek megvannak');
assert.ok(!app.includes('01–10'), 'régi eltolt DE csoport (01–10) nem maradhat');
ok('DE/IT csoportos szűrés kódja megvan');

if (process.exitCode) {
  console.error('\nTesztek hibával zárultak.');
  process.exit(1);
}
console.log('\nMinden statikus / adat teszt sikeres.');
