import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Constants ───
const ROWS = 6;
const COLS = 22;
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.!?/-+@#$%& ";
const FLIP_DURATION = 300;
const FLIP_STAGGER = 25;
const INTERMEDIATE_STEPS = 4;
const QUOTES = [
  "THE BEST TIME TO START IS NOW",
  "DREAM BIG WORK HARD STAY HUMBLE",
  "EVERY DAY IS A NEW BEGINNING",
  "BE THE CHANGE YOU WISH TO SEE",
  "FORTUNE FAVORS THE BOLD",
  "STAY HUNGRY STAY FOOLISH",
  "MAKE IT HAPPEN",
  "DO WHAT YOU LOVE",
  "LIFE IS SHORT MAKE IT COUNT",
  "THE FUTURE BELONGS TO THE BRAVE",
  "GREAT THINGS TAKE TIME",
  "BELIEVE IN YOURSELF",
  "ADVENTURES AWAIT YOU OUT THERE",
  "CREATE THE LIFE YOU IMAGINE",
  "NOTHING IS IMPOSSIBLE",
];

// ─── Audio Engine ───
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.buffers = [];
    this.enabled = true;
    this.volume = 0.3;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 6; i++) {
      this.buffers.push(this._createClack(i));
    }
  }

  _createClack(variant) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * (0.015 + variant * 0.003));
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * (300 + variant * 40));
      const click = Math.sin(t * (3000 + variant * 500)) * 0.5;
      const noise = (Math.random() * 2 - 1) * 0.5;
      const thud = Math.sin(t * (200 + variant * 30)) * 0.3;
      d[i] = (click + noise + thud) * env;
    }
    return buf;
  }

  play() {
    if (!this.ctx || !this.enabled) return;
    const buf = this.buffers[Math.floor(Math.random() * this.buffers.length)];
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume * (0.6 + Math.random() * 0.4);
    src.buffer = buf;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.detune.value = (Math.random() - 0.5) * 200;
    src.start(this.ctx.currentTime + Math.random() * 0.01);
  }
}

const audio = new AudioEngine();

// ─── Single Flap Component ───
function Flap({ char, prevChar, flipping, onFlipDone }) {
  const [phase, setPhase] = useState("idle");
  const [displayTop, setDisplayTop] = useState(char);
  const [displayBottom, setDisplayBottom] = useState(char);
  const [flapChar, setFlapChar] = useState(char);
  const [nextChar, setNextChar] = useState(char);
  const timeouts = useRef([]);

  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!flipping) return;
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];

    const intermediates = [];
    for (let i = 0; i < INTERMEDIATE_STEPS; i++) {
      intermediates.push(CHARSET[Math.floor(Math.random() * CHARSET.length)]);
    }
    intermediates.push(char);

    let step = 0;
    const runStep = () => {
      const c = intermediates[step];
      setNextChar(c);
      setPhase("flip-down");
      audio.play();

      const t1 = setTimeout(() => {
        setDisplayTop(c);
        setDisplayBottom(c);
        setFlapChar(c);
        setPhase("flip-up");

        const t2 = setTimeout(() => {
          setPhase("idle");
          step++;
          if (step < intermediates.length) {
            const t3 = setTimeout(runStep, 20);
            timeouts.current.push(t3);
          } else {
            onFlipDone?.();
          }
        }, FLIP_DURATION * 0.4);
        timeouts.current.push(t2);
      }, FLIP_DURATION * 0.5);
      timeouts.current.push(t1);
    };

    setDisplayTop(prevChar);
    setDisplayBottom(prevChar);
    setFlapChar(prevChar);
    runStep();
  }, [flipping]);

  const isSpace = char === " " && !flipping;

  return (
    <div style={{
      width: "100%",
      aspectRatio: "0.72",
      position: "relative",
      perspective: "400px",
      transformStyle: "preserve-3d",
    }}>
      {/* Card body */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "4px",
        background: isSpace
          ? "linear-gradient(180deg, #1a1a1a 0%, #141414 49.5%, transparent 49.5%, transparent 50.5%, #141414 50.5%, #1a1a1a 100%)"
          : "linear-gradient(180deg, #1e1e1e 0%, #181818 49.5%, transparent 49.5%, transparent 50.5%, #181818 50.5%, #1e1e1e 100%)",
        boxShadow: isSpace ? "none" : "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        {/* Top static half */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          borderRadius: "4px 4px 0 0",
        }}>
          <span style={{
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: "min(4.2vw, 4.2vh)",
            color: "#f0efe8",
            lineHeight: 1,
            transform: "translateY(55%)",
            textShadow: "0 0 8px rgba(240,239,232,0.1)",
            userSelect: "none",
          }}>{displayTop}</span>
        </div>

        {/* Bottom static half */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          borderRadius: "0 0 4px 4px",
        }}>
          <span style={{
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: "min(4.2vw, 4.2vh)",
            color: "#e8e7e0",
            lineHeight: 1,
            transform: "translateY(-45%)",
            textShadow: "0 0 8px rgba(232,231,224,0.1)",
            userSelect: "none",
          }}>{displayBottom}</span>
        </div>

        {/* Center line / axle */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1.5px",
          background: "rgba(0,0,0,0.9)",
          transform: "translateY(-50%)",
          zIndex: 10,
        }} />
      </div>

      {/* Flipping top half */}
      {phase === "flip-down" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          borderRadius: "4px 4px 0 0",
          background: "linear-gradient(180deg, #1e1e1e, #181818)",
          transformOrigin: "bottom center",
          animation: `flipDown ${FLIP_DURATION * 0.5}ms ease-in forwards`,
          zIndex: 20,
          backfaceVisibility: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
        }}>
          <span style={{
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: "min(4.2vw, 4.2vh)",
            color: "#f0efe8",
            lineHeight: 1,
            transform: "translateY(55%)",
            userSelect: "none",
          }}>{flapChar}</span>
        </div>
      )}

      {/* Flipping bottom half (reveals next char) */}
      {phase === "flip-up" && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          overflow: "hidden",
          borderRadius: "0 0 4px 4px",
          background: "linear-gradient(180deg, #181818, #1e1e1e)",
          transformOrigin: "top center",
          animation: `flipUp ${FLIP_DURATION * 0.4}ms ease-out forwards`,
          zIndex: 20,
          backfaceVisibility: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          boxShadow: "0 -1px 6px rgba(0,0,0,0.4)",
        }}>
          <span style={{
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            fontWeight: 700,
            fontSize: "min(4.2vw, 4.2vh)",
            color: "#e8e7e0",
            lineHeight: 1,
            transform: "translateY(-45%)",
            userSelect: "none",
          }}>{nextChar}</span>
        </div>
      )}
    </div>
  );
}

// ─── Board ───
function Board({ grid, prevGrid, flipTrigger }) {
  const [flipping, setFlipping] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  );

  useEffect(() => {
    if (flipTrigger === 0) return;
    const newFlip = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const delays = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== prevGrid[r][c]) {
          const delay = c * FLIP_STAGGER + r * (FLIP_STAGGER * 0.5) + Math.random() * 30;
          delays.push({ r, c, delay });
        }
      }
    }

    delays.forEach(({ r, c, delay }) => {
      setTimeout(() => {
        setFlipping((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = true;
          return next;
        });
      }, delay);
    });

    const maxDelay = delays.length > 0 ? Math.max(...delays.map((d) => d.delay)) + 1500 : 0;
    setTimeout(() => {
      setFlipping(Array.from({ length: ROWS }, () => Array(COLS).fill(false)));
    }, maxDelay);
  }, [flipTrigger]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
      gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      gap: "min(0.5vw, 4px)",
      width: "96vw",
      maxWidth: "1600px",
      aspectRatio: `${COLS * 0.72} / ${ROWS}`,
      margin: "0 auto",
    }}>
      {grid.flatMap((row, r) =>
        row.map((ch, c) => (
          <Flap
            key={`${r}-${c}`}
            char={ch}
            prevChar={prevGrid[r]?.[c] || " "}
            flipping={flipping[r][c]}
            onFlipDone={() => {
              setFlipping((prev) => {
                const next = prev.map((row) => [...row]);
                next[r][c] = false;
                return next;
              });
            }}
          />
        ))
      )}
    </div>
  );
}

// ─── Helpers ───
function textToGrid(text) {
  const lines = text.split("\n").slice(0, ROWS);
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
  lines.forEach((line, r) => {
    const upper = line.toUpperCase();
    for (let c = 0; c < COLS && c < upper.length; c++) {
      grid[r][c] = CHARSET.includes(upper[c]) ? upper[c] : " ";
    }
  });
  return grid;
}

function centerText(text) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 <= COLS) {
      current = current ? current + " " + word : word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const startRow = Math.max(0, Math.floor((ROWS - lines.length) / 2));
  const padded = [];
  for (let i = 0; i < ROWS; i++) {
    const lineIdx = i - startRow;
    if (lineIdx >= 0 && lineIdx < lines.length) {
      const line = lines[lineIdx];
      const pad = Math.max(0, Math.floor((COLS - line.length) / 2));
      padded.push(" ".repeat(pad) + line);
    } else {
      padded.push("");
    }
  }
  return textToGrid(padded.join("\n"));
}

function getTimeGrid() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
  const lines = [
    "",
    "",
    time,
    "",
    date,
    "",
  ];
  return textToGrid(lines.map((l) => {
    const pad = Math.max(0, Math.floor((COLS - l.length) / 2));
    return " ".repeat(pad) + l;
  }).join("\n"));
}

// ─── Main App ───
const EMPTY_GRID = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));

export default function FlipFlap() {
  const [grid, setGrid] = useState(EMPTY_GRID);
  const [prevGrid, setPrevGrid] = useState(EMPTY_GRID);
  const [flipTrigger, setFlipTrigger] = useState(0);
  const [mode, setMode] = useState("quotes");
  const [showUI, setShowUI] = useState(true);
  const [customMsg, setCustomMsg] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const hideTimer = useRef(null);
  const intervalRef = useRef(null);
  const initialized = useRef(false);

  const flipTo = useCallback((newGrid) => {
    setGrid((current) => {
      setPrevGrid(current);
      return newGrid;
    });
    setFlipTrigger((t) => t + 1);
  }, []);

  // Init audio on first interaction
  useEffect(() => {
    const handler = () => {
      audio.init();
      initialized.current = true;
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    audio.enabled = soundOn;
  }, [soundOn]);

  // Show/hide UI on mouse movement
  useEffect(() => {
    const handler = () => {
      setShowUI(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowUI(false), 3000);
    };
    window.addEventListener("mousemove", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // Mode logic
  useEffect(() => {
    clearInterval(intervalRef.current);

    if (mode === "quotes") {
      flipTo(centerText(QUOTES[quoteIdx]));
      intervalRef.current = setInterval(() => {
        setQuoteIdx((i) => {
          const next = (i + 1) % QUOTES.length;
          flipTo(centerText(QUOTES[next]));
          return next;
        });
      }, 12000);
    } else if (mode === "clock") {
      flipTo(getTimeGrid());
      intervalRef.current = setInterval(() => {
        flipTo(getTimeGrid());
      }, 1000);
    } else if (mode === "custom") {
      if (customMsg.trim()) {
        flipTo(centerText(customMsg.toUpperCase()));
      }
    }

    return () => clearInterval(intervalRef.current);
  }, [mode, quoteIdx, flipTo]);

  const sendCustom = () => {
    if (customMsg.trim()) {
      flipTo(centerText(customMsg.toUpperCase()));
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&family=Inter:wght@300;400;500&display=swap');

        @keyframes flipDown {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }

        @keyframes flipUp {
          0% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .ff-controls {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.95) 30%);
          padding: 32px 24px 24px;
          transition: opacity 0.5s ease, transform 0.5s ease;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .ff-controls.hidden {
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
        }

        .ff-modes {
          display: flex;
          gap: 6px;
        }

        .ff-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #999;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.5px;
          transition: all 0.2s;
        }

        .ff-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #ccc;
        }

        .ff-btn.active {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.25);
          color: #fff;
        }

        .ff-input-row {
          display: flex;
          gap: 8px;
          width: 100%;
          max-width: 600px;
        }

        .ff-input {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          padding: 10px 16px;
          border-radius: 6px;
          font-family: 'Roboto Mono', monospace;
          font-size: 14px;
          outline: none;
        }

        .ff-input:focus {
          border-color: rgba(255,255,255,0.3);
        }

        .ff-input::placeholder { color: #555; }

        .ff-brand {
          position: fixed;
          top: 20px;
          left: 24px;
          font-family: 'Roboto Mono', monospace;
          font-size: 11px;
          letter-spacing: 4px;
          color: rgba(255,255,255,0.15);
          text-transform: uppercase;
          z-index: 50;
          transition: opacity 0.5s;
        }
      `}</style>

      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: showUI ? "default" : "none",
        }}
        onClick={() => {
          if (!initialized.current) {
            audio.init();
            initialized.current = true;
          }
        }}
      >
        {/* Brand */}
        <div className="ff-brand" style={{ opacity: showUI ? 1 : 0 }}>
          FLIPFLAP
        </div>

        {/* Board */}
        <Board grid={grid} prevGrid={prevGrid} flipTrigger={flipTrigger} />

        {/* Controls */}
        <div className={`ff-controls ${showUI ? "" : "hidden"}`}>
          <div className="ff-modes">
            <button className={`ff-btn ${mode === "quotes" ? "active" : ""}`} onClick={() => setMode("quotes")}>
              Quotes
            </button>
            <button className={`ff-btn ${mode === "clock" ? "active" : ""}`} onClick={() => setMode("clock")}>
              Clock
            </button>
            <button className={`ff-btn ${mode === "custom" ? "active" : ""}`} onClick={() => setMode("custom")}>
              Custom
            </button>
            <button className={`ff-btn`} onClick={() => setSoundOn((s) => !s)}>
              {soundOn ? "Sound On" : "Sound Off"}
            </button>
          </div>

          {mode === "custom" && (
            <div className="ff-input-row">
              <input
                className="ff-input"
                placeholder="Type your message..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCustom()}
                maxLength={COLS * ROWS}
              />
              <button className="ff-btn active" onClick={sendCustom}>FLIP</button>
            </div>
          )}

          <div style={{ color: "rgba(255,255,255,0.2)", fontFamily: "Inter, sans-serif", fontSize: "11px" }}>
            Click anywhere to enable sound · Move mouse to show controls
          </div>
        </div>
      </div>
    </>
  );
}
