import { renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../constants";
import { useFeedSnapshot } from "./useFeeds";
import type { FeedAdapter, PersistedSettings } from "../types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

describe("useFeedSnapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("resets immediately when the cache key changes", async () => {
    const firstRequest = deferred<string[]>();
    const secondRequest = deferred<string[]>();

    const adapter: FeedAdapter<string[], string[]> = {
      id: "crypto",
      pollIntervalMs: 60_000,
      staleAfterMs: 300_000,
      isConfigured: (settings) => settings.cryptoWatchlist.length > 0,
      getCacheKey: (settings) => settings.cryptoWatchlist.join(","),
      empty: () => [],
      load: async (settings) =>
        settings.cryptoWatchlist[0] === "bitcoin" ? firstRequest.promise : secondRequest.promise,
      normalize: (raw) => raw,
    };

    const { result, rerender } = renderHook(
      ({ settings, refreshNonce }: { settings: PersistedSettings; refreshNonce: number }) =>
        useFeedSnapshot(adapter, settings, refreshNonce),
      {
        initialProps: {
          settings: {
            ...DEFAULT_SETTINGS,
            cryptoWatchlist: ["bitcoin"],
          },
          refreshNonce: 0,
        },
      },
    );

    firstRequest.resolve(["bitcoin"]);
    await waitFor(() => expect(result.current.data).toEqual(["bitcoin"]));

    rerender({
      settings: {
        ...DEFAULT_SETTINGS,
        cryptoWatchlist: ["ethereum"],
      },
      refreshNonce: 0,
    });

    await waitFor(() => {
      expect(result.current.status).toBe("loading");
      expect(result.current.data).toEqual([]);
    });

    secondRequest.resolve(["ethereum"]);
    await waitFor(() => expect(result.current.data).toEqual(["ethereum"]));
  });

  it("keeps the last same-key value after a fetch failure", async () => {
    const firstRequest = deferred<string[]>();
    const secondRequest = deferred<string[]>();
    let loadCount = 0;

    const adapter: FeedAdapter<string[], string[]> = {
      id: "crypto",
      pollIntervalMs: 60_000,
      staleAfterMs: 300_000,
      isConfigured: (settings) => settings.cryptoWatchlist.length > 0,
      getCacheKey: (settings) => settings.cryptoWatchlist.join(","),
      empty: () => [],
      load: async (_settings, signal) => {
        if (signal.aborted) {
          throw new Error("aborted");
        }
        loadCount += 1;
        return loadCount === 1 ? firstRequest.promise : secondRequest.promise;
      },
      normalize: (raw) => raw,
    };

    const { result, rerender } = renderHook(
      ({ refreshNonce }: { refreshNonce: number }) =>
        useFeedSnapshot(adapter, {
          ...DEFAULT_SETTINGS,
          cryptoWatchlist: ["bitcoin"],
        }, refreshNonce),
      {
        initialProps: { refreshNonce: 0 },
      },
    );

    firstRequest.resolve(["bitcoin"]);
    await waitFor(() => expect(result.current.data).toEqual(["bitcoin"]));

    rerender({ refreshNonce: 1 });
    secondRequest.reject(new Error("boom"));

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      expect(result.current.stale).toBe(true);
      expect(result.current.data).toEqual(["bitcoin"]);
      expect(result.current.error).toBe("boom");
    });
  });
});
