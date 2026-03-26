import { BOARD_COLS, BOARD_ROWS, FLAP_CHARSET } from "../constants";
import type { BoardGrid } from "../types";

export function createEmptyGrid(fill = " "): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(fill));
}

export function sanitizeChar(char: string): string {
  const upper = char.toUpperCase();
  return FLAP_CHARSET.includes(upper) ? upper : " ";
}

export function sanitizeText(value: string): string {
  return [...value.toUpperCase()].map((char) => sanitizeChar(char)).join("");
}

export function truncateText(value: string, width: number): string {
  return sanitizeText(value).slice(0, width).padEnd(width, " ");
}

export function putText(grid: BoardGrid, row: number, col: number, text: string): BoardGrid {
  if (row < 0 || row >= BOARD_ROWS) {
    return grid;
  }

  const next = grid.map((gridRow) => [...gridRow]);
  const normalized = sanitizeText(text);

  for (let index = 0; index < normalized.length; index += 1) {
    const targetCol = col + index;
    if (targetCol < 0 || targetCol >= BOARD_COLS) {
      continue;
    }
    next[row][targetCol] = normalized[index];
  }

  return next;
}

export function padCenter(value: string, width: number): string {
  const normalized = sanitizeText(value).slice(0, width);
  const left = Math.max(0, Math.floor((width - normalized.length) / 2));
  return `${" ".repeat(left)}${normalized}`.padEnd(width, " ");
}

export function padRight(value: string, width: number): string {
  return sanitizeText(value).slice(0, width).padEnd(width, " ");
}

export function wrapText(value: string, width = BOARD_COLS): string[] {
  const words = sanitizeText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function linesToGrid(lines: string[]): BoardGrid {
  const grid = createEmptyGrid();

  lines.slice(0, BOARD_ROWS).forEach((line, row) => {
    const normalized = sanitizeText(line).slice(0, BOARD_COLS);
    for (let col = 0; col < normalized.length; col += 1) {
      grid[row][col] = normalized[col];
    }
  });

  return grid;
}

export function centerLines(lines: string[]): BoardGrid {
  const trimmed = lines.slice(0, BOARD_ROWS);
  const topPadding = Math.max(0, Math.floor((BOARD_ROWS - trimmed.length) / 2));
  const mapped = Array.from({ length: BOARD_ROWS }, (_, row) => {
    const source = trimmed[row - topPadding] ?? "";
    return padCenter(source, BOARD_COLS);
  });
  return linesToGrid(mapped);
}

export function centerText(value: string): BoardGrid {
  return centerLines(wrapText(value, BOARD_COLS));
}

export function renderRegion(
  grid: BoardGrid,
  rowStart: number,
  colStart: number,
  width: number,
  lines: string[],
  align: "left" | "center" = "left",
): BoardGrid {
  let next = grid;

  lines.forEach((line, index) => {
    const targetRow = rowStart + index;
    if (targetRow < 0 || targetRow >= BOARD_ROWS) {
      return;
    }
    const padded = align === "center" ? padCenter(line, width) : padRight(line, width);
    next = putText(next, targetRow, colStart, padded.slice(0, width));
  });

  return next;
}

export function gridToSignature(grid: BoardGrid): string {
  return grid.map((row) => row.join("")).join("\n");
}

export function compactDate(now: Date, locale = "en-GB", timeZone?: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone,
  });
  return formatter.format(now).toUpperCase().replace(",", "");
}

export function compactTime(now: Date, locale = "en-GB", timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(now);
}
