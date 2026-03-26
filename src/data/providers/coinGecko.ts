import type { CryptoQuote, FeedAdapter, PersistedSettings } from "../../types";
import { createUnavailableCryptoQuote, fallbackCryptoSymbol } from "../../lib/markets";

interface CoinGeckoMarket {
  id: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
  last_updated?: string;
}

type CoinGeckoResponse = CoinGeckoMarket[];

export const coinGeckoAdapter: FeedAdapter<CryptoQuote[], CoinGeckoResponse> = {
  id: "crypto",
  pollIntervalMs: 5 * 60 * 1000,
  staleAfterMs: 5 * 60 * 1000,
  isConfigured: (settings) => settings.cryptoWatchlist.length > 0,
  getCacheKey: (settings) => `crypto:${settings.cryptoWatchlist.join(",")}`,
  empty: () => [],
  async load(settings, signal) {
    const ids = settings.cryptoWatchlist.slice(0, 10);
    if (ids.length === 0) {
      return [];
    }

    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", ids.join(","));
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error("Crypto request failed");
    }

    return (await response.json()) as CoinGeckoResponse;
  },
  normalize(raw, settings) {
    const marketsById = new Map(raw.map((entry) => [entry.id, entry]));

    return settings.cryptoWatchlist.slice(0, 10).map((id) => {
      const market = marketsById.get(id);
      if (!market || typeof market.current_price !== "number" || Number.isNaN(market.current_price)) {
        return createUnavailableCryptoQuote(id);
      }

      return {
        id,
        symbol: fallbackCryptoSymbol(market.symbol ?? market.id),
        priceUsd: market.current_price,
        change24h:
          typeof market.price_change_percentage_24h === "number"
            ? market.price_change_percentage_24h
            : null,
        status: "ready" as const,
        updatedAt: market.last_updated,
      };
    });
  },
};
