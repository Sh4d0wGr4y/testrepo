'use strict';

const APP_VERSION = '3.3.35';

const CONFIG = {
  HU: {
    name: 'Magyarország', flag: '🇭🇺', api: 'hu', digits: 4, prefixDigits: 1,
    file: '/data/processed/hu_prefix1.geojson', center: [47.16, 19.42], zoom: 7,
    placeholder: 'Példa: 8600', groupMode: 'HU',
    fit: { countryMaxZoom: 8, rangeMaxZoom: 9, rangeMaxZoom: 8, countryPadding: [36, 36] }
  },
  DE: {
    name: 'Németország', flag: '🇩🇪', api: 'de', digits: 5, prefixDigits: 2,
    file: '/data/processed/de_prefix2.geojson', center: [51.16, 10.45], zoom: 6,
    placeholder: 'Példa: 10115', groupMode: 'DE',
    fit: { countryMaxZoom: 8, rangeMaxZoom: 9, rangeMaxZoom: 8, countryPadding: [28, 28] }
  },
  IT: {
    name: 'Olaszország', flag: '🇮🇹', api: 'it', digits: 5, prefixDigits: 2,
    file: '/data/processed/it_prefix2.geojson', center: [42.5, 12.5], zoom: 6,
    placeholder: 'Példa: 20121', groupMode: 'IT',
    fit: { countryMaxZoom: 7, rangeMaxZoom: 9, rangeMaxZoom: 8, countryPadding: [30, 30] }
  }
};

const COLORS = ['#2f6fed','#0f9f8a','#2fbf71','#8bc34a','#e0b000','#e07a1f','#d94848','#c23d7a','#6b4fbf','#3d8ea8'];
// HU 1–9: prémium „jewel” skála – mély, telített, sorrendben olvasható
const HU_ZONE_COLORS = {
  1: '#1f5fd6', // zafír
  2: '#0c8f86', // smaragdtenger
  3: '#1aa86a', // smaragd
  4: '#6fad2e', // olíva-lime
  5: '#d4a017', // arany
  6: '#d97706', // réz
  7: '#c2410c', // borostyán-vörös
  8: '#be185d', // rubin-rózsa
  9: '#5b4fcf'  // ametiszt (csak a skála vége)
};
const HISTORY_KEY = 'ftrans-postcode-history-v3';
const THEME_KEY = 'ftrans-postcode-theme-v3';
const MAX_HISTORY = 6;
const LABEL_OVERRIDES = {
  // Csak igazolt problémás prefixekhez. Üres induláskor; a pont-a-poligonon ellenőrzés a fő védelem.
};

const CITY_DATA = {
  HU: [
    ['Budapest', 47.4979, 19.0402],
    ['Érd', 47.3651, 18.9060],
    ['Vác', 47.7758, 19.1361],
    ['Gödöllő', 47.6007, 19.3535],
    ['Cegléd', 47.1727, 19.7962],
    ['Tatabánya', 47.5692, 18.4048],
    ['Győr', 47.6875, 17.6504],
    ['Mosonmagyaróvár', 47.8679, 17.2700],
    ['Sopron', 47.6817, 16.5845],
    ['Szombathely', 47.2307, 16.6218],
    ['Zalaegerszeg', 46.8417, 16.8416],
    ['Nagykanizsa', 46.4530, 16.9910],
    ['Veszprém', 47.0933, 17.9115],
    ['Pápa', 47.3300, 17.4674],
    ['Ajka', 47.1001, 17.5580],
    ['Székesfehérvár', 47.1860, 18.4221],
    ['Dunaújváros', 46.9640, 18.9350],
    ['Pécs', 46.0727, 18.2323],
    ['Kaposvár', 46.3594, 17.7968],
    ['Szekszárd', 46.3470, 18.7060],
    ['Baja', 46.1820, 18.9530],
    ['Kecskemét', 46.9062, 19.6913],
    ['Szeged', 46.2530, 20.1414],
    ['Hódmezővásárhely', 46.4167, 20.3333],
    ['Békéscsaba', 46.6736, 21.0877],
    ['Szolnok', 47.1621, 20.1825],
    ['Debrecen', 47.5316, 21.6273],
    ['Nyíregyháza', 47.9558, 21.7167],
    ['Miskolc', 48.1031, 20.7784],
    ['Eger', 47.9025, 20.3772],
    ['Salgótarján', 48.0987, 19.8045]
  ],
  DE: [
    ['Berlin', 52.5200, 13.4050],
    ['Hamburg', 53.5511, 9.9937],
    ['Bremen', 53.0793, 8.8017],
    ['Hannover', 52.3759, 9.7320],
    ['Braunschweig', 52.2689, 10.5268],
    ['Magdeburg', 52.1205, 11.6276],
    ['Dortmund', 51.5136, 7.4653],
    ['Essen', 51.4556, 7.0116],
    ['Duisburg', 51.4344, 6.7623],
    ['Bochum', 51.4818, 7.2162],
    ['Düsseldorf', 51.2277, 6.7735],
    ['Köln', 50.9375, 6.9603],
    ['Bonn', 50.7374, 7.0982],
    ['Münster', 51.9607, 7.6261],
    ['Bielefeld', 52.0302, 8.5325],
    ['Frankfurt', 50.1109, 8.6821],
    ['Wiesbaden', 50.0782, 8.2398],
    ['Mainz', 49.9929, 8.2473],
    ['Mannheim', 49.4875, 8.4660],
    ['Karlsruhe', 49.0069, 8.4037],
    ['Stuttgart', 48.7758, 9.1829],
    ['Freiburg', 47.9990, 7.8421],
    ['München', 48.1351, 11.5820],
    ['Augsburg', 48.3705, 10.8978],
    ['Nürnberg', 49.4521, 11.0767],
    ['Leipzig', 51.3397, 12.3731],
    ['Dresden', 51.0504, 13.7373],
    ['Chemnitz', 50.8278, 12.9214],
    ['Halle', 51.4960, 11.9680],
    ['Erfurt', 50.9848, 11.0299],
    ['Rostock', 54.0924, 12.0991],
    ['Kiel', 54.3233, 10.1228],
    ['Lübeck', 53.8655, 10.6866],
    ['Potsdam', 52.3906, 13.0645],
    ['Saarbrücken', 49.2402, 6.9969]
  ],
  IT: [
    ['Milano', 45.4642, 9.1900],
    ['Brescia', 45.5416, 10.2118],
    ['Bergamo', 45.6983, 9.6773],
    ['Torino', 45.0703, 7.6869],
    ['Genova', 44.4056, 8.9463],
    ['Venezia', 45.4408, 12.3155],
    ['Padova', 45.4064, 11.8768],
    ['Verona', 45.4384, 10.9916],
    ['Trieste', 45.6495, 13.7768],
    ['Bologna', 44.4949, 11.3426],
    ['Modena', 44.6471, 10.9252],
    ['Parma', 44.8015, 10.3279],
    ['Firenze', 43.7696, 11.2558],
    ['Prato', 43.8777, 11.1022],
    ['Pisa', 43.7228, 10.4017],
    ['Livorno', 43.5485, 10.3106],
    ['Perugia', 43.1107, 12.3908],
    ['Ancona', 43.6158, 13.5189],
    ['Roma', 41.9028, 12.4964],
    ['Pescara', 42.4618, 14.2160],
    ['Napoli', 40.8518, 14.2681],
    ['Salerno', 40.6824, 14.7681],
    ['Bari', 41.1171, 16.8719],
    ['Taranto', 40.4644, 17.2470],
    ['Palermo', 38.1157, 13.3615],
    ['Messina', 38.1938, 15.5540],
    ['Catania', 37.5079, 15.0830],
    ['Reggio Calabria', 38.1113, 15.6473],
    ['Cagliari', 39.2238, 9.1217]
  ]
};

const CITIES_KEY = 'ftrans-show-cities-v3';
const COLORS_KEY = 'ftrans-show-colors-v3';
const LABELS_KEY = 'ftrans-show-labels-v3';
const LABEL_COLORS_KEY = 'ftrans-show-label-colors-v3';
const RANGE_COLORS_KEY = 'ftrans-show-range-colors-v3';
const QUICK_COLORS_KEY = 'ftrans-show-quick-colors-v3';

function readFlag(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === '1';
  } catch {
    return fallback;
  }
}

function saveFlag(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch {}
}

function readShowCities() { return readFlag(CITIES_KEY, false); }
function saveShowCities() { saveFlag(CITIES_KEY, state.showCities); }
function readShowColors() { return readFlag(COLORS_KEY, true); }
function saveShowColors() { saveFlag(COLORS_KEY, state.showZoneColors); }
function readShowLabels() { return readFlag(LABELS_KEY, true); }
function saveShowLabels() { saveFlag(LABELS_KEY, state.showZoneLabels); }
function readShowLabelColors() { return readFlag(LABEL_COLORS_KEY, false); }
function saveShowLabelColors() { saveFlag(LABEL_COLORS_KEY, state.showLabelColors); }
function readShowRangeColors() { return readFlag(RANGE_COLORS_KEY, false); }
function saveShowRangeColors() { saveFlag(RANGE_COLORS_KEY, state.showRangeColors); }
function readShowQuickColors() { return readFlag(QUICK_COLORS_KEY, false); }
function saveShowQuickColors() { saveFlag(QUICK_COLORS_KEY, state.showQuickColors); }

const $ = (id) => document.getElementById(id);
const elements = {
  countryFlags: $('countryFlags'), searchForm: $('searchForm'), searchInput: $('searchInput'),
  inputHelp: $('inputHelp'), rangeGrid: $('rangeGrid'), quickGrid: $('quickGrid'), quickEmpty: $('quickEmpty'),
  showAllButton: $('showAllButton'), clearFiltersButton: $('clearFiltersButton'), citiesToggle: $('citiesToggle'), colorsToggle: $('colorsToggle'), labelsToggle: $('labelsToggle'), labelColorsToggle: $('labelColorsToggle'), labelColorsToggleRow: $('labelColorsToggleRow'), rangeColorsToggle: $('rangeColorsToggle'), quickColorsToggle: $('quickColorsToggle'), fsCountryFlags: $('fsCountryFlags'),
  historyList: $('historyList'), historyEmpty: $('historyEmpty'), clearHistoryButton: $('clearHistoryButton'),
  countryName: $('countryName'), mapTitle: $('mapTitle'), mapSubtitle: $('mapSubtitle'), mapLoading: $('mapLoading'), loadingText: $('loadingText'),
  retryButton: $('retryButton'),
  resultCard: $('resultCard'), resultCloseButton: $('resultCloseButton'), resultBadge: $('resultBadge'), resultCode: $('resultCode'),
  resultPlace: $('resultPlace'), resultRegion: $('resultRegion'), detailPostcode: $('detailPostcode'), detailPlace: $('detailPlace'),
  detailRegion: $('detailRegion'), detailPostcodeLabel: $('detailPostcodeLabel'), detailPlaceLabel: $('detailPlaceLabel'),
  detailRegionLabel: $('detailRegionLabel'), resultMessage: $('resultMessage'), mapsLink: $('mapsLink'),
  fitCountryButton: $('fitCountryButton'), clearSelectionButton: $('clearSelectionButton'), fullscreenButton: $('fullscreenButton'),
  themeButton: $('themeButton'), infoButton: $('infoButton'), infoDialog: $('infoDialog'), toast: $('toast'), dataStatus: $('dataStatus'),
  sidebar: $('sidebar'), openFiltersButton: $('openFiltersButton'), closeFiltersButton: $('closeFiltersButton'),
  mobileDrawerBackdrop: $('mobileDrawerBackdrop'), mobileFitButton: $('mobileFitButton'), mobileDock: $('mobileDock')
};

if (typeof L === 'undefined') {
  throw new Error('Leaflet hiányzik – a térkép nem indítható.');
}

const state = {
  country: 'HU', layer: null, labels: L.layerGroup(), cities: L.layerGroup(), groups: new Map(), features: new Map(),
  selectedPrefixes: new Set(),
  activeRanges: [],
  showCities: readShowCities(),
  showZoneColors: readShowColors(),
  showZoneLabels: readShowLabels(),
  showLabelColors: readShowLabelColors(),
  showRangeColors: readShowRangeColors(),
  showQuickColors: readShowQuickColors(),
  currentResult: null, lastSuccessfulResult: null,
  dataCache: new Map(), loadToken: 0, controller: null,
  history: readHistory(), manifest: null, lastLoadError: null,
  flightToken: 0
};

function isSelectedPrefix(prefix) {
  return state.selectedPrefixes.has(String(prefix));
}
function hasZoneSelection() {
  return state.selectedPrefixes.size > 0;
}
function primarySelectedPrefix() {
  if (!state.selectedPrefixes.size) return null;
  return [...state.selectedPrefixes][state.selectedPrefixes.size - 1];
}
function setSingleSelection(prefix) {
  state.selectedPrefixes = new Set(prefix == null || prefix === '' ? [] : [String(prefix)]);
}

const svgRenderer = L.svg({ padding: 1.0 });
const zoneRenderer = L.canvas({ padding: 1.0 });
const map = L.map('map', {
  renderer: svgRenderer,
  zoomControl: true,
  preferCanvas: false,
  fadeAnimation: true,
  zoomAnimation: true,
  markerZoomAnimation: true,
  zoomAnimationThreshold: 8,
  inertia: true,
  inertiaDeceleration: 2800,
  easeLinearity: 0.2,
  minZoom: 3,
  worldCopyJump: false
}).setView(CONFIG.HU.center, CONFIG.HU.zoom);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 6,
  crossOrigin: true,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.createPane('zoneLabelPane');
map.getPane('zoneLabelPane').style.zIndex = 650;
map.getPane('zoneLabelPane').style.pointerEvents = 'none';
map.createPane('cityPane');
map.getPane('cityPane').style.zIndex = 680;
map.getPane('cityPane').style.pointerEvents = 'none';

state.labels.addTo(map);
state.cities.addTo(map);
state.placeMarker = null;

function clearPlaceMarker() {
  if (state.placeMarker) {
    map.removeLayer(state.placeMarker);
    state.placeMarker = null;
  }
}

function showPlaceMarker(lat, lon, label = '') {
  clearPlaceMarker();
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const icon = L.divIcon({
    className: 'place-marker-icon',
    html: `<div class="place-map-pin" title="${escapeHtml(label)}"><span></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  state.placeMarker = L.marker([lat, lon], {
    icon,
    pane: 'cityPane',
    interactive: false,
    keyboard: false,
    zIndexOffset: 6000
  }).addTo(map);
}

function cleanDigits(value) { return String(value || '').replace(/\D/g, ''); }
function prefixNumber(prefix) { const n = Number.parseInt(prefix, 10); return Number.isFinite(n) ? n : -1; }
function colorFor(prefix, country = state.country) {
  const n = Math.max(0, prefixNumber(prefix));
  const digits = CONFIG[country]?.prefixDigits || 2;
  if (digits === 1) {
    return HU_ZONE_COLORS[n] || HU_ZONE_COLORS[1];
  }
  // DE/IT: 00→99 prémium folyamatos ramp (zafír → smaragd → arany → réz → rubin → ametiszt)
  const stops = [
    [0, [31, 95, 214]],
    [16, [12, 143, 134]],
    [33, [26, 168, 106]],
    [50, [212, 160, 23]],
    [66, [217, 119, 6]],
    [83, [194, 65, 12]],
    [100, [91, 79, 207]]
  ];
  const t = Math.min(100, (n / 99) * 100);
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = Math.max(1, b[0] - a[0]);
  const u = (t - a[0]) / span;
  const mix = (x, y) => Math.round(x + (y - x) * u);
  const r = mix(a[1][0], b[1][0]);
  const g = mix(a[1][1], b[1][1]);
  const bl = mix(a[1][2], b[1][2]);
  return `rgb(${r}, ${g}, ${bl})`;
}

function zoneFillColor(prefix) {
  return state.showZoneColors ? colorFor(prefix) : '#8b9790';
}

function shadeColor(hexOrRgb, amount) {
  const m = String(hexOrRgb).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  let r;
  let g;
  let b;
  if (m) {
    r = Number(m[1]); g = Number(m[2]); b = Number(m[3]);
  } else {
    const h = String(hexOrRgb).replace('#', '');
    if (h.length !== 6) return hexOrRgb;
    r = Number.parseInt(h.slice(0, 2), 16);
    g = Number.parseInt(h.slice(2, 4), 16);
    b = Number.parseInt(h.slice(4, 6), 16);
  }
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (amount * 255))));
  return `rgb(${adj(r)}, ${adj(g)}, ${adj(b)})`;
}
function hasActiveRanges() {
  return state.activeRanges.length > 0;
}
function isActiveRange(range) {
  return state.activeRanges.some((item) => item.min === range.min && item.max === range.max);
}
function inActiveRange(prefix) {
  if (!hasActiveRanges()) return true;
  const n = prefixNumber(prefix);
  return state.activeRanges.some((range) => n >= range.min && n <= range.max);
}
function rangeForPrefix(country, prefix) {
  const n = prefixNumber(prefix);
  return getRanges(country).find((range) => n >= range.min && n <= range.max) || null;
}
function setActiveRanges(ranges) {
  state.activeRanges = Array.isArray(ranges) ? ranges.slice() : [];
}
function toggleActiveRange(range, additive) {
  if (additive) {
    if (isActiveRange(range)) {
      state.activeRanges = state.activeRanges.filter((item) => item.min !== range.min || item.max !== range.max);
    } else {
      state.activeRanges = [...state.activeRanges, range];
    }
    return;
  }
  if (state.activeRanges.length === 1 && isActiveRange(range)) {
    state.activeRanges = [];
    return;
  }
  state.activeRanges = [range];
}

function polygonStyle(feature) {
  const prefix = String(feature.properties?.prefix ?? '');
  const selected = isSelectedPrefix(prefix);
  const hasSelection = hasZoneSelection();
  const visible = inActiveRange(prefix) || selected;
  const fill = zoneFillColor(prefix);
  if (!visible) {
    return {
      renderer: zoneRenderer,
      color: fill,
      weight: 0,
      opacity: 0,
      fillColor: fill,
      fillOpacity: 0,
      className: 'ftrans-zone-path is-hidden',
      interactive: false
    };
  }
  const baseFill = state.showZoneColors ? (selected ? 0.88 : (hasSelection ? 0.18 : 0.58)) : (selected ? 0.42 : (hasSelection ? 0.06 : 0.12));
  return {
    renderer: zoneRenderer,
    color: selected ? '#0f7a38' : (state.showZoneColors ? shadeColor(fill, -0.28) : 'rgba(40, 55, 48, 0.5)'),
    weight: selected ? 3.0 : (hasSelection ? 0.55 : 0.7),
    opacity: selected ? 1 : (hasSelection ? 0.4 : 0.82),
    fillColor: fill,
    fillOpacity: baseFill,
    lineCap: 'round',
    lineJoin: 'round',
    className: selected ? 'ftrans-zone-path is-selected' : (hasSelection ? 'ftrans-zone-path is-dimmed' : 'ftrans-zone-path'),
    interactive: true
  };
}

function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.mapLoading.hidden = false;
  elements.mapLoading.classList.remove('is-error');
  if (elements.retryButton) elements.retryButton.hidden = true;
}
function showLoadError(message) {
  elements.loadingText.textContent = message;
  elements.mapLoading.hidden = false;
  elements.mapLoading.classList.add('is-error');
  if (elements.retryButton) elements.retryButton.hidden = false;
}
function hideLoading() {
  elements.mapLoading.hidden = true;
  elements.mapLoading.classList.remove('is-error');
  if (elements.retryButton) elements.retryButton.hidden = true;
}
function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}
function setInputMessage(message = 'Írd be a teljes irányítószámot.', error = false) {
  elements.inputHelp.textContent = message;
  elements.inputHelp.classList.toggle('is-error', error);
}
function scheduleMapRefresh() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    map.invalidateSize({ pan: false, animate: false });
  }));
}

function countryFitOptions() {
  return CONFIG[state.country]?.fit || {
    countryMaxZoom: 8,
    rangeMaxZoom: 8,
    zoneMaxZoom: 8,
    countryPadding: [32, 32]
  };
}

function prepareMapSize() {
  try {
    map.invalidateSize({ pan: false, animate: false });
  } catch {
    /* ignore */
  }
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function setFiltersOpen(open) {
  const next = Boolean(open) && isMobileLayout();
  document.body.classList.toggle('is-filters-open', next);
  if (elements.openFiltersButton) {
    elements.openFiltersButton.setAttribute('aria-expanded', next ? 'true' : 'false');
  }
  if (elements.mobileDrawerBackdrop) {
    elements.mobileDrawerBackdrop.hidden = !next;
  }
  // iOS: a panel nyitás/zárás után újraméretezzük a térképet.
  requestAnimationFrame(() => {
    prepareMapSize();
    setTimeout(prepareMapSize, 260);
  });
}

function closeFiltersIfMobile() {
  if (isMobileLayout()) setFiltersOpen(false);
}

function getRanges(country) {
  if (country === 'HU') return [{ label: '1–9', min: 1, max: 9 }];
  const ranges = [];
  if (country === 'IT') {
    // IT adatban létezik a 00 előtag, ezért 00–09-cel kezdünk.
    for (let start = 0; start <= 90; start += 10) {
      ranges.push({
        label: `${String(start).padStart(2, '0')}–${String(Math.min(start + 9, 99)).padStart(2, '0')}`,
        min: start,
        max: Math.min(start + 9, 99)
      });
    }
  } else {
    // DE: 01–10, 11–20, …, 91–99
    for (let start = 1; start <= 91; start += 10) {
      ranges.push({
        label: `${String(start).padStart(2, '0')}–${String(Math.min(start + 9, 99)).padStart(2, '0')}`,
        min: start,
        max: Math.min(start + 9, 99)
      });
    }
  }
  return ranges;
}

function buildRangeButtons() {
  elements.rangeGrid.replaceChildren();
  const section = elements.rangeGrid.closest('.control-section');
  if (state.country === 'HU') {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;
  const digits = CONFIG[state.country].prefixDigits;
  for (const range of getRanges(state.country)) {
    const button = document.createElement('button');
    button.type = 'button';
    const active = isActiveRange(range);
    // Színes mód: csak a kijelölt zónacsoport(ok) kapnak színt.
    const showColor = state.showRangeColors && active;
    button.className = `range-button${active ? ' is-active' : ''}${showColor ? ' has-swatch' : ''}`;
    if (showColor) {
      const mid = Math.round((range.min + range.max) / 2);
      const swatchPrefix = String(mid).padStart(digits, '0');
      const swatch = colorFor(swatchPrefix);
      button.style.setProperty('--swatch', swatch);
      button.style.setProperty('--swatch-soft', shadeColor(swatch, 0.42));
      button.innerHTML = `<i class="btn-swatch" aria-hidden="true"></i><span>${range.label}</span>`;
    } else {
      button.textContent = range.label;
    }
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', (event) => {
      const additive = event.ctrlKey || event.metaKey;
      toggleActiveRange(range, additive);
      state.selectedPrefixes.clear();
      clearPlaceMarker();
      hideResult();
      restyleMap();
      buildRangeButtons();
      buildQuickButtons();
      buildLabels();
      if (hasActiveRanges()) fitFocus(true);
      else fitCountry(true);
      if (additive && hasActiveRanges()) {
        toast(`${state.activeRanges.length} zónacsoport kijelölve.`);
      }
    });
    elements.rangeGrid.appendChild(button);
  }
}

function buildQuickButtons() {
  elements.quickGrid.replaceChildren();
  const prefixes = [...state.groups.keys()].sort((a, b) => prefixNumber(a) - prefixNumber(b));
  const filtered = hasActiveRanges() ? prefixes.filter(inActiveRange) : prefixes;
  elements.quickEmpty.hidden = filtered.length > 0;
  for (const prefix of filtered) {
    const button = document.createElement('button');
    button.type = 'button';
    const selected = isSelectedPrefix(prefix);
    // Színes mód: csak a kijelölt zónaszám(ok) kapnak színt.
    const showColor = state.showQuickColors && selected;
    button.className = `quick-button${selected ? ' is-active' : ''}${showColor ? ' has-swatch' : ''}`;
    if (showColor) {
      const swatch = colorFor(prefix);
      button.style.setProperty('--swatch', swatch);
      button.style.setProperty('--swatch-soft', shadeColor(swatch, 0.42));
      button.innerHTML = `<i class="btn-swatch" aria-hidden="true"></i><span>${prefix}</span>`;
    } else {
      button.textContent = prefix;
    }
    button.setAttribute('aria-pressed', String(selected));
    button.addEventListener('click', (event) => selectPrefix(prefix, true, '', { additive: event.ctrlKey || event.metaKey }));
    elements.quickGrid.appendChild(button);
  }
}

function restyleMap() {
  if (!state.layer) return;
  state.layer.eachLayer((layer) => {
    const feature = layer.feature;
    if (!feature) return;
    layer.setStyle(polygonStyle(feature));
    const prefix = String(feature.properties?.prefix ?? '');
    if (isSelectedPrefix(prefix) && layer.bringToFront) layer.bringToFront();
  });
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
  }
  return Math.abs(sum / 2);
}

function largestPolygon(geometry) {
  if (!geometry) return null;
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];
  let best = null;
  let bestArea = -1;
  for (const polygon of polygons) {
    const area = polygon[0] ? ringArea(polygon[0]) : 0;
    if (area > bestArea) {
      bestArea = area;
      best = polygon;
    }
  }
  return best;
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonCoords(x, y, polygon) {
  if (!polygon?.[0] || !pointInRing(x, y, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(x, y, polygon[i])) return false;
  }
  return true;
}

function pointInGeometry(x, y, geometry) {
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return pointInPolygonCoords(x, y, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygonCoords(x, y, polygon));
  }
  return false;
}

function pointToPolygonDist(x, y, polygon) {
  let inside = pointInPolygonCoords(x, y, polygon);
  let minDistSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      minDistSq = Math.min(minDistSq, segmentDistSq(x, y, ring[i], ring[j]));
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function segmentDistSq(px, py, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

class Cell {
  constructor(x, y, h, polygon) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.d = pointToPolygonDist(x, y, polygon);
    this.max = this.d + this.h * Math.SQRT2;
  }
}

class MaxHeap {
  constructor() { this.items = []; }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].max >= item.max) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = item;
  }
  pop() {
    const a = this.items;
    if (!a.length) return null;
    const root = a[0];
    const last = a.pop();
    if (a.length) {
      let i = 0;
      while (true) {
        const l = i * 2 + 1;
        const r = l + 1;
        let c = i;
        if (l < a.length && a[l].max > (c === i ? last.max : a[c].max)) c = l;
        if (r < a.length && a[r].max > (c === i ? last.max : a[c].max)) c = r;
        if (c === i) break;
        a[i] = a[c];
        i = c;
      }
      a[i] = last;
    }
    return root;
  }
  get length() { return this.items.length; }
}

function centroidCell(polygon) {
  const ring = polygon[0];
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  if (area === 0) return new Cell(ring[0][0], ring[0][1], 0, polygon);
  return new Cell(x / area, y / area, 0, polygon);
}

function polylabel(polygon, precision = 0.025) {
  const ring = polygon[0];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (!Number.isFinite(cellSize) || cellSize <= 0) return ring[0];
  const h = cellSize / 2;
  const heap = new MaxHeap();
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      heap.push(new Cell(x + h, y + h, h, polygon));
    }
  }
  let best = centroidCell(polygon);
  const bbox = new Cell(minX + width / 2, minY + height / 2, 0, polygon);
  if (bbox.d > best.d) best = bbox;
  let guard = 0;
  while (heap.length && guard++ < 12000) {
    const cell = heap.pop();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= precision) continue;
    const nh = cell.h / 2;
    heap.push(new Cell(cell.x - nh, cell.y - nh, nh, polygon));
    heap.push(new Cell(cell.x + nh, cell.y - nh, nh, polygon));
    heap.push(new Cell(cell.x - nh, cell.y + nh, nh, polygon));
    heap.push(new Cell(cell.x + nh, cell.y + nh, nh, polygon));
  }
  return [best.x, best.y];
}

function mergeGeometries(features) {
  const polygons = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === 'Polygon') polygons.push(geometry.coordinates);
    else if (geometry.type === 'MultiPolygon') polygons.push(...geometry.coordinates);
  }
  if (!polygons.length) return null;
  if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0] };
  return { type: 'MultiPolygon', coordinates: polygons };
}

function featureLabelPoint(feature) {
  const country = feature.properties?.country || state.country;
  const prefix = String(feature.properties?.prefix ?? '');
  const override = LABEL_OVERRIDES[`${country}:${prefix}`];
  if (Array.isArray(override) && override.length === 2 && pointInGeometry(override[0], override[1], feature.geometry)) {
    return override;
  }

  const existing = feature.properties?.labelPoint;
  if (Array.isArray(existing) && existing.length === 2 && pointInGeometry(existing[0], existing[1], feature.geometry)) {
    return existing;
  }

  const polygon = largestPolygon(feature.geometry);
  if (!polygon) return null;
  const point = polylabel(polygon);
  if (!pointInGeometry(point[0], point[1], feature.geometry)) {
    // Utolsó biztonsági mentés: a legnagyobb gyűrű első belsőnek tűnő pontja.
    const ring = polygon[0];
    for (const candidate of [point, ring[0], ring[Math.floor(ring.length / 2)]]) {
      if (pointInGeometry(candidate[0], candidate[1], feature.geometry)) {
        feature.properties = { ...(feature.properties || {}), labelPoint: candidate };
        return candidate;
      }
    }
  }
  feature.properties = { ...(feature.properties || {}), labelPoint: point };
  return point;
}

function buildLabels() {
  state.labels.clearLayers();
  if (!state.showZoneLabels || !state.features.size) return;
  const forceRange = hasActiveRanges();
  const hasSelection = hasZoneSelection();
  const candidates = [];
  for (const [prefix, feature] of state.features.entries()) {
    if (hasActiveRanges() && !inActiveRange(prefix) && !isSelectedPrefix(prefix)) continue;
    const point = featureLabelPoint(feature);
    if (!point) continue;
    candidates.push({ prefix, latLng: L.latLng(point[1], point[0]), selected: isSelectedPrefix(prefix) });
  }
  candidates.sort((a, b) => Number(b.selected) - Number(a.selected) || prefixNumber(a.prefix) - prefixNumber(b.prefix));
  const occupied = [];
  for (const item of candidates) {
    const pixel = map.latLngToContainerPoint(item.latLng);
    const collides = occupied.some((p) => p.distanceTo(pixel) < (forceRange ? 23 : 34));
    if (collides && !item.selected) continue;
    occupied.push(pixel);
    const muted = hasSelection && !item.selected;
    const zoneColor = colorFor(item.prefix);
    const colored = Boolean(state.showLabelColors);
    const style = colored
      ? `--zone-color:${zoneColor};--zone-color-deep:${shadeColor(zoneColor, -0.18)};`
      : '';
    const icon = L.divIcon({
      className: `zone-label${item.selected ? ' is-selected' : ''}${muted ? ' is-muted' : ''}${colored ? ' is-colored' : ''}`,
      html: `<span style="${style}">${item.prefix}</span>`,
      iconSize: null,
      iconAnchor: [15, 12]
    });
    L.marker(item.latLng, { icon, interactive: false, keyboard: false, pane: 'zoneLabelPane' }).addTo(state.labels);
  }
}

function syncLabelColorToggle() {
  const row = elements.labelColorsToggleRow;
  const input = elements.labelColorsToggle;
  if (!row || !input) return;
  const enabled = Boolean(state.showZoneLabels);
  row.classList.toggle('is-disabled', !enabled);
  input.disabled = !enabled;
  if (!enabled && input.checked) {
    input.checked = false;
    state.showLabelColors = false;
    saveShowLabelColors();
  }
}

function createGeoLayer(data, nextCountry, nextGroups, nextFeatures) {
  const byPrefix = new Map();
  for (const feature of data.features || []) {
    const prefix = String(feature.properties?.prefix ?? '').padStart(CONFIG[nextCountry].prefixDigits, '0');
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(feature);
  }

  const mergedFeatures = [];
  for (const [prefix, group] of byPrefix.entries()) {
    const geometry = mergeGeometries(group);
    if (!geometry) continue;
    const base = group[0];
    mergedFeatures.push({
      type: 'Feature',
      properties: {
        ...(base.properties || {}),
        prefix,
        country: nextCountry
      },
      geometry
    });
  }

  return L.geoJSON({ type: 'FeatureCollection', features: mergedFeatures }, {
    renderer: zoneRenderer,
    style: polygonStyle,
    // Keep rings intact: smoothFactor can collapse complex IT polygons to empty SVG paths (M0 0).
    smoothFactor: 0,
    onEachFeature(feature, polygon) {
      const prefix = String(feature.properties?.prefix ?? '');
      if (!nextGroups.has(prefix)) nextGroups.set(prefix, []);
      nextGroups.get(prefix).push(polygon);
      nextFeatures.set(prefix, feature);
      polygon.bindTooltip(`${CONFIG[nextCountry].name} · ${prefix}-es zóna`, { sticky: true, direction: 'top', opacity: 0.96 });
      polygon.on('add', function onPathAdd() {
        const el = this.getElement?.() || this._path;
        if (el) {
          el.setAttribute('tabindex', '-1');
          el.style.outline = 'none';
        }
      });
      // mousedown preventDefault: a böngésző ne fókuszálja az SVG path-t (fekete négyszög).
      polygon.on('mousedown', (event) => {
        try { event.originalEvent?.preventDefault(); } catch {}
      });
      polygon.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        try {
          const target = event.originalEvent?.target;
          if (target) {
            target.setAttribute('tabindex', '-1');
            target.style.outline = 'none';
            if (typeof target.blur === 'function') target.blur();
          }
        } catch {}
        const additive = Boolean(event.originalEvent?.ctrlKey || event.originalEvent?.metaKey);
        selectPrefix(prefix, true, '', { additive });
      });
      polygon.on('mouseover', (event) => {
        if (isSelectedPrefix(prefix)) return;
        event.target.setStyle({
          weight: 2.2,
          color: '#1faa45',
          fillOpacity: hasZoneSelection() ? 0.28 : 0.7,
          opacity: 0.9
        });
        // Ne hozzuk előre a hovered zónát a kijelölt fölé — különben a váltás beragadhat.
      });
      polygon.on('mouseout', (event) => event.target.setStyle(polygonStyle(feature)));
    }
  });
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { cache: 'no-cache', signal });
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`A térképi adat nem érhető el (${response.status}).`);
  }
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    throw new Error('A térképi adat helyett HTML érkezett. Az adatfájl hiányzik a telepítésből.');
  }
  if (contentType && !contentType.includes('json') && !contentType.includes('geo+json') && !contentType.includes('javascript') && !contentType.includes('text/plain')) {
    // Allow empty/odd types only if JSON parses.
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('A térképi adat nem érvényes JSON.');
  }
}

function removeActiveLayer() {
  if (state.layer) {
    map.removeLayer(state.layer);
    state.layer = null;
  }
  state.labels.clearLayers();
  state.cities.clearLayers();
  clearPlaceMarker();
}

async function loadCountry(nextCountry, options = {}) {
  if (!CONFIG[nextCountry]) return;
  closeFiltersIfMobile();
  const token = ++state.loadToken;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  state.lastLoadError = null;
  showLoading(`${CONFIG[nextCountry].name} térképének betöltése…`);
  setInputMessage();

  try {
    let data = state.dataCache.get(nextCountry);
    if (!data) {
      data = await fetchJson(CONFIG[nextCountry].file, controller.signal);
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) {
        throw new Error('A térképi adat üres vagy hibás.');
      }
      state.dataCache.set(nextCountry, data);
    }
    if (token !== state.loadToken) return;

    const nextGroups = new Map();
    const nextFeatures = new Map();
    state.country = nextCountry;
    state.activeRanges = []; // induláskor teljes ország, ne az első csoport
    state.selectedPrefixes.clear();
    const newLayer = createGeoLayer(data, nextCountry, nextGroups, nextFeatures);

    removeActiveLayer();
    state.layer = newLayer.addTo(map);
    state.groups = nextGroups;
    state.features = nextFeatures;

    updateCountryUI();
    buildRangeButtons();
    buildQuickButtons();
    hideResult();
    restyleMap();
    prepareMapSize();
    // Először méretezzük a panelt, aztán lágyan középre az országot.
    requestAnimationFrame(() => {
      prepareMapSize();
      fitCountry(true);
    });
    renderCities();

    const count = state.groups.size;
    elements.dataStatus.textContent = `${CONFIG[nextCountry].name}: ${count} zóna betöltve · v${APP_VERSION}`;
    hideLoading();

    if (options.postcode) {
      elements.searchInput.value = options.postcode;
      await executeSearch(options.postcode, { fromHistory: true });
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (token !== state.loadToken) return;
    state.lastLoadError = error;
    const message = error.message || 'A térkép betöltése nem sikerült.';
    showLoadError(message);
    toast(message);
    console.error(error);
  }
}

function updateCountryUI() {
  const cfg = CONFIG[state.country];
  syncCountryFlags();
  elements.searchInput.value = '';
  elements.searchInput.maxLength = cfg.digits;
  elements.searchInput.placeholder = cfg.placeholder;
  elements.countryName.textContent = cfg.name.toUpperCase();
  elements.mapTitle.textContent = state.country === 'HU' ? '1–9 postai zóna' : 'Kétjegyű postai zónák';
  elements.mapSubtitle.textContent = 'Kattints egy területre, vagy szűkíts zónacsoport szerint.';
}

function syncCountryFlags() {
  const sync = (root) => {
    if (!root) return;
    root.querySelectorAll('[data-country]').forEach((button) => {
      const active = button.dataset.country === state.country;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  sync(elements.countryFlags);
  sync(elements.fsCountryFlags);
}

function updateFullscreenFlags() {
  if (!elements.fsCountryFlags) return;
  const active = Boolean(document.fullscreenElement === $('mapStage'));
  elements.fsCountryFlags.hidden = !active;
  if (active) syncCountryFlags();
}

function renderCities() {
  state.cities.clearLayers();
  if (!state.showCities) return;
  for (const [name, lat, lon] of CITY_DATA[state.country] || []) {
    const icon = L.divIcon({
      className: 'city-marker-icon',
      html: `<div class="city-map-label"><span class="city-dot" aria-hidden="true"></span><span class="city-name">${escapeHtml(name)}</span></div>`,
      iconSize: null,
      iconAnchor: [7, 11]
    });
    L.marker([lat, lon], {
      icon,
      pane: 'cityPane',
      interactive: false,
      keyboard: false,
      zIndexOffset: 4000
    }).addTo(state.cities);
  }
}

function boundsForFeature(feature) {
  const polygon = largestPolygon(feature?.geometry);
  if (!polygon?.[0]?.length) return null;
  const latLngs = polygon[0].map((coord) => L.latLng(coord[1], coord[0]));
  return L.latLngBounds(latLngs);
}

function fullFeatureBounds(feature) {
  if (!feature?.geometry) return null;
  try {
    const bounds = L.geoJSON(feature).getBounds();
    return bounds?.isValid() ? bounds : boundsForFeature(feature);
  } catch {
    return boundsForFeature(feature);
  }
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function targetForBounds(bounds, padding, maxZoom) {
  const pad = Array.isArray(padding)
    ? L.point(padding[0], padding[1])
    : L.point(padding || 40, padding || 40);
  let zoom = map.getBoundsZoom(bounds, false, pad);
  if (!Number.isFinite(zoom)) zoom = map.getZoom();
  zoom = Math.min(zoom, maxZoom);
  return {
    center: bounds.getCenter(),
    zoom
  };
}

function flightDurationSeconds(fromCenter, toCenter, fromZoom, toZoom) {
  const distanceM = fromCenter.distanceTo(toCenter);
  const zoomDelta = Math.abs(fromZoom - toZoom);
  const distanceFactor = clampNumber(distanceM / 780000, 0, 1);
  const zoomFactor = clampNumber(zoomDelta / 4.2, 0, 1);
  // Minden szűrés / országváltás: kb. 2 másodperces lágy átlapozás.
  return clampNumber(1.85 + distanceFactor * 0.2 + zoomFactor * 0.15, 1.9, 2.15);
}

function softFitBounds(bounds, options = {}) {
  if (!bounds?.isValid()) return false;
  prepareMapSize();
  const fit = countryFitOptions();
  const padding = options.padding || fit.countryPadding || [40, 40];
  const maxZoom = options.maxZoom ?? fit.countryMaxZoom ?? 8;
  const instant = options.duration != null && options.duration <= 0.05;

  try { map.stop(); } catch { /* ignore */ }

  if (instant || prefersReducedMotion()) {
    map.fitBounds(bounds, { padding, maxZoom, animate: false });
    scheduleMapRefresh();
    return true;
  }

  const target = targetForBounds(bounds, padding, maxZoom);
  const fromCenter = map.getCenter();
  const fromZoom = map.getZoom();
  const duration = options.duration ?? flightDurationSeconds(fromCenter, target.center, fromZoom, target.zoom);
  const token = ++state.flightToken;

  try {
    map.flyTo(target.center, target.zoom, {
      duration,
      easeLinearity: options.easeLinearity ?? 0.42,
      noMoveStart: false
    });
  } catch {
    map.fitBounds(bounds, { padding, maxZoom, animate: true, duration: Math.min(duration, 2) });
  }

  const finish = () => {
    if (token !== state.flightToken) return;
    scheduleMapRefresh();
    setTimeout(buildLabels, 40);
  };
  map.once('moveend', finish);
  setTimeout(finish, Math.ceil(duration * 1000) + 160);
  return true;
}

function mergeBoundsList(list) {
  if (!list.length) return null;
  let merged = list[0];
  for (let i = 1; i < list.length; i += 1) merged = merged.extend(list[i]);
  return merged?.isValid() ? merged : null;
}

function fitFeature(feature, options = {}) {
  const bounds = fullFeatureBounds(feature) || boundsForFeature(feature);
  if (!bounds?.isValid()) return false;
  const fit = countryFitOptions();
  return softFitBounds(bounds, {
    padding: options.padding || [48, 48],
    maxZoom: options.maxZoom ?? fit.zoneMaxZoom,
    duration: options.duration
  });
}

function fitActiveRange(smooth = true) {
  if (!hasActiveRanges() || !state.features.size) {
    fitCountry(smooth);
    return;
  }
  const layers = [];
  for (const [prefix, feature] of state.features.entries()) {
    if (!inActiveRange(prefix)) continue;
    const bounds = fullFeatureBounds(feature);
    if (bounds?.isValid()) layers.push(bounds);
  }
  const merged = mergeBoundsList(layers);
  if (!merged) {
    fitCountry(smooth);
    return;
  }
  const fit = countryFitOptions();
  const multi = state.activeRanges.length > 1;
  softFitBounds(merged, {
    padding: multi ? [44, 44] : [36, 36],
    maxZoom: multi ? Math.min(fit.rangeMaxZoom, fit.countryMaxZoom) : fit.rangeMaxZoom,
    duration: smooth ? undefined : 0.01
  });
}

function fitCountry(smooth = true) {
  if (!state.layer?.getBounds().isValid()) return;
  const fit = countryFitOptions();
  softFitBounds(state.layer.getBounds(), {
    padding: fit.countryPadding,
    maxZoom: fit.countryMaxZoom,
    duration: smooth ? undefined : 0.01
  });
}

function fitSelectedZones(smooth = true) {
  if (!hasZoneSelection()) return;
  const layers = [];
  for (const prefix of state.selectedPrefixes) {
    const feature = state.features.get(prefix);
    const bounds = fullFeatureBounds(feature) || boundsForFeature(feature);
    if (bounds?.isValid()) layers.push(bounds);
  }
  const merged = mergeBoundsList(layers);
  if (!merged) return;
  const fit = countryFitOptions();
  const multi = state.selectedPrefixes.size > 1;
  softFitBounds(merged, {
    padding: multi ? [52, 52] : [56, 56],
    // Több kijelölésnél hagyjuk jobban kitágulni a nézetet, hogy minden ráférjen.
    maxZoom: multi ? Math.min(fit.rangeMaxZoom, fit.countryMaxZoom) : fit.zoneMaxZoom,
    duration: smooth ? undefined : 0.01
  });
}

/** Aktuális fókusz: kijelölt zónák, vagy zónacsoport(ok), vagy teljes ország. */
function fitFocus(smooth = true) {
  if (hasZoneSelection()) {
    fitSelectedZones(smooth);
    return;
  }
  if (hasActiveRanges()) {
    fitActiveRange(smooth);
    return;
  }
  fitCountry(smooth);
}

function selectPrefix(prefix, fit = true, fullCode = '', options = {}) {
  const key = String(prefix);
  const additive = Boolean(options.additive) && !fullCode;

  if (additive) {
    if (isSelectedPrefix(key)) state.selectedPrefixes.delete(key);
    else state.selectedPrefixes.add(key);
    if (!hasZoneSelection()) {
      clearSelection();
      // Ha van még aktív zónacsoport, arra igazítsunk vissza.
      if (fit) fitFocus(true);
      toast('Kijelölés törölve.');
      return;
    }
  } else if (isSelectedPrefix(key) && state.selectedPrefixes.size === 1 && !fullCode && !options.force) {
    clearSelection();
    if (fit) fitFocus(true);
    toast('Kijelölés törölve.');
    return;
  } else {
    setSingleSelection(key);
  }

  if (!state.groups.has(key)) {
    showResult({
      prefix: key,
      postcode: fullCode,
      place: '',
      region: '',
      verified: false,
      message: 'Ehhez a zónához nincs terület a betöltött térképen.'
    });
    return;
  }

  clearPlaceMarker();
  const range = rangeForPrefix(state.country, key);
  if (range && options.activateRange) {
    setActiveRanges([range]);
  }
  restyleMap();
  buildRangeButtons();
  buildQuickButtons();

  if (fit) fitFocus(true);
  scheduleMapRefresh();
  setTimeout(buildLabels, 50);

  const selected = [...state.selectedPrefixes].sort((a, b) => prefixNumber(a) - prefixNumber(b));
  if (selected.length > 1) {
    showResult({
      prefix: primarySelectedPrefix(),
      prefixes: selected,
      postcode: '',
      place: '',
      region: '',
      verified: false,
      message: 'Több zóna kijelölve. Ctrl+kattintással adhatsz hozzá / vehetsz el; Esc törli.'
    });
  } else {
    showResult({
      prefix: key,
      postcode: fullCode,
      place: '',
      region: '',
      verified: false,
      message: 'A zóna ki van jelölve. Ctrl+kattintással többet is kijelölhetsz; Esc törli.'
    });
  }
}

function clearSelection() {
  state.selectedPrefixes.clear();
  clearPlaceMarker();
  hideResult();
  restyleMap();
  buildQuickButtons();
  buildLabels();
}

async function lookupPostcode(postcode) {
  const cfg = CONFIG[state.country];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`https://api.zippopotam.us/${cfg.api}/${encodeURIComponent(postcode)}`, { signal: controller.signal });
    if (response.status === 404) return { verified: false, notFound: true };
    if (!response.ok) throw new Error('Az online település-ellenőrzés nem érhető el.');
    const data = await response.json();
    const place = data.places?.[0] || {};
    return {
      verified: true,
      place: place['place name'] || '',
      region: place.state || place['state abbreviation'] || '',
      latitude: Number.parseFloat(place.latitude),
      longitude: Number.parseFloat(place.longitude)
    };
  } catch (error) {
    return { verified: false, networkError: true, error };
  } finally {
    clearTimeout(timer);
  }
}

async function executeSearch(rawValue, options = {}) {
  const cfg = CONFIG[state.country];
  const value = cleanDigits(rawValue);
  elements.searchInput.value = value.slice(0, cfg.digits);
  if (value.length !== cfg.digits) {
    setInputMessage(`${cfg.name}: pontosan ${cfg.digits} számjegyet adj meg.`, true);
    elements.searchInput.focus();
    return;
  }
  setInputMessage('Keresés folyamatban…');
  closeFiltersIfMobile();
  const prefix = value.slice(0, cfg.prefixDigits).padStart(cfg.prefixDigits, '0');
  selectPrefix(prefix, true, value, { activateRange: false });
  const lookup = await lookupPostcode(value);
  const message = lookup.verified
    ? 'A teljes irányítószám települési adatait online ellenőriztük.'
    : lookup.notFound
      ? 'A zóna az előtag alapján kijelölhető, de a teljes irányítószámra nem érkezett települési találat.'
      : 'A zóna kijelölve. Az online település-ellenőrzés most nem sikerült.';
  const result = {
    prefix,
    postcode: value,
    place: lookup.place || '',
    region: lookup.region || '',
    verified: Boolean(lookup.verified),
    message,
    latitude: lookup.latitude,
    longitude: lookup.longitude
  };
  // Hálózati hiba esetén ne töröljük a korábbi sikeres találatot a kártyáról, ha nincs új zóna.
  if (lookup.networkError && state.lastSuccessfulResult && !lookup.verified) {
    showResult({ ...result, message });
  } else {
    showResult(result);
    if (lookup.verified || lookup.notFound) state.lastSuccessfulResult = result;
  }
  if (lookup.verified && Number.isFinite(lookup.latitude) && Number.isFinite(lookup.longitude)) {
    showPlaceMarker(lookup.latitude, lookup.longitude, result.place || value);
    const zoom = state.country === 'HU' ? 10 : 11;
    const target = L.latLng(lookup.latitude, lookup.longitude);
    try { map.stop(); } catch { /* ignore */ }
    if (prefersReducedMotion()) {
      map.setView(target, zoom, { animate: false });
    } else {
      const duration = flightDurationSeconds(map.getCenter(), target, map.getZoom(), zoom);
      try {
        map.flyTo(target, zoom, { duration, easeLinearity: 0.42 });
      } catch {
        map.setView(target, zoom, { animate: true });
      }
    }
    map.once('moveend', () => scheduleMapRefresh());
  }
  setInputMessage(lookup.networkError ? 'A zóna megjelent, de a hálózati ellenőrzés nem sikerült.' : 'A találat megjelent a térképen.', Boolean(lookup.networkError));
  if (!options.fromHistory) addHistory({ country: state.country, postcode: value, place: result.place, prefix });
}

function zoneFeature(prefix) {
  const key = String(prefix ?? '').padStart(CONFIG[state.country].prefixDigits, '0');
  return state.features.get(key) || state.features.get(String(prefix)) || null;
}

function zoneMapCenter(prefix) {
  const feature = zoneFeature(prefix);
  if (!feature) return null;
  // Ugyanarra a legnagyobb darabra támaszkodunk, mint a térképes zoom.
  const bounds = boundsForFeature(feature) || fullFeatureBounds(feature);
  if (bounds?.isValid()) {
    const c = bounds.getCenter();
    if (pointInGeometry(c.lng, c.lat, feature.geometry)) {
      return { latitude: c.lat, longitude: c.lng, bounds };
    }
  }
  const point = featureLabelPoint(feature);
  if (Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
    return { latitude: point[1], longitude: point[0], bounds };
  }
  if (bounds?.isValid()) {
    const c = bounds.getCenter();
    return { latitude: c.lat, longitude: c.lng, bounds };
  }
  return null;
}

function zoomForLatLngBounds(bounds, paddingFactor = 1) {
  if (!bounds?.isValid()) return 10;
  const span = Math.max(
    Math.abs(bounds.getNorth() - bounds.getSouth()),
    Math.abs(bounds.getEast() - bounds.getWest())
  ) * paddingFactor;
  if (span > 3.5) return 7;
  if (span > 2.2) return 8;
  if (span > 1.3) return 9;
  if (span > 0.75) return 10;
  if (span > 0.4) return 11;
  if (span > 0.2) return 12;
  return 13;
}

function isPlaceResult(result) {
  return Boolean(result?.verified && result?.postcode && Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude)));
}

function googleMapsAreaUrl(lat, lon, zoom) {
  // Hivatalos Maps URL: map_action=map → NINCS tű / place pin, csak a nézet.
  const z = Math.max(5, Math.min(14, Number(zoom) || 10));
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}&zoom=${z}`;
}

function googleMapsUrl(result) {
  // Konkrét település / irányítószám → tű a címen.
  if (isPlaceResult(result)) {
    const lat = Number(result.latitude);
    const lon = Number(result.longitude);
    return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lon.toFixed(5)}`;
  }

  // Zóna / szűrés → területnézet TŰ NÉLKÜL (Google nem rajzolja ki a poligonunkat).
  const feature = result.prefix ? zoneFeature(result.prefix) : null;
  const bounds = feature ? (fullFeatureBounds(feature) || boundsForFeature(feature)) : null;
  if (bounds?.isValid()) {
    const c = bounds.getCenter();
    // Egy fokozattal távolabbról, hogy ne „egy pontnak” tűnjön.
    const zoom = Math.max(5, zoomForLatLngBounds(bounds, 1.15) - 1);
    return googleMapsAreaUrl(c.lat, c.lng, zoom);
  }

  const center = result.prefix ? zoneMapCenter(String(result.prefix)) : null;
  if (center) {
    const zoom = Math.max(5, (center.bounds ? zoomForLatLngBounds(center.bounds, 1.15) : 10) - 1);
    return googleMapsAreaUrl(center.latitude, center.longitude, zoom);
  }

  const cfg = CONFIG[state.country];
  return googleMapsAreaUrl(cfg.center[0], cfg.center[1], cfg.zoom);
}

function postcodeRangeForPrefix(prefix) {
  const cfg = CONFIG[state.country];
  const digits = cfg.digits;
  const prefixDigits = cfg.prefixDigits;
  const p = String(prefix).padStart(prefixDigits, '0');
  const fill = digits - prefixDigits;
  if (fill < 0) return p;
  const from = `${p}${'0'.repeat(fill)}`;
  const to = `${p}${'9'.repeat(fill)}`;
  return from === to ? from : `${from}–${to}`;
}

function citiesInZone(prefix) {
  const feature = state.features.get(String(prefix));
  if (!feature?.geometry) return [];
  const names = [];
  for (const [name, lat, lon] of CITY_DATA[state.country] || []) {
    if (pointInGeometry(lon, lat, feature.geometry)) names.push(name);
  }
  return names;
}

function showResult(result) {
  const cfg = CONFIG[state.country];
  if ((!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) && result.prefix) {
    const center = zoneMapCenter(String(result.prefix));
    if (center) {
      result = { ...result, latitude: center.latitude, longitude: center.longitude };
    }
  }
  state.currentResult = result;
  elements.resultCard.hidden = false;
  const place = isPlaceResult(result);
  const multi = !place && Array.isArray(result.prefixes) && result.prefixes.length > 1;
  const prefix = result.prefix ? String(result.prefix) : '';
  const zoneCities = (!place && !multi && prefix) ? citiesInZone(prefix) : [];
  const zoneRange = (!place && !multi && prefix) ? postcodeRangeForPrefix(prefix) : '';

  elements.resultBadge.textContent = place ? 'Ellenőrzött találat' : (multi ? 'Több zóna' : 'Kiválasztott zóna');
  elements.resultCode.textContent = place ? (result.postcode || prefix) : (multi ? String(result.prefixes.length) : prefix);
  elements.resultPlace.textContent = place
    ? (result.place || `${prefix}-es postai zóna`)
    : (multi ? result.prefixes.join(', ') : `${prefix}-es postai zóna`);
  elements.resultRegion.textContent = result.region || cfg.name;

  if (place) {
    if (elements.detailPostcodeLabel) elements.detailPostcodeLabel.textContent = 'Teljes kód';
    if (elements.detailPlaceLabel) elements.detailPlaceLabel.textContent = 'Település';
    if (elements.detailRegionLabel) elements.detailRegionLabel.textContent = 'Régió';
    elements.detailPostcode.textContent = result.postcode || '—';
    elements.detailPlace.textContent = result.place || '—';
    elements.detailRegion.textContent = result.region || cfg.name;
  } else if (multi) {
    if (elements.detailPostcodeLabel) elements.detailPostcodeLabel.textContent = 'Zónák';
    if (elements.detailPlaceLabel) elements.detailPlaceLabel.textContent = 'Darab';
    if (elements.detailRegionLabel) elements.detailRegionLabel.textContent = 'Ország';
    elements.detailPostcode.textContent = result.prefixes.join(', ');
    elements.detailPlace.textContent = `${result.prefixes.length} kijelölve`;
    elements.detailRegion.textContent = cfg.name;
  } else {
    if (elements.detailPostcodeLabel) elements.detailPostcodeLabel.textContent = 'Tartomány';
    if (elements.detailPlaceLabel) elements.detailPlaceLabel.textContent = 'Nagyvárosok';
    if (elements.detailRegionLabel) elements.detailRegionLabel.textContent = 'Ország';
    elements.detailPostcode.textContent = zoneRange || prefix || '—';
    elements.detailPlace.textContent = zoneCities.length
      ? zoneCities.join(', ')
      : 'Több település a zónában';
    elements.detailRegion.textContent = cfg.name;
  }

  if (!result.message) {
    elements.resultMessage.textContent = place
      ? 'A teljes irányítószám települési adatait online ellenőriztük.'
      : 'A zóna ki van jelölve. Ctrl+kattintással többet is kijelölhetsz; Esc törli.';
  } else {
    elements.resultMessage.textContent = result.message;
  }
  elements.mapsLink.href = googleMapsUrl(result);
  elements.mapsLink.textContent = place ? 'Pont a Mapsen' : 'Terület a Mapsen';
  elements.mapsLink.title = place
    ? 'Megnyitás Google Mapsen a településnél (tűvel)'
    : 'Megnyitás Google Mapsen a zóna területére zoomolva, tű nélkül (a zónahatárt a Google nem rajzolja)';
}
function hideResult() {
  elements.resultCard.hidden = true;
  state.currentResult = null;
  if (elements.mapsLink) {
    elements.mapsLink.textContent = 'Google Maps';
    elements.mapsLink.href = '#';
  }
}

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}
function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history)); } catch {}
}
function addHistory(item) {
  state.history = [item, ...state.history.filter((x) => !(x.country === item.country && x.postcode === item.postcode))].slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
}
function removeHistory(index) {
  state.history.splice(index, 1);
  saveHistory();
  renderHistory();
}
function renderHistory() {
  elements.historyList.replaceChildren();
  elements.historyEmpty.hidden = state.history.length > 0;
  state.history.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    const cfg = CONFIG[item.country] || CONFIG.HU;
    button.innerHTML = `<span class="history-main"><span aria-hidden="true">↶</span><span>${cfg.flag} ${item.postcode}${item.place ? ` · ${escapeHtml(item.place)}` : ''}</span></span><span class="history-remove" aria-label="Eltávolítás">×</span>`;
    button.addEventListener('click', (event) => {
      if (event.target.closest('.history-remove')) {
        event.stopPropagation();
        removeHistory(index);
        return;
      }
      if (item.country !== state.country) loadCountry(item.country, { postcode: item.postcode });
      else {
        elements.searchInput.value = item.postcode;
        executeSearch(item.postcode, { fromHistory: true });
      }
    });
    elements.historyList.appendChild(button);
  });
}
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  elements.themeButton.textContent = next === 'dark' ? '☀' : '☾';
  elements.themeButton.setAttribute('aria-label', next === 'dark' ? 'Világos téma bekapcsolása' : 'Sötét téma bekapcsolása');
  try { localStorage.setItem(THEME_KEY, next); } catch {}
}

async function loadManifest() {
  try {
    state.manifest = await fetchJson('/data/processed/manifest.json');
    // Ne írja felül a betöltött zónaszámot; csak akkor jelenjen meg, ha még nincs státusz.
    if (!elements.dataStatus.textContent || elements.dataStatus.textContent.includes('betöltése')) {
      const date = new Date(state.manifest.generatedAt || state.manifest.packagedAt);
      if (Number.isFinite(date.getTime())) {
        elements.dataStatus.textContent = `Adatcsomag: ${date.toLocaleDateString('hu-HU')} · v${APP_VERSION}`;
      }
    }
  } catch {
    /* A térkép ettől még betölthető. */
  }
}

function clearAllFilters() {
  state.activeRanges = [];
  state.selectedPrefixes.clear();
  clearPlaceMarker();
  elements.searchInput.value = '';
  setInputMessage();
  hideResult();
  restyleMap();
  buildRangeButtons();
  buildQuickButtons();
  buildLabels();
  fitCountry(true);
  toast('Minden szűrőt töröltem.');
}

function bindEvents() {
  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    executeSearch(elements.searchInput.value);
  });
  elements.searchInput.addEventListener('input', () => {
    const cfg = CONFIG[state.country];
    elements.searchInput.value = cleanDigits(elements.searchInput.value).slice(0, cfg.digits);
    setInputMessage();
  });
  if (elements.countryFlags) {
    elements.countryFlags.querySelectorAll('[data-country]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.dataset.country;
        if (!next || next === state.country) return;
        loadCountry(next);
      });
    });
  }
  elements.showAllButton.addEventListener('click', () => {
    state.activeRanges = [];
    state.selectedPrefixes.clear();
    clearPlaceMarker();
    hideResult();
    restyleMap();
    buildRangeButtons();
    buildQuickButtons();
    buildLabels();
    fitCountry(true);
  });
  if (elements.clearFiltersButton) {
    elements.clearFiltersButton.addEventListener('click', clearAllFilters);
  }
  if (elements.citiesToggle) {
    elements.citiesToggle.checked = state.showCities;
    elements.citiesToggle.addEventListener('change', () => {
      state.showCities = Boolean(elements.citiesToggle.checked);
      saveShowCities();
      renderCities();
    });
  }
  if (elements.colorsToggle) {
    elements.colorsToggle.checked = state.showZoneColors;
    elements.colorsToggle.addEventListener('change', () => {
      state.showZoneColors = Boolean(elements.colorsToggle.checked);
      saveShowColors();
      restyleMap();
    });
  }
  if (elements.labelsToggle) {
    elements.labelsToggle.checked = state.showZoneLabels;
    elements.labelsToggle.addEventListener('change', () => {
      state.showZoneLabels = Boolean(elements.labelsToggle.checked);
      saveShowLabels();
      syncLabelColorToggle();
      buildLabels();
    });
  }
  if (elements.labelColorsToggle) {
    elements.labelColorsToggle.checked = state.showLabelColors;
    elements.labelColorsToggle.addEventListener('change', () => {
      if (!state.showZoneLabels) {
        elements.labelColorsToggle.checked = false;
        return;
      }
      state.showLabelColors = Boolean(elements.labelColorsToggle.checked);
      saveShowLabelColors();
      buildLabels();
    });
  }
  if (elements.rangeColorsToggle) {
    elements.rangeColorsToggle.checked = state.showRangeColors;
    elements.rangeColorsToggle.addEventListener('change', () => {
      state.showRangeColors = Boolean(elements.rangeColorsToggle.checked);
      saveShowRangeColors();
      buildRangeButtons();
    });
  }
  if (elements.quickColorsToggle) {
    elements.quickColorsToggle.checked = state.showQuickColors;
    elements.quickColorsToggle.addEventListener('change', () => {
      state.showQuickColors = Boolean(elements.quickColorsToggle.checked);
      saveShowQuickColors();
      buildQuickButtons();
    });
  }
  if (elements.fsCountryFlags) {
    elements.fsCountryFlags.querySelectorAll('[data-country]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.dataset.country;
        if (!next || next === state.country) return;
        loadCountry(next);
      });
    });
  }
  elements.fitCountryButton.addEventListener('click', () => fitCountry(true));
  elements.clearSelectionButton.addEventListener('click', clearSelection);
  elements.resultCloseButton.addEventListener('click', () => {
    clearSelection();
  });
  elements.clearHistoryButton.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
  });
  elements.themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  elements.infoButton.addEventListener('click', () => elements.infoDialog.showModal());
  elements.fullscreenButton.addEventListener('click', async () => {
    const stage = $('mapStage');
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        return;
      }
      if (stage.requestFullscreen) {
        await stage.requestFullscreen();
        return;
      }
      if (stage.webkitRequestFullscreen) {
        stage.webkitRequestFullscreen();
        return;
      }
      // iPhone Safari: a div fullscreen gyakran nem elérhető — a térkép amúgy is fullscreen-szerű.
      toast('iPhone-on a térkép nézet már nagyban jelenik meg.');
    } catch {
      toast('A teljes képernyős mód nem érhető el.');
    }
  });
  if (elements.openFiltersButton) {
    elements.openFiltersButton.addEventListener('click', () => setFiltersOpen(true));
  }
  if (elements.closeFiltersButton) {
    elements.closeFiltersButton.addEventListener('click', () => setFiltersOpen(false));
  }
  if (elements.mobileDrawerBackdrop) {
    elements.mobileDrawerBackdrop.addEventListener('click', () => setFiltersOpen(false));
  }
  if (elements.mobileFitButton) {
    elements.mobileFitButton.addEventListener('click', () => {
      closeFiltersIfMobile();
      fitCountry(true);
    });
  }
  if (elements.retryButton) {
    elements.retryButton.addEventListener('click', () => {
      state.dataCache.delete(state.country);
      loadCountry(state.country);
    });
  }
  document.addEventListener('fullscreenchange', () => {
    scheduleMapRefresh();
    updateFullscreenFlags();
  });
  document.addEventListener('webkitfullscreenchange', () => {
    scheduleMapRefresh();
    updateFullscreenFlags();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (elements.infoDialog?.open) return;
    if (document.body.classList.contains('is-filters-open')) {
      setFiltersOpen(false);
      event.preventDefault();
      return;
    }
    if (hasZoneSelection() || state.placeMarker || state.currentResult) {
      clearSelection();
      event.preventDefault();
    }
  });
  // Üres térképkattintás: kijelölés feloldása (a zónapoligonok stopPropagation-nel jönnek).
  map.on('click', () => {
    if (hasZoneSelection() || state.placeMarker || state.currentResult) {
      clearSelection();
    }
  });
  map.on('zoomend moveend', () => setTimeout(buildLabels, 20));
  window.addEventListener('resize', () => {
    if (!isMobileLayout()) setFiltersOpen(false);
    scheduleMapRefresh();
  }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleMapRefresh, { passive: true });
  }
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMapRefresh).observe($('mapStage'));
}

async function init() {
  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();
  setTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (elements.citiesToggle) elements.citiesToggle.checked = state.showCities;
  if (elements.colorsToggle) elements.colorsToggle.checked = state.showZoneColors;
  if (elements.labelsToggle) elements.labelsToggle.checked = state.showZoneLabels;
  if (elements.labelColorsToggle) elements.labelColorsToggle.checked = state.showLabelColors;
  if (elements.rangeColorsToggle) elements.rangeColorsToggle.checked = state.showRangeColors;
  if (elements.quickColorsToggle) elements.quickColorsToggle.checked = state.showQuickColors;
  syncLabelColorToggle();
  syncCountryFlags();
  updateFullscreenFlags();
  bindEvents();
  renderHistory();
  loadManifest();
  await loadCountry('HU');
}

init();
