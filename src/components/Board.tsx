import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_COLS, BOARD_ROWS, FLIP_STAGGER_MS } from "../constants";
import type { BoardGrid } from "../types";
import { gridToSignature } from "../lib/board";
import { Flap } from "./Flap";

type ActiveFlipMap = Record<string, number>;
const SCENE_WIDE_CHANGE_THRESHOLD = 24;

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

interface BoardProps {
  grid: BoardGrid;
  onBusyChange?: (busy: boolean) => void;
}

export function Board({ grid, onBusyChange }: BoardProps) {
  const signature = useMemo(() => gridToSignature(grid), [grid]);
  const [previousGrid, setPreviousGrid] = useState(grid);
  const [activeFlips, setActiveFlips] = useState<ActiveFlipMap>({});
  const [scheduledFlipCount, setScheduledFlipCount] = useState(0);
  const previousGridRef = useRef(grid);
  const previousSignatureRef = useRef(signature);
  const timeoutsRef = useRef<number[]>([]);
  const nextFlipTokenRef = useRef(1);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(scheduledFlipCount > 0 || Object.keys(activeFlips).length > 0);
  }, [activeFlips, onBusyChange, scheduledFlipCount]);

  useEffect(() => {
    if (signature === previousSignatureRef.current) {
      setScheduledFlipCount(0);
      return;
    }

    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];

    const fromGrid = previousGridRef.current;
    setPreviousGrid(fromGrid);
    setActiveFlips({});

    const changes: Array<{ row: number; col: number; delay: number; token: number }> = [];
    const pendingChanges: Array<{ row: number; col: number; nextChar: string; token: number }> = [];

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (grid[row][col] !== fromGrid[row][col]) {
          pendingChanges.push({
            row,
            col,
            nextChar: grid[row][col],
            token: nextFlipTokenRef.current,
          });
          nextFlipTokenRef.current += 1;
        }
      }
    }

    const sceneWideTransition = pendingChanges.length >= SCENE_WIDE_CHANGE_THRESHOLD;
    setScheduledFlipCount(pendingChanges.length);

    pendingChanges.forEach(({ row, col, nextChar, token }) => {
      const baseDelay = col * FLIP_STAGGER_MS + row * (FLIP_STAGGER_MS * 0.45) + Math.random() * 28;
      const delay = sceneWideTransition
        ? nextChar === " "
          ? row * 10 + col * 12
          : 170 + row * 12 + col * 16
        : baseDelay;

      changes.push({
        row,
        col,
        delay,
        token,
      });
    });

    changes.forEach(({ row, col, delay, token }) => {
      const timeoutId = window.setTimeout(() => {
        setScheduledFlipCount((current) => Math.max(0, current - 1));
        setActiveFlips((current) => {
          const key = cellKey(row, col);
          if (current[key] === token) {
            return current;
          }
          return {
            ...current,
            [key]: token,
          };
        });
      }, delay);
      timeoutsRef.current.push(timeoutId);
    });

    previousGridRef.current = grid;
    previousSignatureRef.current = signature;
  }, [grid, signature]);

  return (
    <div className="ff-board">
      {grid.flatMap((row, rowIndex) =>
        row.map((char, colIndex) => (
          <Flap
            key={`${rowIndex}-${colIndex}`}
            char={char}
            prevChar={previousGrid[rowIndex]?.[colIndex] ?? " "}
            flipToken={activeFlips[cellKey(rowIndex, colIndex)]}
            onFlipDone={() => {
              const key = cellKey(rowIndex, colIndex);
              setPreviousGrid((current) => {
                if (current[rowIndex]?.[colIndex] === char) {
                  return current;
                }

                const next = current.map((line) => [...line]);
                next[rowIndex][colIndex] = char;
                return next;
              });
              setActiveFlips((current) => {
                if (!(key in current)) {
                  return current;
                }

                const { [key]: _removed, ...rest } = current;
                return rest;
              });
            }}
          />
        )),
      )}
    </div>
  );
}
