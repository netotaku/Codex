import { computed, onMounted, onScopeDispose, shallowReactive } from "vue";
import { readFeed } from "../lib/rss.js";

export function useEpisodes(categories) {
  const feeds = categories[0].feeds;
  const episodesByFeed = shallowReactive(new Map());
  const controller = new AbortController();
  const episodesByCategory = computed(() =>
    Object.fromEntries(
      categories.map(({ name, feeds }) => [
        name,
        [
          ...new Map(
            feeds
              .flatMap((feed) => episodesByFeed.get(feed.url) ?? [])
              .map((episode) => [episode.id, episode]),
          ).values(),
        ].sort((a, b) => b.stamp - a.stamp),
      ]),
    ),
  );
  const loading = computed(() => episodesByFeed.size < feeds.length);

  onMounted(async () => {
    let next = 0;
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        while (next < feeds.length && !controller.signal.aborted) {
          const feed = feeds[next++];
          let episodes = [];
          try {
            episodes = await readFeed(feed, controller.signal);
          } catch {
            // A failed source must not block the rest of the catalogue.
          }
          if (!controller.signal.aborted)
            episodesByFeed.set(feed.url, episodes);
        }
      }),
    );
  });
  onScopeDispose(() => controller.abort());

  return { episodesByCategory, loading };
}
