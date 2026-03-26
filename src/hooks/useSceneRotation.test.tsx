import { renderHook } from "@testing-library/react";
import { act } from "react";
import { DEFAULT_SETTINGS } from "../constants";
import { useSceneRotation } from "./useSceneRotation";

describe("useSceneRotation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not restart autoplay when the board pulses busy during the same scene", () => {
    const onAdvance = vi.fn();
    const playlist = [
      { id: "clockDate" as const, enabled: true, durationSec: 1 },
      { id: "quote" as const, enabled: true, durationSec: 1 },
    ];
    const settings = {
      ...DEFAULT_SETTINGS,
      playlist,
    };

    const { rerender } = renderHook(
      ({ boardBusy }: { boardBusy: boolean }) =>
        useSceneRotation({
          activeSceneId: "clockDate",
          playlist,
          settings,
          rotationPaused: false,
          boardBusy,
          onAdvance,
        }),
      {
        initialProps: {
          boardBusy: false,
        },
      },
    );

    act(() => {
      vi.advanceTimersByTime(80);
    });

    act(() => {
      vi.advanceTimersByTime(420);
    });
    rerender({ boardBusy: true });

    act(() => {
      vi.advanceTimersByTime(80);
    });
    rerender({ boardBusy: false });

    act(() => {
      vi.advanceTimersByTime(520);
    });

    expect(onAdvance).toHaveBeenCalledWith("quote");
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("waits for the board to settle before advancing if the timeout lands mid-flip", () => {
    const onAdvance = vi.fn();
    const playlist = [
      { id: "weather" as const, enabled: true, durationSec: 1 },
      { id: "quote" as const, enabled: true, durationSec: 1 },
    ];
    const settings = {
      ...DEFAULT_SETTINGS,
      playlist,
    };

    const { rerender } = renderHook(
      ({ boardBusy }: { boardBusy: boolean }) =>
        useSceneRotation({
          activeSceneId: "weather",
          playlist,
          settings,
          rotationPaused: false,
          boardBusy,
          onAdvance,
        }),
      {
        initialProps: {
          boardBusy: false,
        },
      },
    );

    act(() => {
      vi.advanceTimersByTime(80);
    });

    rerender({ boardBusy: true });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onAdvance).not.toHaveBeenCalled();

    rerender({ boardBusy: false });

    expect(onAdvance).toHaveBeenCalledWith("quote");
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
