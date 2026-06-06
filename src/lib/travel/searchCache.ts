import type { CurrencyCode, FlightResult, HotelResult } from "./types";

export const FLIGHT_SEARCH_TTL_MS = 15 * 60 * 1000;
export const HOTEL_PRICE_TTL_MS = 30 * 60 * 1000;

export type FlightSearchKeyInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  travelers: number;
  currency?: CurrencyCode;
  cabinClass?: string | null;
};

export type HotelSearchKeyInput = {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms: number;
  currency?: CurrencyCode;
};

export type BrowserSearchCacheEntry =
  | { kind: "flights"; key: string; fetchedAt: string; results: FlightResult[] }
  | { kind: "hotels"; key: string; fetchedAt: string; results: HotelResult[] };

export function flightSearchKey(input: FlightSearchKeyInput) {
  return stableSearchKey([
    input.origin,
    input.destination,
    input.departureDate,
    input.returnDate ?? "",
    input.travelers,
    input.currency ?? "CAD",
    input.cabinClass ?? ""
  ]);
}

export function hotelSearchKey(input: HotelSearchKeyInput) {
  return stableSearchKey([input.destination, input.checkInDate, input.checkOutDate, input.guests, input.rooms, input.currency ?? "CAD"]);
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
