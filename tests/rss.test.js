import { afterEach, expect, it, vi } from "vitest";
import { readFeed } from "../src/lib/rss.js";

const show = { name: "Example", url: "https://example.com/feed" };
afterEach(() => vi.unstubAllGlobals());
it("parses RSS into dated episodes and safely extracts descriptions and episode links", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(`<rss><channel>
    <item><title>First</title><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>Hello <strong>there</strong></p>]]></description>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
    </item>
    <item><title>No date</title></item>
  </channel></rss>`),
    ),
  );
  const episodes = await readFeed(show, new AbortController().signal);
  expect(episodes).toEqual([
    expect.objectContaining({
      id: `${show.url}|First`,
      title: "First",
      source: "Example",
      description: "Hello there",
      url: "https://example.com/audio.mp3",
      mediaUrl: "https://example.com/audio.mp3",
      mediaKind: "audio",
    }),
  ]);
});
it("retries the saved RSS URL through the proxy after a direct failure", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("CORS"))
    .mockResolvedValueOnce(new Response("<rss><channel/></rss>"));
  vi.stubGlobal("fetch", fetch);
  expect(await readFeed(show, new AbortController().signal)).toEqual([]);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    show.url,
    `https://proxy.cors.dev/${show.url}`,
  ]);
});
it("does not start a fallback request after cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  const fetch = vi.fn().mockRejectedValue(new Error("Aborted"));
  vi.stubGlobal("fetch", fetch);
  expect(await readFeed(show, controller.signal)).toEqual([]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("ignores malformed XML rather than trying to render it", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("<rss><channel>")),
  );
  expect(await readFeed(show, new AbortController().signal)).toEqual([]);
});

it("keeps non-media enclosures out of the player and recognises video enclosures", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(`<rss><channel>
    <item><title>Video</title><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate>
      <enclosure url="https://example.com/cover.jpg" type="image/jpeg" />
      <enclosure url="https://example.com/watch.mp4" type="video/mp4" />
    </item>
    <item><title>Article</title><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate>
      <link>https://example.com/article</link><enclosure url="https://example.com/doc.pdf" type="application/pdf" />
    </item>
  </channel></rss>`),
    ),
  );
  const episodes = await readFeed(show, new AbortController().signal);
  expect(episodes[0]).toMatchObject({
    mediaUrl: "https://example.com/watch.mp4",
    mediaKind: "video",
  });
  expect(episodes[1]).toMatchObject({
    mediaUrl: null,
    url: "https://example.com/article",
  });
});
