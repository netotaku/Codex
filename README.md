# Easy Listening

A personal, curated place for things worth hearing. Astro + structured JSON catalogue.

## Develop

`npm install && npm run dev`

## Curation

Edit `src/data/selectors.json` to add DJs and selectors. Each entry has a stable `id`, `category`, `origin`, `status`, `notes`, `mixes` and `links`. `mixes` and `links` intentionally start empty; we haven't verified individual recordings or platform URLs yet. `origin` records who suggested an entry, not whether it is a favourite. Don Letts is intentionally excluded.

The original Personal Broadcast app is preserved in branch `archive/personal-broadcast-2026-11-05`.
