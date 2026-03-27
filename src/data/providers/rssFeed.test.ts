import { DEFAULT_SETTINGS } from "../../constants";
import { rssFeedAdapter } from "./rssFeed";

describe("rssFeedAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merges and deduplicates headlines from multiple feeds", () => {
    const headlines = rssFeedAdapter.normalize(
      [
        {
          sourceUrl: "https://example.com/a.xml",
          payload: {
            status: "ok",
            feed: { title: "BBC News" },
            items: [
              { title: "Scientists discover new species", pubDate: "2026-03-27T10:00:00Z" },
              { title: "Markets rebound sharply", pubDate: "2026-03-27T08:00:00Z" },
            ],
          },
        },
        {
          sourceUrl: "https://example.com/b.xml",
          payload: {
            status: "ok",
            feed: { title: "Reuters" },
            items: [
              { title: "Scientists discover new species", pubDate: "2026-03-27T09:00:00Z" },
              { title: "Rocket launch moved to Friday", pubDate: "2026-03-27T11:00:00Z" },
            ],
          },
        },
      ],
      DEFAULT_SETTINGS,
    );

    expect(headlines).toEqual([
      {
        title: "Rocket launch moved to Friday",
        source: "REUTERS",
        publishedAt: "2026-03-27T11:00:00.000Z",
      },
      {
        title: "Scientists discover new species",
        source: "BBC NEWS",
        publishedAt: "2026-03-27T10:00:00.000Z",
      },
      {
        title: "Markets rebound sharply",
        source: "BBC NEWS",
        publishedAt: "2026-03-27T08:00:00.000Z",
      },
    ]);
  });

  it("loads all configured feeds through the proxy and throws when none succeed", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          feed: { title: "BBC News" },
          items: [{ title: "Headline one", pubDate: "2026-03-27T10:00:00Z" }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
      } as Response);

    const loaded = await rssFeedAdapter.load(
      {
        ...DEFAULT_SETTINGS,
        newsFeeds: ["https://example.com/a.xml", "https://example.com/b.xml"],
      },
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(loaded).toHaveLength(1);

    fetchMock.mockReset().mockResolvedValue({
      ok: false,
    } as Response);

    await expect(
      rssFeedAdapter.load(
        {
          ...DEFAULT_SETTINGS,
          newsFeeds: ["https://example.com/c.xml"],
        },
        new AbortController().signal,
      ),
    ).rejects.toThrow("News feeds are unavailable");
  });
});
