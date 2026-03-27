export type BoardGrid = string[][];
export type SceneId =
  | "quote"
  | "custom"
  | "clockDate"
  | "weather"
  | "marketsDashboard"
  | "countdown"
  | "news";
export type SceneKind = "full" | "dashboard";
export type TimezoneMode = "device" | "location";
export type ThemeId = "classic" | "amber" | "terminal" | "warmWhite";
export type BoardSizeId = "standard" | "large" | "dense";

export interface ScenePlaylistItem {
  id: SceneId;
  enabled: boolean;
  durationSec: number;
}

export interface LocationSelection {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
}

export interface DimmingSettings {
  enabled: boolean;
  level: number;
  scheduleEnabled: boolean;
  start: string;
  end: string;
}

export interface CountdownItem {
  id: string;
  label: string;
  targetDate: string;
}

export interface BoardDimensions {
  rows: number;
  cols: number;
}

export interface PersistedSettings {
  playlist: ScenePlaylistItem[];
  locationQuery: string;
  location: LocationSelection | null;
  timezoneMode: TimezoneMode;
  theme: ThemeId;
  soundEnabled: boolean;
  soundGain: number;
  customMessages: string[];
  quoteRotation: string[];
  cryptoWatchlist: string[];
  countdowns: CountdownItem[];
  newsFeeds: string[];
  boardSize: BoardSizeId;
  kioskMode: boolean;
  restoreLastState: boolean;
  onboardingCompleted: boolean;
  dimming: DimmingSettings;
}

export interface WeatherData {
  locationLabel: string;
  summary: string;
  temperatureC: number;
  apparentTemperatureC: number;
  highC: number;
  lowC: number;
  windKph: number;
  updatedAt: string;
}

export interface CryptoQuote {
  id: string;
  symbol: string;
  priceUsd?: number;
  change24h?: number | null;
  status: "ready" | "unavailable";
  updatedAt?: string;
}

export interface NewsHeadline {
  title: string;
  source: string;
  publishedAt: string;
}

export interface QuotePack {
  id: string;
  label: string;
  description: string;
  quotes: string[];
}

export interface FeedSnapshot<T> {
  status: "idle" | "loading" | "ready" | "error" | "unconfigured";
  data: T;
  stale: boolean;
  error?: string;
  updatedAt?: number;
}

export interface FeedAdapter<TData, TRaw = unknown> {
  id: "weather" | "crypto" | "news";
  pollIntervalMs: number;
  staleAfterMs: number;
  isConfigured: (settings: PersistedSettings) => boolean;
  getCacheKey: (settings: PersistedSettings) => string;
  empty: (settings: PersistedSettings) => TData;
  load: (settings: PersistedSettings, signal: AbortSignal) => Promise<TRaw>;
  normalize: (raw: TRaw, settings: PersistedSettings) => TData;
}

export interface AppFeeds {
  weather: FeedSnapshot<WeatherData | null>;
  crypto: FeedSnapshot<CryptoQuote[]>;
  news: FeedSnapshot<NewsHeadline[]>;
}

export interface SceneContext {
  now: Date;
  settings: PersistedSettings;
  feeds: AppFeeds;
  board: BoardDimensions;
  quoteIndex: number;
  customIndex: number;
}

export interface SceneDefinition {
  id: SceneId;
  label: string;
  kind: SceneKind;
  defaultDurationSec: number;
  requiresFeeds: (keyof AppFeeds)[];
}
