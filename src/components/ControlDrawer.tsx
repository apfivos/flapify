import { useEffect, useMemo, useState } from "react";
import { SCENE_LABELS, SCENE_ORDER } from "../constants";
import { searchLocations } from "../data/providers/openMeteo";
import type { AppFeeds, LocationSelection, PersistedSettings, SceneId } from "../types";
import { AdvancedPanel } from "./control-drawer/AdvancedPanel";
import { HelpModal } from "./control-drawer/HelpModal";
import { replacePlaylistItem, withTransition } from "./control-drawer/shared";

interface WakeLockStatus {
  supported: boolean;
  active: boolean;
  error?: string;
}

interface ControlDrawerProps {
  visible: boolean;
  settings: PersistedSettings;
  feeds: AppFeeds;
  onRefreshFeeds: () => void;
  activeSceneId: SceneId | null;
  rotationPaused: boolean;
  onSetScene: (sceneId: SceneId) => void;
  onPreviousScene: () => void;
  onNextScene: () => void;
  onSendMessage: (message: string) => void;
  onToggleRotation: () => void;
  onToggleFullscreen: () => void;
  onEngagementChange: (engaged: boolean) => void;
  onSettingsChange: (updater: (current: PersistedSettings) => PersistedSettings) => void;
  isFullscreen: boolean;
  wakeLock: WakeLockStatus;
  advancedRequestSignal?: number;
  onOpenOnboarding: () => void;
}

type Tone = "neutral" | "live" | "stale" | "setup" | "waiting" | "error";

function isFocusEngagingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function feedTone(feed: AppFeeds[keyof AppFeeds]): Tone {
  if (feed.stale) {
    return "stale";
  }
  if (feed.status === "ready") {
    return "live";
  }
  if (feed.status === "error") {
    return "error";
  }
  if (feed.status === "unconfigured") {
    return "setup";
  }
  return "waiting";
}

function sceneTone(sceneId: SceneId, feeds: AppFeeds, settings: PersistedSettings): Tone {
  if (sceneId === "quote" || sceneId === "clockDate") {
    return "neutral";
  }

  if (sceneId === "custom") {
    return settings.customMessages.length > 0 ? "neutral" : "setup";
  }

  if (sceneId === "countdown") {
    return settings.countdowns.length > 0 ? "neutral" : "setup";
  }

  if (sceneId === "weather") {
    return feedTone(feeds.weather);
  }

  if (sceneId === "news") {
    return feedTone(feeds.news);
  }

  return feedTone(feeds.crypto);
}

export function ControlDrawer({
  visible,
  settings,
  feeds,
  onRefreshFeeds,
  activeSceneId,
  rotationPaused,
  onSetScene,
  onPreviousScene,
  onNextScene,
  onSendMessage,
  onToggleRotation,
  onToggleFullscreen,
  onEngagementChange,
  onSettingsChange,
  isFullscreen,
  wakeLock,
  advancedRequestSignal,
  onOpenOnboarding,
}: ControlDrawerProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState(settings.locationQuery);
  const [locationResults, setLocationResults] = useState<LocationSelection[]>(settings.location ? [settings.location] : []);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");

  const updateSettings = withTransition(onSettingsChange);

  useEffect(() => {
    if (advancedRequestSignal) {
      setAdvancedOpen(true);
    }
  }, [advancedRequestSignal]);

  useEffect(() => {
    setLocationQuery(settings.locationQuery);
    setLocationResults(settings.location ? [settings.location] : []);
  }, [settings.location, settings.locationQuery]);

  const sceneButtons = useMemo(
    () =>
      SCENE_ORDER.map((sceneId) => ({
        id: sceneId,
        label: SCENE_LABELS[sceneId],
        tone: sceneTone(sceneId, feeds, settings),
      })),
    [feeds, settings],
  );

  const handleLocationSearch = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const results = await searchLocations(locationQuery);
      setLocationResults(results);
      if (results.length === 0) {
        setLocationError("No matching locations found.");
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleLocationSelect = (location: LocationSelection, query = location.label) => {
    updateSettings((current) => ({
      ...current,
      locationQuery: query,
      location,
    }));
    setLocationResults([location]);
    setLocationError(null);
  };

  const activateScene = (sceneId: SceneId) => {
    updateSettings((current) => ({
      ...current,
      playlist: replacePlaylistItem(current.playlist, sceneId, (entry) => ({
        ...entry,
        enabled: true,
      })),
    }));
    onSetScene(sceneId);
  };

  const handleSendMessage = () => {
    if (!messageDraft.trim()) {
      return;
    }
    onSendMessage(messageDraft);
    setMessageDraft("");
  };

  return (
    <>
      <aside
        className={`ff-drawer ${visible ? "is-visible" : ""}`}
        onMouseEnter={() => onEngagementChange(true)}
        onMouseLeave={() => onEngagementChange(false)}
        onFocusCapture={(event) => onEngagementChange(isFocusEngagingTarget(event.target))}
        onBlurCapture={() => {
          window.requestAnimationFrame(() => {
            onEngagementChange(isFocusEngagingTarget(document.activeElement));
          });
        }}
      >
        <div className="ff-drawer__shell">
          <div className={`ff-drawer__main ${advancedOpen ? "is-hidden" : ""}`}>
            <div className="ff-drawer__header">
              <div className="ff-drawer__brand">
                <span>FLAPIFY</span>
                <small>{activeSceneId ? SCENE_LABELS[activeSceneId] : "Idle"}</small>
              </div>
              <div className="ff-drawer__header-actions">
                <button
                  type="button"
                  className="ff-button ff-button--ghost"
                  onClick={() => setHelpOpen(true)}
                >
                  Info & Setup
                </button>
                <button
                  type="button"
                  className="ff-button ff-button--ghost"
                  aria-label="Open advanced controls"
                  onClick={() => setAdvancedOpen(true)}
                >
                  Advanced
                </button>
              </div>
            </div>

            <div className="ff-remote-card">
              <div className="ff-scene-indicator">
                <button type="button" className="ff-button ff-button--ghost" onClick={onPreviousScene}>
                  Prev
                </button>
                <div className="ff-scene-indicator__label">
                  <span className={`ff-status-dot ff-status-dot--${activeSceneId ? sceneTone(activeSceneId, feeds, settings) : "neutral"}`} />
                  <strong>{activeSceneId ? SCENE_LABELS[activeSceneId] : "No scene"}</strong>
                </div>
                <button type="button" className="ff-button ff-button--ghost" onClick={onNextScene}>
                  Next
                </button>
              </div>

              <div className="ff-scene-grid">
                {sceneButtons.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    className={`ff-scene-button ${activeSceneId === scene.id ? "is-active" : ""}`}
                    onClick={() => activateScene(scene.id)}
                  >
                    <span className={`ff-status-dot ff-status-dot--${scene.tone}`} />
                    <span>{scene.label}</span>
                  </button>
                ))}
              </div>

              <form
                className="ff-message-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSendMessage();
                }}
              >
                <input
                  className="ff-input"
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  placeholder="Send a message"
                />
                <button type="submit" className="ff-button ff-button--primary">
                  Show
                </button>
              </form>

              <div className="ff-remote-actions">
                <button
                  type="button"
                  className={`ff-button ${settings.soundEnabled ? "ff-button--primary" : "ff-button--ghost"}`}
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      soundEnabled: !current.soundEnabled,
                    }))
                  }
                >
                  {settings.soundEnabled ? "Sound on" : "Sound off"}
                </button>

                <div className="ff-volume">
                  <label className="ff-label" htmlFor="ff-volume-range">
                    Volume
                  </label>
                  <input
                    id="ff-volume-range"
                    className="ff-range"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.soundGain}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        soundGain: Number(event.target.value),
                      }))
                    }
                  />
                </div>

                <button
                  type="button"
                  className={`ff-button ${rotationPaused ? "ff-button--ghost" : "ff-button--primary"}`}
                  onClick={onToggleRotation}
                >
                  {rotationPaused ? "Resume rotation" : "Pause rotation"}
                </button>

                <button type="button" className="ff-button ff-button--ghost" onClick={onToggleFullscreen}>
                  {isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
                </button>
              </div>
            </div>
          </div>

          <div className={`ff-drawer__advanced ${advancedOpen ? "is-open" : ""}`}>
            <AdvancedPanel
              settings={settings}
              feeds={feeds}
              updateSettings={updateSettings}
              onRefreshFeeds={onRefreshFeeds}
              locationQuery={locationQuery}
              setLocationQuery={setLocationQuery}
              locationResults={locationResults}
              locationLoading={locationLoading}
              locationError={locationError}
              onLocationSearch={handleLocationSearch}
              onLocationSelect={handleLocationSelect}
              wakeLock={wakeLock}
              onOpenOnboarding={() => {
                setAdvancedOpen(false);
                onOpenOnboarding();
              }}
              onOpenHelp={() => setHelpOpen(true)}
              onClose={() => setAdvancedOpen(false)}
            />
          </div>
        </div>
      </aside>

      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
