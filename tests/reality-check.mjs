import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Valóság-ellenőrzés: ismert városok tényleg a várt zónába esnek-e.
// Ha egy adatfrissítés elrontja a zónahatárokat, ez a teszt azonnal jelez.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data', 'processed');

const CASES = {
  'hu_prefix1.geojson': [
    ['Budapest', 19.04, 47.5, '1'],
    ['Tatabánya', 18.4, 47.57, '2'],
    ['Esztergom', 18.74, 47.79, '2'],
    ['Miskolc', 20.78, 48.1, '3'],
    ['Eger', 20.37, 47.9, '3'],
    ['Debrecen', 21.63, 47.53, '4'],
    ['Nyíregyháza', 21.72, 47.95, '4'],
    ['Szolnok', 20.2, 47.17, '5'],
    ['Békéscsaba', 21.09, 46.68, '5'],
    ['Szeged', 20.15, 46.25, '6'],
    ['Kecskemét', 19.69, 46.9, '6'],
    ['Pécs', 18.23, 46.07, '7'],
    ['Kaposvár', 17.8, 46.36, '7'],
    ['Székesfehérvár', 18.41, 47.19, '8'],
    ['Veszprém', 17.91, 47.09, '8'],
    ['Zalaegerszeg', 16.84, 46.84, '8'],
    ['Győr', 17.63, 47.68, '9'],
    ['Szombathely', 16.62, 47.23, '9']
  ],
  'de_prefix2.geojson': [
    ['Dresden', 13.74, 51.05, '01'],
    ['Görlitz', 14.97, 51.15, '02'],
    ['Leipzig', 12.37, 51.34, '04'],
    ['Berlin', 13.4, 52.52, '10'],
    ['Rostock', 12.14, 54.09, '18'],
    ['Hamburg', 9.99, 53.55, '20'],
    ['Kiel', 10.14, 54.32, '24'],
    ['Flensburg', 9.44, 54.79, '24'],
    ['Bremen', 8.8, 53.08, '28'],
    ['Hannover', 9.73, 52.37, '30'],
    ['Düsseldorf', 6.78, 51.23, '40'],
    ['Dortmund', 7.47, 51.51, '44'],
    ['Essen', 7.01, 51.46, '45'],
    ['Köln', 6.96, 50.94, '50'],
    ['Aachen', 6.08, 50.78, '52'],
    ['Frankfurt am Main', 8.68, 50.11, '60'],
    ['Saarbrücken', 7.0, 49.23, '66'],
    ['Stuttgart', 9.18, 48.78, '70'],
    ['Freiburg', 7.85, 47.99, '79'],
    ['München', 11.58, 48.14, '80'],
    ['Nürnberg', 11.08, 49.45, '90'],
    ['Regensburg', 12.1, 49.01, '93'],
    ['Passau', 13.4319, 48.5744, '94'],
    ['Erfurt', 11.03, 50.98, '99']
  ],
  'it_prefix2.geojson': [
    ['Roma', 12.5, 41.9, '00'],
    ['Perugia', 12.39, 43.11, '06'],
    ['Cagliari', 9.11, 39.22, '09'],
    ['Torino', 7.69, 45.07, '10'],
    ['Genova', 8.93, 44.41, '16'],
    ['Milano', 9.19, 45.46, '20'],
    ['Venezia', 12.34, 45.44, '30'],
    ['Trieste', 13.77, 45.65, '34'],
    ['Verona', 10.99, 45.44, '37'],
    ['Bolzano', 11.35, 46.5, '39'],
    ['Bologna', 11.34, 44.49, '40'],
    ['Firenze', 11.26, 43.77, '50'],
    ['Ancona', 13.52, 43.62, '60'],
    ["L'Aquila", 13.4, 42.35, '67'],
    ['Bari', 16.87, 41.13, '70'],
    ['Napoli', 14.25, 40.85, '80'],
    ['Salerno', 14.79, 40.68, '84'],
    ['Reggio Calabria', 15.65, 38.11, '89'],
    ['Palermo', 13.36, 38.12, '90'],
    ['Catania', 15.09, 37.5, '95']
  ]
};

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(x, y, coords) {
  if (!pointInRing(x, y, coords[0])) return false;
  for (let k = 1; k < coords.length; k++) {
    if (pointInRing(x, y, coords[k])) return false;
  }
  return true;
}

function pointInGeometry(x, y, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(x, y, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInPolygon(x, y, poly));
  }
  return false;
}

let failures = 0;
for (const [file, cases] of Object.entries(CASES)) {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const zones = data.features.map((f) => ({
    prefix: String(f.properties.prefix),
    geometry: f.geometry
  }));
  let ok = 0;
  for (const [city, x, y, expected] of cases) {
    const owner = zones.find((z) => pointInGeometry(x, y, z.geometry));
    const got = owner ? owner.prefix : null;
    if (got === expected) {
      ok += 1;
    } else {
      failures += 1;
      console.error(`HIBA: ${file} – ${city}: várt zóna ${expected}, kapott ${got ?? 'nincs'}`);
    }
  }
  console.log(`OK: ${file} városellenőrzés ${ok}/${cases.length}`);
}

if (failures > 0) {
  console.error(`Összesen ${failures} város rossz zónába esik.`);
  process.exit(1);
}
console.log('Minden ismert város a várt zónában van.');
