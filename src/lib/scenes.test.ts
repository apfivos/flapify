import { BOARD_SIZE_PRESETS, DEFAULT_SETTINGS } from "../constants";
import type { AppFeeds, SceneContext } from "../types";
import { getActiveCountdowns, marketTickerSummary, renderScene } from "./scenes";

function buildContext(overrides: Partial<SceneContext> = {}): SceneContext {
  const feeds: AppFeeds = {
    weather: {
      status: "ready",
      stale: false,
      data: {
        locationLabel: "LONDON, UK",
        summary: "PARTLY CLOUDY",
        temperatureC: 18,
        apparentTemperatureC: 16,
        highC: 21,
        lowC: 10,
        windKph: 14,
        updatedAt: new Date().toISOString(),
      },
    },
    crypto: {
      status: "ready",
      stale: false,
      data: [
        { id: "bitcoin", symbol: "BTC", priceUsd: 68000, change24h: 1.4, status: "ready" },
        { id: "ethereum", symbol: "ETH", priceUsd: 3400, change24h: -0.8, status: "ready" },
        { id: "solana", symbol: "SOL", priceUsd: 144, change24h: 3.2, status: "ready" },
      ],
    },
    news: {
      status: "ready",
      stale: false,
      data: [
        {
          title: "SCIENTISTS DISCOVER NEW SPECIES IN DEEP OCEAN TRENCH",
          source: "BBC NEWS",
          publishedAt: "2026-03-26T18:00:00.000Z",
        },
      ],
    },
  };

  return {
    now: new Date("2026-03-26T18:30:00Z"),
    settings: DEFAULT_SETTINGS,
    feeds,
    board: BOARD_SIZE_PRESETS.standard,
    quoteIndex: 0,
    customIndex: 0,
    ...overrides,
  };
}

describe("scene rendering", () => {
  it("renders a full weather board", () => {
    const grid = renderScene("weather", buildContext());
    expect(grid).toHaveLength(6);
    expect(grid[2].join("")).toContain("18C");
  });

  it("renders weather fallback when unconfigured", () => {
    const grid = renderScene(
      "weather",
      buildContext({
        feeds: {
          ...buildContext().feeds,
          weather: {
            status: "unconfigured",
            stale: false,
            data: null,
          },
        },
      }),
    );
    expect(grid.map((row) => row.join("")).join("\n")).toContain("SET A LOCATION");
  });

  it("renders a crypto dashboard inside board bounds", () => {
    const grid = renderScene("marketsDashboard", buildContext());
    expect(grid.every((row) => row.length === 22)).toBe(true);
    expect(grid.map((row) => row.join("")).join("\n")).toContain("CRYPTO");
  });

  it("renders the crypto dashboard on large and dense boards", () => {
    const largeGrid = renderScene("marketsDashboard", buildContext({ board: BOARD_SIZE_PRESETS.large }));
    const denseGrid = renderScene("marketsDashboard", buildContext({ board: BOARD_SIZE_PRESETS.dense }));

    expect(largeGrid).toHaveLength(4);
    expect(largeGrid.every((row) => row.length === 16)).toBe(true);
    expect(denseGrid).toHaveLength(8);
    expect(denseGrid.every((row) => row.length === 28)).toBe(true);
  });

  it("shows LOAD on the crypto dashboard header while feed is loading", () => {
    const grid = renderScene(
      "marketsDashboard",
      buildContext({
        feeds: {
          ...buildContext().feeds,
          crypto: {
            status: "loading",
            stale: false,
            data: [],
          },
        },
      }),
    );

    expect(grid.map((row) => row.join("")).join("\n")).toContain("LOAD");
    expect(grid.map((row) => row.join("")).join("\n")).not.toContain("LIVE");
  });

  it("renders unavailable crypto explicitly instead of fake prices", () => {
    const grid = renderScene(
      "marketsDashboard",
      buildContext({
        now: new Date("1970-01-01T00:00:00Z"),
        feeds: {
          ...buildContext().feeds,
          crypto: {
            status: "ready",
            stale: false,
            data: [{ id: "bitcoin", symbol: "BTC", status: "unavailable" }],
          },
        },
      }),
    );

    expect(grid.map((row) => row.join("")).join("\n")).toContain("BTC");
    expect(grid.map((row) => row.join("")).join("\n")).toContain("UNAVAIL");
  });

  it("pages crypto every eight seconds through the watchlist", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      cryptoWatchlist: ["bitcoin", "ethereum", "solana", "dogecoin"],
    };
    const feeds: AppFeeds = {
      ...buildContext().feeds,
      crypto: {
        status: "ready",
        stale: false,
        data: [
          { id: "bitcoin", symbol: "BTC", priceUsd: 68000, change24h: 1.4, status: "ready" },
          { id: "ethereum", symbol: "ETH", priceUsd: 3400, change24h: -0.8, status: "ready" },
          { id: "solana", symbol: "SOL", priceUsd: 144, change24h: 3.2, status: "ready" },
          { id: "dogecoin", symbol: "DOGE", priceUsd: 0.18, change24h: -1.3, status: "ready" },
        ],
      },
    };

    const firstPage = renderScene(
      "marketsDashboard",
      buildContext({
        now: new Date("1970-01-01T00:00:00Z"),
        settings,
        feeds,
      }),
    );
    const secondPage = renderScene(
      "marketsDashboard",
      buildContext({
        now: new Date("1970-01-01T00:00:08Z"),
        settings,
        feeds,
      }),
    );

    expect(firstPage.map((row) => row.join("")).join("\n")).toContain("BTC");
    expect(firstPage.map((row) => row.join("")).join("\n")).toContain("ETH");
    expect(firstPage.map((row) => row.join("")).join("\n")).toContain("SOL");
    expect(secondPage.map((row) => row.join("")).join("\n")).toContain("DOGE");
  });

  it("renders the full year on the clock scene", () => {
    const grid = renderScene("clockDate", buildContext());
    expect(grid.map((row) => row.join("")).join("\n")).toContain("2026");
  });

  it("renders countdown scenes for upcoming items", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      countdowns: [{ id: "vacation", label: "VACATION", targetDate: "2026-05-07" }],
    };
    const grid = renderScene("countdown", buildContext({ settings }));
    expect(grid.map((row) => row.join("")).join("\n")).toContain("VACATION");
    expect(grid.map((row) => row.join("")).join("\n")).toContain("DAYS");
  });

  it("hides expired countdowns from the active rotation pool", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      countdowns: [
        { id: "old", label: "OLD", targetDate: "2026-03-20" },
        { id: "new", label: "NEW", targetDate: "2026-04-10" },
      ],
    };

    expect(getActiveCountdowns(settings, new Date("2026-03-26T18:30:00Z"))).toEqual([
      { id: "new", label: "NEW", targetDate: "2026-04-10" },
    ]);
  });

  it("renders a news headline with a source footer", () => {
    const grid = renderScene("news", buildContext());
    const boardText = grid.map((row) => row.join("")).join("\n");
    expect(boardText).toContain("SCIENTISTS");
    expect(boardText).toContain("BBC NEWS");
  });

  it("renders a news fallback when feeds are unavailable", () => {
    const grid = renderScene(
      "news",
      buildContext({
        feeds: {
          ...buildContext().feeds,
          news: {
            status: "error",
            stale: true,
            data: [],
            error: "boom",
          },
        },
      }),
    );

    expect(grid.map((row) => row.join("")).join("\n")).toContain("NEWS UNAVAILABLE");
  });

  it("formats unavailable ticker summaries safely", () => {
    expect(marketTickerSummary({ id: "bitcoin", symbol: "BTC", status: "unavailable" })).toBe(
      "BTC UNAVAIL",
    );
  });
});
