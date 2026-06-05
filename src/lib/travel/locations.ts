import { destinations } from "./fallback-data";
import type { DestinationOption, LocationOption, LocationSuggestionMode } from "./types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type OpenMeteoSearchResponse = {
  results?: OpenMeteoLocation[];
};

type OpenMeteoLocation = {
  id?: number;
  name?: string;
  country?: string;
  admin1?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
};

type LocationSearchOptions = {
  mode?: LocationSuggestionMode;
  limit?: number;
  fetcher?: FetchLike;
};

export async function suggestLocations(query: string, options: LocationSearchOptions = {}): Promise<LocationOption[]> {
  const mode = options.mode ?? "destination";
  const limit = normalizeLimit(options.limit);
  const fallback = suggestFallbackLocations(query, mode, limit);
  const geocoded = await searchOpenMeteoLocations(query, limit, options.fetcher ?? fetch);
  return mergeLocations([...geocoded, ...fallback], query, mode, limit);
}

export function suggestFallbackLocations(query: string, mode: LocationSuggestionMode = "destination", limit = 8): LocationOption[] {
  const normalized = query.trim().toLowerCase();
  const ranked = destinations
    .map((destination) => ({
      location: locationFromDestination(destination),
      score: normalized ? locationMatchScore(destination, normalized) : destination.trendingScore
    }))
    .filter((entry) => !normalized || entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.location.population ?? 0) - Number(a.location.population ?? 0))
    .slice(0, limit)
    .map((entry) => entry.location);

  if (!normalized) return ranked;
  return mergeLocations([customLocation(query, mode), ...ranked], query, mode, limit);
}

export function parseLocationLabel(value: string) {
  const trimmed = value.trim();
  const [rawName, ...countryParts] = trimmed.split(",");
  const name = titleCase(rawName || trimmed || "Custom location");
  const country = countryParts.join(",").trim();
  const formattedCountry = country ? titleCase(country) : undefined;
  return {
    name,
    country: formattedCountry,
    label: formattedCountry ? `${name}, ${formattedCountry}` : name
  };
}

export function locationSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "location";
}

async function searchOpenMeteoLocations(query: string, limit: number, fetcher: FetchLike): Promise<LocationOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LOCATION_SEARCH_TIMEOUT_MS ?? 2500));
  const baseUrl = process.env.OPEN_METEO_GEOCODING_BASE_URL ?? "https://geocoding-api.open-meteo.com/v1/search";
  const url = new URL(baseUrl);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(Math.min(100, Math.max(1, limit))));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  if (process.env.OPEN_METEO_API_KEY) url.searchParams.set("apikey", process.env.OPEN_METEO_API_KEY);

  try {
    const response = await fetcher(url.toString(), { signal: controller.signal });
    if (!response.ok) return [];
    const payload = (await response.json()) as OpenMeteoSearchResponse;
    return (payload.results ?? []).map(locationFromOpenMeteo).filter((location): location is LocationOption => Boolean(location));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function locationFromOpenMeteo(location: OpenMeteoLocation): LocationOption | null {
  if (!location.name) return null;
  const country = location.country?.trim() || "Global location";
  const label = country ? `${location.name}, ${country}` : location.name;
  const region = uniqueStrings([location.admin1, country]).join(", ");
  return {
    id: `geocoding-${location.id ?? locationSlug(label)}`,
    name: location.name,
    country,
    label,
    source: "geocoding",
    detail: region || "Global location",
    latitude: numberValue(location.latitude),
    longitude: numberValue(location.longitude),
    population: numberValue(location.population)
  };
}

function locationFromDestination(destination: DestinationOption): LocationOption {
  return {
    id: `curated-${destination.id}`,
    name: destination.name,
    country: destination.country,
    label: `${destination.name}, ${destination.country}`,
    source: "curated",
    detail: "Curated travel seed",
    costLevel: destination.costLevel,
    bestFor: destination.bestFor
  };
}

function customLocation(query: string, mode: LocationSuggestionMode): LocationOption {
  const parsed = parseLocationLabel(query);
  return {
    id: `custom-${mode}-${locationSlug(parsed.label)}`,
    name: parsed.name,
    country: parsed.country ?? (mode === "origin" ? "Global origin" : "Global destination"),
    label: parsed.label,
    source: "custom",
    detail: mode === "origin" ? "Use this typed origin" : "Use this typed destination"
  };
}

function mergeLocations(locations: LocationOption[], query: string, mode: LocationSuggestionMode, limit: number) {
  const normalizedQuery = query.trim().toLowerCase();
  const seen = new Set<string>();
  const merged: LocationOption[] = [];

  for (const location of locations) {
    const key = `${location.name},${location.country}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(location);
  }

  if (normalizedQuery && !merged.some((location) => location.label.toLowerCase() === normalizedQuery || location.name.toLowerCase() === normalizedQuery)) {
    merged.unshift(customLocation(query, mode));
  }

  return merged.slice(0, limit);
}

function locationMatchScore(destination: DestinationOption, normalized: string): number {
  const name = destination.name.toLowerCase();
  const country = destination.country.toLowerCase();
  const interests = destination.bestFor.join(" ");

  if (name === normalized) return 140;
  if (`${name}, ${country}` === normalized) return 135;
  if (name.startsWith(normalized)) return 110;
  if (name.includes(normalized)) return 85;
  if (country.startsWith(normalized)) return 45;
  if (country.includes(normalized)) return 32;
  if (interests.includes(normalized)) return 20;
  return 0;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeLimit(limit = 8) {
  return Math.min(100, Math.max(1, Math.round(limit)));
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  const cleaned = values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return cleaned.filter((value, index) => cleaned.indexOf(value) === index);
}
