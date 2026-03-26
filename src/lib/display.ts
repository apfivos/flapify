import type { PersistedSettings } from "../types";

function timeStringToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
}

function displayTimeZone(settings: PersistedSettings): string | undefined {
  return settings.timezoneMode === "location" ? settings.location?.timezone : undefined;
}

function zonedNow(now: Date, timeZone?: string): Date {
  if (!timeZone) {
    return now;
  }

  const localized = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const valueFor = (type: string) => localized.find((part) => part.type === type)?.value ?? "00";
  return new Date(
    `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}T${valueFor("hour")}:${valueFor("minute")}:${valueFor("second")}`,
  );
}

function isWithinWindow(minutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }

  return minutes >= startMinutes || minutes < endMinutes;
}

export function resolveActiveDimLevel(settings: PersistedSettings, now: Date): number {
  if (!settings.dimming.enabled) {
    return 0;
  }

  const timeZone = displayTimeZone(settings);
  const effectiveNow = zonedNow(now, timeZone);
  const minutes = effectiveNow.getHours() * 60 + effectiveNow.getMinutes();
  const scheduleActive = settings.dimming.scheduleEnabled
    ? isWithinWindow(
        minutes,
        timeStringToMinutes(settings.dimming.start),
        timeStringToMinutes(settings.dimming.end),
      )
    : true;

  return scheduleActive ? settings.dimming.level : 0;
}
