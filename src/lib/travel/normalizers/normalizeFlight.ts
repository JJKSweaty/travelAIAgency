import type { CurrencyCode, FlightLayover, FlightResult } from "../types";
import { validateFlightResult } from "../validation";

export type FlightNormalizeParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  currency: CurrencyCode;
  sourceUrl?: string | null;
  fetchedAt?: string;
};

export function normalizeSerpApiFlightGroup(group: SerpApiFlightGroup, index: number, params: FlightNormalizeParams): FlightResult | null {
  const legs = group.flights ?? [];
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const totalPrice = numberFrom(group.price);
  const fetchedAt = params.fetchedAt ?? new Date().toISOString();
  const result: FlightResult = {
    id: `serpapi-flight-${group.booking_token ?? stableId(`${firstLeg?.airline ?? ""}-${firstLeg?.flight_number ?? ""}-${index}`)}`,
    source: "SerpApi Google Flights",
    sourceUrl: params.sourceUrl ?? null,
    airlineName: firstLeg?.airline?.trim() ?? null,
    airlineLogoUrl: firstLeg?.airline_logo ?? group.airline_logo ?? null,
    flightNumber: firstLeg?.flight_number ?? null,
    originAirport: firstLeg?.departure_airport?.id ?? params.origin,
    destinationAirport: lastLeg?.arrival_airport?.id ?? params.destination,
    departureTime: firstLeg?.departure_airport?.time ?? null,
    arrivalTime: lastLeg?.arrival_airport?.time ?? null,
    duration: numberFrom(group.total_duration) ?? null,
    stops: Math.max(0, legs.length - 1),
    layovers: normalizeLayovers(group.layovers),
    cabin: firstLeg?.travel_class ?? group.travel_class ?? null,
    baggage: stringArray(group.extensions).length ? stringArray(group.extensions) : stringArray(firstLeg?.extensions),
    fareType: group.type ?? null,
    pricePerTraveler: totalPrice,
    totalPrice,
    currency: params.currency,
    fetchedAt,
    isLivePrice: totalPrice !== null,
    dataQuality: "provider",
    bookingToken: group.booking_token ?? null
  };
  return validateFlightResult(result);
}

export function normalizeKiwiFlight(item: KiwiFlightItem, index: number, params: FlightNormalizeParams): FlightResult | null {
  const route = item.route ?? [];
  const firstLeg = route[0];
  const lastLeg = route[route.length - 1];
  const totalPrice = numberFrom(item.price);
  const fetchedAt = params.fetchedAt ?? new Date().toISOString();
  const airlineCode = firstLeg?.airline ?? item.airlines?.[0] ?? null;
  const result: FlightResult = {
    id: `kiwi-flight-${item.id ?? stableId(`${airlineCode ?? ""}-${item.flyFrom ?? ""}-${item.flyTo ?? ""}-${index}`)}`,
    source: "Kiwi Tequila",
    sourceUrl: item.deep_link ?? null,
    airlineName: airlineCode,
    airlineLogoUrl: airlineCode ? `https://images.kiwi.com/airlines/64/${airlineCode}.png` : null,
    flightNumber: firstLeg?.flight_no && airlineCode ? `${airlineCode} ${firstLeg.flight_no}` : null,
    originAirport: firstLeg?.flyFrom ?? item.flyFrom ?? params.origin,
    destinationAirport: lastLeg?.flyTo ?? item.flyTo ?? params.destination,
    departureTime: firstLeg?.local_departure ?? item.local_departure ?? null,
    arrivalTime: lastLeg?.local_arrival ?? item.local_arrival ?? null,
    duration: item.duration?.total ? Math.round(item.duration.total / 60) : null,
    stops: Math.max(0, route.length - 1),
    layovers: route.slice(0, -1).map((leg) => ({ airport: leg.flyTo })),
    cabin: null,
    baggage: [],
    fareType: null,
    pricePerTraveler: totalPrice === null ? null : Math.round(totalPrice / Math.max(1, params.adults)),
    totalPrice,
    currency: params.currency,
    fetchedAt,
    isLivePrice: totalPrice !== null,
    dataQuality: "provider",
    bookingToken: null
  };
  return validateFlightResult(result);
}

export type SerpApiFlightGroup = {
  booking_token?: string;
  price?: number | string;
  total_duration?: number | string;
  type?: string;
  travel_class?: string;
  airline_logo?: string;
  extensions?: unknown[];
  layovers?: unknown[];
  flights?: {
    airline?: string;
    airline_logo?: string;
    flight_number?: string;
    travel_class?: string;
    extensions?: unknown[];
    departure_airport?: { id?: string; time?: string };
    arrival_airport?: { id?: string; time?: string };
  }[];
};

export type KiwiFlightItem = {
  id?: string;
  flyFrom?: string;
  flyTo?: string;
  local_departure?: string;
  local_arrival?: string;
  price?: number | string;
  deep_link?: string;
  airlines?: string[];
  duration?: { total?: number };
  route?: {
    airline?: string;
    flight_no?: string | number;
    flyFrom?: string;
    flyTo?: string;
    local_departure?: string;
    local_arrival?: string;
  }[];
};

function normalizeLayovers(value?: unknown[]): FlightLayover[] {
  return (value ?? []).map((item) => {
    if (!item || typeof item !== "object") return {};
    const record = item as Record<string, unknown>;
    return {
      airport: stringFrom(record.id) ?? stringFrom(record.name) ?? undefined,
      duration: numberFrom(record.duration) ?? stringFrom(record.duration) ?? undefined
    };
  });
}

function stringArray(value?: unknown[]) {
  return (value ?? []).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
