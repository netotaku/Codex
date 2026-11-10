<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
} from "vue";

const props = defineProps({ request: { type: Object, default: null } });
const emit = defineEmits(["playback-change"]);
const queue = shallowRef([]);
const index = ref(-1);
const episode = computed(() => queue.value[index.value]);
const media = ref(null);
const player = ref(null);
const height = ref(0);
const playing = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const error = ref("");
const canPrevious = computed(() => index.value > 0);
const canNext = computed(() => index.value < queue.value.length - 1);

async function play() {
  const element = media.value;
  if (!element) return;
  error.value = "";
  try {
    await element.play();
  } catch (reason) {
    if (element !== media.value || reason.name === "AbortError") return;
    error.value =
      reason.name === "NotAllowedError"
        ? "Press play to start this episode."
        : "This episode could not be played. Try another episode or open its link.";
  }
}
function toggle() {
  if (media.value.paused) play();
  else media.value.pause();
}
function step(offset) {
  const next = index.value + offset;
  if (next >= 0 && next < queue.value.length) index.value = next;
}
function syncTime() {
  currentTime.value = media.value.currentTime || 0;
  duration.value = Number.isFinite(media.value.duration)
    ? media.value.duration
    : 0;
}
function seek(event) {
  if (!duration.value) return;
  media.value.currentTime = Math.max(
    0,
    Math.min(duration.value, Number(event.target.value)),
  );
  syncTime();
}
function formatTime(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = String(value % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

watch(
  () => props.request,
  (request) => {
    if (!request) return;
    const sameEpisode = episode.value?.id === request.episodeId;
    queue.value = request.queue;
    index.value = request.queue.findIndex(
      (item) => item.id === request.episodeId,
    );
    if (sameEpisode) toggle();
  },
  { immediate: true },
);
watch(
  () => episode.value?.id,
  async (id) => {
    if (!id) return;
    media.value?.pause();
    playing.value = false;
    currentTime.value = duration.value = 0;
    error.value = "";
    await nextTick();
    if (episode.value?.id === id) play();
  },
  { immediate: true },
);
watch(
  [() => episode.value?.id, playing],
  ([episodeId, isPlaying]) => {
    emit("playback-change", { episodeId, playing: isPlaying });
  },
  { immediate: true },
);
watch(
  player,
  (element, previous, onCleanup) => {
    if (!element) return;
    const observer = new ResizeObserver(() => {
      height.value = element.offsetHeight;
    });
    observer.observe(element);
    height.value = element.offsetHeight;
    onCleanup(() => observer.disconnect());
  },
  { flush: "post" },
);
onBeforeUnmount(() => media.value?.pause());
</script>

<template>
  <template v-if="episode">
    <div
      class="player__spacer"
      :style="{ height: height + 'px' }"
      aria-hidden="true"
    ></div>
    <section ref="player" class="player" aria-label="Episode player">
      <component
        :is="episode.mediaKind === 'video' ? 'video' : 'audio'"
        :key="episode.id"
        ref="media"
        class="player__media"
        :class="{ 'player__media--video': episode.mediaKind === 'video' }"
        :src="episode.mediaUrl"
        preload="metadata"
        playsinline
        @play="playing = true"
        @pause="playing = false"
        @loadedmetadata="syncTime"
        @durationchange="syncTime"
        @timeupdate="syncTime"
        @ended="
          playing = false;
          step(1);
        "
        @error="
          playing = false;
          error =
            'This media could not be loaded. Try another episode or open its link.';
        "
      />
      <div class="player__info">
        <a
          class="player__title"
          :href="episode.url"
          target="_blank"
          rel="noopener noreferrer"
          >{{ episode.title }}</a
        >
        <span class="player__source">{{ episode.source }}</span>
      </div>
      <div class="player__controls">
        <button
          class="player__button"
          type="button"
          :disabled="!canPrevious"
          aria-label="Previous episode"
          @click="step(-1)"
        >
          Previous
        </button>
        <button
          class="player__button player__button--primary"
          type="button"
          :aria-label="playing ? 'Pause' : 'Play'"
          @click="toggle"
        >
          {{ playing ? "Pause" : "Play" }}
        </button>
        <button
          class="player__button"
          type="button"
          :disabled="!canNext"
          aria-label="Next episode"
          @click="step(1)"
        >
          Next
        </button>
      </div>
      <div class="player__timeline">
        <span class="player__time">{{ formatTime(currentTime) }}</span>
        <input
          class="player__seek"
          type="range"
          min="0"
          :max="duration || 0"
          step="1"
          :value="currentTime"
          :disabled="!duration"
          aria-label="Seek episode"
          :aria-valuetext="
            formatTime(currentTime) + ' of ' + formatTime(duration)
          "
          @input="seek"
        />
        <span class="player__time">{{ formatTime(duration) }}</span>
      </div>
      <p v-if="error" class="player__error" role="status">{{ error }}</p>
    </section>
  </template>
</template>
