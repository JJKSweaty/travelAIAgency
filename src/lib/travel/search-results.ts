import type { HotelOption, PriceQuote, SelectedHotelOption, SelectedQuoteOption, TripPlan } from "./types";

export type FlightSort = "best-value" | "cheapest" | "fastest";
export type FlightStopFilter = "any" | "nonstop" | "one-stop";
export type FlightDepartureFilter = "any" | "morning" | "afternoon" | "evening";
export type FlightPackageFilter = "any" | "basic" | "standard" | "flexible" | "premium";

export type FlightFilterState = {
  stops: FlightStopFilter;
  airline: string;
  departure: FlightDepartureFilter;
  packageLevel: FlightPackageFilter;
};

export type FlightSearchOption = {
  id: string;
  sourceQuoteId: string;
  category: "flight";
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureWindow: Exclude<FlightDepartureFilter, "any">;
  durationMinutes: number;
  stops: number;
  stopLabel: string;
  routeDetail: string;
  baggage: string;
  packageLevel: string;
  packageQuality: Exclude<FlightPackageFilter, "any">;
  fareNote: string;
  price: number;
  score: number;
  link: string;
  source: PriceQuote["source"];
  provider: string;
};

export type HotelSort = "best-value" | "lowest-price" | "highest-rated" | "closest";
export type HotelProximityFilter = "any" | "near-attractions" | "beachfront";
export type HotelTierFilter = "any" | "budget" | "midrange" | "luxury";

export type HotelFilterState = {
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  proximity: HotelProximityFilter;
  starRating: "any" | "3" | "4" | "5";
  tier: HotelTierFilter;
};

export type HotelSearchOption = {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  nightlyPrice: number;
  priceSource: NonNullable<HotelOption["priceSource"]>;
  totalPrice: number;
  hasKnownPrice: boolean;
  rating: number;
  reviewCount: number;
  starRating: number;
  description: string;
  amenities: string[];
  cancellationNote: string;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  proximity: Exclude<HotelProximityFilter, "any">;
  distanceKm: number;
  tier: Exclude<HotelTierFilter, "any">;
  valueScore: number;
  source: string;
  link: string;
};

const airlinePool = ["Air Canada", "TAP Air Portugal", "Delta", "United", "Lufthansa", "Air France", "WestJet", "British Airways"];

export function buildFlightResults(plan: TripPlan): FlightSearchOption[] {
  const quotes = plan.priceComparison.flights.filter((quote) => quote.airline && quote.departureTime && quote.arrivalTime && quote.durationMinutes);

  return quotes.map((quote, index) => {
    const airline = quote.airline ?? "Airline";
    const durationMinutes = quote.durationMinutes ?? baseFlightDuration(plan);
    const departureTime = quote.departureTime ?? "8:00 AM";
    const departureWindow = departureWindowFor(departureTime);
    const stops = quote.stops ?? 0;
    const stopLabel = stops === 0 ? "Nonstop" : stops === 1 ? "1 stop" : `${stops} stops`;
    const packageQuality = fareQuality(quote.fareType);
    const score = valueScore({
      price: quote.estimatedPrice,
      durationMinutes,
      stops,
      packageQuality
    });

    return {
      id: quote.id,
      sourceQuoteId: quote.id,
      category: "flight",
      airline,
      flightNumber: quote.flightNumber ?? `${quote.airlineCode ?? airlineCode(airline)} ${120 + positiveHash(quote.id + index) % 770}`,
      departureTime,
      arrivalTime: quote.arrivalTime ?? "",
      departureWindow,
      durationMinutes,
      stops,
      stopLabel,
      routeDetail: routeDetailForQuote(quote, plan),
      baggage: quote.baggage ?? "Baggage varies by fare",
      packageLevel: quote.fareType ?? "Published fare",
      packageQuality,
      fareNote: quote.refundableNote ?? "Check fare rules before booking",
      price: quote.estimatedPrice,
      score,
      link: quote.link,
      source: quote.source,
      provider: quote.provider
    };
  });
}

export function filterFlightResults(options: FlightSearchOption[], filters: FlightFilterState) {
  return options.filter((option) => {
    if (filters.stops === "nonstop" && option.stops !== 0) return false;
    if (filters.stops === "one-stop" && option.stops !== 1) return false;
    if (filters.airline !== "any" && option.airline !== filters.airline) return false;
    if (filters.departure !== "any" && option.departureWindow !== filters.departure) return false;
    if (filters.packageLevel !== "any" && option.packageQuality !== filters.packageLevel) return false;
    return true;
  });
}

export function sortFlightResults(options: FlightSearchOption[], sort: FlightSort) {
  return [...options].sort((a, b) => {
    if (sort === "cheapest") return a.price - b.price || a.durationMinutes - b.durationMinutes;
    if (sort === "fastest") return a.durationMinutes - b.durationMinutes || a.price - b.price;
    return b.score - a.score || a.price - b.price;
  });
}

export function flightToSelectedQuote(option: FlightSearchOption): SelectedQuoteOption {
  return {
    id: option.id,
    category: "flight",
    provider: option.provider,
    displayName: `${option.airline} ${option.packageLevel}`,
    estimatedPrice: option.price,
    unit: "round-trip",
    link: option.link,
    source: option.source,
    airline: option.airline,
    departureTime: option.departureTime,
    arrivalTime: option.arrivalTime,
    durationMinutes: option.durationMinutes,
    stops: option.stops,
    baggage: option.baggage,
    packageLevel: option.packageLevel
  };
}

export function buildHotelResults(plan: TripPlan): HotelSearchOption[] {
  const nights = tripNights(plan);
  const hotels = plan.hotels;

  return hotels.map((hotel, index) => {
    const reviewCount = hotel.reviewCount ?? 0;
    const starRating = hotel.starRating ?? (hotel.rating >= 4.7 ? 5 : hotel.rating >= 4.25 ? 4 : 3);
    const tier = hotelTier(hotel, plan);
    const proximity = hotelProximity(hotel, plan);
    const distanceKm = hotel.distanceKm ?? hotelDistance(hotel.location, index);
    const amenities = hotel.amenities?.length ? hotel.amenities : ["View hotel", "Check availability"];
    const freeCancellation = amenities.some((amenity) => /free cancellation/i.test(amenity));
    const breakfastIncluded = amenities.some((amenity) => /breakfast included/i.test(amenity));
    const cancellationNote = hotel.cancellationNote ?? "Check cancellation terms on the partner site.";
    const hasKnownPrice = hotel.priceSource !== "unavailable";
    const totalPrice = hotel.totalPrice ?? Math.round(hotel.nightlyPrice * nights);

    return {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      imageUrl: hotel.imageUrl ?? "",
      nightlyPrice: hotel.nightlyPrice,
      priceSource: hotel.priceSource ?? "estimate",
      totalPrice,
      hasKnownPrice,
      rating: hotel.rating,
      reviewCount,
      starRating,
      description: hotel.description ?? "Real hotel result. Open the partner page to check live rates and availability.",
      amenities: normalizeAmenities(amenities, { freeCancellation, breakfastIncluded }),
      cancellationNote,
      freeCancellation,
      breakfastIncluded,
      proximity,
      distanceKm,
      tier,
      valueScore: hotelValueScore(hotel.nightlyPrice, hotel.rating, distanceKm, tier),
      source: hotel.source,
      link: hotel.link
    };
  });
}

export function filterHotelResults(options: HotelSearchOption[], filters: HotelFilterState) {
  return options.filter((option) => {
    if (filters.freeCancellation && !option.freeCancellation) return false;
    if (filters.breakfastIncluded && !option.breakfastIncluded) return false;
    if (filters.proximity !== "any" && option.proximity !== filters.proximity) return false;
    if (filters.starRating !== "any" && option.starRating < Number(filters.starRating)) return false;
    if (filters.tier !== "any" && option.tier !== filters.tier) return false;
    return true;
  });
}

export function sortHotelResults(options: HotelSearchOption[], sort: HotelSort) {
  return [...options].sort((a, b) => {
    if (sort === "lowest-price") return a.nightlyPrice - b.nightlyPrice || b.rating - a.rating;
    if (sort === "highest-rated") return b.rating - a.rating || a.nightlyPrice - b.nightlyPrice;
    if (sort === "closest") return a.distanceKm - b.distanceKm || b.rating - a.rating;
    return b.valueScore - a.valueScore || a.nightlyPrice - b.nightlyPrice;
  });
}

export function hotelToSelectedHotel(option: HotelSearchOption): SelectedHotelOption {
  return {
    id: option.id,
    name: option.name,
    location: option.location,
    nightlyPrice: option.nightlyPrice,
    source: option.source,
    link: option.link,
    rating: option.rating,
    reviewCount: option.reviewCount,
    imageUrl: option.imageUrl,
    starRating: option.starRating,
    amenities: option.amenities,
    cancellationNote: option.cancellationNote,
    totalPrice: option.totalPrice,
    priceSource: option.priceSource
  };
}

export function tripNights(plan: TripPlan) {
  return Math.max(1, plan.request.tripLengthDays - 1);
}

function baseFlightDuration(plan: TripPlan) {
  const country = plan.destination.country.toLowerCase();
  if (/japan|korea|singapore|hong kong|thailand|australia|new zealand/.test(country)) return 780;
  if (/south africa|argentina|brazil|colombia/.test(country)) return 610;
  if (/portugal|spain|france|italy|united kingdom|netherlands|czechia|greece|turkiye|morocco|iceland/.test(country)) return 455;
  if (/united states|canada|mexico/.test(country)) return 260;
  return 520;
}

function valueScore({
  price,
  durationMinutes,
  stops,
  packageQuality
}: {
  price: number;
  durationMinutes: number;
  stops: number;
  packageQuality: Exclude<FlightPackageFilter, "any">;
}) {
  const qualityBoost = { basic: 0, standard: 18, flexible: 28, premium: 24 }[packageQuality];
  return Math.round(220 - price / 12 - durationMinutes / 18 - stops * 18 + qualityBoost);
}

function fareQuality(fareType?: string): Exclude<FlightPackageFilter, "any"> {
  if (/premium|business|first/i.test(fareType ?? "")) return "premium";
  if (/flex|change/i.test(fareType ?? "")) return "flexible";
  if (/basic|light/i.test(fareType ?? "")) return "basic";
  return "standard";
}

function routeDetailForQuote(quote: PriceQuote, plan: TripPlan) {
  const route = quote.departureAirport && quote.arrivalAirport ? `${quote.departureAirport} to ${quote.arrivalAirport}` : `${plan.request.origin} to ${plan.destination.name}`;
  if (quote.layoverCity) return `${route}, connection in ${quote.layoverCity}`;
  return route;
}

function hotelValueScore(price: number, rating: number, distanceKm: number, tier: Exclude<HotelTierFilter, "any">) {
  const tierBoost = tier === "midrange" ? 12 : tier === "luxury" ? 8 : 6;
  return Math.round(rating * 28 - price / 9 - distanceKm * 5 + tierBoost);
}

function hotelTier(hotel: HotelOption, plan: TripPlan): Exclude<HotelTierFilter, "any"> {
  const ratio = hotel.nightlyPrice / Math.max(1, plan.destination.averageNightlyHotel);
  if (ratio <= 0.82) return "budget";
  if (ratio >= 1.25 || hotel.rating >= 4.65) return "luxury";
  return "midrange";
}

function hotelProximity(hotel: HotelOption, plan: TripPlan): Exclude<HotelProximityFilter, "any"> {
  if (plan.destination.bestFor.includes("beaches") || /beach|waterfront|coast|harbor|bay/i.test(hotel.location)) return "beachfront";
  return "near-attractions";
}

function hotelDistance(location: string, index: number) {
  if (/central|center|old|downtown/i.test(location)) return 0.4 + index * 0.1;
  if (/dining|waterfront|beach|harbor|old/i.test(location)) return 1.1 + index * 0.15;
  if (/transit|station/i.test(location)) return 2.2;
  return 1.6 + index * 0.2;
}

function normalizeAmenities(amenities: string[], flags: { freeCancellation: boolean; breakfastIncluded: boolean }) {
  const next = [...amenities];
  if (flags.freeCancellation && !next.includes("Free cancellation")) next.unshift("Free cancellation");
  if (flags.breakfastIncluded && !next.includes("Breakfast included")) next.push("Breakfast included");
  return [...new Set(next)].slice(0, 4);
}

function departureWindowFor(value: string): Exclude<FlightDepartureFilter, "any"> {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return "morning";
  const hour = (Number(match[1]) % 12) + (match[3] === "PM" ? 12 : 0);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function airlineCode(airline: string) {
  const codes: Record<string, string> = {
    "Air Canada": "AC",
    "TAP Air Portugal": "TP",
    Delta: "DL",
    United: "UA",
    Lufthansa: "LH",
    "Air France": "AF",
    WestJet: "WS",
    "British Airways": "BA"
  };
  return codes[airline] ?? airline.slice(0, 2).toUpperCase();
}

function positiveHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
