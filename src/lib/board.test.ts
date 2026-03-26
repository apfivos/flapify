import { BOARD_COLS, BOARD_ROWS } from "../constants";
import { centerText, createEmptyGrid, renderRegion, truncateText } from "./board";

describe("board helpers", () => {
  it("creates a 6x22 empty grid", () => {
    const grid = createEmptyGrid();
    expect(grid).toHaveLength(BOARD_ROWS);
    expect(grid[0]).toHaveLength(BOARD_COLS);
    expect(grid.every((row) => row.every((cell) => cell === " "))).toBe(true);
  });

  it("centers text on the board", () => {
    const grid = centerText("hello world");
    expect(grid[2].join("").trim()).toBe("HELLO WORLD");
  });

  it("renders a region without overflowing width", () => {
    const grid = renderRegion(createEmptyGrid(), 0, 0, 11, ["ABCDEFGHIJKLMN"]);
    expect(grid[0].slice(0, 11).join("")).toBe("ABCDEFGHIJK");
  });

  it("truncates unsupported text safely", () => {
    expect(truncateText("hello*world", 8)).toBe("HELLO WO");
  });
});
