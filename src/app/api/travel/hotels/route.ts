import { NextResponse } from "next/server";
import { getTravelCache, setTravelCache, travelCacheKey } from "@/lib/travel/cache";
import { hotelFallbackLinks } from "@/lib/travel/deepLinks";
import { searchGooglePlacesHotels } from "@/lib/travel/providers/hotels/googlePlacesHotels";
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
  const googlePlacesKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

  if (!serpApiKey && !googlePlacesKey) {
    return NextResponse.json({
      hotels: [],
      links,
      message: "Live hotel providers are not configured. Use a provider search link for current rates."
    });
  }

  const messages: string[] = [];
  let hotels: HotelResult[] = [];

  if (serpApiKey) {
    try {
      const result = await searchSerpApiHotels({ apiKey: serpApiKey, destination, checkInDate, checkOutDate, adults, children, rooms, currency });
      hotels = result.hotels;
      if (result.message) messages.push(result.message);
    } catch {
      messages.push("Google Hotels provider did not respond.");
    }
  }

  if (!hotels.length && googlePlacesKey) {
    try {
      const result = await searchGooglePlacesHotels({ apiKey: googlePlacesKey, destination, currency });
      hotels = result.hotels;
      if (result.message) messages.push(result.message);
    } catch {
      messages.push("Google Places provider did not respond.");
    }
  }

  const payload: HotelRouteResponse = {
    hotels,
    links: hotels.length ? [] : links,
    message: hotels.length ? undefined : messages[0] || "No structured hotel results are available. Use a provider search link for current rates."
  };

  return NextResponse.json(setTravelCache(cacheKey, payload, HOTEL_SEARCH_TTL_MS));
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
