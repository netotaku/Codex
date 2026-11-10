import feedData from "./feeds.json";
import categoryOrder from "./feed-categories.json";

// Keep the first catalogue name for each feed, including aliases listed later.
const seenUrls = new Set();
const feeds = feedData.filter(({ url }) => {
  if (seenUrls.has(url)) return false;
  seenUrls.add(url);
  return true;
});

// New categories in feeds.json appear automatically after the configured order.
const categoryNames = new Set([
  ...categoryOrder,
  ...feeds.map(({ category }) => category),
]);

export const categories = [
  { name: "All", feeds },
  ...Array.from(categoryNames, (name) => ({
    name,
    feeds: feeds.filter(({ category }) => category === name),
  })).filter(({ feeds }) => feeds.length > 0),
];
