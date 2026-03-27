import type {
  AppFeeds,
  BoardDimensions,
  BoardGrid,
  CountdownItem,
  CryptoQuote,
  NewsHeadline,
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
  sanitizeText,
  wrapText,
} from "./board";
import { formatCompactCurrency, formatSignedPercent } from "./format";
import { createUnavailableCryptoQuote, fallbackCryptoSymbol } from "./markets";

const MARKET_PAGE_MS = 8000;
const COUNTDOWN_PAGE_MS = 10000;
const NEWS_PAGE_MS = 12000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface CountdownState {
  item: CountdownItem;
  kind: "future" | "hours" | "today";
  daysRemaining: number;
  hoursRemaining: number;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function timeZoneFor(settings: PersistedSettings): string | undefined {
  return settings.timezoneMode === "location" ? settings.location?.timezone : undefined;
}

function zonedParts(date: Date, timeZone?: string): ZonedParts {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function dateStamp(parts: Pick<ZonedParts, "year" | "month" | "day">): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function parseTargetDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatTargetDate(targetDate: string): string {
  const parsed = parseTargetDate(targetDate);
  if (!parsed) {
    return targetDate;
  }

  const month = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][
    parsed.month - 1
  ] ?? "JAN";
  return `${String(parsed.day).padStart(2, "0")} ${month} ${parsed.year}`;
}

function classifyCountdown(item: CountdownItem, now: Date, settings: PersistedSettings): CountdownState | null {
  const target = parseTargetDate(item.targetDate);
  if (!target) {
    return null;
  }

  const parts = zonedParts(now, timeZoneFor(settings));
  const daysRemaining = Math.round((dateStamp(target) - dateStamp(parts)) / DAY_MS);

  if (daysRemaining < 0) {
    return null;
  }

  if (daysRemaining === 0) {
    const minutesLeft = Math.max(0, (24 * 60) - (parts.hour * 60 + parts.minute));
    const hoursRemaining = Math.max(1, Math.ceil(minutesLeft / 60));

    if (hoursRemaining <= 12) {
      return {
        item,
        kind: "hours",
        daysRemaining: 0,
        hoursRemaining,
      };
    }

    return {
      item,
      kind: "today",
      daysRemaining: 0,
      hoursRemaining,
    };
  }

  return {
    item,
    kind: "future",
    daysRemaining,
    hoursRemaining: 0,
  };
}

export function getActiveCountdowns(settings: PersistedSettings, now: Date): CountdownItem[] {
  return settings.countdowns.filter((item) => classifyCountdown(item, now, settings) !== null);
}

function footerLine(now: Date, settings: PersistedSettings, board: BoardDimensions): string {
  const timeZone = timeZoneFor(settings);
  return padCenter(
    `${compactTime(now, "en-GB", timeZone)} ${compactDate(now, "en-GB", timeZone)}`,
    board.cols,
  );
}

function renderFeedFallback(title: string, message: string, board: BoardDimensions): BoardGrid {
  return centerLines([title, message], board);
}

function centerRegionWithFooter(
  lines: string[],
  footer: string,
  board: BoardDimensions,
): BoardGrid {
  let grid = createEmptyGrid(board);
  const contentRows = Math.max(1, board.rows - 1);
  const visibleLines = lines.slice(0, contentRows);
  const topPadding = Math.max(0, Math.floor((contentRows - visibleLines.length) / 2));

  grid = renderRegion(grid, topPadding, 0, board.cols, visibleLines, "center");
  grid = renderRegion(grid, board.rows - 1, 0, board.cols, [footer], "center");
  return grid;
}

function marketPanelLabel(value: string, max = 6): string {
  return sanitizeText(value).replace(/[^A-Z0-9]/g, "").slice(0, max).padEnd(Math.min(max, 6), " ");
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
  pageMs: number,
): Array<{ key?: string; entry?: T }> {
  if (keys.length === 0) {
    return Array.from({ length: perPage }, () => ({}));
  }

  const entryMap = new Map(entries.map((entry) => [resolveKey(entry), entry]));
  const pageCount = Math.max(1, Math.ceil(keys.length / perPage));
  const pageIndex = Math.floor(now.getTime() / pageMs) % pageCount;
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

function selectPagedEntry<T>(entries: T[], now: Date, pageMs: number): T | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  const index = Math.floor(now.getTime() / pageMs) % entries.length;
  return entries[index];
}

function weatherSummaryLine(weather: WeatherData | null, feed: AppFeeds["weather"]): string {
  if (!weather) {
    return feed.status === "unconfigured" ? "SET WEATHER LOCATION" : "WEATHER UNAVAILABLE";
  }
  return `${weather.summary} ${Math.round(weather.temperatureC)}C${feed.stale ? " STALE" : ""}`.trim();
}

function compactCryptoLine(entry: CryptoQuote | undefined, fallbackId: string | undefined, width: number): string {
  const quote = entry ?? (fallbackId ? createUnavailableCryptoQuote(fallbackId) : undefined);
  if (!quote) {
    return "";
  }

  const symbol = marketPanelLabel(quote.symbol || fallbackCryptoSymbol(quote.id), width <= 16 ? 4 : 6);

  if (quote.status === "unavailable" || quote.priceUsd === undefined) {
    return padCenter(`${symbol} UNAVAIL`, width);
  }

  const baseLine = width <= 16
    ? `${symbol} ${formatCompactCurrency(quote.priceUsd)}`
    : `${symbol} ${formatCompactCurrency(quote.priceUsd)} ${formatSignedPercent(quote.change24h ?? null, 1)}`;

  return padCenter(baseLine, width);
}

function zoneLabel(settings: PersistedSettings, width: number): string {
  if (settings.timezoneMode === "device") {
    return width <= 16 ? "DEVICE TIME" : "DEVICE CLOCK";
  }

  const locationName = settings.location?.label.split(",")[0] ?? "LOCAL";
  return width <= 16 ? `${locationName}` : `${locationName} TIME`;
}

function fullDateLine(now: Date, timeZone?: string): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  })
    .format(now)
    .toUpperCase()
    .replace(",", "");

  return formatted;
}

function renderQuoteScene(context: SceneContext): BoardGrid {
  const quotes = context.settings.quoteRotation.length > 0 ? context.settings.quoteRotation : ["FLAPIFY"];
  return centerText(quotes[context.quoteIndex % quotes.length], context.board);
}

function renderCustomScene(context: SceneContext): BoardGrid {
  if (context.settings.customMessages.length === 0) {
    return renderFeedFallback("CUSTOM MESSAGE", "SEND ONE BELOW", context.board);
  }

  return centerText(
    context.settings.customMessages[context.customIndex % context.settings.customMessages.length],
    context.board,
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
  const date = fullDateLine(context.now, timeZone);
  const zone = zoneLabel(context.settings, context.board.cols);

  const lines = context.board.rows >= 8
    ? [time, weekday, date, zone, context.settings.location?.label ?? ""]
    : context.board.rows <= 4
      ? [time, weekday, date, zone]
      : [time, weekday, date, zone];

  return centerLines(lines, context.board);
}

function renderWeatherScene(context: SceneContext): BoardGrid {
  const feed = context.feeds.weather;
  if (feed.status === "unconfigured") {
    return renderFeedFallback("WEATHER", "SET A LOCATION", context.board);
  }
  if (!feed.data) {
    return renderFeedFallback("WEATHER", feed.error ?? "UNAVAILABLE", context.board);
  }

  const weather = feed.data;
  const lines = [
    weather.locationLabel,
    weather.summary,
    `${Math.round(weather.temperatureC)}C FEELS ${Math.round(weather.apparentTemperatureC)}C`,
    `HI ${Math.round(weather.highC)}C  LO ${Math.round(weather.lowC)}C`,
  ];

  if (context.board.rows >= 6) {
    lines.push(`WIND ${Math.round(weather.windKph)} KPH`);
  }
  if (context.board.rows >= 8) {
    lines.push(feed.stale ? "LAST KNOWN DATA" : `UPDATED ${compactTime(context.now, "en-GB", timeZoneFor(context.settings))}`);
  } else if (feed.stale) {
    lines.push("LAST KNOWN DATA");
  }

  return centerLines(lines, context.board);
}

function renderMarketsScene(context: SceneContext): BoardGrid {
  let grid = createEmptyGrid(context.board);
  const cryptoPerPage = context.board.rows <= 4 ? 2 : context.board.rows >= 8 ? 4 : 3;
  const cryptoSlots = selectPagedSlots(
    context.settings.cryptoWatchlist.slice(0, 10),
    context.feeds.crypto.data,
    (entry) => entry.id,
    cryptoPerPage,
    context.now,
    MARKET_PAGE_MS,
  );
  const location = context.settings.location?.label.split(",")[0] ?? "GLOBAL";
  const weatherSummary = weatherSummaryLine(context.feeds.weather.data, context.feeds.weather);
  const header = `CRYPTO ${location} ${feedStatusLabel(context.feeds.crypto.status, context.feeds.crypto.stale)}`;
  const hasWeatherRow = context.board.rows > 4;
  const contentStartRow = hasWeatherRow ? 2 : 1;

  if (hasWeatherRow) {
    grid = renderRegion(
      grid,
      0,
      0,
      context.board.cols,
      [weatherSummary.length <= context.board.cols ? weatherSummary : header],
      "center",
    );
  }

  grid = renderRegion(
    grid,
    hasWeatherRow ? 1 : 0,
    0,
    context.board.cols,
    [
      context.settings.cryptoWatchlist.length > 0
        ? padCenter(header, context.board.cols)
        : padCenter("SET CRYPTO WATCHLIST", context.board.cols),
    ],
  );

  const slotLines = context.settings.cryptoWatchlist.length > 0
    ? cryptoSlots.map((slot) => compactCryptoLine(slot.entry, slot.key, context.board.cols))
    : ["BITCOIN", "ETHEREUM", "SOLANA", "CARDANO"]
        .slice(0, cryptoPerPage)
        .map((value) => padCenter(value, context.board.cols));

  grid = renderRegion(
    grid,
    contentStartRow,
    0,
    context.board.cols,
    slotLines,
  );

  grid = renderRegion(
    grid,
    context.board.rows - 1,
    0,
    context.board.cols,
    [footerLine(context.now, context.settings, context.board)],
  );
  return grid;
}

function renderCountdownScene(context: SceneContext): BoardGrid {
  const activeCountdowns = context.settings.countdowns
    .map((item) => classifyCountdown(item, context.now, context.settings))
    .filter((entry): entry is CountdownState => entry !== null);

  const countdown = selectPagedEntry(activeCountdowns, context.now, COUNTDOWN_PAGE_MS);
  if (!countdown) {
    return renderFeedFallback("COUNTDOWN", "ADD A DATE IN ADVANCED", context.board);
  }

  switch (countdown.kind) {
    case "today":
      return centerLines(["TODAY IS THE DAY", countdown.item.label], context.board);
    case "hours":
      return centerLines(
        [
          countdown.item.label,
          `${countdown.hoursRemaining} ${countdown.hoursRemaining === 1 ? "HOUR" : "HOURS"} LEFT`,
          "TODAY",
        ],
        context.board,
      );
    case "future":
    default:
      return centerLines(
        [
          countdown.item.label,
          `${countdown.daysRemaining} ${countdown.daysRemaining === 1 ? "DAY" : "DAYS"}`,
          formatTargetDate(countdown.item.targetDate),
        ],
        context.board,
      );
  }
}

function renderNewsScene(context: SceneContext): BoardGrid {
  const feed = context.feeds.news;
  if (feed.status === "unconfigured") {
    return renderFeedFallback("NEWS", "ADD NEWS FEEDS", context.board);
  }

  const headline = selectPagedEntry(feed.data, context.now, NEWS_PAGE_MS);
  if (!headline) {
    return renderFeedFallback("NEWS", "NEWS UNAVAILABLE", context.board);
  }

  const wrapped = wrapText(headline.title, context.board.cols)
    .slice(0, Math.max(1, context.board.rows - 1));
  const source = feed.stale ? `${headline.source} STALE` : headline.source;

  return centerRegionWithFooter(wrapped, source, context.board);
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
    case "countdown":
      return renderCountdownScene(context);
    case "news":
      return renderNewsScene(context);
    default:
      return centerText("FLAPIFY", context.board);
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
    { id: "news", label: labelFor("News", feeds.news) },
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

export function newsTickerSummary(entry: NewsHeadline | undefined): string {
  if (!entry) {
    return "NEWS OFF";
  }
  return `${entry.source} ${entry.title}`;
}
