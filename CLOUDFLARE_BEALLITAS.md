# Cloudflare beállítás (V3.3)

## Teszt Worker

- Név: `ftrans-iranyitoszam-terkep-v3-test`
- Deploy: `npm run deploy:test`
- Konfig: `wrangler.jsonc` (alapból a teszt Worker neve)

## Éles Worker

- Név: `ftrans-iranyitoszam-terkep`
- Csak külön felhasználói jóváhagyás után módosítható.
- Élesítéskor a `wrangler.jsonc` `name` mezőjét ideiglenesen az éles névre kell állítani, vagy:

```bash
npx wrangler deploy --name ftrans-iranyitoszam-terkep
```

## Fontos

- Ne tölts fel API-tokent a repositoryba.
- A `/data/*` és `/vendor/*` útvonalakon tilos az SPA HTML fallback.
- Telepítés után mindig ellenőrizd a `/__health` választ.
