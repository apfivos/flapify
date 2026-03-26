import { getSequentialFlapSteps } from "./flap";

describe("flap sequencing", () => {
  it("cycles digits in order with wraparound", () => {
    expect(getSequentialFlapSteps("3", "6")).toEqual(["4", "5", "6"]);
    expect(getSequentialFlapSteps("9", "0")).toEqual(["0"]);
  });

  it("walks the full character ring for letters", () => {
    expect(getSequentialFlapSteps("A", "D")).toEqual(["B", "C", "D"]);
  });

  it("falls directly to blank targets", () => {
    expect(getSequentialFlapSteps("A", " ")).toEqual([" "]);
  });
});
