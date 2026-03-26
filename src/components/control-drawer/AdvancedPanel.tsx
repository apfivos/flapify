import { APP_VERSION, SCENE_LABELS, THEME_LABELS } from "../../constants";
import type { AppFeeds, LocationSelection, PersistedSettings, ThemeId } from "../../types";
import { moveScene, replacePlaylistItem } from "./shared";

interface WakeLockStatus {
  supported: boolean;
  active: boolean;
  error?: string;
}

interface AdvancedPanelProps {
  settings: PersistedSettings;
  feeds: AppFeeds;
  updateSettings: (updater: (current: PersistedSettings) => PersistedSettings) => void;
  onRefreshFeeds: () => void;
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  locationResults: LocationSelection[];
  locationLoading: boolean;
  locationError: string | null;
  onLocationSearch: () => void;
  onLocationSelect: (location: LocationSelection, query?: string) => void;
  wakeLock: WakeLockStatus;
  onOpenOnboarding: () => void;
  onOpenHelp: () => void;
  onClose: () => void;
}

function wakeLockLabel(wakeLock: WakeLockStatus): string {
  if (!wakeLock.supported) {
    return "Unsupported";
  }
  if (wakeLock.active) {
    return "Active";
  }
  return wakeLock.error ? "Unavailable" : "Idle";
}

function dotTone(status: AppFeeds[keyof AppFeeds]["status"], stale: boolean): string {
  if (stale) {
    return "stale";
  }
  if (status === "ready") {
    return "live";
  }
  if (status === "error") {
    return "error";
  }
  if (status === "unconfigured") {
    return "setup";
  }
  return "waiting";
}

function updateTextList(values: string[], index: number, nextValue: string, max: number): string[] {
  const next = [...values];
  next[index] = nextValue.toUpperCase();
  return next.map((entry) => entry.trim()).filter(Boolean).slice(0, max);
}

function removeTextListItem(values: string[], index: number): string[] {
  return values.filter((_, itemIndex) => itemIndex !== index);
}

function addTextListItem(values: string[], fallback: string, max: number): string[] {
  return [...values, fallback].slice(0, max);
}

export function AdvancedPanel({
  settings,
  feeds,
  updateSettings,
  onRefreshFeeds,
  locationQuery,
  setLocationQuery,
  locationResults,
  locationLoading,
  locationError,
  onLocationSearch,
  onLocationSelect,
  wakeLock,
  onOpenOnboarding,
  onOpenHelp,
  onClose,
}: AdvancedPanelProps) {
  return (
    <section className="ff-advanced" aria-label="Advanced controls">
      <div className="ff-advanced__header">
        <div>
          <p className="ff-label">Advanced controls</p>
          <h3>Fine-tune your display</h3>
        </div>
        <button type="button" className="ff-button ff-button--ghost" onClick={onClose}>
          Back
        </button>
      </div>

      <div className="ff-advanced__content">
        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Scene rotation</p>
              <h4>Choose what rotates and for how long</h4>
            </div>
          </div>

          <div className="ff-list">
            {settings.playlist.map((item) => (
              <div key={item.id} className="ff-list__row ff-list__row--compact">
                <label className="ff-checkbox">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        playlist: replacePlaylistItem(current.playlist, item.id, (entry) => ({
                          ...entry,
                          enabled: event.target.checked,
                        })),
                      }))
                    }
                  />
                  <span>{SCENE_LABELS[item.id]}</span>
                </label>

                <div className="ff-inline ff-inline--compact">
                  <input
                    className="ff-input ff-input--small"
                    type="number"
                    min={5}
                    max={90}
                    value={item.durationSec}
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        playlist: replacePlaylistItem(current.playlist, item.id, (entry) => ({
                          ...entry,
                          durationSec: Math.max(5, Math.min(90, Number(event.target.value) || entry.durationSec)),
                        })),
                      }))
                    }
                  />
                  <span className="ff-help">sec</span>
                  <button
                    type="button"
                    className="ff-button ff-button--ghost"
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        playlist: moveScene(current.playlist, item.id, -1),
                      }))
                    }
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="ff-button ff-button--ghost"
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        playlist: moveScene(current.playlist, item.id, 1),
                      }))
                    }
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Location</p>
              <h4>Set your city and timezone source</h4>
            </div>
            <button type="button" className="ff-button ff-button--ghost" onClick={onRefreshFeeds}>
              Refresh live data
            </button>
          </div>

          <div className="ff-inline">
            <input
              className="ff-input"
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search city"
            />
            <button type="button" className="ff-button ff-button--primary" onClick={onLocationSearch}>
              {locationLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {locationError && <p className="ff-help ff-help--error">{locationError}</p>}
          {locationResults.length > 0 && (
            <div className="ff-chip-list">
              {locationResults.map((result) => (
                <button
                  type="button"
                  key={`${result.latitude}:${result.longitude}`}
                  className={`ff-chip ${settings.location?.label === result.label ? "is-selected" : ""}`}
                  onClick={() => onLocationSelect(result, locationQuery)}
                >
                  {result.label}
                </button>
              ))}
            </div>
          )}

          <div className="ff-inline">
            <button
              type="button"
              className={`ff-button ${settings.timezoneMode === "location" ? "ff-button--primary" : "ff-button--ghost"}`}
              onClick={() =>
                updateSettings((current) => ({
                  ...current,
                  timezoneMode: "location",
                }))
              }
            >
              Use location time
            </button>
            <button
              type="button"
              className={`ff-button ${settings.timezoneMode === "device" ? "ff-button--primary" : "ff-button--ghost"}`}
              onClick={() =>
                updateSettings((current) => ({
                  ...current,
                  timezoneMode: "device",
                }))
              }
            >
              Use device time
            </button>
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Quote editor</p>
              <h4>Rotate the quotes you actually want</h4>
            </div>
            <button
              type="button"
              className="ff-button ff-button--ghost"
              onClick={() =>
                updateSettings((current) => ({
                  ...current,
                  quoteRotation: addTextListItem(current.quoteRotation, "NEW QUOTE", 40),
                }))
              }
            >
              Add quote
            </button>
          </div>

          <div className="ff-list">
            {settings.quoteRotation.map((quote, index) => (
              <div key={`${quote}-${index}`} className="ff-list__row">
                <input
                  className="ff-input"
                  value={quote}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      quoteRotation: updateTextList(current.quoteRotation, index, event.target.value, 40),
                    }))
                  }
                />
                <button
                  type="button"
                  className="ff-button ff-button--danger"
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      quoteRotation: removeTextListItem(current.quoteRotation, index),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Crypto watchlist</p>
              <h4>Choose which coins appear on the display</h4>
            </div>
          </div>

          <div>
            <label className="ff-label">Crypto IDs</label>
            <input
              className="ff-input"
              value={settings.cryptoWatchlist.join(", ")}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  cryptoWatchlist: event.target.value
                    .split(",")
                    .map((entry) => entry.trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 10),
                }))
              }
              placeholder="bitcoin, ethereum, solana"
            />
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Saved messages</p>
              <h4>Keep ready-to-send lines on deck</h4>
            </div>
            <button
              type="button"
              className="ff-button ff-button--ghost"
              onClick={() =>
                updateSettings((current) => ({
                  ...current,
                  customMessages: addTextListItem(current.customMessages, "YOUR MESSAGE HERE", 12),
                }))
              }
            >
              Add message
            </button>
          </div>

          <div className="ff-list">
            {settings.customMessages.length === 0 && (
              <p className="ff-help">Quick messages you send from the main drawer can be stored here too.</p>
            )}
            {settings.customMessages.map((message, index) => (
              <div key={`${message}-${index}`} className="ff-list__row">
                <input
                  className="ff-input"
                  value={message}
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      customMessages: updateTextList(current.customMessages, index, event.target.value, 12),
                    }))
                  }
                />
                <button
                  type="button"
                  className="ff-button ff-button--danger"
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      customMessages: removeTextListItem(current.customMessages, index),
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Look and feel</p>
              <h4>Theme and dimming settings</h4>
            </div>
          </div>

          <div>
            <label className="ff-label">Theme</label>
            <div className="ff-chip-list">
              {(Object.keys(THEME_LABELS) as ThemeId[]).map((themeId) => (
                <button
                  type="button"
                  key={themeId}
                  className={`ff-chip ${settings.theme === themeId ? "is-selected" : ""}`}
                  onClick={() =>
                    updateSettings((current) => ({
                      ...current,
                      theme: themeId,
                    }))
                  }
                >
                  {THEME_LABELS[themeId]}
                </button>
              ))}
            </div>
          </div>

          <div className="ff-two-column">
            <label className="ff-checkbox">
              <input
                type="checkbox"
                checked={settings.dimming.enabled}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    dimming: {
                      ...current.dimming,
                      enabled: event.target.checked,
                    },
                  }))
                }
              />
              <span>Manual dimming</span>
            </label>
            <label className="ff-checkbox">
              <input
                type="checkbox"
                checked={settings.dimming.scheduleEnabled}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    dimming: {
                      ...current.dimming,
                      scheduleEnabled: event.target.checked,
                    },
                  }))
                }
              />
              <span>Use quiet hours</span>
            </label>
          </div>

          <div>
            <label className="ff-label">Dim level</label>
            <input
              className="ff-range"
              type="range"
              min={0}
              max={0.75}
              step={0.01}
              value={settings.dimming.level}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  dimming: {
                    ...current.dimming,
                    level: Number(event.target.value),
                  },
                }))
              }
            />
          </div>

          <div className="ff-two-column">
            <div>
              <label className="ff-label">Quiet hours start</label>
              <input
                className="ff-input"
                type="time"
                value={settings.dimming.start}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    dimming: {
                      ...current.dimming,
                      start: event.target.value,
                    },
                  }))
                }
              />
            </div>
            <div>
              <label className="ff-label">Quiet hours end</label>
              <input
                className="ff-input"
                type="time"
                value={settings.dimming.end}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    dimming: {
                      ...current.dimming,
                      end: event.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">Display</p>
              <h4>Device behavior and wake settings</h4>
            </div>
          </div>

          <div className="ff-two-column">
            <label className="ff-checkbox">
              <input
                type="checkbox"
                checked={settings.kioskMode}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    kioskMode: event.target.checked,
                  }))
                }
              />
              <span>Kiosk mode</span>
            </label>
            <label className="ff-checkbox">
              <input
                type="checkbox"
                checked={settings.restoreLastState}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    restoreLastState: event.target.checked,
                  }))
                }
              />
              <span>Restore last scene</span>
            </label>
          </div>

          <div className="ff-status-list">
            <div className="ff-status-list__item">
              <span className={`ff-status-dot ff-status-dot--${dotTone(feeds.weather.status, feeds.weather.stale)}`} />
              <span>Weather feed</span>
            </div>
            <div className="ff-status-list__item">
              <span className={`ff-status-dot ff-status-dot--${dotTone(feeds.crypto.status, feeds.crypto.stale)}`} />
              <span>Crypto feed</span>
            </div>
            <div className="ff-status-list__item">
              <span
                className={`ff-status-dot ff-status-dot--${wakeLock.active ? "live" : wakeLock.supported ? "waiting" : "setup"}`}
              />
              <span>Wake lock {wakeLockLabel(wakeLock)}</span>
            </div>
          </div>

          {wakeLock.error && <p className="ff-help ff-help--error">{wakeLock.error}</p>}
        </section>

        <section className="ff-advanced__section">
          <div className="ff-section-heading">
            <div>
              <p className="ff-label">About</p>
              <h4>Setup help and product info</h4>
            </div>
          </div>

          <div className="ff-inline">
            <button type="button" className="ff-button ff-button--ghost" onClick={onOpenOnboarding}>
              Re-run setup
            </button>
            <button type="button" className="ff-button ff-button--ghost" onClick={onOpenHelp}>
              How to install
            </button>
          </div>

          <div className="ff-about-card">
            <strong>About Flapify</strong>
            <span>Premium split-flap display software for TVs, kiosks, and ambient screens.</span>
            <small>Version {APP_VERSION}</small>
          </div>
        </section>
      </div>
    </section>
  );
}
