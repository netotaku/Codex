import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import EpisodePlayer from "../src/components/EpisodePlayer.vue";

const queue = Array.from({ length: 3 }, (_, i) => ({
  id: String(i),
  title: `Episode ${i}`,
  source: "Example Show",
  url: `https://example.com/${i}`,
  mediaUrl: `https://example.com/${i}.mp3`,
  mediaKind: "audio",
}));
let wrapper;
let play;
let pause;
beforeEach(() => {
  wrapper = null;
  play = vi
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockImplementation(function () {
      Object.defineProperty(this, "paused", {
        configurable: true,
        value: false,
      });
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
  pause = vi
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(function () {
      Object.defineProperty(this, "paused", {
        configurable: true,
        value: true,
      });
      this.dispatchEvent(new Event("pause"));
    });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  wrapper?.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const button = (label) => wrapper.find(`[aria-label="${label}"]`);
async function start(index = 0) {
  wrapper = mount(EpisodePlayer, {
    props: { request: { queue, episodeId: queue[index].id } },
  });
  await flushPromises();
}

it("stays hidden until selected, then starts the selected enclosure and supports play/pause", async () => {
  wrapper = mount(EpisodePlayer);
  expect(wrapper.find(".player").exists()).toBe(false);
  expect(play).not.toHaveBeenCalled();
  await wrapper.setProps({ request: { queue, episodeId: "0" } });
  await flushPromises();
  expect(wrapper.find("audio").attributes("src")).toBe(queue[0].mediaUrl);
  expect(wrapper.find(".player__title").text()).toBe("Episode 0");
  expect(play).toHaveBeenCalledTimes(1);
  await button("Pause").trigger("click");
  expect(pause).toHaveBeenCalledTimes(1);
  await button("Play").trigger("click");
  expect(play).toHaveBeenCalledTimes(2);
});

it("seeks with the range control and displays time updates, including long episodes", async () => {
  await start();
  const audio = wrapper.find("audio");
  expect(button("Seek episode").element.disabled).toBe(true);
  Object.defineProperty(audio.element, "duration", {
    configurable: true,
    value: 3720,
  });
  await audio.trigger("loadedmetadata");
  expect(button("Seek episode").element.disabled).toBe(false);
  await button("Seek episode").setValue("3661");
  expect(audio.element.currentTime).toBe(3661);
  expect(button("Seek episode").attributes("aria-valuetext")).toBe(
    "1:01:01 of 1:02:00",
  );
  audio.element.currentTime = 40;
  await audio.trigger("timeupdate");
  expect(button("Seek episode").element.value).toBe("40");
});

it("supports previous/next, pauses old media, autoplays next and stops at the queue end", async () => {
  await start();
  expect(button("Previous episode").element.disabled).toBe(true);
  const firstAudio = wrapper.find("audio").element;
  await button("Next episode").trigger("click");
  await flushPromises();
  expect(firstAudio.paused).toBe(true);
  expect(wrapper.find(".player__title").text()).toBe("Episode 1");
  expect(play).toHaveBeenCalledTimes(2);
  await button("Previous episode").trigger("click");
  await flushPromises();
  expect(wrapper.find(".player__title").text()).toBe("Episode 0");
  await wrapper.find("audio").trigger("ended");
  await flushPromises();
  expect(wrapper.find(".player__title").text()).toBe("Episode 1");
  await wrapper.find("audio").trigger("ended");
  await flushPromises();
  expect(wrapper.find(".player__title").text()).toBe("Episode 2");
  expect(button("Next episode").element.disabled).toBe(true);
  const calls = play.mock.calls.length;
  await wrapper.find("audio").trigger("ended");
  await flushPromises();
  expect(play).toHaveBeenCalledTimes(calls);
  expect(button("Play").exists()).toBe(true);
});

it("resumes a selected episode without resetting its playback position", async () => {
  await start();
  wrapper.find("audio").element.currentTime = 90;
  await button("Pause").trigger("click");
  await wrapper.setProps({ request: { queue: [...queue], episodeId: "0" } });
  await flushPromises();
  expect(wrapper.find("audio").element.currentTime).toBe(90);
  expect(button("Pause").exists()).toBe(true);
});

it("toggles playback from repeated row requests and reports the active episode", async () => {
  await start();
  expect(wrapper.emitted("playback-change").at(-1)[0]).toEqual({
    episodeId: "0", playing: true,
  });
  wrapper.find("audio").element.currentTime = 90;
  await wrapper.setProps({ request: { queue, episodeId: "0" } });
  expect(button("Play").exists()).toBe(true);
  expect(wrapper.emitted("playback-change").at(-1)[0]).toEqual({
    episodeId: "0", playing: false,
  });
  await wrapper.setProps({ request: { queue, episodeId: "0" } });
  await flushPromises();
  expect(button("Pause").exists()).toBe(true);
  expect(wrapper.find("audio").element.currentTime).toBe(90);
  await button("Next episode").trigger("click");
  await flushPromises();
  expect(wrapper.emitted("playback-change").at(-1)[0]).toEqual({
    episodeId: "1", playing: true,
  });
});

it("handles blocked playback and load errors without claiming media is playing", async () => {
  play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
  await start();
  expect(wrapper.find('[role="status"]').text()).toBe(
    "Press play to start this episode.",
  );
  expect(button("Play").exists()).toBe(true);
  await button("Play").trigger("click");
  await flushPromises();
  expect(wrapper.find('[role="status"]').exists()).toBe(false);
  await wrapper.find("audio").trigger("error");
  expect(wrapper.find('[role="status"]').text()).toContain(
    "could not be loaded",
  );
});

it("uses a video element for video enclosures and pauses it on unmount", async () => {
  const video = {
    ...queue[0],
    mediaKind: "video",
    mediaUrl: "https://example.com/video.mp4",
  };
  wrapper = mount(EpisodePlayer, {
    props: { request: { queue: [video], episodeId: video.id } },
  });
  await flushPromises();
  expect(wrapper.find("video").attributes("src")).toBe(video.mediaUrl);
  const element = wrapper.find("video").element;
  wrapper.unmount();
  wrapper = null;
  expect(element.paused).toBe(true);
});
