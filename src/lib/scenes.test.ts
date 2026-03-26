import { DEFAULT_SETTINGS } from "../constants";
import type { AppFeeds, SceneContext } from "../types";
import { marketTickerSummary, renderScene } from "./scenes";

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
  };

  return {
    now: new Date("2026-03-26T18:30:00Z"),
    settings: DEFAULT_SETTINGS,
    feeds,
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

    expect(grid[1].join("")).toContain("LOAD");
    expect(grid[1].join("")).not.toContain("LIVE");
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

    expect(grid[2].join("")).toContain("BTC");
    expect(grid[2].join("")).toContain("UNAVAIL");
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

    expect(firstPage[2].join("")).toContain("BTC");
    expect(firstPage[3].join("")).toContain("ETH");
    expect(firstPage[4].join("")).toContain("SOL");
    expect(secondPage[2].join("")).toContain("DOGE");
  });

  it("renders the full year on the clock scene", () => {
    const grid = renderScene("clockDate", buildContext());
    expect(grid.map((row) => row.join("")).join("\n")).toContain("2026");
  });

  it("formats unavailable ticker summaries safely", () => {
    expect(marketTickerSummary({ id: "bitcoin", symbol: "BTC", status: "unavailable" })).toBe(
      "BTC UNAVAIL",
    );
  });
});
