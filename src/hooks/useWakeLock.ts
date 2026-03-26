import { useEffect, useRef, useState } from "react";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
}

interface WakeLockState {
  supported: boolean;
  active: boolean;
  error?: string;
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request?: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Wake lock unavailable";
}

export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>({
    supported: Boolean((navigator as WakeLockNavigator).wakeLock?.request),
    active: false,
  });
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock?.request) {
      setState({
        supported: false,
        active: false,
      });
      return;
    }

    let cancelled = false;

    const releaseCurrent = async () => {
      const activeSentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (activeSentinel) {
        await activeSentinel.release().catch(() => undefined);
      }
    };

    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinelRef.current) {
        return;
      }

      try {
        const sentinel = await wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release().catch(() => undefined);
          return;
        }

        sentinelRef.current = sentinel;
        sentinel.addEventListener?.("release", () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null;
            setState((current) => ({
              ...current,
              active: false,
            }));
          }
        });

        setState({
          supported: true,
          active: true,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            supported: true,
            active: false,
            error: getErrorMessage(error),
          });
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await acquire();
        return;
      }

      if (sentinelRef.current) {
        setState((current) => ({
          ...current,
          active: false,
        }));
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseCurrent();
    };
  }, []);

  return state;
}
