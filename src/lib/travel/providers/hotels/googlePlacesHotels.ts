import { normalizeGooglePlaceHotel, type GooglePlaceHotel, type HotelNormalizeParams } from "../../normalizers/normalizeHotel";
import type { CurrencyCode, HotelResult } from "../../types";

export type GooglePlacesHotelSearchParams = {
  apiKey: string;
  destination: string;
  currency: CurrencyCode;
};

export async function searchGooglePlacesHotels(params: GooglePlacesHotelSearchParams): Promise<{ hotels: HotelResult[]; message?: string }> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": params.apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.photos,places.types,places.editorialSummary,places.location"
    },
    body: JSON.stringify({
      textQuery: `hotels in ${params.destination}`,
      includedType: "lodging",
      pageSize: 8,
      languageCode: "en"
    })
  });

  if (!response.ok) throw new Error(`Google Places request failed with ${response.status}`);
  const payload = (await response.json()) as GooglePlacesTextSearchResponse;
  const fetchedAt = new Date().toISOString();
  const normalizeParams: HotelNormalizeParams = { destination: params.destination, currency: params.currency, fetchedAt };
  const placesWithPhotos = await Promise.all(
    (payload.places ?? []).map(async (place) => ({
      ...place,
      photoUrl: place.photos?.[0]?.name ? await googlePlacePhotoUrl(place.photos[0].name, params.apiKey) : undefined
    }))
  );
  const hotels = placesWithPhotos
    .map((place, index) => normalizeGooglePlaceHotel(place, index, normalizeParams))
    .filter((hotel): hotel is HotelResult => Boolean(hotel));

  return {
    hotels,
    message: hotels.length ? undefined : "I could not find current hotel listings for this destination."
  };
}

type GooglePlacesTextSearchResponse = {
  places?: (GooglePlaceHotel & {
    photos?: { name?: string }[];
  })[];
};

type GooglePlacePhotoResponse = {
  photoUri?: string;
};

async function googlePlacePhotoUrl(photoName: string, apiKey: string) {
  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
  url.searchParams.set("maxWidthPx", "1600");
  url.searchParams.set("skipHttpRedirect", "true");
  const response = await fetch(url, { headers: { "X-Goog-Api-Key": apiKey } });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as GooglePlacePhotoResponse;
  return payload.photoUri;
}
