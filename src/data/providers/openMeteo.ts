import { WEATHER_CODE_LABELS } from "../../constants";
import type {
  FeedAdapter,
  LocationSelection,
  PersistedSettings,
  WeatherData,
} from "../../types";

interface OpenMeteoGeocodeResponse {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone: string;
    admin1?: string;
  }>;
}

interface OpenMeteoForecastResponse {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    time: string;
  };
  daily?: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function weatherLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "CURRENT CONDITIONS";
}

export async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationSelection[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const payload = (await response.json()) as OpenMeteoGeocodeResponse;

  return (payload.results ?? []).map((result) => ({
    label: `${result.name}${result.country ? `, ${result.country}` : ""}`.toUpperCase(),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    country: result.country,
  }));
}

export const openMeteoAdapter: FeedAdapter<WeatherData | null, OpenMeteoForecastResponse> = {
  id: "weather",
  pollIntervalMs: 10 * 60 * 1000,
  staleAfterMs: 30 * 60 * 1000,
  isConfigured: (settings) => Boolean(settings.location),
  getCacheKey: (settings) =>
    settings.location
      ? `weather:${settings.location.latitude}:${settings.location.longitude}:${settings.timezoneMode}`
      : "weather:unconfigured",
  empty: () => null,
  async load(settings, signal) {
    if (!settings.location) {
      throw new Error("Location not configured");
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", `${settings.location.latitude}`);
    url.searchParams.set("longitude", `${settings.location.longitude}`);
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    );
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set(
      "timezone",
      settings.timezoneMode === "location" ? settings.location.timezone : "auto",
    );

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error("Weather request failed");
    }

    return (await response.json()) as OpenMeteoForecastResponse;
  },
  normalize(raw, settings) {
    const locationLabel = settings.location?.label ?? "LOCATION UNKNOWN";
    return {
      locationLabel,
      summary: weatherLabel(raw.current?.weather_code ?? 0),
      temperatureC: raw.current?.temperature_2m ?? 0,
      apparentTemperatureC: raw.current?.apparent_temperature ?? 0,
      highC: raw.daily?.temperature_2m_max?.[0] ?? 0,
      lowC: raw.daily?.temperature_2m_min?.[0] ?? 0,
      windKph: raw.current?.wind_speed_10m ?? 0,
      updatedAt: raw.current?.time ?? new Date().toISOString(),
    };
  },
};
