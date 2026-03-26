import { DEFAULT_SETTINGS } from "../constants";
import { resolveActiveDimLevel } from "./display";

describe("display dimming", () => {
  it("returns zero when dimming is disabled", () => {
    expect(resolveActiveDimLevel(DEFAULT_SETTINGS, new Date("2026-03-26T21:00:00Z"))).toBe(0);
  });

  it("applies manual dimming without a schedule", () => {
    expect(
      resolveActiveDimLevel(
        {
          ...DEFAULT_SETTINGS,
          dimming: {
            ...DEFAULT_SETTINGS.dimming,
            enabled: true,
            level: 0.35,
          },
        },
        new Date("2026-03-26T12:00:00Z"),
      ),
    ).toBe(0.35);
  });

  it("applies scheduled dimming inside quiet hours", () => {
    expect(
      resolveActiveDimLevel(
        {
          ...DEFAULT_SETTINGS,
          dimming: {
            enabled: true,
            level: 0.4,
            scheduleEnabled: true,
            start: "22:00",
            end: "07:00",
          },
        },
        new Date("2026-03-26T23:00:00Z"),
      ),
    ).toBe(0.4);
  });

  it("disables scheduled dimming outside quiet hours", () => {
    expect(
      resolveActiveDimLevel(
        {
          ...DEFAULT_SETTINGS,
          dimming: {
            enabled: true,
            level: 0.4,
            scheduleEnabled: true,
            start: "22:00",
            end: "07:00",
          },
        },
        new Date("2026-03-26T12:00:00Z"),
      ),
    ).toBe(0);
  });
});
