# Cloudflare GitHub-kapcsolat – egyszeri beállítás

## 1. Repository létrehozása

GitHubon hozz létre egy új, üres repositoryt:

- Owner: `Sh4d0wGr4y`
- Repository name: `ftrans-iranyitoszam-terkep`
- Visibility: **Private** ajánlott
- Ne adj hozzá README, `.gitignore` vagy licenc fájlt, mert ezeket a projekt már tartalmazza.

## 2. Projekt feltöltése

A repository létrehozása után a kész fájlok feltölthetők a GitHub webes felületén, vagy a kapcsolódó ChatGPT GitHub-eszközzel.

## 3. Meglévő Worker összekapcsolása

Cloudflare Dashboard → Workers & Pages → `ftrans-iranyitoszam-terkep` → Settings → Builds → Connect.

Beállítások:

- Git provider: GitHub
- Git account: `Sh4d0wGr4y`
- Repository: `ftrans-iranyitoszam-terkep`
- Production branch: `main`
- Root directory: `/`
- Build command: üres
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: alapértelmezett `npx wrangler versions upload`

## 4. Első telepítés

Mentés után indítsd el az első buildet. Később minden `main` branchre kerülő commit automatikusan frissíti a Workert.

## Fontos névellenőrzés

A Cloudflare Worker neve és a `wrangler.jsonc` fájl `name` mezője ugyanaz:

`ftrans-iranyitoszam-terkep`

Eltérő név esetén a Cloudflare build hibával leáll.
