# Easy Listening

A personal, curated place for things worth hearing. Astro + structured JSON catalogue.

## Develop

`npm install && npm run dev`

## Curation

Edit `src/data/selectors.json` to add DJs and selectors. Each entry has a stable `id`, `category`, `origin`, `status`, `notes`, `mixes` and `links`. `mixes` and `links` intentionally start empty; we haven't verified individual recordings or platform URLs yet. `origin` records who suggested an entry, not whether it is a favourite. Don Letts is intentionally excluded.

The original Personal Broadcast app is preserved in branch `archive/personal-broadcast-2026-11-05`.

## Podcast feeds

Edit `src/data/feeds.json` to curate podcasts and their verified RSS URLs. Category order is configured in `src/data/feed-categories.json`; new categories are picked up automatically. `src/data/catalogue.js` supplies the same groups to the page and browser loader, counting each RSS URL once. See [the RSS audit](docs/rss-feed-audit.md) for removed entries and renamed shows. Run `python3 scripts/check-feeds.py` to recheck saved URLs.

## Feed UI

Astro renders the page shell and hydrates `src/components/PodcastFeed.vue` on load. The Vue island uses `useEpisodes` to fetch each unique saved RSS URL once (six requests at a time). Feed results are reactive; computed category lists update as sources finish. Selection and per-category page sizes stay local to the island, so tab switches never fetch data. Requests are cancelled when the island unmounts. RSS parsing and the existing CORS fallback live in `src/lib/rss.js`.

Run `npm test` for component, hydration, loading, pagination, cancellation, and RSS parsing checks; run `npm run build` for the production build.
