import { fireEvent, render, screen } from "@testing-library/react";
import { DisplayErrorBoundary } from "./ErrorBoundaries";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

function KeyboardHarness({
  onToggleRotation,
  onNextScene,
  onPreviousScene,
  onDismissUi,
  onToggleFullscreen,
}: {
  onToggleRotation: () => void;
  onNextScene: () => void;
  onPreviousScene: () => void;
  onDismissUi: () => void;
  onToggleFullscreen: () => void;
}) {
  useKeyboardShortcuts({
    onToggleRotation,
    onNextScene,
    onPreviousScene,
    onDismissUi,
    onToggleFullscreen,
  });

  return <input aria-label="editor" />;
}

function Thrower(): never {
  throw new Error("boom");
}

describe("runtime protections", () => {
  it("renders the display boundary fallback for render crashes", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const openSettings = vi.fn();

    render(
      <DisplayErrorBoundary onOpenSettings={openSettings}>
        <Thrower />
      </DisplayErrorBoundary>,
    );

    expect(screen.getByText("The display view failed to render")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Open Settings"));
    expect(openSettings).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it("fires keyboard shortcuts and ignores focused inputs", () => {
    const handlers = {
      onToggleRotation: vi.fn(),
      onNextScene: vi.fn(),
      onPreviousScene: vi.fn(),
      onDismissUi: vi.fn(),
      onToggleFullscreen: vi.fn(),
    };

    render(<KeyboardHarness {...handlers} />);

    fireEvent.keyDown(window, { code: "Space", key: " " });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "f" });

    expect(handlers.onToggleRotation).toHaveBeenCalledTimes(1);
    expect(handlers.onNextScene).toHaveBeenCalledTimes(1);
    expect(handlers.onPreviousScene).toHaveBeenCalledTimes(1);
    expect(handlers.onDismissUi).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleFullscreen).toHaveBeenCalledTimes(1);

    const input = screen.getByLabelText("editor");
    input.focus();
    fireEvent.keyDown(input, { code: "Space", key: " " });
    fireEvent.keyDown(input, { key: "f" });

    expect(handlers.onToggleRotation).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleFullscreen).toHaveBeenCalledTimes(1);
  });
});
