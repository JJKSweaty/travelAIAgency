import { NextResponse } from "next/server";
import { getTravelCache, setTravelCache, travelCacheKey } from "@/lib/travel/cache";
import { flightFallbackLinks } from "@/lib/travel/deepLinks";
import { searchKiwiFlights } from "@/lib/travel/providers/flights/kiwiFlights";
import { searchSerpApiFlights } from "@/lib/travel/providers/flights/serpApiFlights";
import type { CurrencyCode, FlightResult } from "@/lib/travel/types";

const SUPPORTED_CURRENCIES = new Set(["USD", "CAD", "EUR", "GBP", "AUD", "JPY", "MXN"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin")?.trim();
  const destination = searchParams.get("destination")?.trim();
  const departureDate = searchParams.get("departureDate")?.trim();
  const returnDate = searchParams.get("returnDate")?.trim() || null;
  const adults = positiveInt(searchParams.get("adults"), 1);
  const currency = currencyParam(searchParams.get("currency"));
  const travelClass = searchParams.get("travelClass")?.trim() || null;

  if (!origin || !destination || !departureDate) {
    return NextResponse.json({ error: "Missing required flight search parameters" }, { status: 400 });
  }

  const links = flightFallbackLinks({ origin, destination, departureDate, returnDate, adults, currency });
  const cacheKey = travelCacheKey("flights", { origin, destination, departureDate, returnDate, adults, currency, travelClass });
  const cached = getTravelCache<FlightRouteResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const serpApiKey = process.env.SERPAPI_KEY;
  const kiwiApiKey = process.env.KIWI_TEQUILA_API_KEY ?? process.env.TEQUILA_API_KEY;

  if (!serpApiKey && !kiwiApiKey) {
    return NextResponse.json({
      flights: [],
      links,
      message: "Live flight providers are not configured. Use a provider search link for current fares."
    });
  }

  const messages: string[] = [];
  let flights: FlightResult[] = [];

  if (serpApiKey) {
    try {
      const result = await searchSerpApiFlights({ apiKey: serpApiKey, origin, destination, departureDate, returnDate, adults, currency, travelClass });
      flights = result.flights;
      if (result.message) messages.push(result.message);
    } catch {
      messages.push("Google Flights provider did not respond.");
    }
  }

  if (!flights.length && kiwiApiKey) {
    try {
      const result = await searchKiwiFlights({ apiKey: kiwiApiKey, origin, destination, departureDate, returnDate, adults, currency });
      flights = result.flights;
      if (result.message) messages.push(result.message);
    } catch {
      messages.push("Kiwi flight provider did not respond.");
    }
  }

  const payload: FlightRouteResponse = {
    flights,
    links: flights.length ? [] : links,
    message: flights.length ? undefined : messages[0] || "No structured flight results are available. Use a provider search link for current fares."
  };

  return NextResponse.json(setTravelCache(cacheKey, payload));
}

type FlightRouteResponse = {
  flights: FlightResult[];
  links: ReturnType<typeof flightFallbackLinks>;
  message?: string;
};

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function currencyParam(value: string | null): CurrencyCode {
  return SUPPORTED_CURRENCIES.has(value ?? "") ? (value as CurrencyCode) : "CAD";
}
