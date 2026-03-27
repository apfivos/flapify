import { BOARD_SIZE_PRESETS } from "../constants";
import { centerText, createEmptyGrid, renderRegion, truncateText, wrapText } from "./board";

describe("board helpers", () => {
  it("creates a 6x22 empty grid", () => {
    const grid = createEmptyGrid(BOARD_SIZE_PRESETS.standard);
    expect(grid).toHaveLength(BOARD_SIZE_PRESETS.standard.rows);
    expect(grid[0]).toHaveLength(BOARD_SIZE_PRESETS.standard.cols);
    expect(grid.every((row) => row.every((cell) => cell === " "))).toBe(true);
  });

  it("centers text on the board", () => {
    const grid = centerText("hello world", BOARD_SIZE_PRESETS.standard);
    expect(grid[2].join("").trim()).toBe("HELLO WORLD");
  });

  it("renders a region without overflowing width", () => {
    const grid = renderRegion(createEmptyGrid(BOARD_SIZE_PRESETS.standard), 0, 0, 11, ["ABCDEFGHIJKLMN"]);
    expect(grid[0].slice(0, 11).join("")).toBe("ABCDEFGHIJK");
  });

  it("truncates unsupported text safely", () => {
    expect(truncateText("hello*world", 8)).toBe("HELLO WO");
  });

  it("supports large and dense board sizes", () => {
    const large = createEmptyGrid(BOARD_SIZE_PRESETS.large);
    const dense = createEmptyGrid(BOARD_SIZE_PRESETS.dense);

    expect(large).toHaveLength(4);
    expect(large[0]).toHaveLength(16);
    expect(dense).toHaveLength(8);
    expect(dense[0]).toHaveLength(28);
  });

  it("wraps overly long words to the board width", () => {
    expect(wrapText("SUPERCALIFRAGILISTIC", 8)).toEqual(["SUPERCAL", "IFRAGILI", "STIC"]);
  });
});
