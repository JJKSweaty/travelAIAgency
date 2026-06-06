import { searchLocalLocations } from "./locationSearch";
import type { LocationOption, LocationSuggestionMode } from "./types";

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

type GeocodeCacheEntry = {
  expiresAt: number;
  locations: LocationOption[];
};

const GEOCODE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const geocodeCache = new Map<string, GeocodeCacheEntry>();

export async function suggestLocations(query: string, options: LocationSearchOptions = {}): Promise<LocationOption[]> {
  const mode = options.mode ?? "destination";
  const limit = normalizeLimit(options.limit);
  const local = searchLocalLocations(query, mode, limit);
  const shouldUseGeocoding = query.trim().length >= 2 && !hasStrongLocalMatch(local, query);
  const geocoded = shouldUseGeocoding ? await searchOpenMeteoLocations(query, limit, options.fetcher ?? fetch) : [];
  return mergeLocations([...localResultsFirst(local, query), ...geocoded, ...local], query, mode, limit);
}

export function suggestFallbackLocations(query: string, mode: LocationSuggestionMode = "destination", limit = 8): LocationOption[] {
  return searchLocalLocations(query, mode, normalizeLimit(limit));
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
  const cacheKey = `${trimmed.toLowerCase()}:${limit}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.locations;

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
    const locations = (payload.results ?? []).map(locationFromOpenMeteo).filter((location): location is LocationOption => Boolean(location));
    geocodeCache.set(cacheKey, { locations, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
    return locations;
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
  const localAirport = searchLocalLocations(label, "destination", 1).find((item) => normalize(item.name) === normalize(location.name ?? "") || normalize(item.label) === normalize(label));
  return {
    id: `geocoding-${location.id ?? locationSlug(label)}`,
    name: location.name,
    country,
    label,
    source: "geocoding",
    detail: region || "Global location",
    airportCode: localAirport?.airportCode,
    latitude: numberValue(location.latitude),
    longitude: numberValue(location.longitude),
    population: numberValue(location.population)
  };
}

function hasStrongLocalMatch(locations: LocationOption[], query: string) {
  const normalized = normalize(query);
  return locations.some((location) => {
    if (location.source === "custom") return false;
    return normalize(location.name).startsWith(normalized) || normalize(location.label).startsWith(normalized) || normalize(location.airportCode ?? "") === normalized;
  });
}

function localResultsFirst(locations: LocationOption[], query: string) {
  const normalized = normalize(query);
  return locations.filter((location) => location.source !== "custom" && (normalize(location.name).startsWith(normalized) || normalize(location.label).startsWith(normalized)));
}

function mergeLocations(locations: LocationOption[], query: string, mode: LocationSuggestionMode, limit: number) {
  const normalizedQuery = normalize(query);
  const seen = new Set<string>();
  const merged: LocationOption[] = [];

  for (const location of locations) {
    const key = `${location.name},${location.country},${location.airportCode ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(location);
  }

  if (normalizedQuery && !merged.some((location) => normalize(location.label) === normalizedQuery || normalize(location.name) === normalizedQuery)) {
    merged.unshift(customLocation(query, mode));
  }

  return merged.slice(0, limit);
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

function normalizeLimit(limit = 8) {
  return Math.min(100, Math.max(1, Math.round(limit)));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function uniqueStrings(values: Array<string | undefined>) {
  const cleaned = values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return cleaned.filter((value, index) => cleaned.indexOf(value) === index);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
