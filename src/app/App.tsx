import { useEffect, useMemo, useRef, useState } from "react";
import { SCENE_LABELS, SPLASH_MIN_DURATION_MS, UI_IDLE_TIMEOUT_MS } from "../constants";
import { mechanicalAudioEngine } from "../audio/MechanicalAudioEngine";
import { ControlDrawer } from "../components/ControlDrawer";
import { DisplayErrorBoundary } from "../components/ErrorBoundaries";
import { LoadingSplash } from "../components/LoadingSplash";
import { OnboardingOverlay } from "../components/OnboardingOverlay";
import { SceneBoard } from "../components/SceneBoard";
import { useFeeds } from "../data/useFeeds";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSceneRotation } from "../hooks/useSceneRotation";
import { useWakeLock } from "../hooks/useWakeLock";
import { toggleFullscreen } from "../lib/browser";
import { resolveActiveDimLevel } from "../lib/display";
import { createUnavailableCryptoQuote } from "../lib/markets";
import {
  getNextSceneId,
  getPreviousSceneId,
  getRenderablePlaylist,
} from "../lib/playlist";
import { marketTickerSummary, weatherTickerSummary } from "../lib/scenes";
import { loadRuntime, loadSettings, saveRuntime, saveSettings } from "../state/settings";
import type { PersistedSettings, SceneId } from "../types";

function resolveInitialSettings(): PersistedSettings {
  const base = loadSettings();
  const search = new URLSearchParams(window.location.search);
  if (search.get("kiosk") === "1") {
    return {
      ...base,
      kioskMode: true,
    };
  }
  return base;
}

function resolveInitialScene(settings: PersistedSettings): SceneId | null {
  const playlist = getRenderablePlaylist(settings);
  const runtime = loadRuntime();

  if (
    settings.restoreLastState
    && runtime.lastSceneId
    && playlist.some((item) => item.id === runtime.lastSceneId)
  ) {
    return runtime.lastSceneId;
  }

  return playlist[0]?.id ?? "quote";
}

function resolveDisplayStandalone(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(display-mode: standalone)").matches;
}

export default function App() {
  const [settings, setSettings] = useState<PersistedSettings>(() => resolveInitialSettings());
  const [activeSceneId, setActiveSceneId] = useState<SceneId | null>(() =>
    resolveInitialScene(resolveInitialSettings()),
  );
  const [rotationPaused, setRotationPaused] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [customIndex, setCustomIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [drawerVisible, setDrawerVisible] = useState(!resolveInitialSettings().kioskMode);
  const [drawerEngaged, setDrawerEngaged] = useState(false);
  const [advancedRequestSignal, setAdvancedRequestSignal] = useState(0);
  const [onboardingVisible, setOnboardingVisible] = useState(() => !resolveInitialSettings().onboardingCompleted);
  const [splashVisible, setSplashVisible] = useState(true);
  const [standalone] = useState(resolveDisplayStandalone);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [sceneTransitionActive, setSceneTransitionActive] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const previousSceneRef = useRef<SceneId | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const { feeds, refreshAll } = useFeeds(settings);
  const wakeLock = useWakeLock();

  const renderablePlaylist = useMemo(() => getRenderablePlaylist(settings), [settings]);
  const effectiveKiosk = settings.kioskMode || standalone;
  const minuteBucket = Math.floor(now.getTime() / 60000);
  const dimLevel = useMemo(() => resolveActiveDimLevel(settings, now), [now, settings]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.restoreLastState) {
      saveRuntime(activeSceneId);
    }
  }, [activeSceneId, settings.restoreLastState]);

  useSceneRotation({
    activeSceneId,
    playlist: renderablePlaylist,
    settings,
    rotationPaused,
    boardBusy,
    onAdvance: setActiveSceneId,
  });

  useEffect(() => {
    const nextTitle = activeSceneId ? `Flapify - ${SCENE_LABELS[activeSceneId]}` : "Flapify";
    document.title = nextTitle;
  }, [activeSceneId]);

  useEffect(() => {
    mechanicalAudioEngine.enabled = settings.soundEnabled;
    mechanicalAudioEngine.volume = settings.soundGain;
  }, [settings.soundEnabled, settings.soundGain]);

  useEffect(() => {
    const completeSplash = async () => {
      const fontReady = "fonts" in document ? document.fonts.ready : Promise.resolve();
      await Promise.all([
        fontReady.catch(() => undefined),
        new Promise((resolve) => window.setTimeout(resolve, SPLASH_MIN_DURATION_MS)),
      ]);
      setSplashVisible(false);
    };

    void completeSplash();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const primeAudio = () => {
      void mechanicalAudioEngine.prime();
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };

    window.addEventListener("pointerdown", primeAudio);
    window.addEventListener("keydown", primeAudio);

    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  useEffect(() => {
    if (renderablePlaylist.length === 0) {
      setActiveSceneId(null);
      return;
    }

    if (!activeSceneId || !renderablePlaylist.some((item) => item.id === activeSceneId)) {
      setActiveSceneId(renderablePlaylist[0].id);
    }
  }, [activeSceneId, renderablePlaylist]);

  useEffect(() => {
    const previous = previousSceneRef.current;
    let timeoutId: number | undefined;

    if (previous && previous !== activeSceneId) {
      setSceneTransitionActive(true);
      timeoutId = window.setTimeout(() => {
        setSceneTransitionActive(false);
      }, 420);
      if (activeSceneId === "quote") {
        setQuoteIndex((value) => value + 1);
      }
      if (activeSceneId === "custom") {
        setCustomIndex((value) => value + 1);
      }
    }
    previousSceneRef.current = activeSceneId;

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeSceneId]);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    const showUi = () => {
      setDrawerVisible(true);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        if (!drawerEngaged && !onboardingVisible) {
          setDrawerVisible(false);
        }
      }, UI_IDLE_TIMEOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = ["mousemove", "touchstart", "keydown"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, showUi));

    if (!effectiveKiosk || onboardingVisible) {
      showUi();
    } else {
      setDrawerVisible(false);
    }

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, showUi));
    };
  }, [drawerEngaged, effectiveKiosk, onboardingVisible]);

  const openSettings = () => {
    setDrawerVisible(true);
    setDrawerEngaged(true);
    setAdvancedRequestSignal((value) => value + 1);
  };

  const handleSceneSelection = (sceneId: SceneId | null) => {
    setActiveSceneId(sceneId);
  };

  const handleSendMessage = (message: string) => {
    const normalized = message.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    setSettings((current) => ({
      ...current,
      customMessages: [normalized, ...current.customMessages.filter((entry) => entry !== normalized)].slice(0, 12),
      playlist: current.playlist.map((item) =>
        item.id === "custom"
          ? {
              ...item,
              enabled: true,
            }
          : item,
      ),
    }));
    setCustomIndex(0);
    setActiveSceneId("custom");
  };

  useKeyboardShortcuts({
    onToggleRotation: () => setRotationPaused((value) => !value),
    onNextScene: () => handleSceneSelection(getNextSceneId(renderablePlaylist, activeSceneId)),
    onPreviousScene: () => handleSceneSelection(getPreviousSceneId(renderablePlaylist, activeSceneId)),
    onDismissUi: () => {
      if (onboardingVisible) {
        setOnboardingVisible(false);
        setSettings((current) => ({
          ...current,
          onboardingCompleted: true,
        }));
        return;
      }

      setDrawerVisible(false);
      setDrawerEngaged(false);
    },
    onToggleFullscreen: () => {
      void toggleFullscreen();
    },
  });

  const boardShift = useMemo(() => {
    const positions = [
      { x: 0, y: 0 },
      { x: 2, y: -1 },
      { x: -2, y: 1 },
      { x: 1, y: 2 },
      { x: -1, y: -2 },
    ];
    return positions[minuteBucket % positions.length];
  }, [minuteBucket]);

  const tickerLine = useMemo(() => {
    const cryptoTicker =
      feeds.crypto.data[0]
      ?? (settings.cryptoWatchlist[0] ? createUnavailableCryptoQuote(settings.cryptoWatchlist[0]) : undefined);

    return [
      weatherTickerSummary(feeds.weather.data),
      marketTickerSummary(cryptoTicker),
    ].join("  ");
  }, [feeds, settings.cryptoWatchlist]);

  const handleOnboardingClose = (_completed: boolean) => {
    setOnboardingVisible(false);
    setSettings((current) => ({
      ...current,
      onboardingCompleted: true,
    }));
  };

  return (
    <div
      className={`ff-app ${effectiveKiosk ? "ff-app--kiosk" : ""}`}
      data-theme={settings.theme}
    >
      <div className="ff-ambient" />
      <div className="ff-dim-layer" style={{ opacity: dimLevel }} />
      <div className="ff-rotate-hint">
        <div className="ff-rotate-hint__card">
          <strong>Rotate your device</strong>
          <span>Flapify works best in landscape, but you can still preview it here.</span>
        </div>
      </div>

      <header className={`ff-topbar ${drawerVisible ? "is-visible" : ""}`}>
        <div className="ff-topbar__brand">
          <span>FLAPIFY</span>
          <small>{activeSceneId ? SCENE_LABELS[activeSceneId] : "Idle"}</small>
        </div>
        <div className="ff-topbar__ticker">{tickerLine}</div>
      </header>

      <main className="ff-stage">
        <DisplayErrorBoundary onOpenSettings={openSettings}>
          <div
            className={`ff-stage__board ${sceneTransitionActive ? "is-switching" : ""}`}
            style={{ transform: `translate(${boardShift.x}px, ${boardShift.y}px)` }}
          >
            <SceneBoard
              activeSceneId={activeSceneId}
              now={now}
              settings={settings}
              feeds={feeds}
              quoteIndex={quoteIndex}
              customIndex={customIndex}
              onBusyChange={setBoardBusy}
            />
          </div>
        </DisplayErrorBoundary>
      </main>

      <ControlDrawer
        visible={drawerVisible || drawerEngaged}
        settings={settings}
        feeds={feeds}
        onRefreshFeeds={refreshAll}
        activeSceneId={activeSceneId}
        rotationPaused={rotationPaused}
        onSetScene={(sceneId) => handleSceneSelection(sceneId)}
        onPreviousScene={() => handleSceneSelection(getPreviousSceneId(renderablePlaylist, activeSceneId))}
        onNextScene={() => handleSceneSelection(getNextSceneId(renderablePlaylist, activeSceneId))}
        onSendMessage={handleSendMessage}
        onToggleRotation={() => setRotationPaused((value) => !value)}
        onToggleFullscreen={() => void toggleFullscreen()}
        onEngagementChange={setDrawerEngaged}
        onSettingsChange={(updater) => {
          setSettings((current) => updater(current));
        }}
        isFullscreen={isFullscreen}
        wakeLock={wakeLock}
        advancedRequestSignal={advancedRequestSignal}
        onOpenOnboarding={() => {
          setOnboardingVisible(true);
        }}
      />

      <OnboardingOverlay
        visible={onboardingVisible}
        settings={settings}
        onSettingsChange={(updater) => {
          setSettings((current) => updater(current));
        }}
        onClose={handleOnboardingClose}
      />

      <LoadingSplash visible={splashVisible} />
    </div>
  );
}
