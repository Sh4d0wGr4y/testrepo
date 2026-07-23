# F-TRANS Irányítószám-kereső

Egyszerű, reszponzív irányítószám-kereső Magyarország, Németország és Olaszország számára.

## Telepítés Cloudflare Workersre

A projekt statikus fájlokat szolgál ki Cloudflare Workers Static Assets használatával.

### Helyi indítás

```bash
npm install
npm run dev
```

### Kézi telepítés

```bash
npm install
npm run deploy
```

### Automatikus GitHub → Cloudflare telepítés

A Cloudflare Dashboardban nyisd meg a meglévő `ftrans-iranyitoszam-terkep` Workert:

1. **Settings → Builds**
2. **Connect**
3. GitHub-fiók: `Sh4d0wGr4y`
4. Repository: `ftrans-iranyitoszam-terkep`
5. Production branch: `main`
6. Root directory: `/`
7. Build command: hagyd üresen
8. Deploy command: `npx wrangler deploy`
9. Save and Deploy

A Wrangler `name` mezője szándékosan pontosan megegyezik a meglévő Worker nevével.

## Projektstruktúra

- `public/` – a telepített weboldal teljes statikus tartalma
- `wrangler.jsonc` – Cloudflare Workers-konfiguráció
- `package.json` – Wrangler és fejlesztési parancsok

## Biztonság

Ne tölts fel Cloudflare API-tokent, jelszót vagy `.env` fájlt a repositoryba.


Automatikus Cloudflare telepítés aktiválva.
