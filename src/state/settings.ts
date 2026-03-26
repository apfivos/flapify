import {
  DEFAULT_PLAYLIST,
  DEFAULT_SETTINGS,
  FEED_CACHE_STORAGE_KEY,
  RUNTIME_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "../constants";
import type {
  DimmingSettings,
  FeedSnapshot,
  PersistedSettings,
  SceneId,
  ScenePlaylistItem,
} from "../types";

type FeedCacheMap = Record<string, FeedSnapshot<unknown>>;

interface RuntimeState {
  lastSceneId: SceneId | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function uniqueStrings(values: unknown, max = 20): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => `${value}`.trim()).filter(Boolean))]
    .slice(0, max)
    .map((value) => value.toLowerCase() === value ? value : value.toUpperCase());
}

function normalizePlaylist(value: unknown): ScenePlaylistItem[] {
  if (!Array.isArray(value)) {
    return DEFAULT_PLAYLIST;
  }

  const seen = new Set<string>();
  const normalized = value
    .filter((item): item is ScenePlaylistItem => isObject(item) && typeof item.id === "string")
    .map((item) => ({
      id: item.id as ScenePlaylistItem["id"],
      enabled: Boolean(item.enabled),
      durationSec:
        typeof item.durationSec === "number" && Number.isFinite(item.durationSec)
          ? Math.max(5, Math.min(90, Math.round(item.durationSec)))
          : DEFAULT_PLAYLIST.find((entry) => entry.id === item.id)?.durationSec ?? 12,
    }))
    .filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return DEFAULT_PLAYLIST.some((entry) => entry.id === item.id);
    });

  return DEFAULT_PLAYLIST.map((item) => normalized.find((entry) => entry.id === item.id) ?? item);
}

function normalizeSettings(value: unknown): PersistedSettings {
  if (!isObject(value)) {
    return DEFAULT_SETTINGS;
  }

  const location = isObject(value.location)
    ? {
        label: `${value.location.label ?? DEFAULT_SETTINGS.location?.label ?? ""}`,
        latitude: Number(value.location.latitude ?? DEFAULT_SETTINGS.location?.latitude ?? 0),
        longitude: Number(value.location.longitude ?? DEFAULT_SETTINGS.location?.longitude ?? 0),
        timezone: `${value.location.timezone ?? DEFAULT_SETTINGS.location?.timezone ?? "UTC"}`,
        country:
          value.location.country === undefined ? undefined : `${value.location.country}`,
      }
    : DEFAULT_SETTINGS.location;
  const rawDimming = isObject(value.dimming) ? value.dimming : {};
  const dimming: DimmingSettings = {
    enabled:
      typeof rawDimming.enabled === "boolean"
        ? rawDimming.enabled
        : DEFAULT_SETTINGS.dimming.enabled,
    level:
      typeof rawDimming.level === "number"
        ? Math.max(0, Math.min(0.75, rawDimming.level))
        : DEFAULT_SETTINGS.dimming.level,
    scheduleEnabled:
      typeof rawDimming.scheduleEnabled === "boolean"
        ? rawDimming.scheduleEnabled
        : DEFAULT_SETTINGS.dimming.scheduleEnabled,
    start: `${rawDimming.start ?? DEFAULT_SETTINGS.dimming.start}`,
    end: `${rawDimming.end ?? DEFAULT_SETTINGS.dimming.end}`,
  };

  return {
    playlist: normalizePlaylist(value.playlist),
    locationQuery: `${value.locationQuery ?? DEFAULT_SETTINGS.locationQuery}`,
    location,
    timezoneMode: value.timezoneMode === "device" ? "device" : "location",
    theme:
      value.theme === "amber"
      || value.theme === "terminal"
      || value.theme === "warmWhite"
      || value.theme === "classic"
        ? value.theme
        : DEFAULT_SETTINGS.theme,
    soundEnabled:
      typeof value.soundEnabled === "boolean" ? value.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    soundGain:
      typeof value.soundGain === "number"
        ? Math.max(0, Math.min(1, value.soundGain))
        : DEFAULT_SETTINGS.soundGain,
    customMessages: uniqueStrings(value.customMessages, 12).map((entry) => entry.toUpperCase()),
    quoteRotation:
      Array.isArray(value.quoteRotation) && value.quoteRotation.length > 0
        ? uniqueStrings(value.quoteRotation, 40).map((entry) => entry.toUpperCase())
        : DEFAULT_SETTINGS.quoteRotation,
    cryptoWatchlist: uniqueStrings(value.cryptoWatchlist, 10).map((entry) => entry.toLowerCase()),
    kioskMode: Boolean(value.kioskMode),
    restoreLastState:
      typeof value.restoreLastState === "boolean"
        ? value.restoreLastState
        : DEFAULT_SETTINGS.restoreLastState,
    onboardingCompleted:
      typeof value.onboardingCompleted === "boolean"
        ? value.onboardingCompleted
        : DEFAULT_SETTINGS.onboardingCompleted,
    dimming,
  };
}

export function loadSettings(): PersistedSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PersistedSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadRuntime(): RuntimeState {
  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) {
      return { lastSceneId: null };
    }
    const parsed = JSON.parse(raw) as RuntimeState;
    return {
      lastSceneId: parsed.lastSceneId ?? null,
    };
  } catch {
    return { lastSceneId: null };
  }
}

export function saveRuntime(lastSceneId: SceneId | null): void {
  window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify({ lastSceneId }));
}

export function loadFeedCache<T>(id: string): FeedSnapshot<T> | null {
  try {
    const raw = window.localStorage.getItem(FEED_CACHE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as FeedCacheMap;
    return (parsed[id] as FeedSnapshot<T>) ?? null;
  } catch {
    return null;
  }
}

export function saveFeedCache<T>(id: string, snapshot: FeedSnapshot<T>): void {
  try {
    const raw = window.localStorage.getItem(FEED_CACHE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FeedCacheMap) : {};
    parsed[id] = snapshot as FeedSnapshot<unknown>;
    window.localStorage.setItem(FEED_CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage failures in kiosk mode.
  }
}
