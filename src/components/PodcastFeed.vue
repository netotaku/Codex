<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  shallowRef,
} from "vue";
import EpisodePlayer from "./EpisodePlayer.vue";
import { categories } from "../data/catalogue.js";
import { useEpisodes } from "../composables/useEpisodes.js";

const { episodesByCategory, loading } = useEpisodes(categories);
const playRequest = shallowRef(null);
const playback = ref({ episodeId: null, playing: false });
const isPlaying = (episode) =>
  playback.value.episodeId === episode.id && playback.value.playing;
const selected = ref(categories[0].name);
const pageSizes = reactive({});
const episodes = computed(() => episodesByCategory.value[selected.value]);
const shown = computed(() => pageSizes[selected.value] ?? 30);
const visibleEpisodes = computed(() => episodes.value.slice(0, shown.value));
const tabs = ref(null);
const canScrollRight = ref(false);
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayGroups = computed(() => {
  const groups = new Map();
  for (const episode of visibleEpisodes.value) {
    const date = new Date(episode.stamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, { key, label: dateFormatter.format(date), episodes: [] });
    }
    groups.get(key).episodes.push(episode);
  }
  return [...groups.values()];
});

function updateTabFade() {
  const { scrollWidth, clientWidth, scrollLeft } = tabs.value;
  canScrollRight.value = scrollWidth > clientWidth + scrollLeft + 2;
}
function playEpisode(episode) {
  playRequest.value = {
    episodeId: episode.id,
    queue: episodes.value.filter((item) => item.mediaUrl),
  };
}
function selectCategory(name, event) {
  selected.value = name;
  event.currentTarget.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}
let resizeObserver;
onMounted(() => {
  resizeObserver = new ResizeObserver(updateTabFade);
  resizeObserver.observe(tabs.value);
  updateTabFade();
});
onUnmounted(() => resizeObserver?.disconnect());
</script>

<template>
  <div
    class="feed__tabs-wrap"
    :class="{ 'feed__tabs-wrap--overflow': canScrollRight }"
  >
    <nav
      ref="tabs"
      class="feed__tabs"
      aria-label="Feed categories"
      @scroll.passive="updateTabFade"
    >
      <button
        v-for="{ name, feeds } in categories"
        :key="name"
        class="feed__tab"
        :class="{ 'feed__tab--active': selected === name }"
        :aria-pressed="selected === name"
        type="button"
        @click="selectCategory(name, $event)"
      >
        {{ name }} <span class="feed__count">{{ feeds.length }}</span>
      </button>
    </nav>
  </div>
  <section class="feed__panel" :aria-label="selected + ' episodes'">
    <h1 class="feed__heading">Episodes</h1>
    <p v-if="loading || !episodes.length" class="feed__status" role="status">
      {{
        loading
          ? "Loading latest episodes…"
          : "No recent episodes available from the sources that could be reached."
      }}
    </p>
    <section v-for="group in dayGroups" :key="group.key" class="feed__day">
      <h2 class="feed__day-heading"><time :datetime="group.key">{{ group.label }}</time></h2>
      <div class="feed__list">
      <div
        v-for="episode in group.episodes"
        :key="episode.id"
        class="feed__item"
        :class="{ 'feed__item--playing': isPlaying(episode) }"
      >
        <a
          :href="episode.url"
          class="episode"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3 class="episode__title" :title="episode.title">{{ episode.title }}</h3>
          <div class="episode__meta">
            <time
              class="episode__date"
              :datetime="new Date(episode.stamp).toISOString()"
              >{{ timeFormatter.format(episode.stamp) }}</time
            >
            <span class="episode__source" :title="episode.source">{{ episode.source }}</span>
          </div>
          <p v-if="episode.description" class="episode__description">
            {{ episode.description }}
          </p>
        </a>
        <button
          v-if="episode.mediaUrl"
          class="episode__play"
          type="button"
          :aria-label="(isPlaying(episode) ? 'Pause ' : 'Play ') + episode.title"
          :class="{ 'episode__play--playing': isPlaying(episode) }"
          @click="playEpisode(episode)"
        >
          <span aria-hidden="true">{{ isPlaying(episode) ? "Ⅱ" : "▶" }}</span>
        </button>
      </div>
      </div>
    </section>
    <button
      v-if="shown < episodes.length"
      class="feed__load-more"
      type="button"
      @click="pageSizes[selected] = shown + 30"
    >
      Load more episodes
    </button>
  </section>
  <EpisodePlayer :request="playRequest" @playback-change="playback = $event" />
</template>
