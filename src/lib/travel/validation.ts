import type { FlightResult, HotelResult } from "./types";

const PRICE_TTL_MS = 30 * 60 * 1000;
const PLACEHOLDER_IMAGE_PATTERNS = [/placeholder/i, /image-not-available/i, /no[-_ ]?image/i, /blank/i];

export function validateFlightResult(result: FlightResult): FlightResult | null {
  if (!result.airlineName?.trim()) return null;
  if (!result.originAirport?.trim() || !result.destinationAirport?.trim()) return null;
  if (!result.departureTime?.trim() || !result.arrivalTime?.trim()) return null;
  if (!result.source || !result.fetchedAt) return null;
  if ((result.totalPrice !== null || result.pricePerTraveler !== null) && !result.fetchedAt) return null;
  return result;
}

export function validateHotelResult(result: HotelResult): HotelResult | null {
  if (!result.name?.trim()) return null;
  if (result.imageUrl && PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => pattern.test(result.imageUrl ?? ""))) return null;
  if ((result.guestRating !== null || result.reviewCount !== null) && !result.source) return null;
  if ((result.pricePerNight !== null || result.totalPrice !== null) && (!result.source || !result.fetchedAt)) return null;
  return result;
}

export function isPriceStale(fetchedAt?: string | null, now = Date.now()) {
  if (!fetchedAt) return false;
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(fetched)) return false;
  return now - fetched > PRICE_TTL_MS;
}

export function stalePriceMessage(fetchedAt?: string | null) {
  return isPriceStale(fetchedAt) ? "Price may have changed. View listing for latest price." : null;
}
