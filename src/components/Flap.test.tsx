import { act, render } from "@testing-library/react";
import { Flap } from "./Flap";

describe("Flap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("keeps the previous glyph visible until the delayed flip starts", () => {
    const { container, rerender } = render(
      <Flap char="A" prevChar="A" />,
    );

    expect(container.textContent).toContain("A");
    expect(container.textContent).not.toContain("B");

    rerender(<Flap char="B" prevChar="A" />);

    expect(container.textContent).toContain("A");
    expect(container.textContent).not.toContain("B");

    rerender(<Flap char="B" prevChar="A" flipToken={1} />);

    act(() => {
      vi.runAllTimers();
    });

    expect(container.textContent).toContain("B");
  });

  it("cancels an in-flight flip when a new delayed target arrives", () => {
    const { container, rerender } = render(
      <Flap char="A" prevChar="A" />,
    );

    rerender(<Flap char="B" prevChar="A" flipToken={1} />);
    rerender(<Flap char="C" prevChar="A" />);

    expect(container.textContent).toContain("A");
    expect(container.textContent).not.toContain("B");
    expect(container.textContent).not.toContain("C");

    rerender(<Flap char="C" prevChar="A" flipToken={2} />);

    act(() => {
      vi.runAllTimers();
    });

    expect(container.textContent).toContain("C");
  });
});
