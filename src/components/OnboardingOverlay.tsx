import { startTransition, useEffect, useMemo, useState } from "react";
import { SCENE_LABELS, THEME_LABELS } from "../constants";
import { searchLocations } from "../data/providers/openMeteo";
import { requestCurrentPosition, reverseGeocodeLocation } from "../lib/location";
import type { LocationSelection, PersistedSettings, SceneId } from "../types";

interface OnboardingOverlayProps {
  visible: boolean;
  settings: PersistedSettings;
  onSettingsChange: (updater: (current: PersistedSettings) => PersistedSettings) => void;
  onClose: (completed: boolean) => void;
}

type StepId = "welcome" | "location" | "scenes" | "review";
type StepDirection = "forward" | "back";

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "welcome", label: "Welcome" },
  { id: "location", label: "Location" },
  { id: "scenes", label: "Scenes" },
  { id: "review", label: "Launch" },
];

const DEFAULT_SCENES: SceneId[] = ["quote", "clockDate", "weather"];
const OPTIONAL_SCENES: SceneId[] = ["marketsDashboard", "custom"];

function isSceneEnabled(settings: PersistedSettings, sceneId: SceneId): boolean {
  return settings.playlist.find((item) => item.id === sceneId)?.enabled ?? false;
}

export function OnboardingOverlay({
  visible,
  settings,
  onSettingsChange,
  onClose,
}: OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<StepDirection>("forward");
  const [locationQuery, setLocationQuery] = useState(settings.locationQuery);
  const [locationResults, setLocationResults] = useState<LocationSelection[]>(settings.location ? [settings.location] : []);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const activeStep = STEPS[stepIndex] ?? STEPS[0];
  const canUseGeolocation =
    typeof window !== "undefined" && window.isSecureContext && "geolocation" in navigator;
  const enabledScenes = useMemo(
    () => settings.playlist.filter((item) => item.enabled).map((item) => item.id),
    [settings.playlist],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStepIndex(0);
    setDirection("forward");
    setLocationQuery(settings.locationQuery);
    setLocationResults(settings.location ? [settings.location] : []);
    setLocationError(null);
    setLocationNotice(null);
  }, [settings.location, settings.locationQuery, visible]);

  if (!visible) {
    return null;
  }

  const updateSettings = (updater: (current: PersistedSettings) => PersistedSettings) => {
    startTransition(() => {
      onSettingsChange(updater);
    });
  };

  const selectLocation = (location: LocationSelection, query = location.label) => {
    updateSettings((current) => ({
      ...current,
      locationQuery: query,
      location,
    }));
    setLocationQuery(query);
    setLocationResults([location]);
    setLocationError(null);
    setLocationNotice(null);
  };

  const handleLocationSearch = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);
      const results = await searchLocations(locationQuery);
      setLocationResults(results);
      if (results.length === 0) {
        setLocationError("No matching locations found. Try a nearby city.");
      }
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    try {
      setDetectingLocation(true);
      setLocationError(null);
      setLocationNotice("Detecting your location...");
      const position = await requestCurrentPosition();
      const result = await reverseGeocodeLocation(
        position.coords.latitude,
        position.coords.longitude,
      );

      if (!result) {
        setLocationNotice("No worries - type your city below.");
        return;
      }

      selectLocation(result, result.label);
      setLocationNotice(`Using ${result.label}.`);
    } catch (error) {
      const denied =
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error as { code?: number }).code === 1;

      if (denied) {
        setLocationNotice("No worries - type your city below.");
      } else {
        setLocationNotice("Could not detect your location. Type your city below.");
      }
    } finally {
      setDetectingLocation(false);
    }
  };

  const toggleOptionalScene = (sceneId: SceneId) => {
    updateSettings((current) => ({
      ...current,
      playlist: current.playlist.map((item) =>
        item.id === sceneId
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item,
      ),
    }));
  };

  const goNext = () => {
    setDirection("forward");
    setStepIndex((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const goBack = () => {
    setDirection("back");
    setStepIndex((value) => Math.max(0, value - 1));
  };

  const complete = () => {
    updateSettings((current) => ({
      ...current,
      onboardingCompleted: true,
    }));
    onClose(true);
  };

  return (
    <div className="ff-onboarding">
      <div className="ff-onboarding__card">
        <div className="ff-onboarding__header">
          <div>
            <p className="ff-onboarding__eyebrow">Welcome to Flapify</p>
            <h2>
              {activeStep.id === "welcome" && "Your screen is about to look incredible."}
              {activeStep.id === "location" && "Set your city"}
              {activeStep.id === "scenes" && "Choose your scenes"}
              {activeStep.id === "review" && "Launch your display"}
            </h2>
          </div>
          <button type="button" className="ff-button ff-button--ghost" onClick={() => onClose(false)}>
            Skip
          </button>
        </div>

        <div className="ff-stepper" aria-label="Setup progress">
          {STEPS.map((step, index) => (
            <div key={step.id} className={`ff-stepper__item ${index <= stepIndex ? "is-active" : ""}`}>
              <span className="ff-stepper__bar" />
              <span className="ff-stepper__label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className={`ff-onboarding__step ff-onboarding__step--${direction}`} key={activeStep.id}>
          {activeStep.id === "welcome" && (
            <div className="ff-onboarding__body">
              <p className="ff-onboarding__lede">
                Your screen is about to look incredible. Let&apos;s set it up in 30 seconds.
              </p>
              <div className="ff-summary-grid">
                <div className="ff-summary-card">
                  <strong>Full-screen board</strong>
                  <span>Built to feel premium on TVs, kiosks, and ambient displays.</span>
                </div>
                <div className="ff-summary-card">
                  <strong>Live scenes</strong>
                  <span>Clock, weather, quotes, crypto, and custom messages.</span>
                </div>
                <div className="ff-summary-card">
                  <strong>Ready fast</strong>
                  <span>Set your city, keep the default scenes, and launch.</span>
                </div>
              </div>
            </div>
          )}

          {activeStep.id === "location" && (
            <div className="ff-onboarding__body">
              <p className="ff-onboarding__lede">Use your location instantly, or type your city below.</p>
              {canUseGeolocation && (
                <button
                  type="button"
                  className="ff-button ff-button--primary"
                  onClick={handleUseMyLocation}
                  disabled={detectingLocation}
                >
                  {detectingLocation ? "Detecting location..." : "Use my location"}
                </button>
              )}
              {locationNotice && <p className="ff-help">{locationNotice}</p>}
              <form
                className="ff-inline"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLocationSearch();
                }}
              >
                <input
                  className="ff-input"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  placeholder="Search city"
                />
                <button type="submit" className="ff-button ff-button--ghost">
                  {locationLoading ? "Searching..." : "Search"}
                </button>
              </form>
              {locationError && <p className="ff-help ff-help--error">{locationError}</p>}
              {locationResults.length > 0 && (
                <div className="ff-chip-list">
                  {locationResults.map((result) => (
                    <button
                      type="button"
                      key={`${result.latitude}:${result.longitude}`}
                      className={`ff-chip ${settings.location?.label === result.label ? "is-selected" : ""}`}
                      onClick={() => selectLocation(result, locationQuery || result.label)}
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeStep.id === "scenes" && (
            <div className="ff-onboarding__body">
              <p className="ff-onboarding__lede">Quotes, Clock, and Weather are already on. Want to add more?</p>
              <div className="ff-chip-list">
                {DEFAULT_SCENES.map((sceneId) => (
                  <span key={sceneId} className="ff-chip is-selected ff-chip--static">
                    {SCENE_LABELS[sceneId]}
                  </span>
                ))}
                {OPTIONAL_SCENES.map((sceneId) => (
                  <button
                    type="button"
                    key={sceneId}
                    className={`ff-chip ${isSceneEnabled(settings, sceneId) ? "is-selected" : ""}`}
                    onClick={() => toggleOptionalScene(sceneId)}
                  >
                    {isSceneEnabled(settings, sceneId) ? "Added: " : "Add: "}
                    {SCENE_LABELS[sceneId]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep.id === "review" && (
            <div className="ff-onboarding__body">
              <p className="ff-onboarding__lede">Everything looks good. Here&apos;s what will launch.</p>
              <div className="ff-summary-grid">
                <div className="ff-summary-card">
                  <strong>City</strong>
                  <span>{settings.location?.label ?? "No city selected yet"}</span>
                </div>
                <div className="ff-summary-card">
                  <strong>Scenes</strong>
                  <span>{enabledScenes.map((sceneId) => SCENE_LABELS[sceneId]).join(", ")}</span>
                </div>
                <div className="ff-summary-card">
                  <strong>Theme</strong>
                  <span>{THEME_LABELS[settings.theme]}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ff-onboarding__actions">
          <button type="button" className="ff-button ff-button--ghost" onClick={goBack} disabled={stepIndex === 0}>
            Back
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="ff-button ff-button--primary" onClick={goNext}>
              Next
            </button>
          ) : (
            <button type="button" className="ff-button ff-button--primary ff-button--hero" onClick={complete}>
              Launch display
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
