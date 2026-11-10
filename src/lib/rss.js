const textOf = (node, tag) =>
  node.getElementsByTagName(tag)[0]?.textContent?.trim() || "";

function plain(value) {
  const doc = new DOMParser().parseFromString(value || "", "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim().slice(0, 280);
}

export async function readFeed(show, signal) {
  const url = show.url;
  let response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(11000)]),
  }).catch(() => null);
  if (!response?.ok && !signal.aborted)
    response = await fetch("https://proxy.cors.dev/" + url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    }).catch(() => null);
  if (!response?.ok) return [];
  const xml = new DOMParser().parseFromString(
    await response.text(),
    "application/xml",
  );
  if (xml.querySelector("parsererror")) return [];
  return [...xml.getElementsByTagName("item")]
    .slice(0, 8)
    .map((item) => {
      const title = textOf(item, "title"),
        date = textOf(item, "pubDate");
      const enclosure = [...item.getElementsByTagName("enclosure")].find(
        (node) => {
          const type = node.getAttribute("type") || "";
          return (
            /^(audio|video)\//i.test(type) ||
            !type ||
            type === "application/octet-stream"
          );
        },
      );
      const mediaUrl = enclosure?.getAttribute("url") || null;
      const mediaKind =
        /^video\//i.test(enclosure?.getAttribute("type") || "") ||
        /\.(mp4|m4v|webm)(?:[?#]|$)/i.test(mediaUrl || "")
          ? "video"
          : "audio";
      const link = textOf(item, "link") || mediaUrl || url;
      return {
        id: `${show.url}|${title}`,
        title,
        source: show.name,
        description: plain(
          textOf(item, "description") ||
            textOf(item, "content:encoded") ||
            textOf(item, "itunes:summary"),
        ),
        url: link,
        mediaUrl,
        mediaKind,
        stamp: Date.parse(date) || 0,
      };
    })
    .filter((e) => e.title && e.stamp);
}
