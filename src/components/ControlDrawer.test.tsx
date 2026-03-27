import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_SETTINGS } from "../constants";
import type { AppFeeds } from "../types";
import { ControlDrawer } from "./ControlDrawer";

const feeds: AppFeeds = {
  weather: { status: "ready", data: null, stale: false },
  crypto: { status: "ready", data: [], stale: false },
  news: { status: "ready", data: [], stale: false },
};

describe("ControlDrawer", () => {
  it("opens the help modal from the main drawer and advanced panel", () => {
    render(
      <ControlDrawer
        visible
        settings={DEFAULT_SETTINGS}
        feeds={feeds}
        onRefreshFeeds={vi.fn()}
        activeSceneId="weather"
        rotationPaused={false}
        onSetScene={vi.fn()}
        onPreviousScene={vi.fn()}
        onNextScene={vi.fn()}
        onSendMessage={vi.fn()}
        onToggleRotation={vi.fn()}
        onToggleFullscreen={vi.fn()}
        onEngagementChange={vi.fn()}
        onSettingsChange={vi.fn()}
        isFullscreen={false}
        wakeLock={{ supported: true, active: true }}
        onOpenOnboarding={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Info & Setup" })[0]);
    expect(screen.getByRole("heading", { name: "Set up your display in a minute" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next: Controls" }));
    expect(screen.getByRole("heading", { name: "How the control panel works" })).toBeInTheDocument();
    expect(screen.getByText("Main controls")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Open advanced controls" }));
    const helpButtons = screen.getAllByRole("button", { name: "Info & Setup" });
    const advancedHelpButton = helpButtons[helpButtons.length - 1];
    expect(advancedHelpButton).toBeDefined();
    fireEvent.click(advancedHelpButton!);
    expect(screen.getByText("Start here")).toBeInTheDocument();
  });
});
