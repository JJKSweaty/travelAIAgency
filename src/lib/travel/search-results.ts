import type { FlightResult, HotelOption, HotelResult, PriceQuote, SelectedHotelOption, SelectedQuoteOption, TripPlan } from "./types";

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
  flightNumber: string | null;
  departureTime: string;
  arrivalTime: string;
  departureWindow: Exclude<FlightDepartureFilter, "any">;
  durationMinutes: number | null;
  stops: number;
  stopLabel: string;
  routeDetail: string;
  baggage: string | null;
  packageLevel: string | null;
  packageQuality: Exclude<FlightPackageFilter, "any">;
  fareNote: string | null;
  price: number | null;
  hasKnownPrice: boolean;
  score: number;
  link: string;
  source: PriceQuote["source"];
  provider: string;
  sourceLabel: string;
  fetchedAt: string;
  bookingToken: string | null;
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
  nightlyPrice: number | null;
  priceSource: NonNullable<HotelOption["priceSource"]>;
  totalPrice: number | null;
  hasKnownPrice: boolean;
  rating: number | null;
  reviewCount: number | null;
  starRating: number | null;
  description: string | null;
  amenities: string[];
  cancellationNote: string | null;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  proximity: Exclude<HotelProximityFilter, "any">;
  distanceKm: number | null;
  tier: Exclude<HotelTierFilter, "any">;
  valueScore: number;
  source: string;
  link: string;
  sourceLabel: string;
  fetchedAt: string;
  propertyToken: string | null;
};

export type ProviderSearchLink = { id: string; label: string; url: string };

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
      hasKnownPrice: quote.priceSource !== "unavailable",
      score,
      link: quote.link,
      source: quote.source,
      provider: quote.provider,
      sourceLabel: sourceLabelFor(quote.provider),
      fetchedAt: quote.lastChecked,
      bookingToken: null
    };
  });
}

export function flightResultsToSearchOptions(results: FlightResult[], fallbackLinks: ProviderSearchLink[] = []): FlightSearchOption[] {
  return results
    .map((result): FlightSearchOption | null => {
      if (!result.airlineName || !result.departureTime || !result.arrivalTime) return null;
      const durationMinutes = durationMinutesFrom(result.duration);
      const departureTime = displayFlightTime(result.departureTime);
      const arrivalTime = displayFlightTime(result.arrivalTime);
      const stops = Math.max(0, result.stops ?? result.layovers.length);
      const stopLabel = stops === 0 ? "Nonstop" : stops === 1 ? "1 stop" : `${stops} stops`;
      const fareLabel = result.cabin ?? result.fareType;
      const price = result.totalPrice ?? result.pricePerTraveler;
      const link = result.sourceUrl ?? fallbackLinks[0]?.url ?? "";
      const routeDetail = [result.originAirport, result.destinationAirport].filter(Boolean).join(" to ");

      return {
        id: result.id,
        sourceQuoteId: result.id,
        category: "flight",
        airline: result.airlineName,
        flightNumber: result.flightNumber,
        departureTime,
        arrivalTime,
        departureWindow: departureWindowFor(departureTime),
        durationMinutes,
        stops,
        stopLabel,
        routeDetail: routeDetail || "Route details unavailable",
        baggage: result.baggage.length ? result.baggage.join(", ") : null,
        packageLevel: fareLabel,
        packageQuality: fareQuality(fareLabel ?? undefined),
        fareNote: result.fareType,
        price,
        hasKnownPrice: price !== null,
        score: valueScore({ price, durationMinutes, stops, packageQuality: fareQuality(fareLabel ?? undefined) }),
        link,
        source: "live",
        provider: result.source,
        sourceLabel: `From ${result.source}`,
        fetchedAt: result.fetchedAt,
        bookingToken: result.bookingToken
      };
    })
    .filter((option): option is FlightSearchOption => Boolean(option));
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
    const priceA = knownPriceForSort(a.price);
    const priceB = knownPriceForSort(b.price);
    const durationA = knownDurationForSort(a.durationMinutes);
    const durationB = knownDurationForSort(b.durationMinutes);
    if (sort === "cheapest") return priceA - priceB || durationA - durationB;
    if (sort === "fastest") return durationA - durationB || priceA - priceB;
    return b.score - a.score || priceA - priceB;
  });
}

export function flightToSelectedQuote(option: FlightSearchOption): SelectedQuoteOption {
  return {
    id: option.id,
    category: "flight",
    provider: option.provider,
    displayName: `${option.airline}${option.packageLevel ? ` ${option.packageLevel}` : ""}`,
    estimatedPrice: option.price ?? 0,
    unit: "round-trip",
    link: option.link,
    source: option.source,
    airline: option.airline,
    departureTime: option.departureTime,
    arrivalTime: option.arrivalTime,
    durationMinutes: option.durationMinutes ?? undefined,
    stops: option.stops,
    baggage: option.baggage ?? undefined,
    packageLevel: option.packageLevel ?? undefined
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
      link: hotel.link,
      sourceLabel: sourceLabelFor(hotel.source),
      fetchedAt: new Date().toISOString(),
      propertyToken: hotel.placeId ?? null
    };
  });
}

export function hotelResultsToSearchOptions(results: HotelResult[], plan: TripPlan, fallbackLinks: ProviderSearchLink[] = []): HotelSearchOption[] {
  const nights = tripNights(plan);
  return results
    .map((hotel): HotelSearchOption | null => {
      if (!hotel.name) return null;
      const nightlyPrice = hotel.pricePerNight ?? (hotel.totalPrice !== null ? Math.round(hotel.totalPrice / nights) : null);
      const totalPrice = hotel.totalPrice ?? (nightlyPrice !== null ? Math.round(nightlyPrice * nights) : null);
      const hasKnownPrice = nightlyPrice !== null || totalPrice !== null;
      const location = hotel.address ?? hotel.area ?? plan.destination.name;
      const amenities = hotel.amenities.slice(0, 4);
      const freeCancellation = amenities.some((amenity) => /free cancellation/i.test(amenity)) || /free cancellation/i.test(hotel.cancellationPolicy ?? "");
      const breakfastIncluded = amenities.some((amenity) => /breakfast/i.test(amenity));
      const distanceKm = hotel.distanceFromCenter;
      const tier = hotelTierFromValues(nightlyPrice, hotel.guestRating, plan);

      return {
        id: hotel.id,
        name: hotel.name,
        location,
        imageUrl: hotel.imageUrl ?? "",
        nightlyPrice,
        priceSource: hasKnownPrice ? "live" : "unavailable",
        totalPrice,
        hasKnownPrice,
        rating: hotel.guestRating,
        reviewCount: hotel.reviewCount,
        starRating: hotel.starRating,
        description: hotel.description,
        amenities,
        cancellationNote: hotel.cancellationPolicy,
        freeCancellation,
        breakfastIncluded,
        proximity: hotelProximityFromLocation(location, plan),
        distanceKm,
        tier,
        valueScore: hotelValueScore(nightlyPrice, hotel.guestRating, distanceKm, tier),
        source: hotel.source,
        link: hotel.sourceUrl ?? fallbackLinks[0]?.url ?? "",
        sourceLabel: `From ${hotel.source}`,
        fetchedAt: hotel.fetchedAt,
        propertyToken: hotel.propertyToken
      };
    })
    .filter((option): option is HotelSearchOption => Boolean(option));
}

export function filterHotelResults(options: HotelSearchOption[], filters: HotelFilterState) {
  return options.filter((option) => {
    if (filters.freeCancellation && !option.freeCancellation) return false;
    if (filters.breakfastIncluded && !option.breakfastIncluded) return false;
    if (filters.proximity !== "any" && option.proximity !== filters.proximity) return false;
    if (filters.starRating !== "any" && (option.starRating ?? 0) < Number(filters.starRating)) return false;
    if (filters.tier !== "any" && option.tier !== filters.tier) return false;
    return true;
  });
}

export function sortHotelResults(options: HotelSearchOption[], sort: HotelSort) {
  return [...options].sort((a, b) => {
    const priceA = knownPriceForSort(a.nightlyPrice);
    const priceB = knownPriceForSort(b.nightlyPrice);
    const ratingA = a.rating ?? 0;
    const ratingB = b.rating ?? 0;
    const distanceA = knownDurationForSort(a.distanceKm);
    const distanceB = knownDurationForSort(b.distanceKm);
    if (sort === "lowest-price") return priceA - priceB || ratingB - ratingA;
    if (sort === "highest-rated") return ratingB - ratingA || priceA - priceB;
    if (sort === "closest") return distanceA - distanceB || ratingB - ratingA;
    return b.valueScore - a.valueScore || priceA - priceB;
  });
}

export function hotelToSelectedHotel(option: HotelSearchOption): SelectedHotelOption {
  return {
    id: option.id,
    name: option.name,
    location: option.location,
    nightlyPrice: option.nightlyPrice ?? 0,
    source: option.source,
    link: option.link,
    rating: option.rating ?? undefined,
    reviewCount: option.reviewCount ?? undefined,
    imageUrl: option.imageUrl,
    starRating: option.starRating ?? undefined,
    amenities: option.amenities,
    cancellationNote: option.cancellationNote ?? undefined,
    totalPrice: option.totalPrice ?? undefined,
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
  price: number | null;
  durationMinutes: number | null;
  stops: number;
  packageQuality: Exclude<FlightPackageFilter, "any">;
}) {
  const qualityBoost = { basic: 0, standard: 18, flexible: 28, premium: 24 }[packageQuality];
  const pricePenalty = price === null ? 95 : price / 12;
  const durationPenalty = durationMinutes === null ? 35 : durationMinutes / 18;
  return Math.round(220 - pricePenalty - durationPenalty - stops * 18 + qualityBoost);
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

function hotelValueScore(price: number | null, rating: number | null, distanceKm: number | null, tier: Exclude<HotelTierFilter, "any">) {
  const tierBoost = tier === "midrange" ? 12 : tier === "luxury" ? 8 : 6;
  const pricePenalty = price === null ? 24 : price / 9;
  return Math.round((rating ?? 0) * 28 - pricePenalty - (distanceKm ?? 2.5) * 5 + tierBoost);
}

function hotelTier(hotel: HotelOption, plan: TripPlan): Exclude<HotelTierFilter, "any"> {
  const ratio = hotel.nightlyPrice / Math.max(1, plan.destination.averageNightlyHotel);
  if (ratio <= 0.82) return "budget";
  if (ratio >= 1.25 || hotel.rating >= 4.65) return "luxury";
  return "midrange";
}

function hotelTierFromValues(nightlyPrice: number | null, rating: number | null, plan: TripPlan): Exclude<HotelTierFilter, "any"> {
  if (nightlyPrice === null) return "midrange";
  const ratio = nightlyPrice / Math.max(1, plan.destination.averageNightlyHotel);
  if (ratio <= 0.82) return "budget";
  if (ratio >= 1.25 || (rating ?? 0) >= 4.65) return "luxury";
  return "midrange";
}

function hotelProximity(hotel: HotelOption, plan: TripPlan): Exclude<HotelProximityFilter, "any"> {
  if (plan.destination.bestFor.includes("beaches") || /beach|waterfront|coast|harbor|bay/i.test(hotel.location)) return "beachfront";
  return "near-attractions";
}

function hotelProximityFromLocation(location: string, plan: TripPlan): Exclude<HotelProximityFilter, "any"> {
  if (plan.destination.bestFor.includes("beaches") || /beach|waterfront|coast|harbor|bay/i.test(location)) return "beachfront";
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
  const twelveHour = /^(\d{1,2}):(\d{2})\s(AM|PM)$/i.exec(value);
  const twentyFourHour = /(?:^|\s|T)(\d{1,2}):(\d{2})/.exec(value);
  const hour = twelveHour ? (Number(twelveHour[1]) % 12) + (twelveHour[3].toUpperCase() === "PM" ? 12 : 0) : twentyFourHour ? Number(twentyFourHour[1]) : 8;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function displayFlightTime(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return value;
}

function durationMinutesFrom(value: number | string | null) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function knownPriceForSort(value: number | null) {
  return value === null ? Number.POSITIVE_INFINITY : value;
}

function knownDurationForSort(value: number | null) {
  return value === null ? Number.POSITIVE_INFINITY : value;
}

function sourceLabelFor(value: string) {
  return value.startsWith("From ") ? value : `From ${value}`;
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
