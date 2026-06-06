import { normalizeSerpApiHotel, type HotelNormalizeParams, type SerpApiHotelProperty } from "./normalizeHotel";

export function normalizeSerpHotel(property: SerpApiHotelProperty, index: number, params: HotelNormalizeParams) {
  return normalizeSerpApiHotel(property, index, params);
}

export type { HotelNormalizeParams, SerpApiHotelProperty };
