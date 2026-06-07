import { normalizeKiwiFlight, type FlightNormalizeParams, type KiwiFlightItem } from "../../normalizers/normalizeFlight";
import type { CurrencyCode, FlightResult } from "../../types";

export type KiwiFlightSearchParams = {
  apiKey: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  currency: CurrencyCode;
};

export async function searchKiwiFlights(params: KiwiFlightSearchParams): Promise<{ flights: FlightResult[]; message?: string }> {
  const [originLocation, destinationLocation] = await Promise.all([resolveKiwiLocation(params.apiKey, params.origin), resolveKiwiLocation(params.apiKey, params.destination)]);
  if (!originLocation || !destinationLocation) {
    return { flights: [], message: "I could not match that route to current flight listings." };
  }

  const searchParams = new URLSearchParams({
    fly_from: originLocation,
    fly_to: destinationLocation,
    date_from: formatKiwiDate(params.departureDate),
    date_to: formatKiwiDate(params.departureDate),
    adults: String(params.adults),
    curr: params.currency,
    limit: "8"
  });
  if (params.returnDate) searchParams.set("return_from", formatKiwiDate(params.returnDate));
  if (params.returnDate) searchParams.set("return_to", formatKiwiDate(params.returnDate));

  const response = await fetch(`https://tequila-api.kiwi.com/v2/search?${searchParams}`, {
    headers: { apikey: params.apiKey }
  });
  if (!response.ok) throw new Error(`Kiwi flight provider request failed with ${response.status}`);

  const payload = (await response.json()) as { data?: KiwiFlightItem[] };
  const fetchedAt = new Date().toISOString();
  const normalizeParams: FlightNormalizeParams = { ...params, fetchedAt };
  const flights = (payload.data ?? [])
    .map((item, index) => normalizeKiwiFlight(item, index, normalizeParams))
    .filter((flight): flight is FlightResult => Boolean(flight));

  return {
    flights,
    message: flights.length ? undefined : "I could not find current flight options for this exact search."
  };
}

async function resolveKiwiLocation(apiKey: string, query: string) {
  if (/^[A-Z]{3}$/i.test(query.trim())) return query.trim().toUpperCase();
  const params = new URLSearchParams({ term: query, locale: "en-US", location_types: "airport,city", limit: "1" });
  const response = await fetch(`https://tequila-api.kiwi.com/locations/query?${params}`, {
    headers: { apikey: apiKey }
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { locations?: { code?: string; id?: string }[] };
  return payload.locations?.[0]?.code ?? payload.locations?.[0]?.id ?? null;
}

function formatKiwiDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
