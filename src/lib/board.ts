import { BOARD_SIZE_PRESETS, FLAP_CHARSET } from "../constants";
import type { BoardDimensions, BoardGrid } from "../types";

const DEFAULT_BOARD = BOARD_SIZE_PRESETS.standard;

export function resolveBoardDimensions(board?: BoardDimensions): BoardDimensions {
  return board ?? DEFAULT_BOARD;
}

export function createEmptyGrid(board?: BoardDimensions, fill = " "): BoardGrid {
  const { rows, cols } = resolveBoardDimensions(board);
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

export function getGridDimensions(grid: BoardGrid): BoardDimensions {
  return {
    rows: grid.length,
    cols: grid[0]?.length ?? 0,
  };
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
  const { rows, cols } = getGridDimensions(grid);
  if (row < 0 || row >= rows) {
    return grid;
  }

  const next = grid.map((gridRow) => [...gridRow]);
  const normalized = sanitizeText(text);

  for (let index = 0; index < normalized.length; index += 1) {
    const targetCol = col + index;
    if (targetCol < 0 || targetCol >= cols) {
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

export function wrapText(value: string, width: number): string[] {
  if (width <= 0) {
    return [];
  }

  const words = sanitizeText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  const pushWordChunks = (word: string) => {
    for (let start = 0; start < word.length; start += width) {
      lines.push(word.slice(start, start + width));
    }
  };

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      pushWordChunks(word);
      continue;
    }

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

export function linesToGrid(lines: string[], board?: BoardDimensions): BoardGrid {
  const dimensions = resolveBoardDimensions(board);
  const grid = createEmptyGrid(dimensions);

  lines.slice(0, dimensions.rows).forEach((line, row) => {
    const normalized = sanitizeText(line).slice(0, dimensions.cols);
    for (let col = 0; col < normalized.length; col += 1) {
      grid[row][col] = normalized[col];
    }
  });

  return grid;
}

export function centerLines(lines: string[], board?: BoardDimensions): BoardGrid {
  const dimensions = resolveBoardDimensions(board);
  const trimmed = lines.slice(0, dimensions.rows);
  const topPadding = Math.max(0, Math.floor((dimensions.rows - trimmed.length) / 2));
  const mapped = Array.from({ length: dimensions.rows }, (_, row) => {
    const source = trimmed[row - topPadding] ?? "";
    return padCenter(source, dimensions.cols);
  });
  return linesToGrid(mapped, dimensions);
}

export function centerText(value: string, board?: BoardDimensions): BoardGrid {
  const dimensions = resolveBoardDimensions(board);
  return centerLines(wrapText(value, dimensions.cols), dimensions);
}

export function renderRegion(
  grid: BoardGrid,
  rowStart: number,
  colStart: number,
  width: number,
  lines: string[],
  align: "left" | "center" = "left",
): BoardGrid {
  const { rows } = getGridDimensions(grid);
  let next = grid;

  lines.forEach((line, index) => {
    const targetRow = rowStart + index;
    if (targetRow < 0 || targetRow >= rows) {
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
