import { flightFallbackLinks, googleFlightsSearchUrl } from "../../deepLinks";
import { normalizeSerpFlight, type FlightNormalizeParams, type SerpApiFlightGroup } from "../../normalizers/normalizeSerpFlight";
import type { CurrencyCode, FlightResult } from "../../types";

export type SerpApiFlightSearchParams = {
  apiKey: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  currency: CurrencyCode;
  travelClass?: string | null;
};

export async function searchSerpApiFlights(params: SerpApiFlightSearchParams): Promise<{ flights: FlightResult[]; message?: string }> {
  const serpParams = new URLSearchParams({
    engine: "google_flights",
    departure_id: params.origin,
    arrival_id: params.destination,
    outbound_date: params.departureDate,
    adults: String(params.adults),
    currency: params.currency,
    hl: "en",
    api_key: params.apiKey
  });

  if (params.returnDate) serpParams.set("return_date", params.returnDate);
  if (params.travelClass) serpParams.set("travel_class", params.travelClass);

  const response = await fetch(`https://serpapi.com/search.json?${serpParams}`);
  if (!response.ok) throw new Error(`Flight provider request failed with ${response.status}`);

  const payload = (await response.json()) as SerpApiFlightResponse;
  const fetchedAt = new Date().toISOString();
  const normalizeParams: FlightNormalizeParams = { ...params, sourceUrl: payload.google_flights_url ?? null, fetchedAt };
  const groups = [...(payload.best_flights ?? []), ...(payload.other_flights ?? [])];
  const flights = groups
    .map((group, index) => normalizeSerpFlight(group, index, normalizeParams))
    .filter((flight): flight is FlightResult => Boolean(flight));

  return {
    flights,
    message: flights.length ? undefined : "No structured Google Flights results were returned for this search."
  };
}

export function serpApiFlightSearchLinks(params: Omit<SerpApiFlightSearchParams, "apiKey">) {
  return {
    googleFlightsUrl: googleFlightsSearchUrl(params),
    fallbackLinks: flightFallbackLinks(params)
  };
}

type SerpApiFlightResponse = {
  google_flights_url?: string;
  best_flights?: SerpApiFlightGroup[];
  other_flights?: SerpApiFlightGroup[];
};
