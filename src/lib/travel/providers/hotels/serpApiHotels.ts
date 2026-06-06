import { normalizeSerpHotel, type HotelNormalizeParams, type SerpApiHotelProperty } from "../../normalizers/normalizeSerpHotel";
import type { CurrencyCode, HotelResult } from "../../types";

export type SerpApiHotelSearchParams = {
  apiKey: string;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number | null;
  rooms?: number | null;
  currency: CurrencyCode;
};

export async function searchSerpApiHotels(params: SerpApiHotelSearchParams): Promise<{ hotels: HotelResult[]; message?: string }> {
  const serpParams = new URLSearchParams({
    engine: "google_hotels",
    q: params.destination,
    check_in_date: params.checkInDate,
    check_out_date: params.checkOutDate,
    adults: String(params.adults),
    currency: params.currency,
    hl: "en",
    gl: "ca",
    api_key: params.apiKey
  });

  if (params.children) serpParams.set("children", String(params.children));
  if (params.rooms) serpParams.set("rooms", String(params.rooms));

  const response = await fetch(`https://serpapi.com/search.json?${serpParams}`);
  if (!response.ok) throw new Error(`Hotel provider request failed with ${response.status}`);

  const payload = (await response.json()) as SerpApiHotelResponse;
  const fetchedAt = new Date().toISOString();
  const normalizeParams: HotelNormalizeParams = { destination: params.destination, currency: params.currency, fetchedAt };
  const hotels = (payload.properties ?? [])
    .map((property, index) => normalizeSerpHotel(property, index, normalizeParams))
    .filter((hotel): hotel is HotelResult => Boolean(hotel));

  return {
    hotels,
    message: hotels.length ? undefined : "No Google Hotels results were returned for this search."
  };
}

type SerpApiHotelResponse = {
  properties?: SerpApiHotelProperty[];
};
