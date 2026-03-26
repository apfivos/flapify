import { DEFAULT_SETTINGS } from "../../constants";
import { coinGeckoAdapter } from "./coinGecko";

describe("coinGeckoAdapter", () => {
  it("uses provider symbols and marks missing ids unavailable", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      cryptoWatchlist: ["bitcoin", "ethereum"],
    };

    const quotes = coinGeckoAdapter.normalize(
      [
        {
          id: "bitcoin",
          symbol: "btc",
          current_price: 68250,
          price_change_percentage_24h: 1.8,
          last_updated: "2026-03-26T18:00:00Z",
        },
      ],
      settings,
    );

    expect(quotes).toEqual([
      {
        id: "bitcoin",
        symbol: "BTC",
        priceUsd: 68250,
        change24h: 1.8,
        status: "ready",
        updatedAt: "2026-03-26T18:00:00Z",
      },
      {
        id: "ethereum",
        symbol: "ETHEREUM",
        status: "unavailable",
      },
    ]);
  });
});
