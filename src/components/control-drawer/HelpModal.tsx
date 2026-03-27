import { useEffect, useState } from "react";

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUICK_SETUP = [
  {
    id: "city",
    badge: "01",
    title: "Set your city",
    description: "Open Advanced, search for your city, and Flapify will match the local weather and time.",
  },
  {
    id: "scenes",
    badge: "02",
    title: "Choose what rotates",
    description: "Use the main scene buttons for quick switching, then fine-tune rotation timing in Advanced.",
  },
  {
    id: "display",
    badge: "03",
    title: "Make it room-ready",
    description: "Tap fullscreen, then adjust sound, dimming, board size, and kiosk mode to suit the screen.",
  },
];

const INSTALL_GUIDES = [
  {
    id: "tv",
    badge: "TV",
    title: "Smart TV",
    description: "Open the TV browser, go to flapify.app, tap fullscreen, and leave it running.",
  },
  {
    id: "cast",
    badge: "CAST",
    title: "Chromecast or Fire Stick",
    description: "Open Flapify on your phone or laptop, cast the tab or screen, then switch to fullscreen.",
  },
  {
    id: "pi",
    badge: "PI",
    title: "Raspberry Pi",
    description: "Run Chromium in kiosk mode, point it to flapify.app, and auto-launch it on boot.",
  },
  {
    id: "tablet",
    badge: "TAB",
    title: "Tablet or old phone",
    description: "Open it in the browser, use Add to Home Screen, then mount it and keep the display awake.",
  },
  {
    id: "desktop",
    badge: "DESK",
    title: "Desktop screensaver",
    description: "Open flapify.app, press F or tap fullscreen, and leave it running on an ambient screen.",
  },
];

const CONTROL_PANELS = [
  {
    id: "main",
    badge: "MAIN",
    title: "Main controls",
    items: [
      "Use the big scene buttons to jump between scenes instantly.",
      "Type a message and hit Show to send it straight to the board.",
      "Sound, volume, rotation, fullscreen, and Info & Setup live here for quick access.",
    ],
  },
  {
    id: "advanced",
    badge: "ADV",
    title: "Advanced panel",
    items: [
      "Open Advanced when you want to edit locations, quotes, countdowns, or news feeds.",
      "This is where themes, board size, dimming, kiosk mode, and restore-last-scene live.",
      "Re-run setup brings the onboarding flow back any time you want a guided pass.",
    ],
  },
];

export function HelpModal({ visible, onClose }: HelpModalProps) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (visible) {
      setPage(0);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="ff-help-modal" role="dialog" aria-modal="true" aria-labelledby="ff-help-title">
      <div className="ff-help-modal__backdrop" onClick={onClose} />
      <div className="ff-help-modal__card">
        <div className="ff-help-modal__header">
          <div>
            <p className="ff-label">Info & setup</p>
            <h3 id="ff-help-title">
              {page === 0 ? "Set up your display in a minute" : "How the control panel works"}
            </h3>
          </div>
          <button type="button" className="ff-button ff-button--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ff-help-modal__nav" role="tablist" aria-label="Help sections">
          <button
            type="button"
            role="tab"
            aria-selected={page === 0}
            className={`ff-help-tab ${page === 0 ? "is-active" : ""}`}
            onClick={() => setPage(0)}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={page === 1}
            className={`ff-help-tab ${page === 1 ? "is-active" : ""}`}
            onClick={() => setPage(1)}
          >
            Controls
          </button>
        </div>

        {page === 0 ? (
          <>
            <div className="ff-help-modal__hero">
              <div className="ff-help-modal__intro">
                <strong>Flapify turns any screen into a premium split-flap display.</strong>
                <p>
                  Set your city, choose what rotates, go fullscreen, and let it run. No account,
                  no hardware, no setup maze.
                </p>
              </div>
              <div className="ff-help-modal__chips" aria-label="Quick setup checklist">
                <span className="ff-help-chip">Set your city</span>
                <span className="ff-help-chip">Pick scenes</span>
                <span className="ff-help-chip">Go fullscreen</span>
                <span className="ff-help-chip">Optional kiosk mode</span>
              </div>
            </div>

            <div className="ff-help-modal__layout">
              <section className="ff-help-panel">
                <div className="ff-section-heading">
                  <div>
                    <p className="ff-label">Quick setup</p>
                    <h4>Start here</h4>
                  </div>
                </div>
                <div className="ff-help-steps">
                  {QUICK_SETUP.map((guide) => (
                    <section key={guide.id} className="ff-help-step">
                      <div className="ff-help-step__badge">{guide.badge}</div>
                      <div className="ff-help-step__body">
                        <h4>{guide.title}</h4>
                        <p>{guide.description}</p>
                      </div>
                    </section>
                  ))}
                </div>
              </section>

              <section className="ff-help-panel">
                <div className="ff-section-heading">
                  <div>
                    <p className="ff-label">Install guides</p>
                    <h4>Works on the screens you already have</h4>
                  </div>
                </div>
                <div className="ff-help-device-list">
                  {INSTALL_GUIDES.map((guide) => (
                    <section key={guide.id} className="ff-help-device">
                      <div className="ff-help-card__badge">{guide.badge}</div>
                      <div className="ff-help-device__body">
                        <strong>{guide.title}</strong>
                        <p>{guide.description}</p>
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            </div>

            <div className="ff-help-modal__footer">
              <div className="ff-help-modal__tips">
                <strong>Good defaults</strong>
                <p>Quotes, clock, weather, crypto, and custom messages already work out of the box.</p>
              </div>
              <div className="ff-help-modal__tips">
                <strong>Need the guided version?</strong>
                <p>Use <em>Re-run setup</em> in Advanced any time you want the onboarding flow again.</p>
              </div>
            </div>

            <div className="ff-help-modal__actions">
              <button type="button" className="ff-button ff-button--primary" onClick={() => setPage(1)}>
                Next: Controls
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ff-help-modal__hero">
              <div className="ff-help-modal__intro">
                <strong>The control panel has two layers: quick controls and advanced controls.</strong>
                <p>
                  The main drawer is for fast everyday actions. Advanced is where you configure the
                  display in detail.
                </p>
              </div>
              <div className="ff-help-modal__chips" aria-label="Control panel summary">
                <span className="ff-help-chip">Quick scene switching</span>
                <span className="ff-help-chip">Instant messages</span>
                <span className="ff-help-chip">Advanced settings</span>
                <span className="ff-help-chip">Re-run setup</span>
              </div>
            </div>

            <div className="ff-help-modal__layout">
              {CONTROL_PANELS.map((panel) => (
                <section key={panel.id} className="ff-help-panel">
                  <div className="ff-section-heading">
                    <div>
                      <p className="ff-label">{panel.badge}</p>
                      <h4>{panel.title}</h4>
                    </div>
                  </div>
                  <div className="ff-help-device-list">
                    {panel.items.map((item, index) => (
                      <section key={`${panel.id}-${index}`} className="ff-help-step">
                        <div className="ff-help-step__badge">{`${index + 1}`.padStart(2, "0")}</div>
                        <div className="ff-help-step__body">
                          <p>{item}</p>
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="ff-help-modal__footer">
              <div className="ff-help-modal__tips">
                <strong>Main drawer</strong>
                <p>Best for scene switching, sending a message, sound, fullscreen, and pause/resume.</p>
              </div>
              <div className="ff-help-modal__tips">
                <strong>Advanced</strong>
                <p>Best for locations, quotes, news feeds, countdowns, themes, dimming, and kiosk behavior.</p>
              </div>
            </div>

            <div className="ff-help-modal__actions">
              <button type="button" className="ff-button ff-button--ghost" onClick={() => setPage(0)}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
