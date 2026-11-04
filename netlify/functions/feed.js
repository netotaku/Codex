// Public YouTube RSS aggregation. No Google login or API key.
// Channel handles resolve to channel IDs by reading public YouTube channel pages.
// This is a prototype: YouTube can change its page markup or block server-side requests.
const subscriptions = [
  { name: 'MeidasTouch', handle: '@MeidasTouch' },
  { name: 'The News Agents', handle: '@thenewsagents' },
  { name: 'Pondering Politics', handle: '@PonderingPolitics' },
  { name: 'LBC', channelId: 'UCb1Ti1WKPauPpXkYKVHNpsw' },
  { name: 'Brian Tyler Cohen', channelId: 'UCQANb2YPwAtK-IQJrLaaUFw' },
  { name: 'Premier Guitar — Rig Rundown', handle: '@premierguitar', include: ['rig rundown'] }
];
const decode = (value = '') => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const field = (xml, tag) => decode(xml.match(new RegExp('<' + tag.replace(':', '\\:') + '[^>]*>([\\s\\S]*?)<\\/' + tag.replace(':', '\\:') + '>'))?.[1] || '');
async function getText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PersonalBroadcast/0.1)' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.text();
}
async function channelId(handle) {
  const html = await getText('https://www.youtube.com/' + encodeURI(handle));
  const id = html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/)?.[1]
    || html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/)?.[1]
    || html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/)?.[1];
  if (!id) throw new Error('Could not resolve channel ID for ' + handle);
  return id;
}
async function fetchSource(source) {
  try {
    let id;
    try { id = source.channelId || await channelId(source.handle); }
    catch (error) { throw new Error('Channel lookup: ' + error.message); }
    let xml;
    try { xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(id)); }
    catch (error) { throw new Error('YouTube RSS: ' + error.message + ' (' + id + ')'); }
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => {
      const entry = match[1];
      return {
        videoId: field(entry, 'yt:videoId'),
        title: field(entry, 'title'),
        published: field(entry, 'published'),
        source: source.name,
        channelId: id
      };
    }).filter(item => item.videoId && item.published && (!source.include || source.include.some(word => item.title.toLowerCase().includes(word))));
    return { source: { name: source.name, count: entries.length }, items: entries };
  } catch (error) {
    return { source: { name: source.name, count: 0, error: String(error.message || error) }, items: [] };
  }
}
export async function handler() {
  const results = await Promise.all(subscriptions.map(fetchSource));
  const unique = new Map();
  for (const result of results) for (const item of result.items) if (!unique.has(item.videoId)) unique.set(item.videoId, item);
  const items = [...unique.values()].sort((a, b) => new Date(b.published) - new Date(a.published));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=180, s-maxage=300' },
    body: JSON.stringify({ items, sources: results.map(result => result.source), generatedAt: new Date().toISOString() })
  };
}
