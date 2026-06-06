import { NextResponse } from "next/server";
import { getTravelCache, setTravelCache, travelCacheKey } from "@/lib/travel/cache";
import { hotelFallbackLinks } from "@/lib/travel/deepLinks";
import { searchSerpApiHotels } from "@/lib/travel/providers/hotels/serpApiHotels";
import type { CurrencyCode, HotelResult } from "@/lib/travel/types";

const SUPPORTED_CURRENCIES = new Set(["USD", "CAD", "EUR", "GBP", "AUD", "JPY", "MXN"]);
const HOTEL_SEARCH_TTL_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get("destination")?.trim();
  const checkInDate = searchParams.get("checkInDate")?.trim();
  const checkOutDate = searchParams.get("checkOutDate")?.trim();
  const adults = positiveInt(searchParams.get("adults"), 1);
  const children = optionalPositiveInt(searchParams.get("children"));
  const rooms = positiveInt(searchParams.get("rooms"), 1);
  const currency = currencyParam(searchParams.get("currency"));

  if (!destination || !checkInDate || !checkOutDate) {
    return NextResponse.json({ error: "Missing required hotel search parameters" }, { status: 400 });
  }

  const links = hotelFallbackLinks({ destination, checkInDate, checkOutDate, adults, currency });
  const cacheKey = travelCacheKey("hotels", { destination, checkInDate, checkOutDate, adults, children, rooms, currency });
  const cached = getTravelCache<HotelRouteResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const serpApiKey = process.env.SERPAPI_KEY;

  if (!serpApiKey) {
    return NextResponse.json({ error: "SERPAPI_KEY is not configured", hotels: [], links }, { status: 500 });
  }

  try {
    const result = await searchSerpApiHotels({ apiKey: serpApiKey, destination, checkInDate, checkOutDate, adults, children, rooms, currency });
    const hotels = result.hotels;
    const payload: HotelRouteResponse = {
      hotels,
      links: hotels.length ? [] : links,
      message: hotels.length ? undefined : result.message || "No SerpApi Google Hotels results are available. Use a provider search link for the latest options."
    };

    return NextResponse.json(setTravelCache(cacheKey, payload, HOTEL_SEARCH_TTL_MS));
  } catch {
    return NextResponse.json({ error: "Hotel provider request failed", hotels: [], links }, { status: 502 });
  }
}

type HotelRouteResponse = {
  hotels: HotelResult[];
  links: ReturnType<typeof hotelFallbackLinks>;
  message?: string;
};

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalPositiveInt(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function currencyParam(value: string | null): CurrencyCode {
  return SUPPORTED_CURRENCIES.has(value ?? "") ? (value as CurrencyCode) : "CAD";
}
