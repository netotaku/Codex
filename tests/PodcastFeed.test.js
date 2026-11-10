import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { flushPromises, mount } from "@vue/test-utils";
import PodcastFeed from "../src/components/PodcastFeed.vue";

const fixtures = vi.hoisted(() => {
  const feeds = Array.from({ length: 8 }, (_, i) => ({
    name: `Show ${i}`,
    url: `https://example.com/${i}.rss`,
    category: i < 4 ? "Music" : "News",
  }));
  return {
    feeds,
    readFeed: vi.fn(),
    categories: [
      { name: "All", feeds },
      { name: "Music", feeds: feeds.slice(0, 4) },
      { name: "News", feeds: feeds.slice(4) },
    ],
  };
});
vi.mock("../src/data/catalogue.js", () => ({
  categories: fixtures.categories,
}));
vi.mock("../src/lib/rss.js", () => ({ readFeed: fixtures.readFeed }));

function episode(feed, index) {
  return {
    id: `${feed.url}|${index}`,
    title: `Episode ${index}`,
    source: feed.name,
    stamp: index + 1,
    url: `https://example.com/episode/${index}`,
    description: index === 0 ? "<b>Untrusted description</b>" : "",
  };
}
const select = (wrapper, name) =>
  wrapper
    .findAll(".feed__tab")
    .find((button) => button.text().startsWith(name))
    .trigger("click");
let wrapper;
beforeEach(() => {
  wrapper = null;
  fixtures.readFeed.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
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
  vi.unstubAllGlobals();
});

describe("reactive podcast island", () => {
  it("groups episodes by local calendar day and shows only times in rows", async () => {
    const stamps = [
      new Date(2026, 10, 10, 15, 0).getTime(),
      new Date(2026, 10, 10, 9, 5).getTime(),
      new Date(2026, 10, 9, 23, 30).getTime(),
    ];
    fixtures.readFeed.mockImplementation((feed) => Promise.resolve(
      feed === fixtures.feeds[0]
        ? stamps.map((stamp, i) => ({ ...episode(feed, i), stamp }))
        : [],
    ));
    wrapper = mount(PodcastFeed);
    await flushPromises();
    expect(wrapper.findAll(".feed__day-heading").map((item) => item.text()))
      .toEqual(["10 Nov", "09 Nov"]);
    expect(wrapper.findAll(".feed__day").map((group) => group.findAll(".episode").length))
      .toEqual([2, 1]);
    expect(wrapper.findAll(".episode__date").map((item) => item.text()))
      .toEqual(["15:00", "09:05", "23:30"]);
    expect(wrapper.find(".feed__day-heading time").attributes("datetime"))
      .toBe("2026-11-10");
  });

  it("shows arriving episodes, shares requests across tabs, and remembers pagination", async () => {
    let resolveMusic;
    fixtures.readFeed.mockImplementation((feed) => {
      if (feed === fixtures.feeds[0])
        return new Promise((resolve) => {
          resolveMusic = resolve;
        });
      return Promise.resolve(
        feed === fixtures.feeds[4] ? [episode(feed, 100)] : [],
      );
    });
    wrapper = mount(PodcastFeed);
    await flushPromises();
    expect(wrapper.find(".episode__title").text()).toBe("Episode 100");
    expect(wrapper.find('[role="status"]').text()).toContain("Loading");
    await select(wrapper, "Music");
    expect(wrapper.findAll(".episode")).toHaveLength(0);
    const music = Array.from({ length: 31 }, (_, i) =>
      episode(fixtures.feeds[0], i),
    );
    resolveMusic([...music, music[0]]);
    await flushPromises();
    expect(wrapper.findAll(".episode")).toHaveLength(30);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    await wrapper.find(".feed__load-more").trigger("click");
    expect(wrapper.findAll(".episode")).toHaveLength(31);
    expect(wrapper.find(".episode__description").text()).toBe(
      "<b>Untrusted description</b>",
    );
    expect(wrapper.find(".episode__description b").exists()).toBe(false);
    await select(wrapper, "News");
    expect(wrapper.findAll(".episode")).toHaveLength(1);
    await select(wrapper, "Music");
    expect(wrapper.findAll(".episode")).toHaveLength(31);
    expect(
      wrapper
        .findAll(".feed__tab")
        .find((button) => button.text().startsWith("Music"))
        .attributes("aria-pressed"),
    ).toBe("true");
    expect(fixtures.readFeed).toHaveBeenCalledTimes(8);
    expect(
      new Set(fixtures.readFeed.mock.calls.map(([feed]) => feed.url)).size,
    ).toBe(8);
    await select(wrapper, "All");
    expect(wrapper.find(".episode__title").text()).toBe("Episode 100");
  });

  it("hydrates server-rendered categories before starting browser-only feed work", async () => {
    fixtures.readFeed.mockResolvedValue([]);
    const markup = await renderToString(createSSRApp(PodcastFeed));
    expect(fixtures.readFeed).not.toHaveBeenCalled();
    const host = document.createElement("div");
    host.innerHTML = markup;
    document.body.append(host);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createSSRApp(PodcastFeed);
    try {
      app.mount(host);
      await flushPromises();
      expect(host.querySelectorAll(".feed__tab")).toHaveLength(3);
      expect(fixtures.readFeed).toHaveBeenCalledTimes(8);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      host.remove();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it("settles into an empty state even when a source rejects", async () => {
    fixtures.readFeed
      .mockResolvedValue([])
      .mockRejectedValueOnce(new Error("Offline"));
    wrapper = mount(PodcastFeed);
    await flushPromises();
    expect(wrapper.find('[role="status"]').text()).toContain(
      "No recent episodes",
    );
    expect(wrapper.find(".feed__load-more").exists()).toBe(false);
    expect(fixtures.readFeed).toHaveBeenCalledTimes(8);
  });

  it("limits concurrency and cancels loading when the island unmounts", async () => {
    const resolvePending = [];
    fixtures.readFeed.mockImplementation(
      () => new Promise((resolve) => resolvePending.push(resolve)),
    );
    wrapper = mount(PodcastFeed);
    expect(fixtures.readFeed).toHaveBeenCalledTimes(6);
    const signals = fixtures.readFeed.mock.calls.map(([, signal]) => signal);
    wrapper.unmount();
    wrapper = null;
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    resolvePending.forEach((resolve) => resolve([]));
    await flushPromises();
    expect(fixtures.readFeed).toHaveBeenCalledTimes(6);
  });
});
