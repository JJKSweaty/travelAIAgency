import { NextResponse } from "next/server";
import { getTravelCache, setTravelCache, travelCacheKey } from "@/lib/travel/cache";
import { flightFallbackLinks } from "@/lib/travel/deepLinks";
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

  if (!serpApiKey) {
    return NextResponse.json({ error: "SERPAPI_KEY is not configured", flights: [], links }, { status: 500 });
  }

  try {
    const result = await searchSerpApiFlights({ apiKey: serpApiKey, origin, destination, departureDate, returnDate, adults, currency, travelClass });
    const flights = result.flights;

    const payload: FlightRouteResponse = {
      flights,
      links: flights.length ? [] : links,
      message: flights.length ? undefined : result.message || "No structured SerpApi Google Flights results are available. Use a provider search link for the latest options."
    };

    return NextResponse.json(setTravelCache(cacheKey, payload));
  } catch {
    return NextResponse.json({ error: "Flight provider request failed", flights: [], links }, { status: 502 });
  }
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
