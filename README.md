# F TRANS Irányítószám-kereső V3.3

Önálló, reprodukálható Cloudflare Workers alkalmazás Magyarország, Németország és Olaszország postai zónáinak kereséséhez.

## Mi változott a V3.3-ban

- A GeoJSON és a Leaflet fájlok **a repositoryban** vannak (`public/data/processed/*`, `public/vendor/*`).
- Nincs manuális fájlkeresés, nincs futásidejű proxy régi Workerre.
- A `/__health` végpont csak akkor ad `ok: true` választ, ha minden kötelező asset érvényes.
- A hiányzó adatfájlok **nem** esnek vissza `index.html`-re.
- Térkép: SVG renderer, AbortController, egy aktív zónaréteg, címkepont poligonon belüli ellenőrzése.

## Helyi futtatás

```bash
npm install
npm test
npm run test:labels
npm run dev
```

## Teszt Worker telepítés

```bash
npm run deploy:test
```

Ez a `ftrans-iranyitoszam-terkep-v3-test` Workerre telepít.

Az **éles** Workert (`ftrans-iranyitoszam-terkep`) csak külön jóváhagyás után szabad frissíteni.

## Ellenőrző végpontok

- `/__health`
- `/data/processed/manifest.json`
- `/data/processed/hu_prefix1.geojson`
- `/data/processed/de_prefix2.geojson`
- `/data/processed/it_prefix2.geojson`
- `/vendor/leaflet.js`
- `/vendor/leaflet.css`

## Adatforrások

Lásd: `public/data/processed/manifest.json`.
