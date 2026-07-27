# Telepítési ellenőrzőlista – V3.3

1. `npm install`
2. `npm test`
3. `npm run test:labels`
4. `npm run deploy:test` (csak teszt Worker)
5. Ellenőrizd:
   - `/__health` → `ok: true`, `version: 3.3.0`
   - GeoJSON és Leaflet végpontok
   - HU / DE / IT térkép megjelenik
6. Élesítés csak külön jóváhagyás után.
