interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

const INSTALL_GUIDES = [
  {
    id: "tv",
    badge: "TV",
    title: "Smart TV",
    bullets: [
      "Open the browser on your TV.",
      "Go to flapify.app.",
      "Tap fullscreen and leave it running.",
    ],
  },
  {
    id: "cast",
    badge: "CAST",
    title: "Chromecast or Fire Stick",
    bullets: [
      "Open Flapify on your phone or laptop.",
      "Cast the tab or screen to your TV.",
      "Switch to fullscreen once it lands.",
    ],
  },
  {
    id: "pi",
    badge: "PI",
    title: "Raspberry Pi",
    bullets: [
      "Install Chromium in kiosk mode.",
      "Point it to flapify.app.",
      "Auto-launch it on boot for an always-on board.",
    ],
  },
  {
    id: "tablet",
    badge: "TAB",
    title: "Tablet or old phone",
    bullets: [
      "Open Flapify in the browser.",
      "Use Add to Home Screen.",
      "Mount it and keep the display awake.",
    ],
  },
  {
    id: "desktop",
    badge: "DESK",
    title: "Desktop screensaver",
    bullets: [
      "Open flapify.app in your browser.",
      "Press F or tap fullscreen.",
      "Leave it on a waiting-room or ambient screen.",
    ],
  },
];

export function HelpModal({ visible, onClose }: HelpModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="ff-help-modal" role="dialog" aria-modal="true" aria-labelledby="ff-help-title">
      <div className="ff-help-modal__backdrop" onClick={onClose} />
      <div className="ff-help-modal__card">
        <div className="ff-help-modal__header">
          <div>
            <p className="ff-label">Quick start</p>
            <h3 id="ff-help-title">How to install Flapify</h3>
          </div>
          <button type="button" className="ff-button ff-button--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="ff-help-modal__grid">
          {INSTALL_GUIDES.map((guide) => (
            <section key={guide.id} className="ff-help-card">
              <div className="ff-help-card__badge">{guide.badge}</div>
              <div className="ff-help-card__body">
                <h4>{guide.title}</h4>
                <ul>
                  {guide.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
