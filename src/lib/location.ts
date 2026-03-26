import type { LocationSelection } from "../types";

interface ReverseGeocodeResponse {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<LocationSelection | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.searchParams.set("latitude", `${latitude}`);
  url.searchParams.set("longitude", `${longitude}`);
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const payload = (await response.json()) as ReverseGeocodeResponse;
  const result = payload.results?.[0];
  if (!result) {
    return null;
  }

  return {
    label: `${result.name}${result.country ? `, ${result.country}` : ""}`.toUpperCase(),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    country: result.country,
  };
}

export function requestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 10 * 60 * 1000,
    });
  });
}
