import type { CryptoQuote } from "../types";

function normalizeMarketToken(value: string, fallback: string): string {
  const token = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return token || fallback;
}

export function fallbackCryptoSymbol(id: string): string {
  return normalizeMarketToken(id.replace(/-/g, " "), "CRYPTO");
}

export function createUnavailableCryptoQuote(id: string): CryptoQuote {
  return {
    id,
    symbol: fallbackCryptoSymbol(id),
    status: "unavailable",
  };
}
