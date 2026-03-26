import { BOARD_COLS } from "../constants";
import type {
  AppFeeds,
  BoardGrid,
  CryptoQuote,
  PersistedSettings,
  SceneContext,
  SceneId,
  WeatherData,
} from "../types";
import {
  centerLines,
  centerText,
  compactDate,
  compactTime,
  createEmptyGrid,
  padCenter,
  renderRegion,
} from "./board";
import { formatCompactCurrency, formatSignedPercent } from "./format";
import { createUnavailableCryptoQuote, fallbackCryptoSymbol } from "./markets";

const MARKET_PAGE_MS = 8000;
const CRYPTO_ROWS_PER_PAGE = 3;

function timeZoneFor(settings: PersistedSettings): string | undefined {
  return settings.timezoneMode === "location" ? settings.location?.timezone : undefined;
}

function footerLine(now: Date, settings: PersistedSettings): string {
  const timeZone = timeZoneFor(settings);
  return padCenter(
    `${compactTime(now, "en-GB", timeZone)} ${compactDate(now, "en-GB", timeZone)}`,
    BOARD_COLS,
  );
}

function renderFeedFallback(title: string, message: string): BoardGrid {
  return centerLines(["", title, "", message, "", ""]);
}

function marketPanelLabel(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, " ");
}

function feedStatusLabel(status: AppFeeds[keyof AppFeeds]["status"], stale: boolean): string {
  if (stale) {
    return "STALE";
  }
  if (status === "error") {
    return "ERROR";
  }
  if (status === "loading") {
    return "LOAD";
  }
  if (status === "idle") {
    return "IDLE";
  }
  if (status === "unconfigured") {
    return "SETUP";
  }
  return "LIVE";
}

function selectPagedSlots<T>(
  keys: string[],
  entries: T[],
  resolveKey: (entry: T) => string,
  perPage: number,
  now: Date,
): Array<{ key?: string; entry?: T }> {
  if (keys.length === 0) {
    return Array.from({ length: perPage }, () => ({}));
  }

  const entryMap = new Map(entries.map((entry) => [resolveKey(entry), entry]));
  const pageCount = Math.max(1, Math.ceil(keys.length / perPage));
  const pageIndex = Math.floor(now.getTime() / MARKET_PAGE_MS) % pageCount;
  const pageStart = pageIndex * perPage;

  return Array.from({ length: perPage }, (_, slotIndex) => {
    const key = keys[pageStart + slotIndex];
    if (!key) {
      return {};
    }

    return {
      key,
      entry: entryMap.get(key),
    };
  });
}

function weatherSummaryLine(weather: WeatherData | null, feed: AppFeeds["weather"]): string {
  if (!weather) {
    return feed.status === "unconfigured" ? "SET WEATHER LOCATION" : "WEATHER UNAVAILABLE";
  }
  return `${weather.summary} ${Math.round(weather.temperatureC)}C${feed.stale ? " STALE" : ""}`.trim();
}

function compactCryptoLine(entry: CryptoQuote | undefined, fallbackId?: string): string {
  const quote = entry ?? (fallbackId ? createUnavailableCryptoQuote(fallbackId) : undefined);
  if (!quote) {
    return "";
  }

  if (quote.status === "unavailable" || quote.priceUsd === undefined) {
    return `${marketPanelLabel(quote.symbol || fallbackCryptoSymbol(quote.id))}  UNAVAIL`;
  }

  return padCenter(
    `${marketPanelLabel(quote.symbol)} ${formatCompactCurrency(quote.priceUsd)} ${formatSignedPercent(quote.change24h ?? null, 1)}`,
    BOARD_COLS,
  );
}

function renderQuoteScene(context: SceneContext): BoardGrid {
  const quotes = context.settings.quoteRotation.length > 0 ? context.settings.quoteRotation : ["FLAPIFY"];
  return centerText(quotes[context.quoteIndex % quotes.length]);
}

function renderCustomScene(context: SceneContext): BoardGrid {
  if (context.settings.customMessages.length === 0) {
    return renderFeedFallback("CUSTOM MESSAGE", "SEND ONE BELOW");
  }

  return centerText(
    context.settings.customMessages[context.customIndex % context.settings.customMessages.length],
  );
}

function renderClockScene(context: SceneContext): BoardGrid {
  const timeZone = timeZoneFor(context.settings);
  const time = compactTime(context.now, "en-GB", timeZone);
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone,
  })
    .format(context.now)
    .toUpperCase();
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  })
    .format(context.now)
    .toUpperCase()
    .replace(",", "");
  const zone =
    context.settings.timezoneMode === "location"
      ? context.settings.location?.timezone.replace("_", " ") ?? "LOCATION TIME"
      : "DEVICE TIME";

  return centerLines(["", time, weekday, date, zone.toUpperCase(), ""]);
}

function renderWeatherScene(context: SceneContext): BoardGrid {
  const feed = context.feeds.weather;
  if (feed.status === "unconfigured") {
    return renderFeedFallback("WEATHER", "SET A LOCATION");
  }
  if (!feed.data) {
    return renderFeedFallback("WEATHER", feed.error ?? "UNAVAILABLE");
  }

  const weather = feed.data;
  const lines = [
    weather.locationLabel,
    weather.summary,
    `${Math.round(weather.temperatureC)}C FEELS ${Math.round(weather.apparentTemperatureC)}C`,
    `HI ${Math.round(weather.highC)}C  LO ${Math.round(weather.lowC)}C`,
    `WIND ${Math.round(weather.windKph)} KPH`,
    feed.stale ? "LAST KNOWN DATA" : "",
  ];

  return centerLines(lines);
}

function renderMarketsScene(context: SceneContext): BoardGrid {
  let grid = createEmptyGrid();
  const cryptoSlots = selectPagedSlots(
    context.settings.cryptoWatchlist.slice(0, 10),
    context.feeds.crypto.data,
    (entry) => entry.id,
    CRYPTO_ROWS_PER_PAGE,
    context.now,
  );
  const location = context.settings.location?.label.split(",")[0] ?? "GLOBAL";
  const weatherSummary = weatherSummaryLine(context.feeds.weather.data, context.feeds.weather);
  const header = `CRYPTO ${location} ${feedStatusLabel(context.feeds.crypto.status, context.feeds.crypto.stale)}`;

  grid = renderRegion(
    grid,
    0,
    0,
    22,
    [weatherSummary.length <= BOARD_COLS ? weatherSummary : header],
    "center",
  );
  grid = renderRegion(
    grid,
    1,
    0,
    22,
    context.settings.cryptoWatchlist.length > 0
      ? [padCenter(header, BOARD_COLS)]
      : [padCenter("SET CRYPTO WATCHLIST", BOARD_COLS)],
  );
  grid = renderRegion(
    grid,
    2,
    0,
    22,
    context.settings.cryptoWatchlist.length > 0
      ? cryptoSlots.map((slot) => compactCryptoLine(slot.entry, slot.key))
      : [
          padCenter("BITCOIN", BOARD_COLS),
          padCenter("ETHEREUM", BOARD_COLS),
          padCenter("SOLANA", BOARD_COLS),
          "",
        ],
  );
  grid = renderRegion(grid, 5, 0, 22, [footerLine(context.now, context.settings)]);
  return grid;
}

export function renderScene(sceneId: SceneId, context: SceneContext): BoardGrid {
  switch (sceneId) {
    case "quote":
      return renderQuoteScene(context);
    case "custom":
      return renderCustomScene(context);
    case "clockDate":
      return renderClockScene(context);
    case "weather":
      return renderWeatherScene(context);
    case "marketsDashboard":
      return renderMarketsScene(context);
    default:
      return centerText("FLAPIFY");
  }
}

export function summarizeFeeds(feeds: AppFeeds): Array<{ id: keyof AppFeeds; label: string }> {
  const labelFor = (name: string, feed: AppFeeds[keyof AppFeeds]): string => {
    if (feed.stale) {
      return `${name} stale`;
    }
    if (feed.status === "ready") {
      return `${name} live`;
    }
    if (feed.status === "unconfigured") {
      return `${name} setup`;
    }
    if (feed.status === "error") {
      return `${name} error`;
    }
    if (feed.status === "loading") {
      return `${name} loading`;
    }
    return `${name} idle`;
  };

  return [
    { id: "weather", label: labelFor("Weather", feeds.weather) },
    { id: "crypto", label: labelFor("Crypto", feeds.crypto) },
  ];
}

export function marketTickerSummary(entry: CryptoQuote | undefined): string {
  if (!entry) {
    return "--";
  }

  if (entry.status === "unavailable" || entry.priceUsd === undefined) {
    return `${entry.symbol} UNAVAIL`;
  }

  return `${entry.symbol} ${formatCompactCurrency(entry.priceUsd)} ${formatSignedPercent(entry.change24h ?? null, 1)}`;
}

export function weatherTickerSummary(entry: WeatherData | null): string {
  if (!entry) {
    return "WEATHER OFF";
  }
  return `${entry.locationLabel.split(",")[0]} ${Math.round(entry.temperatureC)}C ${entry.summary}`;
}
