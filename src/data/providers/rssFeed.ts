import type { FeedAdapter, NewsHeadline } from "../../types";

interface RssFeedMeta {
  title?: string;
  url?: string;
}

interface RssFeedItem {
  title?: string;
  pubDate?: string;
}

interface RssProxyResponse {
  status?: string;
  feed?: RssFeedMeta;
  items?: RssFeedItem[];
}

interface LoadedFeed {
  sourceUrl: string;
  payload: RssProxyResponse;
}

function sourceLabel(feed: RssFeedMeta | undefined, sourceUrl: string): string {
  const explicit = `${feed?.title ?? ""}`.trim();
  if (explicit) {
    return explicit.toUpperCase().replace(/\s+/g, " ").slice(0, 22);
  }

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, "").toUpperCase();
  } catch {
    return "NEWS";
  }
}

function parsePublishedAt(value?: string): string {
  if (!value) {
    return new Date(0).toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

export const rssFeedAdapter: FeedAdapter<NewsHeadline[], LoadedFeed[]> = {
  id: "news",
  pollIntervalMs: 10 * 60 * 1000,
  staleAfterMs: 30 * 60 * 1000,
  isConfigured: (settings) => settings.newsFeeds.length > 0,
  getCacheKey: (settings) => settings.newsFeeds.join("|"),
  empty: () => [],
  async load(settings, signal) {
    const feeds = settings.newsFeeds.slice(0, 6);
    if (feeds.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      feeds.map(async (feedUrl) => {
        const proxyUrl = new URL("https://api.rss2json.com/v1/api.json");
        proxyUrl.searchParams.set("rss_url", feedUrl);
        const response = await fetch(proxyUrl, { signal });
        if (!response.ok) {
          throw new Error(`News request failed for ${feedUrl}`);
        }

        return {
          sourceUrl: feedUrl,
          payload: (await response.json()) as RssProxyResponse,
        };
      }),
    );

    const successes = results
      .filter((result): result is PromiseFulfilledResult<LoadedFeed> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((result) => result.payload.status === "ok" && Array.isArray(result.payload.items));

    if (successes.length === 0) {
      throw new Error("News feeds are unavailable");
    }

    return successes;
  },
  normalize(raw) {
    const seen = new Set<string>();
    const headlines = raw.flatMap(({ sourceUrl, payload }) =>
      (payload.items ?? []).map((item) => ({
        title: `${item.title ?? ""}`.trim().replace(/\s+/g, " "),
        source: sourceLabel(payload.feed, sourceUrl),
        publishedAt: parsePublishedAt(item.pubDate),
      })),
    );

    return headlines
      .filter((headline) => {
        if (!headline.title) {
          return false;
        }

        const key = headline.title.toUpperCase();
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
      .slice(0, 40);
  },
};
