import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'hu_prefix1.geojson',
  'de_prefix2.geojson',
  'it_prefix2.geojson'
];

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(sum / 2);
}

function largestPolygon(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
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
  if (geometry.type === 'Polygon') return pointInPolygonCoords(x, y, geometry.coordinates);
  return geometry.coordinates.some((polygon) => pointInPolygonCoords(x, y, polygon));
}

function pointToPolygonDist(x, y, polygon) {
  const inside = pointInPolygonCoords(x, y, polygon);
  let minDistSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      let px = a[0];
      let py = a[1];
      let dx = b[0] - px;
      let dy = b[1] - py;
      if (dx !== 0 || dy !== 0) {
        const t = ((x - px) * dx + (y - py) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          px = b[0];
          py = b[1];
        } else if (t > 0) {
          px += dx * t;
          py += dy * t;
        }
      }
      dx = x - px;
      dy = y - py;
      minDistSq = Math.min(minDistSq, dx * dx + dy * dy);
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function polylabel(polygon, precision = 0.05) {
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
  const cellSize = Math.min(maxX - minX, maxY - minY);
  if (!Number.isFinite(cellSize) || cellSize <= 0) return ring[0];
  const h = cellSize / 2;
  const cells = [];
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      cells.push({ x: x + h, y: y + h, h, d: pointToPolygonDist(x + h, y + h, polygon) });
    }
  }
  let best = cells.sort((a, b) => b.d - a.d)[0] || { x: ring[0][0], y: ring[0][1], d: -Infinity };
  // Egyszerűsített, determinisztikus finomítás
  for (let iter = 0; iter < 4; iter += 1) {
    const nh = best.h ? best.h / 2 : cellSize / 4 / (iter + 1);
    const candidates = [
      [best.x - nh, best.y - nh],
      [best.x + nh, best.y - nh],
      [best.x - nh, best.y + nh],
      [best.x + nh, best.y + nh],
      [best.x, best.y]
    ];
    for (const [x, y] of candidates) {
      const d = pointToPolygonDist(x, y, polygon);
      if (d > best.d) best = { x, y, h: nh, d };
    }
  }
  return [best.x, best.y];
}

let outside = 0;
for (const name of files) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'public/data/processed', name), 'utf8'));
  for (const feature of data.features) {
    const prefix = String(feature.properties.prefix);
    const existing = feature.properties.labelPoint;
    let point = null;
    if (Array.isArray(existing) && existing.length === 2 && pointInGeometry(existing[0], existing[1], feature.geometry)) {
      point = existing;
    } else {
      const polygon = largestPolygon(feature.geometry);
      assert.ok(polygon, `${name}/${prefix}: nincs poligon`);
      point = polylabel(polygon);
    }
    const inside = pointInGeometry(point[0], point[1], feature.geometry);
    if (!inside) {
      outside += 1;
      console.error(`FAIL: ${name}/${prefix} címkepont a geometrián kívül`, point);
    }
  }
  console.log(`OK: ${name} címkepontok ellenőrizve (${data.features.length})`);
}

assert.equal(outside, 0, `${outside} címkepont esett a poligonon kívül`);
console.log('Minden címkepont a saját zónáján belül van.');
