import type { PersistedSettings, SceneDefinition, SceneId, ScenePlaylistItem, ThemeId } from "./types";

export const BOARD_ROWS = 6;
export const BOARD_COLS = 22;
export const FLAP_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?/-+@#$%&() ";
export const FLIP_DURATION_MS = 152;
export const FLIP_STAGGER_MS = 26;
export const SETTINGS_STORAGE_KEY = "flapify/v1/settings";
export const RUNTIME_STORAGE_KEY = "flapify/v1/runtime";
export const FEED_CACHE_STORAGE_KEY = "flapify/v1/feed-cache";
export const UI_IDLE_TIMEOUT_MS = 4000;
export const SPLASH_MIN_DURATION_MS = 900;
export const QUIET_HOURS_DEFAULT_START = "22:00";
export const QUIET_HOURS_DEFAULT_END = "07:00";
export const APP_VERSION = "0.1.0";

export const DEFAULT_QUOTES = [
  "THE BEST TIME TO START IS NOW",
  "LUXURY LIVES IN THE DETAILS",
  "ARRIVALS DEPARTURES POSSIBILITIES",
  "MAKE TODAY FEEL DELIBERATE",
  "CALM IS A COMPETITIVE ADVANTAGE",
  "BUILD BEAUTIFUL THINGS",
  "EVERY DAY DESERVES A STATEMENT",
  "GOOD TASTE NEVER SHOUTS",
  "MOVE WITH INTENTION",
  "FORTUNE FAVORS THE BOLD",
  "THE FUTURE BELONGS TO THE BRAVE",
  "START WHERE YOU STAND",
];

export const DEFAULT_PLAYLIST: ScenePlaylistItem[] = [
  { id: "quote", enabled: true, durationSec: 12 },
  { id: "clockDate", enabled: true, durationSec: 10 },
  { id: "weather", enabled: true, durationSec: 12 },
  { id: "marketsDashboard", enabled: true, durationSec: 15 },
  { id: "custom", enabled: false, durationSec: 12 },
];

export const THEME_LABELS: Record<ThemeId, string> = {
  classic: "Classic",
  amber: "Amber",
  terminal: "Green Terminal",
  warmWhite: "Warm White",
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  playlist: DEFAULT_PLAYLIST,
  locationQuery: "London",
  location: {
    label: "LONDON, UK",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
    country: "United Kingdom",
  },
  timezoneMode: "location",
  theme: "classic",
  soundEnabled: true,
  soundGain: 0.36,
  customMessages: [],
  quoteRotation: DEFAULT_QUOTES,
  cryptoWatchlist: ["bitcoin", "ethereum", "solana"],
  kioskMode: false,
  restoreLastState: true,
  onboardingCompleted: false,
  dimming: {
    enabled: false,
    level: 0.28,
    scheduleEnabled: false,
    start: QUIET_HOURS_DEFAULT_START,
    end: QUIET_HOURS_DEFAULT_END,
  },
};

export const SCENE_LABELS: Record<SceneId, string> = {
  quote: "Quotes",
  custom: "Custom",
  clockDate: "Clock",
  weather: "Weather",
  marketsDashboard: "Crypto",
};

export const SCENE_ORDER: SceneId[] = [
  "quote",
  "clockDate",
  "weather",
  "marketsDashboard",
  "custom",
];

export const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "CLEAR",
  1: "MAINLY CLEAR",
  2: "PARTLY CLOUDY",
  3: "OVERCAST",
  45: "FOG",
  48: "RIME FOG",
  51: "LIGHT DRIZZLE",
  53: "DRIZZLE",
  55: "HEAVY DRIZZLE",
  56: "FREEZING DRZL",
  57: "HEAVY FRZ DRZ",
  61: "LIGHT RAIN",
  63: "RAIN",
  65: "HEAVY RAIN",
  66: "FREEZING RAIN",
  67: "HVY FRZ RAIN",
  71: "LIGHT SNOW",
  73: "SNOW",
  75: "HEAVY SNOW",
  77: "SNOW GRAINS",
  80: "RAIN SHOWERS",
  81: "SHOWERS",
  82: "HVY SHOWERS",
  85: "SNOW SHOWERS",
  86: "HVY SNW SHWR",
  95: "THUNDERSTORM",
  96: "THUNDER HAIL",
  99: "SEVERE STORM",
};

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  { id: "quote", label: SCENE_LABELS.quote, kind: "full", defaultDurationSec: 12, requiresFeeds: [] },
  { id: "custom", label: SCENE_LABELS.custom, kind: "full", defaultDurationSec: 12, requiresFeeds: [] },
  { id: "clockDate", label: SCENE_LABELS.clockDate, kind: "full", defaultDurationSec: 10, requiresFeeds: [] },
  { id: "weather", label: SCENE_LABELS.weather, kind: "full", defaultDurationSec: 12, requiresFeeds: ["weather"] },
  {
    id: "marketsDashboard",
    label: SCENE_LABELS.marketsDashboard,
    kind: "dashboard",
    defaultDurationSec: 15,
    requiresFeeds: ["crypto", "weather"],
  },
];
