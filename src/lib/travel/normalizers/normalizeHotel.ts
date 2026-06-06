import type { CurrencyCode, HotelResult } from "../types";
import { validateHotelResult } from "../validation";

export type HotelNormalizeParams = {
  destination: string;
  currency: CurrencyCode;
  fetchedAt?: string;
};

export function normalizeSerpApiHotel(property: SerpApiHotelProperty, index: number, params: HotelNormalizeParams): HotelResult | null {
  const fetchedAt = params.fetchedAt ?? new Date().toISOString();
  const pricePerNight = numberFrom(property.rate_per_night?.extracted_lowest ?? property.rate_per_night?.lowest);
  const totalPrice = numberFrom(property.total_rate?.extracted_lowest ?? property.total_rate?.lowest);
  const imageUrl = property.images?.[0]?.thumbnail ?? property.images?.[0]?.original_image ?? property.thumbnail ?? null;
  const result: HotelResult = {
    id: `serpapi-hotel-${property.property_token ?? stableId(`${property.name ?? ""}-${index}`)}`,
    source: "SerpApi Google Hotels",
    sourceUrl: property.link ?? property.serpapi_property_details_link ?? null,
    propertyToken: property.property_token ?? null,
    name: property.name?.trim() ?? "",
    imageUrl,
    address: property.address ?? null,
    latitude: numberFrom(property.gps_coordinates?.latitude),
    longitude: numberFrom(property.gps_coordinates?.longitude),
    area: property.neighborhood ?? null,
    distanceFromCenter: numberFrom(property.distance),
    starRating: numberFrom(property.extracted_hotel_class ?? property.hotel_class),
    guestRating: numberFrom(property.overall_rating),
    reviewCount: numberFrom(property.reviews),
    description: property.description ?? null,
    amenities: stringArray(property.amenities),
    cancellationPolicy: null,
    pricePerNight,
    totalPrice,
    currency: params.currency,
    taxesIncluded: null,
    fetchedAt,
    isLivePrice: Boolean(property.rate_per_night || property.total_rate),
    dataQuality: "provider"
  };
  return validateHotelResult(result);
}

export function normalizeGooglePlaceHotel(place: GooglePlaceHotel, index: number, params: HotelNormalizeParams): HotelResult | null {
  const fetchedAt = params.fetchedAt ?? new Date().toISOString();
  const result: HotelResult = {
    id: `google-place-${place.id ?? stableId(`${place.displayName?.text ?? ""}-${index}`)}`,
    source: "Google Places",
    sourceUrl: place.websiteUri ?? place.googleMapsUri ?? null,
    propertyToken: null,
    name: place.displayName?.text?.trim() ?? "",
    imageUrl: place.photoUrl ?? null,
    address: place.formattedAddress ?? null,
    latitude: numberFrom(place.location?.latitude),
    longitude: numberFrom(place.location?.longitude),
    area: null,
    distanceFromCenter: null,
    starRating: null,
    guestRating: numberFrom(place.rating),
    reviewCount: numberFrom(place.userRatingCount),
    description: place.editorialSummary?.text ?? null,
    amenities: place.types?.filter((type) => type !== "lodging").slice(0, 5) ?? [],
    cancellationPolicy: null,
    pricePerNight: null,
    totalPrice: null,
    currency: params.currency,
    taxesIncluded: null,
    fetchedAt,
    isLivePrice: false,
    dataQuality: "provider"
  };
  return validateHotelResult(result);
}

export type SerpApiHotelProperty = {
  property_token?: string;
  serpapi_property_details_link?: string;
  name?: string;
  link?: string;
  thumbnail?: string;
  address?: string;
  neighborhood?: string;
  distance?: number | string;
  description?: string;
  hotel_class?: string;
  extracted_hotel_class?: number | string;
  overall_rating?: number | string;
  reviews?: number | string;
  amenities?: unknown[];
  gps_coordinates?: { latitude?: number | string; longitude?: number | string };
  rate_per_night?: { lowest?: number | string; extracted_lowest?: number | string };
  total_rate?: { lowest?: number | string; extracted_lowest?: number | string };
  images?: { thumbnail?: string; original_image?: string }[];
};

export type GooglePlaceHotel = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  types?: string[];
  editorialSummary?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  photoUrl?: string;
};

function stringArray(value?: unknown[]) {
  return (value ?? []).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 10) / 10;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) return Math.round(parsed * 10) / 10;
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
