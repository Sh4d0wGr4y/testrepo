'use strict';

const APP_VERSION = '3.3.3';

const CONFIG = {
  HU: {
    name: 'Magyarország', flag: '🇭🇺', api: 'hu', digits: 4, prefixDigits: 1,
    file: '/data/processed/hu_prefix1.geojson', center: [47.16, 19.42], zoom: 7,
    placeholder: 'Példa: 8600', groupMode: 'HU'
  },
  DE: {
    name: 'Németország', flag: '🇩🇪', api: 'de', digits: 5, prefixDigits: 2,
    file: '/data/processed/de_prefix2.geojson', center: [51.12, 10.35], zoom: 6,
    placeholder: 'Példa: 10115', groupMode: 'DE'
  },
  IT: {
    name: 'Olaszország', flag: '🇮🇹', api: 'it', digits: 5, prefixDigits: 2,
    file: '/data/processed/it_prefix2.geojson', center: [42.55, 12.55], zoom: 6,
    placeholder: 'Példa: 20121', groupMode: 'IT'
  }
};

const COLORS = ['#59b56d','#35a792','#32a8b3','#4f94cf','#687fd1','#8b72c3','#bf70aa','#d27678','#d98d55','#d3ac51'];
// HU 1–9: jól elkülönülő, sorrendben olvasható színek (nem „random szivárvány”)
const HU_ZONE_COLORS = {
  1: '#1d6fd8', // kék – Budapest
  2: '#0f9f8a', // smaragdzöld
  3: '#2fbf71', // élénkzöld
  4: '#8bc34a', // lime
  5: '#f0c419', // sárga
  6: '#f08a24', // narancs
  7: '#e4572e', // vörösnarancs
  8: '#c73e6c', // magenta
  9: '#7b3fa0'  // lila
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
    ['Győr', 47.6875, 17.6504],
    ['Sopron', 47.6817, 16.5845],
    ['Szombathely', 47.2307, 16.6218],
    ['Zalaegerszeg', 46.8417, 16.8416],
    ['Veszprém', 47.0933, 17.9115],
    ['Székesfehérvár', 47.1860, 18.4221],
    ['Pécs', 46.0727, 18.2323],
    ['Kaposvár', 46.3594, 17.7968],
    ['Kecskemét', 46.9062, 19.6913],
    ['Szeged', 46.2530, 20.1414],
    ['Békéscsaba', 46.6736, 21.0877],
    ['Szolnok', 47.1621, 20.1825],
    ['Debrecen', 47.5316, 21.6273],
    ['Nyíregyháza', 47.9558, 21.7167],
    ['Miskolc', 48.1031, 20.7784],
    ['Eger', 47.9025, 20.3772]
  ],
  DE: [
    ['Berlin', 52.5200, 13.4050],
    ['Hamburg', 53.5511, 9.9937],
    ['Bremen', 53.0793, 8.8017],
    ['Hannover', 52.3759, 9.7320],
    ['Dortmund', 51.5136, 7.4653],
    ['Düsseldorf', 51.2277, 6.7735],
    ['Köln', 50.9375, 6.9603],
    ['Frankfurt', 50.1109, 8.6821],
    ['Stuttgart', 48.7758, 9.1829],
    ['München', 48.1351, 11.5820],
    ['Nürnberg', 49.4521, 11.0767],
    ['Leipzig', 51.3397, 12.3731],
    ['Dresden', 51.0504, 13.7373],
    ['Rostock', 54.0924, 12.0991]
  ],
  IT: [
    ['Milano', 45.4642, 9.1900],
    ['Torino', 45.0703, 7.6869],
    ['Genova', 44.4056, 8.9463],
    ['Venezia', 45.4408, 12.3155],
    ['Bologna', 44.4949, 11.3426],
    ['Firenze', 43.7696, 11.2558],
    ['Roma', 41.9028, 12.4964],
    ['Napoli', 40.8518, 14.2681],
    ['Bari', 41.1171, 16.8719],
    ['Palermo', 38.1157, 13.3615],
    ['Catania', 37.5079, 15.0830],
    ['Cagliari', 39.2238, 9.1217]
  ]
};

const CITIES_KEY = 'ftrans-show-cities-v3';

function readShowCities() {
  try {
    const value = localStorage.getItem(CITIES_KEY);
    if (value === null) return true;
    return value !== '0';
  } catch {
    return true;
  }
}

function saveShowCities() {
  try { localStorage.setItem(CITIES_KEY, state.showCities ? '1' : '0'); } catch {}
}

const $ = (id) => document.getElementById(id);
const elements = {
  countryFlags: $('countryFlags'), searchForm: $('searchForm'), searchInput: $('searchInput'),
  inputHelp: $('inputHelp'), rangeGrid: $('rangeGrid'), quickGrid: $('quickGrid'), quickEmpty: $('quickEmpty'),
  showAllButton: $('showAllButton'), clearFiltersButton: $('clearFiltersButton'), citiesToggle: $('citiesToggle'),
  historyList: $('historyList'), historyEmpty: $('historyEmpty'), clearHistoryButton: $('clearHistoryButton'),
  countryName: $('countryName'), mapTitle: $('mapTitle'), mapSubtitle: $('mapSubtitle'), mapLoading: $('mapLoading'), loadingText: $('loadingText'),
  retryButton: $('retryButton'),
  resultCard: $('resultCard'), resultCloseButton: $('resultCloseButton'), resultBadge: $('resultBadge'), resultCode: $('resultCode'),
  resultPlace: $('resultPlace'), resultRegion: $('resultRegion'), detailPostcode: $('detailPostcode'), detailPlace: $('detailPlace'),
  detailRegion: $('detailRegion'), resultMessage: $('resultMessage'), copyButton: $('copyButton'), mapsLink: $('mapsLink'),
  fitCountryButton: $('fitCountryButton'), clearSelectionButton: $('clearSelectionButton'), fullscreenButton: $('fullscreenButton'),
  themeButton: $('themeButton'), infoButton: $('infoButton'), infoDialog: $('infoDialog'), toast: $('toast'), dataStatus: $('dataStatus'),
  systemStatus: $('systemStatus'), mapLegend: $('mapLegend'), legendMin: $('legendMin'), legendMax: $('legendMax'),
  legendTitle: $('legendTitle'), legendHint: $('legendHint'), legendCityRow: $('legendCityRow')
};

if (typeof L === 'undefined') {
  throw new Error('Leaflet hiányzik – a térkép nem indítható.');
}

const state = {
  country: 'HU', layer: null, labels: L.layerGroup(), cities: L.layerGroup(), groups: new Map(), features: new Map(), selectedPrefix: null,
  activeRange: null, showCities: readShowCities(), currentResult: null, lastSuccessfulResult: null,
  dataCache: new Map(), loadToken: 0, controller: null,
  history: readHistory(), manifest: null, lastLoadError: null
};

const svgRenderer = L.svg({ padding: 0.65 });
const map = L.map('map', {
  renderer: svgRenderer,
  zoomControl: true,
  preferCanvas: false,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false,
  inertia: true,
  minZoom: 3,
  worldCopyJump: false
}).setView(CONFIG.HU.center, CONFIG.HU.zoom);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  updateWhenIdle: false,
  updateWhenZooming: false,
  keepBuffer: 5,
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
  // DE/IT: szomszédos számok távoli hue-t kapnak (golden angle)
  const hue = (n * 137.508) % 360;
  const sat = 72 + (n % 3) * 6;
  const light = 44 + (n % 5) * 3;
  return `hsl(${hue.toFixed(1)} ${sat}% ${light}%)`;
}
function inActiveRange(prefix) {
  if (!state.activeRange) return true;
  const n = prefixNumber(prefix);
  return n >= state.activeRange.min && n <= state.activeRange.max;
}
function rangeForPrefix(country, prefix) {
  const n = prefixNumber(prefix);
  return getRanges(country).find((range) => n >= range.min && n <= range.max) || null;
}

function polygonStyle(feature) {
  const prefix = String(feature.properties?.prefix ?? '');
  const selected = prefix === state.selectedPrefix;
  const visible = inActiveRange(prefix) || selected;
  const fill = colorFor(prefix);
  // Szűrt nézetben a nem ide tartozó zónák teljesen eltűnnek (nem csak halványak).
  if (!visible) {
    return {
      renderer: svgRenderer,
      color: fill,
      weight: 0,
      opacity: 0,
      fillColor: fill,
      fillOpacity: 0,
      className: 'ftrans-zone-path is-hidden',
      interactive: false
    };
  }
  return {
    renderer: svgRenderer,
    color: selected ? '#1faa45' : 'rgba(20, 40, 28, 0.45)',
    weight: selected ? 3 : 1.05,
    opacity: selected ? 1 : 0.8,
    fillColor: fill,
    fillOpacity: selected ? 0.9 : 0.58,
    lineCap: 'round',
    lineJoin: 'round',
    className: selected ? 'ftrans-zone-path is-selected' : 'ftrans-zone-path',
    interactive: true
  };
}

function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.mapLoading.hidden = false;
  elements.mapLoading.classList.remove('is-error');
  if (elements.retryButton) elements.retryButton.hidden = true;
  elements.systemStatus.textContent = 'Rendszer állapota: Betöltés…';
}
function showLoadError(message) {
  elements.loadingText.textContent = message;
  elements.mapLoading.hidden = false;
  elements.mapLoading.classList.add('is-error');
  if (elements.retryButton) elements.retryButton.hidden = false;
  elements.systemStatus.textContent = 'Rendszer állapota: Adathiba';
}
function hideLoading() {
  elements.mapLoading.hidden = true;
  elements.mapLoading.classList.remove('is-error');
  if (elements.retryButton) elements.retryButton.hidden = true;
  elements.systemStatus.textContent = 'Rendszer állapota: Rendben';
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
  requestAnimationFrame(() => requestAnimationFrame(() => map.invalidateSize({ pan: false, animate: false })));
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
  for (const range of getRanges(state.country)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `range-button${state.activeRange?.min === range.min ? ' is-active' : ''}`;
    button.textContent = range.label;
    button.setAttribute('aria-pressed', String(state.activeRange?.min === range.min));
    button.addEventListener('click', () => {
      state.activeRange = range;
      state.selectedPrefix = null;
      clearPlaceMarker();
      hideResult();
      restyleMap();
      buildRangeButtons();
      buildQuickButtons();
      buildLabels();
      fitActiveRange();
    });
    elements.rangeGrid.appendChild(button);
  }
}

function buildQuickButtons() {
  elements.quickGrid.replaceChildren();
  const prefixes = [...state.groups.keys()].sort((a, b) => prefixNumber(a) - prefixNumber(b));
  const filtered = state.activeRange ? prefixes.filter(inActiveRange) : prefixes;
  elements.quickEmpty.hidden = filtered.length > 0;
  for (const prefix of filtered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `quick-button${prefix === state.selectedPrefix ? ' is-active' : ''}`;
    button.textContent = prefix;
    button.setAttribute('aria-pressed', String(prefix === state.selectedPrefix));
    button.addEventListener('click', () => selectPrefix(prefix, true));
    elements.quickGrid.appendChild(button);
  }
}

function restyleMap() {
  if (state.layer) state.layer.setStyle(polygonStyle);
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
  if (!state.features.size) return;
  const forceRange = Boolean(state.activeRange);
  const candidates = [];
  for (const [prefix, feature] of state.features.entries()) {
    if (state.activeRange && !inActiveRange(prefix) && prefix !== state.selectedPrefix) continue;
    const point = featureLabelPoint(feature);
    if (!point) continue;
    candidates.push({ prefix, latLng: L.latLng(point[1], point[0]), selected: prefix === state.selectedPrefix });
  }
  candidates.sort((a, b) => Number(b.selected) - Number(a.selected) || prefixNumber(a.prefix) - prefixNumber(b.prefix));
  const occupied = [];
  for (const item of candidates) {
    const pixel = map.latLngToContainerPoint(item.latLng);
    const collides = occupied.some((p) => p.distanceTo(pixel) < (forceRange ? 23 : 34));
    if (collides && !item.selected) continue;
    occupied.push(pixel);
    const icon = L.divIcon({
      className: `zone-label${item.selected ? ' is-selected' : ''}`,
      html: `<span>${item.prefix}</span>`,
      iconSize: [40, 28],
      iconAnchor: [20, 14]
    });
    L.marker(item.latLng, { icon, interactive: false, keyboard: false, pane: 'zoneLabelPane' }).addTo(state.labels);
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
    renderer: svgRenderer,
    style: polygonStyle,
    smoothFactor: 0.6,
    onEachFeature(feature, polygon) {
      const prefix = String(feature.properties?.prefix ?? '');
      if (!nextGroups.has(prefix)) nextGroups.set(prefix, []);
      nextGroups.get(prefix).push(polygon);
      nextFeatures.set(prefix, feature);
      polygon.bindTooltip(`${CONFIG[nextCountry].name} · ${prefix}-es zóna`, { sticky: true, direction: 'top', opacity: 0.96 });
      polygon.on('click', () => selectPrefix(prefix, false));
      polygon.on('mouseover', (event) => {
        if (prefix !== state.selectedPrefix) {
          event.target.setStyle({
            weight: 2.2,
            color: '#1faa45',
            fillOpacity: Math.min(0.78, Math.max(polygonStyle(feature).fillOpacity, 0.5))
          });
          if (event.target.bringToFront) event.target.bringToFront();
        }
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
    state.activeRange = null; // induláskor teljes ország, ne az első csoport
    state.selectedPrefix = null;
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
    fitCountry(false);
    scheduleMapRefresh();
    setTimeout(buildLabels, 60);
    renderCities();
    updateLegend();

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
  updateLegend();
}



function updateLegend() {
  const hu = state.country === 'HU';
  if (elements.legendMin) elements.legendMin.textContent = hu ? '1' : '00';
  if (elements.legendMax) elements.legendMax.textContent = hu ? '9' : '99';
  if (elements.legendTitle) elements.legendTitle.textContent = hu ? 'Zónaszínek (1–9)' : 'Zónaszínek';
  if (elements.legendHint) {
    elements.legendHint.textContent = hu
      ? 'Minden szám saját, állandó színt kap.'
      : 'A szomszédos zónák szándékosan más színt kapnak.';
  }
  if (elements.legendCityRow) elements.legendCityRow.hidden = !state.showCities;
  if (elements.mapLegend) {
    elements.mapLegend.hidden = false;
    elements.mapLegend.dataset.scale = hu ? 'hu' : 'multi';
  }
  const chips = document.getElementById('legendChips');
  const gradientRow = document.querySelector('.legend-scale-row');
  if (chips) {
    chips.replaceChildren();
    if (hu) {
      chips.hidden = false;
      for (let i = 1; i <= 9; i += 1) {
        const item = document.createElement('span');
        item.className = 'legend-chip';
        item.title = `${i}-es zóna`;
        item.innerHTML = `<i style="background:${HU_ZONE_COLORS[i]}"></i>${i}`;
        chips.appendChild(item);
      }
    } else {
      chips.hidden = true;
    }
  }
  if (gradientRow) gradientRow.hidden = hu;
  const gradient = document.querySelector('.legend-gradient');
  if (gradient) gradient.hidden = hu;
  if (elements.legendMin) elements.legendMin.hidden = hu;
  if (elements.legendMax) elements.legendMax.hidden = hu;
}

function syncCountryFlags() {
  if (!elements.countryFlags) return;
  elements.countryFlags.querySelectorAll('[data-country]').forEach((button) => {
    const active = button.dataset.country === state.country;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderCities() {
  state.cities.clearLayers();
  if (!state.showCities) {
    if (elements.legendCityRow) elements.legendCityRow.hidden = true;
    return;
  }
  if (elements.legendCityRow) elements.legendCityRow.hidden = false;
  for (const [name, lat, lon] of CITY_DATA[state.country] || []) {
    const icon = L.divIcon({
      className: 'city-marker-icon',
      html: `<div class="city-map-label"><span class="city-dot" aria-hidden="true"></span><span class="city-name">${escapeHtml(name)}</span></div>`,
      iconSize: [150, 22],
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

function fitFeature(feature, options = {}) {
  const bounds = boundsForFeature(feature);
  if (!bounds?.isValid()) return false;
  map.fitBounds(bounds, {
    padding: options.padding || [55, 55],
    maxZoom: options.maxZoom ?? (state.country === 'HU' ? 8 : 9),
    animate: false
  });
  scheduleMapRefresh();
  return true;
}

function fitActiveRange() {
  if (!state.activeRange || !state.features.size) {
    fitCountry(false);
    return;
  }
  const layers = [];
  for (const [prefix, feature] of state.features.entries()) {
    if (!inActiveRange(prefix)) continue;
    const bounds = fullFeatureBounds(feature);
    if (bounds?.isValid()) layers.push(bounds);
  }
  if (!layers.length) {
    fitCountry(false);
    return;
  }
  let merged = layers[0];
  for (let i = 1; i < layers.length; i += 1) merged = merged.extend(layers[i]);
  map.fitBounds(merged, {
    padding: [36, 36],
    animate: false,
    maxZoom: state.country === 'HU' ? 8 : 7
  });
  scheduleMapRefresh();
}

function fitCountry(animate = false) {
  if (state.layer?.getBounds().isValid()) {
    map.fitBounds(state.layer.getBounds(), { padding: [18, 18], animate: false, maxZoom: CONFIG[state.country].zoom + 1 });
    scheduleMapRefresh();
  }
}

function selectPrefix(prefix, fit = true, fullCode = '', options = {}) {
  if (!state.groups.has(prefix)) {
    showResult({
      prefix,
      postcode: fullCode,
      place: '',
      region: '',
      verified: false,
      message: 'Ehhez a zónához nincs terület a betöltött térképen.'
    });
    return;
  }
  state.selectedPrefix = prefix;
  const range = rangeForPrefix(state.country, prefix);
  // Csoportot csak keresésnél, vagy ha már szűrt nézetben vagyunk és a zóna kívül esik.
  // Teljes országnézetben a kattintás csak kijelöl, nem kapcsol be szűrőt.
  if (range && (options.activateRange || (state.activeRange && !inActiveRange(prefix)))) {
    state.activeRange = range;
  }
  restyleMap();
  buildRangeButtons();
  buildQuickButtons();

  if (fit) {
    const feature = state.features.get(prefix);
    if (!fitFeature(feature, { maxZoom: state.country === 'HU' ? 8 : 9 })) {
      const bounds = L.featureGroup(state.groups.get(prefix)).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: state.country === 'HU' ? 8 : 9, animate: false });
      }
    }
  }
  scheduleMapRefresh();
  setTimeout(buildLabels, 50);
  showResult({
    prefix,
    postcode: fullCode,
    place: '',
    region: '',
    verified: false,
    message: 'A zóna ki van jelölve. A zöld keret a kiválasztott területet mutatja.'
  });
}

function clearSelection() {
  state.selectedPrefix = null;
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
  const prefix = value.slice(0, cfg.prefixDigits).padStart(cfg.prefixDigits, '0');
  selectPrefix(prefix, true, value, { activateRange: true });
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
    map.setView([lookup.latitude, lookup.longitude], state.country === 'HU' ? 10 : 11, { animate: false });
    scheduleMapRefresh();
  }
  setInputMessage(lookup.networkError ? 'A zóna megjelent, de a hálózati ellenőrzés nem sikerült.' : 'A találat megjelent a térképen.', Boolean(lookup.networkError));
  if (!options.fromHistory) addHistory({ country: state.country, postcode: value, place: result.place, prefix });
}

function showResult(result) {
  state.currentResult = result;
  const cfg = CONFIG[state.country];
  elements.resultCard.hidden = false;
  elements.resultBadge.textContent = result.verified ? 'Ellenőrzött találat' : 'Kiválasztott zóna';
  elements.resultCode.textContent = result.postcode || result.prefix;
  elements.resultPlace.textContent = result.place || `${result.prefix}-es postai zóna`;
  elements.resultRegion.textContent = result.region || cfg.name;
  elements.detailPostcode.textContent = result.postcode || '—';
  elements.detailPlace.textContent = result.place || '—';
  elements.detailRegion.textContent = result.region || '—';
  elements.resultMessage.textContent = result.message || '';
  const mapQuery = result.latitude && result.longitude
    ? `${result.latitude},${result.longitude}`
    : [result.postcode, result.place, cfg.name].filter(Boolean).join(' ');
  elements.mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
}
function hideResult() {
  elements.resultCard.hidden = true;
  state.currentResult = null;
}

async function copyResult() {
  if (!state.currentResult) return;
  const r = state.currentResult;
  const text = [
    r.postcode ? `${r.postcode}${r.place ? ` – ${r.place}` : ''}` : `${r.prefix}-es postai zóna`,
    `Zóna: ${r.prefix}`,
    r.region ? `Régió: ${r.region}` : '',
    CONFIG[state.country].name
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast('A találatot a vágólapra másoltam.');
  } catch {
    toast('A másolás nem sikerült.');
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
  state.activeRange = null;
  state.selectedPrefix = null;
  clearPlaceMarker();
  elements.searchInput.value = '';
  setInputMessage();
  hideResult();
  restyleMap();
  buildRangeButtons();
  buildQuickButtons();
  buildLabels();
  fitCountry(false);
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
    state.activeRange = null;
    state.selectedPrefix = null;
    clearPlaceMarker();
    hideResult();
    restyleMap();
    buildRangeButtons();
    buildQuickButtons();
    buildLabels();
    fitCountry(false);
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
      updateLegend();
    });
  }
  elements.fitCountryButton.addEventListener('click', () => fitCountry(false));
  elements.clearSelectionButton.addEventListener('click', clearSelection);
  elements.resultCloseButton.addEventListener('click', hideResult);
  elements.copyButton.addEventListener('click', copyResult);
  elements.clearHistoryButton.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
  });
  elements.themeButton.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  elements.infoButton.addEventListener('click', () => elements.infoDialog.showModal());
  elements.fullscreenButton.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await $('mapStage').requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      toast('A teljes képernyős mód nem érhető el.');
    }
  });
  if (elements.retryButton) {
    elements.retryButton.addEventListener('click', () => {
      state.dataCache.delete(state.country);
      loadCountry(state.country);
    });
  }
  document.addEventListener('fullscreenchange', scheduleMapRefresh);
  map.on('zoomend moveend', () => setTimeout(buildLabels, 20));
  window.addEventListener('resize', scheduleMapRefresh, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(scheduleMapRefresh).observe($('mapStage'));
}

async function init() {
  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  })();
  setTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (elements.citiesToggle) elements.citiesToggle.checked = state.showCities;
  syncCountryFlags();
  updateLegend();
  bindEvents();
  renderHistory();
  loadManifest();
  await loadCountry('HU');
}

init();
