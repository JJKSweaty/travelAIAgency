import airports from "./data/airports.json";
import popularCities from "./data/popularCities.json";
import type { LocationOption, LocationSuggestionMode } from "./types";

type LocalAirport = {
  city: string;
  country: string;
  airportCode?: string;
  airportName?: string;
  aliases?: string[];
};

const RECENT_LOCATIONS_KEY = "roamly.recentLocations";

export function searchLocalLocations(query: string, mode: LocationSuggestionMode = "destination", limit = 8): LocationOption[] {
  const normalized = normalize(query);
  const localMatches = localLocationIndex()
    .map((location) => ({ location, score: scoreLocation(location, normalized) }))
    .filter((entry) => !normalized || entry.score > 0)
    .sort((a, b) => b.score - a.score || a.location.label.localeCompare(b.location.label))
    .map((entry) => entry.location);
  const recentMatches = searchRecentLocations(normalized);
  const merged = mergeLocations([...recentMatches, ...localMatches], limit);

  if (!normalized) return merged;
  if (merged.some((location) => normalize(location.label) === normalized || normalize(location.name) === normalized)) return merged;
  return [customLocation(query, mode), ...merged].slice(0, limit);
}

export function rememberRecentLocation(location: Pick<LocationOption, "label" | "name" | "country" | "airportCode">) {
  if (typeof window === "undefined") return;
  const current = readRecentLocations();
  const next = mergeLocations(
    [
      {
        id: `recent-${locationSlug(location.label)}`,
        label: location.label,
        name: location.name,
        country: location.country,
        airportCode: location.airportCode,
        source: "curated" as const,
        detail: location.airportCode ? `Recent search - ${location.airportCode}` : "Recent search"
      },
      ...current
    ],
    12
  );
  window.localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(next));
}

export function readRecentLocations(): LocationOption[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LOCATIONS_KEY);
    return raw ? (JSON.parse(raw) as LocationOption[]) : [];
  } catch {
    return [];
  }
}

function localLocationIndex(): LocationOption[] {
  const airportOptions = (airports as LocalAirport[]).map((airport) => locationFromLocal(airport, "airport"));
  const cityOptions = (popularCities as LocalAirport[]).map((city) => locationFromLocal(city, "city"));
  return mergeLocations([...airportOptions, ...cityOptions], 100);
}

function locationFromLocal(location: LocalAirport, sourceType: "airport" | "city"): LocationOption {
  const label = `${location.city}, ${location.country}`;
  return {
    id: `${sourceType}-${locationSlug(label)}-${location.airportCode ?? "city"}`,
    name: location.city,
    country: location.country,
    label,
    source: "curated",
    detail: location.airportCode ? `${location.airportCode} - ${location.airportName ?? "Primary airport"}` : "Popular city",
    airportCode: location.airportCode
  };
}

function searchRecentLocations(normalizedQuery: string) {
  if (!normalizedQuery) return readRecentLocations();
  return readRecentLocations().filter((location) => scoreLocation(location, normalizedQuery) > 0);
}

function scoreLocation(location: LocationOption, normalizedQuery: string) {
  if (!normalizedQuery) return 1;
  const values = [location.name, location.country, location.label, location.airportCode, location.detail].map((value) => normalize(value ?? ""));
  if (values.some((value) => value === normalizedQuery)) return 120;
  if (values.some((value) => value.startsWith(normalizedQuery))) return 80;
  if (values.some((value) => value.includes(normalizedQuery))) return 40;
  return 0;
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

function parseLocationLabel(value: string) {
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

function mergeLocations(locations: LocationOption[], limit: number) {
  const seen = new Set<string>();
  const merged: LocationOption[] = [];
  for (const location of locations) {
    const key = `${location.name},${location.country},${location.airportCode ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(location);
  }
  return merged.slice(0, limit);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function locationSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "location";
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
