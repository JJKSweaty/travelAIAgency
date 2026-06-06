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
  totalPrice: number;
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

const flightTemplates = [
  { dep: "8:10 AM", stops: 0, quality: "standard", packageLevel: "Main cabin", factor: 1.05, baggage: "Carry-on included", note: "A practical nonstop schedule with standard seat selection." },
  { dep: "10:45 PM", stops: 0, quality: "basic", packageLevel: "Basic economy", factor: 0.96, baggage: "Personal item included", note: "Lower fare with fewer included extras." },
  { dep: "6:35 AM", stops: 1, quality: "standard", packageLevel: "Main cabin", factor: 0.92, baggage: "Carry-on included", note: "One stop keeps the fare lower while preserving a manageable day." },
  { dep: "1:30 PM", stops: 1, quality: "flexible", packageLevel: "Flexible ticket", factor: 1.14, baggage: "Carry-on and checked bag included", note: "Better change terms and a comfortable midday departure." },
  { dep: "5:55 PM", stops: 1, quality: "premium", packageLevel: "Premium economy", factor: 1.32, baggage: "Two checked bags included", note: "More space and stronger included baggage for a longer route." },
  { dep: "11:20 AM", stops: 0, quality: "flexible", packageLevel: "Flexible ticket", factor: 1.22, baggage: "Carry-on and checked bag included", note: "Nonstop timing with more flexible fare conditions." }
] satisfies {
  dep: string;
  stops: number;
  quality: Exclude<FlightPackageFilter, "any">;
  packageLevel: string;
  factor: number;
  baggage: string;
  note: string;
}[];

const airlinePool = ["Air Canada", "TAP Air Portugal", "Delta", "United", "Lufthansa", "Air France", "WestJet", "British Airways"];

const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80"
];

const amenitySets = [
  ["Free Wi-Fi", "Breakfast available", "24-hour front desk"],
  ["Free cancellation", "Breakfast included", "Restaurant"],
  ["Near transit", "Air conditioning", "Workspace"],
  ["Free cancellation", "Rooftop terrace", "Bar"],
  ["Spa access", "Room upgrade options", "Airport transfer"],
  ["Kitchenette", "Laundry", "Family rooms"]
];

export function buildFlightResults(plan: TripPlan): FlightSearchOption[] {
  const quotes = plan.priceComparison.flights.length ? plan.priceComparison.flights : [fallbackFlightQuote(plan)];
  const baseDuration = baseFlightDuration(plan);
  const airlineOffset = positiveHash(`${plan.request.origin}-${plan.destination.name}`) % airlinePool.length;

  return flightTemplates.map((template, index) => {
    const quote = quotes[index % quotes.length];
    const airline = airlinePool[(airlineOffset + index) % airlinePool.length];
    const durationMinutes = baseDuration + template.stops * 95 + (index % 3) * 18;
    const price = Math.max(95, Math.round(quote.estimatedPrice * template.factor));
    const arrivalTime = addMinutesToClock(template.dep, durationMinutes);
    const departureWindow = departureWindowFor(template.dep);
    const stopLabel = template.stops === 0 ? "Nonstop" : template.stops === 1 ? "1 stop" : `${template.stops} stops`;
    const score = valueScore({
      price,
      durationMinutes,
      stops: template.stops,
      packageQuality: template.quality
    });

    return {
      id: `${quote.id}-option-${index + 1}`,
      sourceQuoteId: quote.id,
      category: "flight",
      airline,
      flightNumber: `${airlineCode(airline)} ${120 + positiveHash(quote.id + index) % 770}`,
      departureTime: template.dep,
      arrivalTime,
      departureWindow,
      durationMinutes,
      stops: template.stops,
      stopLabel,
      routeDetail: template.stops === 0 ? `${plan.request.origin} to ${plan.destination.name}` : `${plan.request.origin} to ${plan.destination.name}, short connection`,
      baggage: template.baggage,
      packageLevel: template.packageLevel,
      packageQuality: template.quality,
      fareNote: template.note,
      price,
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
  const hotels = plan.hotels.length ? plan.hotels : [fallbackHotel(plan)];

  return hotels.map((hotel, index) => {
    const reviewCount = 280 + (positiveHash(`${hotel.id}-${hotel.name}`) % 2100);
    const starRating = hotel.rating >= 4.7 ? 5 : hotel.rating >= 4.25 ? 4 : 3;
    const tier = hotelTier(hotel, plan);
    const proximity = hotelProximity(hotel, plan);
    const distanceKm = hotelDistance(hotel.location, index);
    const amenities = amenitySets[index % amenitySets.length];
    const freeCancellation = amenities.includes("Free cancellation") || index % 2 === 0;
    const breakfastIncluded = amenities.includes("Breakfast included") || /value|central|house/i.test(hotel.name);
    const cancellationNote = freeCancellation ? "Free cancellation before check-in week" : "Lower rate with partial refund terms";
    const totalPrice = Math.round(hotel.nightlyPrice * nights);

    return {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      imageUrl: hotelImages[index % hotelImages.length],
      nightlyPrice: hotel.nightlyPrice,
      totalPrice,
      rating: hotel.rating,
      reviewCount,
      starRating,
      description: hotelDescription(hotel, plan, tier, proximity),
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
    totalPrice: option.totalPrice
  };
}

export function tripNights(plan: TripPlan) {
  return Math.max(1, plan.request.tripLengthDays - 1);
}

function fallbackFlightQuote(plan: TripPlan): PriceQuote {
  return {
    id: `${plan.destination.id}-flight-internal`,
    category: "flight",
    provider: "roamly",
    displayName: "Flight estimate",
    estimatedPrice: Math.max(140, Math.round(plan.budget.transport * 0.9)),
    unit: "round-trip",
    link: plan.destination.bookingLink,
    source: "fallback",
    confidence: 0.58,
    lastChecked: new Date().toISOString()
  };
}

function fallbackHotel(plan: TripPlan): HotelOption {
  return {
    id: `${plan.destination.id}-stay-internal`,
    name: `${plan.destination.name} City Stay`,
    location: `Central ${plan.destination.name}`,
    nightlyPrice: plan.destination.averageNightlyHotel,
    rating: 4.3,
    source: "Roamly estimate",
    link: plan.destination.bookingLink,
    confidence: 0.62
  };
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

function hotelDescription(hotel: HotelOption, plan: TripPlan, tier: Exclude<HotelTierFilter, "any">, proximity: Exclude<HotelProximityFilter, "any">) {
  const location = proximity === "beachfront" ? "coast, dining, and relaxed evening plans" : "main sights, food stops, and transit";
  if (tier === "luxury") return `Polished stay with stronger service, elevated rooms, and easy access to ${location}.`;
  if (tier === "budget") return `Value-focused base with simple comforts and a practical location for exploring ${plan.destination.name}.`;
  if (/design|house/i.test(hotel.name)) return `Stylish neighborhood stay with comfortable rooms and quick access to ${location}.`;
  return `Well-rounded stay for travelers who want comfort, location, and a clean nightly rate.`;
}

function normalizeAmenities(amenities: string[], flags: { freeCancellation: boolean; breakfastIncluded: boolean }) {
  const next = [...amenities];
  if (flags.freeCancellation && !next.includes("Free cancellation")) next.unshift("Free cancellation");
  if (flags.breakfastIncluded && !next.includes("Breakfast included")) next.push("Breakfast included");
  return [...new Set(next)].slice(0, 4);
}

function addMinutesToClock(value: string, minutes: number) {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return value;
  const [, hourText, minuteText, period] = match;
  const rawHour = Number(hourText) % 12;
  const start = rawHour * 60 + Number(minuteText) + (period === "PM" ? 12 * 60 : 0);
  const total = start + minutes;
  const dayMinutes = total % (24 * 60);
  const nextDay = total >= 24 * 60;
  const hour24 = Math.floor(dayMinutes / 60);
  const minute = dayMinutes % 60;
  const hour12 = hour24 % 12 || 12;
  const label = `${hour12}:${String(minute).padStart(2, "0")} ${hour24 >= 12 ? "PM" : "AM"}`;
  return nextDay ? `${label} +1` : label;
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
