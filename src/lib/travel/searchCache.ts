import type { CurrencyCode, FlightResult, HotelResult } from "./types";

export const FLIGHT_SEARCH_TTL_MS = 15 * 60 * 1000;
export const HOTEL_PRICE_TTL_MS = 30 * 60 * 1000;

export type FlightSearchKeyInput = {
  origin: string;
  destination: string;
  travelMonth?: string | null;
  departureDate: string;
  returnDate?: string | null;
  tripLengthDays?: number;
  travelers: number;
  budget?: number;
  currency?: CurrencyCode;
  cabinClass?: string | null;
  flightFilters?: string | null;
};

export type HotelSearchKeyInput = {
  destination: string;
  travelMonth?: string | null;
  checkInDate: string;
  checkOutDate: string;
  tripLengthDays?: number;
  guests: number;
  rooms: number;
  budget?: number;
  currency?: CurrencyCode;
  hotelFilters?: string | null;
};

export type BrowserSearchCacheEntry =
  | { kind: "flights"; key: string; fetchedAt: string; results: FlightResult[] }
  | { kind: "hotels"; key: string; fetchedAt: string; results: HotelResult[] };

export function flightSearchKey(input: FlightSearchKeyInput) {
  return stableSearchKey([
    input.origin,
    input.destination,
    input.travelMonth ?? "",
    input.departureDate,
    input.returnDate ?? "",
    input.tripLengthDays ?? "",
    input.travelers,
    input.budget ?? "",
    input.currency ?? "CAD",
    input.cabinClass ?? "",
    input.flightFilters ?? ""
  ]);
}

export function hotelSearchKey(input: HotelSearchKeyInput) {
  return stableSearchKey([
    input.destination,
    input.travelMonth ?? "",
    input.checkInDate,
    input.checkOutDate,
    input.tripLengthDays ?? "",
    input.guests,
    input.rooms,
    input.budget ?? "",
    input.currency ?? "CAD",
    input.hotelFilters ?? ""
  ]);
}

export function isFresh(fetchedAt: string | undefined, ttlMs: number, now = Date.now()) {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  return Number.isFinite(fetched) && now - fetched < ttlMs;
}

export function readBrowserSearchCache(kind: BrowserSearchCacheEntry["kind"], key: string): BrowserSearchCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(browserCacheStorageKey(kind, key));
    return raw ? (JSON.parse(raw) as BrowserSearchCacheEntry) : null;
  } catch {
    return null;
  }
}

export function writeBrowserSearchCache(entry: BrowserSearchCacheEntry) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(browserCacheStorageKey(entry.kind, entry.key), JSON.stringify(entry));
}

function stableSearchKey(parts: Array<string | number>) {
  return parts.map((part) => String(part).trim().toLowerCase()).join("|");
}

function browserCacheStorageKey(kind: BrowserSearchCacheEntry["kind"], key: string) {
  return `roamly.${kind}.search.${key}`;
}
