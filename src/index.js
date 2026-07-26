/**
 * F-TRANS V3.3 Worker
 * - /__health validates required static assets
 * - missing /data/* and /vendor/* never fall back to index.html
 */

const APP_VERSION = '3.3.28';

const REQUIRED_ASSETS = [
  { path: '/data/processed/manifest.json', kind: 'json', minBytes: 200 },
  { path: '/data/processed/hu_prefix1.geojson', kind: 'geojson', minBytes: 1000, minFeatures: 9, country: 'HU' },
  { path: '/data/processed/de_prefix2.geojson', kind: 'geojson', minBytes: 1000, minFeatures: 95, country: 'DE' },
  { path: '/data/processed/it_prefix2.geojson', kind: 'geojson', minBytes: 1000, minFeatures: 93, country: 'IT' },
  { path: '/vendor/leaflet.js', kind: 'js', minBytes: 10000 },
  { path: '/vendor/leaflet.css', kind: 'css', minBytes: 1000 },
  { path: '/flags/hu.svg', kind: 'svg', minBytes: 80 },
  { path: '/flags/de.svg', kind: 'svg', minBytes: 80 },
  { path: '/flags/it.svg', kind: 'svg', minBytes: 80 }
];

const PROTECTED_PREFIXES = ['/data/', '/vendor/'];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

async function fetchAsset(env, path) {
  return env.ASSETS.fetch(new Request(`https://assets.local${path}`, { method: 'GET' }));
}

function looksLikeHtml(text, contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/html')) return true;
  const head = String(text || '').trimStart().slice(0, 64).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

async function validateAsset(env, asset) {
  const result = {
    path: asset.path,
    ok: false,
    status: 0,
    contentType: '',
    bytes: 0,
    featureCount: null,
    error: null
  };

  try {
    const response = await fetchAsset(env, asset.path);
    result.status = response.status;
    result.contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();
    result.bytes = buffer.byteLength;
    const text = new TextDecoder().decode(buffer);

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      return result;
    }
    if (result.bytes < asset.minBytes) {
      result.error = `Túl kicsi fájl (${result.bytes} bájt).`;
      return result;
    }
    if (looksLikeHtml(text, result.contentType)) {
      result.error = 'HTML érkezett adatfájl helyett (SPA fallback).';
      return result;
    }

    if (asset.kind === 'json' || asset.kind === 'geojson') {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        result.error = 'Érvénytelen JSON.';
        return result;
      }
      if (asset.kind === 'geojson') {
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          result.error = 'Nem FeatureCollection.';
          return result;
        }
        result.featureCount = data.features.length;
        if (result.featureCount < asset.minFeatures) {
          result.error = `Kevesebb feature mint elvárt (${result.featureCount} < ${asset.minFeatures}).`;
          return result;
        }
        for (const feature of data.features) {
          const prefix = feature?.properties?.prefix;
          const geometry = feature?.geometry;
          if (prefix == null || prefix === '') {
            result.error = 'Hiányzó properties.prefix.';
            return result;
          }
          if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
            result.error = `Hibás geometria a(z) ${prefix} prefixnél.`;
            return result;
          }
        }
      } else if (!data || typeof data !== 'object') {
        result.error = 'A manifest nem objektum.';
        return result;
      }
    } else if (asset.kind === 'js') {
      if (!text.includes('Leaflet') && !text.includes('leaflet')) {
        result.error = 'A Leaflet JS tartalma gyanús.';
        return result;
      }
    } else if (asset.kind === 'css') {
      if (!text.includes('.leaflet')) {
        result.error = 'A Leaflet CSS tartalma gyanús.';
        return result;
      }
    }

    result.ok = true;
    return result;
  } catch (error) {
    result.error = error?.message || String(error);
    return result;
  }
}

async function handleHealth(env) {
  const checks = [];
  for (const asset of REQUIRED_ASSETS) {
    checks.push(await validateAsset(env, asset));
  }
  const ok = checks.every((item) => item.ok);
  return jsonResponse({
    ok,
    version: APP_VERSION,
    checkedAt: new Date().toISOString(),
    assets: checks,
    countries: {
      HU: checks.find((c) => c.path.endsWith('hu_prefix1.geojson'))?.featureCount ?? null,
      DE: checks.find((c) => c.path.endsWith('de_prefix2.geojson'))?.featureCount ?? null,
      IT: checks.find((c) => c.path.endsWith('it_prefix2.geojson'))?.featureCount ?? null
    }
  }, ok ? 200 : 503);
}

async function handleProtectedAsset(env, pathname) {
  const assetResponse = await fetchAsset(env, pathname);
  const contentType = assetResponse.headers.get('content-type') || '';
  const textProbe = await assetResponse.clone().text();

  if (!assetResponse.ok || looksLikeHtml(textProbe, contentType)) {
    return jsonResponse({
      error: assetResponse.ok
        ? 'HTML érkezett adatfájl helyett.'
        : `Az adatforrás ${assetResponse.status} hibát adott.`,
      path: pathname
    }, 404);
  }

  const headers = new Headers(assetResponse.headers);
  if (pathname.endsWith('.geojson')) {
    headers.set('content-type', 'application/geo+json; charset=utf-8');
  } else if (pathname.endsWith('.json')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  } else if (pathname.endsWith('.js')) {
    headers.set('content-type', 'text/javascript; charset=utf-8');
  } else if (pathname.endsWith('.css')) {
    headers.set('content-type', 'text/css; charset=utf-8');
  }
  headers.set('cache-control', pathname.includes('/data/') ? 'public, max-age=3600' : 'public, max-age=86400');
  headers.set('x-ftrans-version', APP_VERSION);
  return new Response(assetResponse.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/__health') {
      return handleHealth(env);
    }

    if (pathname === '/__version') {
      return jsonResponse({ version: APP_VERSION, ok: true });
    }

    if (isProtectedPath(pathname)) {
      return handleProtectedAsset(env, pathname);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    headers.set('x-ftrans-version', APP_VERSION);
    // A UI fájlok gyorsan frissüljenek deploy után (ne ragadjon be a régi Maps/kijelölés logika).
    if (
      pathname === '/' ||
      pathname === '/index.html' ||
      pathname === '/app.js' ||
      pathname === '/styles.css' ||
      pathname.endsWith('.html')
    ) {
      headers.set('cache-control', 'no-cache');
    }
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      headers
    });
  }
};
