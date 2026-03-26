import { useEffect, useMemo, useRef, useState } from "react";
import { coinGeckoAdapter } from "./providers/coinGecko";
import { openMeteoAdapter } from "./providers/openMeteo";
import { loadFeedCache, saveFeedCache } from "../state/settings";
import type { AppFeeds, FeedAdapter, FeedSnapshot, PersistedSettings } from "../types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown feed error";
}

export function resolveFeedSnapshot<TData, TRaw>(
  adapter: FeedAdapter<TData, TRaw>,
  settings: PersistedSettings,
  cacheKey: string,
): FeedSnapshot<TData> {
  const cached = loadFeedCache<TData>(cacheKey);
  if (cached) {
    return {
      ...cached,
      stale:
        cached.updatedAt !== undefined
          ? Date.now() - cached.updatedAt >= adapter.staleAfterMs
          : true,
    };
  }

  return {
    status: adapter.isConfigured(settings) ? "loading" : "unconfigured",
    data: adapter.empty(settings),
    stale: false,
  };
}

export function useFeedSnapshot<TData, TRaw>(
  adapter: FeedAdapter<TData, TRaw>,
  settings: PersistedSettings,
  refreshNonce: number,
): FeedSnapshot<TData> {
  const cacheKey = useMemo(() => `${adapter.id}:${adapter.getCacheKey(settings)}`, [adapter, settings]);
  const [snapshot, setSnapshot] = useState<FeedSnapshot<TData>>(() =>
    resolveFeedSnapshot(adapter, settings, cacheKey),
  );
  const lastCacheKeyRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);

  settingsRef.current = settings;

  useEffect(() => {
    let timeoutId: number | undefined;
    let staleTimerId: number | undefined;
    let cancelled = false;
    let backoff = 0;
    let controller: AbortController | null = null;
    const cacheKeyChanged = lastCacheKeyRef.current !== cacheKey;

    lastCacheKeyRef.current = cacheKey;

    if (cacheKeyChanged) {
      setSnapshot(resolveFeedSnapshot(adapter, settingsRef.current, cacheKey));
    }

    const schedule = (delay: number) => {
      timeoutId = window.setTimeout(run, delay);
    };

    const scheduleStale = (updatedAt: number) => {
      if (staleTimerId !== undefined) {
        window.clearTimeout(staleTimerId);
      }

      const delay = updatedAt + adapter.staleAfterMs - Date.now();
      if (delay <= 0) {
        setSnapshot((current) =>
          current.updatedAt === updatedAt
            ? {
                ...current,
                stale: true,
              }
            : current,
        );
        return;
      }

      staleTimerId = window.setTimeout(() => {
        setSnapshot((current) =>
          current.updatedAt === updatedAt
            ? {
                ...current,
                stale: true,
              }
            : current,
        );
      }, delay);
    };

    const run = async () => {
      const activeSettings = settingsRef.current;
      const configured = adapter.isConfigured(activeSettings);
      if (!configured) {
        if (staleTimerId !== undefined) {
          window.clearTimeout(staleTimerId);
        }
        setSnapshot({
          status: "unconfigured",
          data: adapter.empty(activeSettings),
          stale: false,
        });
        schedule(adapter.pollIntervalMs);
        return;
      }

      controller?.abort();
      controller = new AbortController();

      setSnapshot((current) => ({
        ...current,
        status: current.updatedAt ? "ready" : "loading",
        error: undefined,
      }));

      try {
        const raw = await adapter.load(activeSettings, controller.signal);
        if (cancelled) {
          return;
        }

        const nextSnapshot: FeedSnapshot<TData> = {
          status: "ready",
          data: adapter.normalize(raw, activeSettings),
          stale: false,
          updatedAt: Date.now(),
        };
        backoff = 0;
        setSnapshot(nextSnapshot);
        saveFeedCache(cacheKey, nextSnapshot);
        scheduleStale(nextSnapshot.updatedAt ?? Date.now());
        schedule(adapter.pollIntervalMs);
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        const nextDelay = Math.min(
          adapter.pollIntervalMs * 4,
          Math.max(5000, adapter.pollIntervalMs * 0.5 * 2 ** backoff),
        );
        backoff += 1;
        setSnapshot((current) => ({
          status: current.updatedAt ? "ready" : "error",
          data: current.data,
          stale: true,
          error: getErrorMessage(error),
          updatedAt: current.updatedAt,
        }));
        schedule(nextDelay);
      }
    };

    run();

    return () => {
      cancelled = true;
      controller?.abort();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (staleTimerId !== undefined) {
        window.clearTimeout(staleTimerId);
      }
    };
  }, [adapter, cacheKey, refreshNonce]);

  return snapshot;
}

export function useFeeds(settings: PersistedSettings): {
  feeds: AppFeeds;
  refreshAll: () => void;
} {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const weather = useFeedSnapshot(openMeteoAdapter, settings, refreshNonce);
  const crypto = useFeedSnapshot(coinGeckoAdapter, settings, refreshNonce);

  return useMemo(
    () => ({
      feeds: {
        weather,
        crypto,
      } satisfies AppFeeds,
      refreshAll: () => {
        setRefreshNonce((value) => value + 1);
      },
    }),
    [crypto, weather],
  );
}
