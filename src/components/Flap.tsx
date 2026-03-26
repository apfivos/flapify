import { memo, useEffect, useRef, useState } from "react";
import { FLIP_DURATION_MS } from "../constants";
import { mechanicalAudioEngine } from "../audio/MechanicalAudioEngine";
import { getSequentialFlapSteps } from "../lib/flap";

type Phase = "idle" | "flip-down" | "flip-up";

interface FlapProps {
  char: string;
  prevChar: string;
  flipToken?: number;
  onFlipDone?: () => void;
}

function FlapComponent({ char, prevChar, flipToken, onFlipDone }: FlapProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayTop, setDisplayTop] = useState(char);
  const [displayBottom, setDisplayBottom] = useState(char);
  const [flapChar, setFlapChar] = useState(char);
  const [nextChar, setNextChar] = useState(char);
  const timeoutIds = useRef<number[]>([]);
  const onFlipDoneRef = useRef(onFlipDone);

  onFlipDoneRef.current = onFlipDone;

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];

    if (flipToken === undefined) {
      setPhase("idle");
      setDisplayTop(prevChar === char ? char : prevChar);
      setDisplayBottom(prevChar === char ? char : prevChar);
      setFlapChar(prevChar === char ? char : prevChar);
      setNextChar(prevChar === char ? char : prevChar);
      return;
    }

    const sequence = getSequentialFlapSteps(prevChar, char);
    if (sequence.length === 0) {
      onFlipDoneRef.current?.();
      return;
    }

    let index = 0;

    const runStep = () => {
      const targetChar = sequence[index];
      setNextChar(targetChar);
      setPhase("flip-down");
      mechanicalAudioEngine.play();

      const t1 = window.setTimeout(() => {
        setDisplayTop(targetChar);
        setDisplayBottom(targetChar);
        setFlapChar(targetChar);
        setPhase("flip-up");

        const t2 = window.setTimeout(() => {
          setPhase("idle");
          index += 1;
          if (index < sequence.length) {
            const t3 = window.setTimeout(runStep, 10);
            timeoutIds.current.push(t3);
          } else {
            onFlipDoneRef.current?.();
          }
        }, FLIP_DURATION_MS * 0.4);
        timeoutIds.current.push(t2);
      }, FLIP_DURATION_MS * 0.5);

      timeoutIds.current.push(t1);
    };

    setDisplayTop(prevChar);
    setDisplayBottom(prevChar);
    setFlapChar(prevChar);
    runStep();
  }, [char, flipToken, prevChar]);

  const isBlank = char === " " && flipToken === undefined;

  return (
    <div className="ff-flap" data-blank={isBlank ? "true" : "false"}>
      <div className="ff-flap__card">
        <div className="ff-flap__half ff-flap__half--top">
          <span className="ff-glyph ff-glyph--top">{displayTop}</span>
        </div>
        <div className="ff-flap__half ff-flap__half--bottom">
          <span className="ff-glyph ff-glyph--bottom">{displayBottom}</span>
        </div>
        <div className="ff-flap__hinge" />
      </div>

      {phase === "flip-down" && (
        <div className="ff-flap__animated ff-flap__animated--top">
          <span className="ff-glyph ff-glyph--top">{flapChar}</span>
        </div>
      )}

      {phase === "flip-up" && (
        <div className="ff-flap__animated ff-flap__animated--bottom">
          <span className="ff-glyph ff-glyph--bottom">{nextChar}</span>
        </div>
      )}
    </div>
  );
}

export const Flap = memo(
  FlapComponent,
  (previous, next) =>
    previous.char === next.char
    && previous.prevChar === next.prevChar
    && previous.flipToken === next.flipToken,
);
