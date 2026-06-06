import type { CurrencyCode } from "./types";

export type FlightDeepLinkInput = {
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  adults?: number | string | null;
  currency?: CurrencyCode | string | null;
};

export type HotelDeepLinkInput = {
  destination?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  adults?: number | string | null;
  currency?: CurrencyCode | string | null;
  hotelName?: string | null;
};

export function googleFlightsSearchUrl(input: FlightDeepLinkInput) {
  const query = [input.origin, input.destination, input.departureDate, input.returnDate].filter(Boolean).join(" ");
  const url = new URL("https://www.google.com/travel/flights");
  if (query) url.searchParams.set("q", query);
  if (input.currency) url.searchParams.set("curr", String(input.currency));
  return url.toString();
}

export function skyscannerFlightSearchUrl(input: FlightDeepLinkInput) {
  const origin = codeSegment(input.origin);
  const destination = codeSegment(input.destination);
  const departure = dateSegment(input.departureDate);
  const ret = dateSegment(input.returnDate);
  const url =
    origin && destination && departure
      ? new URL(`https://www.skyscanner.ca/transport/flights/${origin}/${destination}/${departure}${ret ? `/${ret}` : ""}/`)
      : new URL("https://www.skyscanner.ca/flights");
  if (input.adults) url.searchParams.set("adults", String(input.adults));
  if (input.currency) url.searchParams.set("currency", String(input.currency));
  return url.toString();
}

export function kiwiFlightSearchUrl(input: FlightDeepLinkInput) {
  const url = new URL("https://www.kiwi.com/en/search/results");
  if (input.origin) url.searchParams.set("source", String(input.origin));
  if (input.destination) url.searchParams.set("destination", String(input.destination));
  if (input.departureDate) url.searchParams.set("date_from", String(input.departureDate));
  if (input.returnDate) url.searchParams.set("date_to", String(input.returnDate));
  if (input.adults) url.searchParams.set("adults", String(input.adults));
  if (input.currency) url.searchParams.set("currency", String(input.currency));
  return url.toString();
}

export function expediaHotelSearchUrl(input: HotelDeepLinkInput) {
  const url = new URL("https://www.expedia.com/Hotel-Search");
  url.searchParams.set("destination", hotelDestination(input));
  if (input.checkInDate) url.searchParams.set("startDate", String(input.checkInDate));
  if (input.checkOutDate) url.searchParams.set("endDate", String(input.checkOutDate));
  if (input.adults) url.searchParams.set("adults", String(input.adults));
  return url.toString();
}

export function bookingHotelSearchUrl(input: HotelDeepLinkInput) {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", hotelDestination(input));
  if (input.checkInDate) url.searchParams.set("checkin", String(input.checkInDate));
  if (input.checkOutDate) url.searchParams.set("checkout", String(input.checkOutDate));
  if (input.adults) url.searchParams.set("group_adults", String(input.adults));
  url.searchParams.set("no_rooms", String(Math.max(1, Math.ceil(Number(input.adults ?? 2) / 2))));
  return url.toString();
}

export function hotelsComSearchUrl(input: HotelDeepLinkInput) {
  const url = new URL("https://www.hotels.com/Hotel-Search");
  url.searchParams.set("destination", hotelDestination(input));
  if (input.checkInDate) url.searchParams.set("startDate", String(input.checkInDate));
  if (input.checkOutDate) url.searchParams.set("endDate", String(input.checkOutDate));
  if (input.adults) url.searchParams.set("adults", String(input.adults));
  return url.toString();
}

export function flightFallbackLinks(input: FlightDeepLinkInput) {
  return [
    { id: "google-flights", label: "Search on Google Flights", url: googleFlightsSearchUrl(input) },
    { id: "skyscanner", label: "Search on Skyscanner", url: skyscannerFlightSearchUrl(input) },
    { id: "kiwi", label: "Search on Kiwi", url: kiwiFlightSearchUrl(input) }
  ];
}

export function hotelFallbackLinks(input: HotelDeepLinkInput) {
  return [
    { id: "expedia", label: "Search on Expedia", url: expediaHotelSearchUrl(input) },
    { id: "booking", label: "Search on Booking.com", url: bookingHotelSearchUrl(input) },
    { id: "hotels", label: "Search on Hotels.com", url: hotelsComSearchUrl(input) }
  ];
}

function hotelDestination(input: HotelDeepLinkInput) {
  return [input.hotelName, input.destination].filter(Boolean).join(" ");
}

function codeSegment(value?: string | null) {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dateSegment(value?: string | null) {
  return value?.replaceAll("-", "") ?? "";
}
