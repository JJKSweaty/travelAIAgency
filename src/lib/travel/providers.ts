import { allocateBudget } from "./budget";
import { attractionsFor, carsFor, destinations, flightQuotesFor, hotelMarketQuotesFor, hotelsFor, restaurantsFor } from "./fallback-data";
import { locationSlug, parseLocationLabel } from "./locations";
import type {
  AttractionOption,
  CarOption,
  DestinationOption,
  HotelOption,
  Interest,
  ItineraryDay,
  PriceComparison,
  PriceQuote,
  ProviderResult,
  RestaurantOption,
  TripRequest
} from "./types";

export interface DestinationTrendProvider {
  findDestinations(request: TripRequest): Promise<ProviderResult<DestinationOption>>;
}

export interface HotelSearchProvider {
  searchHotels(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<HotelOption>>;
}

export interface CarSearchProvider {
  searchCars(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<CarOption>>;
}

export interface RestaurantProvider {
  searchRestaurants(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<RestaurantOption>>;
}

export interface AttractionProvider {
  searchAttractions(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<AttractionOption>>;
}

export interface TravelPriceProvider {
  comparePrices(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<PriceComparison>>;
}

export interface ItineraryGenerator {
  generateItinerary(args: {
    destination: DestinationOption;
    request: TripRequest;
    restaurants: RestaurantOption[];
    attractions: AttractionOption[];
  }): Promise<ProviderResult<ItineraryDay>>;
}

export class FallbackDestinationTrendProvider implements DestinationTrendProvider {
  async findDestinations(request: TripRequest): Promise<ProviderResult<DestinationOption>> {
    const normalized = request.destination?.trim().toLowerCase();
    const excluded = new Set(request.excludedDestinationIds ?? []);
    let hasBudgetFit = false;
    const scored = destinations
      .filter((destination) => !excluded.has(destination.id))
      .map((destination) => {
        const budget = allocateBudget(request, destination);
        const matchScore = destinationMatchScore(destination, normalized);
        const preferredMatch = Boolean(request.preferredDestinationEnabled && normalized && destinationMatchesQuery(destination, normalized));
        if (budget.remaining >= 0) hasBudgetFit = true;

        return {
          destination,
          preferredMatch,
          score:
            budgetFitRankScore(budget.remaining, budget.feasibility) +
            destination.trendingScore * 0.35 +
            destination.bestFor.filter((interest) => request.interests.includes(interest)).length * 14 -
            Math.abs(destination.costLevel - budgetCostTarget(request.totalBudget, request.tripLengthDays, request.travelers)) * 3 +
            matchScore
        };
      })
      .sort((a, b) => {
        if (request.preferredDestinationEnabled && normalized && a.preferredMatch !== b.preferredMatch) {
          return a.preferredMatch ? -1 : 1;
        }
        return b.score - a.score;
      })
      .map((entry) => entry.destination);
    const rankedDestinations = scored.length ? scored : destinations;
    const topDestination = rankedDestinations[0];
    const matchedPreferred = Boolean(normalized && topDestination && destinationMatchesQuery(topDestination, normalized));
    const data = request.preferredDestinationEnabled && normalized && !matchedPreferred ? [customDestination(request), ...rankedDestinations] : rankedDestinations;
    const warnings = [
      ...(request.preferredDestinationEnabled && !normalized ? ["Destination preference was enabled but no destination was provided."] : []),
      ...(request.preferredDestinationEnabled && normalized && !matchedPreferred
        ? [`"${request.destination}" is being planned with broader market estimates. Compare packages before final reservations.`]
        : []),
      ...(!request.preferredDestinationEnabled && !hasBudgetFit ? ["No destination fits this budget cleanly, so Roamly selected the lowest-cost match."] : [])
    ];

    return {
      data,
      source: "fallback",
      providerName: "Global destination planner with curated trend seeds",
      confidence: 0.72,
      warnings: warnings.length ? warnings : undefined
    };
  }
}

export function suggestDestinations(query: string, limit = 8): DestinationOption[] {
  const normalized = query.trim().toLowerCase();
  const ranked = destinations
    .map((destination) => ({
      destination,
      score: normalized
        ? destinationMatchScore(destination, normalized) + destination.bestFor.filter((interest) => interest.includes(normalized as Interest)).length * 12
        : destination.trendingScore
    }))
    .filter((entry) => !normalized || entry.score > 0)
    .sort((a, b) => b.score - a.score || b.destination.trendingScore - a.destination.trendingScore)
    .slice(0, limit)
    .map((entry) => entry.destination);

  if (!normalized || ranked.some((destination) => destinationMatchesQuery(destination, normalized))) return ranked;
  return [customDestination({ destination: query, interests: ["food", "museums", "nature"], totalBudget: 2400, tripLengthDays: 5, travelers: 2 } as TripRequest), ...ranked].slice(0, limit);
}

export class FallbackHotelSearchProvider implements HotelSearchProvider {
  async searchHotels(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<HotelOption>> {
    return { data: hotelsFor(destination, request), source: "fallback", providerName: "Demo hotel catalog", confidence: 0.62 };
  }
}

export class GooglePlacesHotelSearchProvider implements HotelSearchProvider {
  async searchHotels(destination: DestinationOption): Promise<ProviderResult<HotelOption>> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return { data: [], source: "fallback", providerName: "Google Places", confidence: 0, warnings: ["Current hotel listings are not connected yet."] };

    try {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.photos,places.types,places.priceLevel,places.editorialSummary"
        },
        body: JSON.stringify({
          textQuery: `hotels in ${destinationLabel(destination)}`,
          includedType: "lodging",
          pageSize: 6,
          languageCode: "en"
        })
      });

      if (!response.ok) throw new Error(`Google Places returned ${response.status}`);
      const payload = (await response.json()) as GooglePlacesTextSearchResponse;
      const places = payload.places ?? [];
      const hotels = await Promise.all(
        places.slice(0, 5).map(async (place, index): Promise<HotelOption | null> => {
          const imageUrl = place.photos?.[0]?.name ? await googlePlacePhotoUrl(place.photos[0].name, apiKey) : undefined;
          const name = place.displayName?.text?.trim();
          if (!name) return null;
          return {
            id: place.id ? `google-places-${place.id}` : `${destination.id}-google-place-${index + 1}`,
            name,
            location: place.formattedAddress ?? destination.name,
            nightlyPrice: 0,
            rating: typeof place.rating === "number" ? place.rating : 0,
            source: "Google Places",
            link: place.websiteUri ?? place.googleMapsUri ?? `https://www.google.com/travel/hotels?q=${encodeURIComponent(`${name} ${destinationLabel(destination)}`)}`,
            confidence: 0.82,
            priceSource: "unavailable" as const,
            imageUrl,
            reviewCount: place.userRatingCount,
            description: place.editorialSummary?.text ?? "Hotel listing with rates and availability to confirm before booking.",
            amenities: googleHotelAmenities(place.types),
            cancellationNote: "Rates and cancellation terms are shown on the partner site.",
            totalPrice: undefined,
            distanceKm: index === 0 ? 0.6 : 0.9 + index * 0.55,
            bookingLinkLabel: "View hotel",
            placeId: place.id,
            photoAttributions: place.photos?.[0]?.authorAttributions?.flatMap((item) => (item.displayName ? [item.displayName] : []))
          } satisfies HotelOption;
        })
      );
      const data = hotels.filter((hotel): hotel is HotelOption => Boolean(hotel));

      return {
        data,
        source: "live",
        providerName: "Google Places",
        confidence: data.length ? 0.82 : 0.2,
        warnings: data.length ? undefined : ["I could not find current hotel listings for this destination."]
      };
    } catch {
      return {
        data: [],
        source: "fallback",
        providerName: "Google Places",
        confidence: 0,
        warnings: ["I could not check current hotel listings, so the plan uses broader market estimates."]
      };
    }
  }
}

export class CascadingHotelSearchProvider implements HotelSearchProvider {
  constructor(
    private readonly liveProvider: HotelSearchProvider,
    private readonly fallbackProvider: HotelSearchProvider
  ) {}

  async searchHotels(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<HotelOption>> {
    const live = await this.liveProvider.searchHotels(destination, request);
    if (live.data.length) return live;
    const fallback = await this.fallbackProvider.searchHotels(destination, request);
    return {
      ...fallback,
      warnings: [...(live.warnings ?? []), ...(fallback.warnings ?? [])]
    };
  }
}

export class FallbackCarSearchProvider implements CarSearchProvider {
  async searchCars(destination: DestinationOption): Promise<ProviderResult<CarOption>> {
    return { data: carsFor(destination), source: "fallback", providerName: "Fallback transport index", confidence: 0.66 };
  }
}

export class FallbackRestaurantProvider implements RestaurantProvider {
  async searchRestaurants(destination: DestinationOption): Promise<ProviderResult<RestaurantOption>> {
    return { data: restaurantsFor(destination), source: "fallback", providerName: "Fallback restaurant index", confidence: 0.65 };
  }
}

export class FallbackAttractionProvider implements AttractionProvider {
  async searchAttractions(destination: DestinationOption): Promise<ProviderResult<AttractionOption>> {
    return { data: attractionsFor(destination), source: "fallback", providerName: "Fallback attraction index", confidence: 0.66 };
  }
}

export class FallbackTravelPriceProvider implements TravelPriceProvider {
  async comparePrices(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<PriceComparison>> {
    const flightsByPrice = flightQuotesFor(destination, request).sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const hotelsByPrice = hotelMarketQuotesFor(destination, request).sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    const flights = [...flightsByPrice].sort(exactSearchFirst);
    const hotels = [...hotelsByPrice].sort(exactSearchFirst);

    return {
      data: [
        {
          flights,
          hotels,
          lowestFlight: flightsByPrice[0],
          lowestHotel: hotelsByPrice[0],
          sourceNote: "Package estimates are compared across major travel search categories. Review selected packages before final reservations."
        }
      ],
      source: "fallback",
      providerName: "Fallback travel price comparison",
      confidence: 0.58
    };
  }
}

export class AmadeusTravelPriceProvider implements TravelPriceProvider {
  async comparePrices(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<PriceComparison>> {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { data: [], source: "fallback", providerName: "Amadeus Flight Offers Search", confidence: 0, warnings: ["Current flight listings are not connected yet."] };
    }

    const originCode = airportCodeFor(request.origin);
    const destinationCode = airportCodeFor(destination.name) ?? airportCodeFor(destination.country);
    const dates = searchDates(request);
    if (!originCode || !destinationCode || !dates) {
      return {
        data: [],
        source: "fallback",
        providerName: "Amadeus Flight Offers Search",
        confidence: 0,
        warnings: ["Flight price checks need matched airports and usable travel dates."]
      };
    }

    try {
      const token = await amadeusAccessToken(clientId, clientSecret);
      const baseUrl = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";
      const url = new URL("/v2/shopping/flight-offers", baseUrl);
      url.searchParams.set("originLocationCode", originCode);
      url.searchParams.set("destinationLocationCode", destinationCode);
      url.searchParams.set("departureDate", dates.departureDate);
      url.searchParams.set("returnDate", dates.returnDate);
      url.searchParams.set("adults", String(Math.max(1, request.travelers)));
      url.searchParams.set("currencyCode", "USD");
      url.searchParams.set("max", "8");

      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Amadeus returned ${response.status}`);
      const payload = (await response.json()) as AmadeusFlightOffersResponse;
      const flights = (payload.data ?? []).map((offer, index) => amadeusOfferToQuote(offer, payload.dictionaries?.carriers ?? {}, request, destination, index)).filter((quote): quote is PriceQuote => Boolean(quote));
      const hotels = hotelMarketQuotesFor(destination, request).sort((a, b) => a.estimatedPrice - b.estimatedPrice);

      return {
        data: [
          {
            flights,
            hotels,
            lowestFlight: [...flights].sort((a, b) => a.estimatedPrice - b.estimatedPrice)[0],
            lowestHotel: hotels[0],
            sourceNote: flights.length
              ? "Flight prices and availability were checked for this route. Hotel prices are shown when current hotel pricing is available."
              : "I could not find current flight options for this route and date combination."
          }
        ],
        source: flights.length ? "live" : "fallback",
        providerName: "Amadeus Flight Offers Search",
        confidence: flights.length ? 0.86 : 0.2,
        warnings: flights.length ? undefined : ["I could not find current flight options for this route and date combination."]
      };
    } catch {
      return {
        data: [],
        source: "fallback",
        providerName: "Amadeus Flight Offers Search",
        confidence: 0,
        warnings: ["I could not check current flight prices, so the plan uses broader market estimates."]
      };
    }
  }
}

export class CascadingTravelPriceProvider implements TravelPriceProvider {
  constructor(
    private readonly liveProvider: TravelPriceProvider,
    private readonly fallbackProvider: TravelPriceProvider
  ) {}

  async comparePrices(destination: DestinationOption, request: TripRequest): Promise<ProviderResult<PriceComparison>> {
    const live = await this.liveProvider.comparePrices(destination, request);
    if (live.data[0]?.flights.length) return live;
    const fallback = await this.fallbackProvider.comparePrices(destination, request);
    return {
      ...fallback,
      warnings: [...(live.warnings ?? []), ...(fallback.warnings ?? [])]
    };
  }
}

function exactSearchFirst<T extends { linkLabel?: string; estimatedPrice: number }>(a: T, b: T) {
  const exactA = a.linkLabel?.startsWith("Exact") ? 1 : 0;
  const exactB = b.linkLabel?.startsWith("Exact") ? 1 : 0;
  return exactB - exactA || a.estimatedPrice - b.estimatedPrice;
}

export class FallbackItineraryGenerator implements ItineraryGenerator {
  async generateItinerary({
    destination,
    request,
    restaurants,
    attractions
  }: {
    destination: DestinationOption;
    request: TripRequest;
    restaurants: RestaurantOption[];
    attractions: AttractionOption[];
  }): Promise<ProviderResult<ItineraryDay>> {
    const variantOffset = Math.max(0, request.itineraryVariant ?? 0);
    const budget = allocateBudget(request, destination);
    const dailyCosts = buildDailyCosts(request, budget.food + budget.activities + Math.round(budget.transport * 0.55));
    const themes = buildThemes(destination.name, request.interests);
    const days = Array.from({ length: request.tripLengthDays }, (_, index) => {
      const attraction = attractions[(index + variantOffset) % Math.max(attractions.length, 1)];
      const restaurant = restaurants[(index + variantOffset) % Math.max(restaurants.length, 1)];
      const nextAttraction = attractions[(index + variantOffset + 1) % Math.max(attractions.length, 1)];
      const active = request.travelStyle === "packed";
      const relaxed = request.travelStyle === "relaxed";
      const theme = themes[(index + variantOffset) % themes.length];
      const neighborhood = restaurant?.neighborhood ?? "the central district";
      const firstDay = index === 0;
      return {
        day: index + 1,
        title: firstDay ? `Arrival in ${destination.name} and neighborhood reset` : `${destination.name}: ${theme}`,
        theme,
        morning: firstDay
          ? `Arrive from ${request.origin}, settle into your stay, and do an easy coffee walk around ${neighborhood}.`
          : relaxed
            ? `Slow morning around ${neighborhood} with a local breakfast stop, then ${attraction?.name ?? "a nearby highlight"}.`
            : `Start with ${attraction?.name ?? "a local highlight"} before crowds build.` ,
        afternoon: active
          ? `Pair ${attraction?.name ?? "the main stop"} with ${nextAttraction?.name ?? "a nearby second stop"} and a short recovery break.`
          : `Anchor the afternoon around ${attraction?.name ?? "one signature stop"}, then move through nearby streets.` ,
        evening: `Dinner at ${restaurant?.name ?? "a local favorite"} in ${neighborhood}, followed by a low-pressure evening option that matches your pace.`,
        estimatedCost: dailyCosts[index]
      };
    });

    return { data: days, source: "fallback", providerName: "Deterministic itinerary synthesizer", confidence: 0.68 };
  }
}

function buildThemes(destinationName: string, interests: Interest[]): string[] {
  const byInterest: Record<Interest, string[]> = {
    food: ["market crawl and tastings", "cafe and neighborhood bites", "chef-counter dinner route"],
    nightlife: ["late bars and live sets", "sunset rooftops and cocktails", "music venues and night lanes"],
    nature: ["parks, viewpoints, and green loops", "waterfront walk and scenic breaks", "urban nature reset"],
    museums: ["history and design circuit", "art and architecture trail", "culture and old-quarter walk"],
    beaches: ["coastline swim and boardwalk", "beach clubs and sunset shore", "morning surf, evening promenade"],
    family: ["kid-friendly discovery route", "easy landmarks and open spaces", "hands-on family activity run"],
    luxury: ["signature dining and spa time", "boutique shopping and lounge night", "premium rooftop and tasting menu"],
    budget: ["value eats and free highlights", "low-cost neighborhood gems", "public spaces and market finds"],
    adventure: ["active trail and local challenge", "outdoor adrenaline window", "high-energy movement day"]
  };

  const selected: Interest[] = interests.length ? interests : ["food", "nature"];
  const merged = selected.flatMap((interest) => byInterest[interest]);
  const base = [`${destinationName.toLowerCase()} old-town rhythm`, `${destinationName.toLowerCase()} local neighborhoods`];
  return [...merged, ...base].filter(Boolean);
}

function buildDailyCosts(request: TripRequest, spendTarget: number): number[] {
  const count = Math.max(1, request.tripLengthDays);
  const profiles = {
    relaxed: [0.82, 0.94, 1.06, 0.9, 1.12, 0.88, 1.04],
    balanced: [0.9, 1.08, 0.98, 1.12, 0.95, 1.2, 1.02],
    packed: [1.0, 1.16, 1.08, 1.24, 0.96, 1.28, 1.1]
  } as const;
  const profile = profiles[request.travelStyle];
  const weights = Array.from({ length: count }, (_, index) => profile[index % profile.length]);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  return weights.map((weight) => Math.max(35, Math.round((spendTarget * weight) / Math.max(totalWeight, 1))));
}

function budgetCostTarget(totalBudget: number, days: number, travelers: number): DestinationOption["costLevel"] {
  const perPersonDay = totalBudget / Math.max(1, days * travelers);
  if (perPersonDay < 130) return 2;
  if (perPersonDay < 210) return 3;
  if (perPersonDay < 330) return 4;
  return 5;
}

function budgetFitRankScore(remaining: number, feasibility: ReturnType<typeof allocateBudget>["feasibility"]): number {
  if (remaining >= 0) return 160 + (feasibility === "comfortable" ? 30 : 12) + Math.min(60, remaining / 35);
  return Math.max(-260, remaining / 5);
}

function destinationMatchScore(destination: DestinationOption, normalized?: string): number {
  if (!normalized) return 0;
  const name = destination.name.toLowerCase();
  const country = destination.country.toLowerCase();
  const interests = destination.bestFor.join(" ");

  if (name === normalized) return 140;
  if (`${name}, ${country}` === normalized) return 135;
  if (name.startsWith(normalized)) return 110;
  if (name.includes(normalized)) return 85;
  if (country.startsWith(normalized)) return 45;
  if (country.includes(normalized)) return 32;
  if (interests.includes(normalized)) return 20;
  return 0;
}

function destinationMatchesQuery(destination: DestinationOption, normalized: string): boolean {
  const name = destination.name.toLowerCase();
  const country = destination.country.toLowerCase();
  return name === normalized || name.includes(normalized) || `${name}, ${country}` === normalized;
}

function customDestination(request: TripRequest): DestinationOption {
  const parsed = parseLocationLabel(request.destination?.trim() || "Custom destination");
  const name = parsed.name;
  const costLevel = budgetCostTarget(request.totalBudget, request.tripLengthDays, request.travelers);
  return {
    id: `custom-${locationSlug(parsed.label)}`,
    name,
    country: parsed.country ?? "Global destination",
    summary: "A custom destination planned with broader market estimates. Compare packages before final reservations.",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    costLevel,
    trendingScore: 70,
    bestFor: request.interests.slice(0, 4),
    averageNightlyHotel: costLevel >= 5 ? 285 : costLevel === 4 ? 220 : costLevel === 3 ? 155 : 105,
    averageDailyFood: costLevel >= 5 ? 98 : costLevel === 4 ? 82 : costLevel === 3 ? 58 : 38,
    averageDailyActivities: costLevel >= 5 ? 86 : costLevel === 4 ? 68 : costLevel === 3 ? 46 : 32,
    bookingLink: `https://www.google.com/travel/explore?q=${encodeURIComponent(parsed.label)}`
  };
}

type GooglePlacesTextSearchResponse = {
  places?: {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    websiteUri?: string;
    priceLevel?: string;
    types?: string[];
    editorialSummary?: { text?: string };
    photos?: {
      name?: string;
      authorAttributions?: { displayName?: string }[];
    }[];
  }[];
};

type GooglePlacePhotoResponse = {
  photoUri?: string;
};

async function googlePlacePhotoUrl(photoName: string, apiKey: string) {
  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
  url.searchParams.set("maxWidthPx", "900");
  url.searchParams.set("skipHttpRedirect", "true");
  const response = await fetch(url, { headers: { "X-Goog-Api-Key": apiKey } });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as GooglePlacePhotoResponse;
  return payload.photoUri;
}

function googleHotelAmenities(types?: string[]) {
  const values = new Set(["Verified place listing", "Open partner rates"]);
  if (types?.some((type) => /restaurant|food/i.test(type))) values.add("Restaurant nearby");
  if (types?.some((type) => /spa/i.test(type))) values.add("Spa access");
  values.add("Check availability");
  return Array.from(values).slice(0, 4);
}

type AmadeusFlightOffersResponse = {
  data?: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
  };
};

type AmadeusFlightOffer = {
  id: string;
  validatingAirlineCodes?: string[];
  itineraries?: {
    duration?: string;
    segments?: {
      carrierCode?: string;
      number?: string;
      departure?: { iataCode?: string; at?: string };
      arrival?: { iataCode?: string; at?: string };
      duration?: string;
    }[];
  }[];
  price?: {
    total?: string;
    grandTotal?: string;
    currency?: string;
  };
  pricingOptions?: {
    fareType?: string[];
    includedCheckedBagsOnly?: boolean;
  };
  travelerPricings?: {
    fareOption?: string;
    price?: { total?: string };
    fareDetailsBySegment?: {
      includedCheckedBags?: { quantity?: number; weight?: number; weightUnit?: string };
      cabin?: string;
      brandedFareLabel?: string;
    }[];
  }[];
};

async function amadeusAccessToken(clientId: string, clientSecret: string) {
  const baseUrl = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });
  const response = await fetch(new URL("/v1/security/oauth2/token", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!response.ok) throw new Error(`Amadeus token request returned ${response.status}`);
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("Amadeus token response did not include an access token.");
  return payload.access_token;
}

function amadeusOfferToQuote(
  offer: AmadeusFlightOffer,
  carriers: Record<string, string>,
  request: TripRequest,
  destination: DestinationOption,
  index: number
): PriceQuote | null {
  const outbound = offer.itineraries?.[0];
  const segments = outbound?.segments ?? [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  const carrierCode = first?.carrierCode ?? offer.validatingAirlineCodes?.[0];
  const airline = carrierCode ? carriers[carrierCode] ?? carrierCode : "Airline";
  const total = Number(offer.price?.grandTotal ?? offer.price?.total);
  if (!Number.isFinite(total) || !first?.departure?.at || !last?.arrival?.at) return null;

  const checkedBag = offer.travelerPricings?.[0]?.fareDetailsBySegment?.find((segment) => segment.includedCheckedBags)?.includedCheckedBags;
  const fareType = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.brandedFareLabel ?? offer.travelerPricings?.[0]?.fareOption ?? offer.pricingOptions?.fareType?.[0] ?? "Published fare";
  const stops = Math.max(0, segments.length - 1);
  const layoverCity = stops > 0 ? segments[0]?.arrival?.iataCode : undefined;

  return {
    id: `amadeus-flight-${offer.id || index + 1}`,
    category: "flight",
    provider: "amadeus",
    displayName: `${airline} ${fareType}`,
    estimatedPrice: Math.round(total),
    unit: "round-trip",
    link: googleFlightSearchLink(request, destination),
    source: "live",
    confidence: 0.86,
    lastChecked: new Date().toISOString(),
    linkLabel: "View flight",
    priceSource: "live",
    airline,
    airlineCode: carrierCode,
    flightNumber: carrierCode && first?.number ? `${carrierCode} ${first.number}` : undefined,
    departureAirport: first.departure?.iataCode,
    arrivalAirport: last.arrival?.iataCode,
    departureTime: formatFlightTime(first.departure.at),
    arrivalTime: formatFlightTime(last.arrival.at),
    durationMinutes: parseIsoDuration(outbound?.duration) ?? segmentDurationMinutes(first.departure.at, last.arrival.at),
    stops,
    layoverCity,
    baggage: checkedBag?.quantity ? `${checkedBag.quantity} checked bag${checkedBag.quantity === 1 ? "" : "s"} included` : offer.pricingOptions?.includedCheckedBagsOnly ? "Checked bag included" : "Baggage varies by fare",
    fareType,
    refundableNote: "Check fare rules before booking",
    pricePerTraveler: Math.round(total / Math.max(1, request.travelers)),
    totalPrice: Math.round(total)
  };
}

function airportCodeFor(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  const codeMatch = /\b[A-Z]{3}\b/.exec(value);
  if (codeMatch) return codeMatch[0];
  const airportCodes: Record<string, string> = {
    toronto: "YYZ",
    lisbon: "LIS",
    "mexico city": "MEX",
    kyoto: "KIX",
    tokyo: "TYO",
    vancouver: "YVR",
    "san diego": "SAN",
    marrakesh: "RAK",
    barcelona: "BCN",
    seoul: "SEL",
    singapore: "SIN",
    "hong kong": "HKG",
    london: "LON",
    paris: "PAR",
    rome: "ROM",
    istanbul: "IST",
    bangkok: "BKK",
    "new orleans": "MSY",
    "new york": "NYC",
    "los angeles": "LAX",
    miami: "MIA",
    porto: "OPO",
    prague: "PRG",
    reykjavik: "KEF",
    "cape town": "CPT",
    "buenos aires": "BUE",
    queenstown: "ZQN",
    amsterdam: "AMS",
    dubai: "DXB",
    sydney: "SYD",
    athens: "ATH",
    "rio de janeiro": "RIO",
    cartagena: "CTG"
  };
  return airportCodes[normalized] ?? airportCodes[normalized.split(",")[0]?.trim()];
}

function searchDates(request: TripRequest) {
  if (request.dateMode === "exact" && isDateOnly(request.startDate)) {
    return {
      departureDate: request.startDate,
      returnDate: isDateOnly(request.endDate) ? request.endDate : addDays(request.startDate, Math.max(1, request.tripLengthDays - 1))
    };
  }
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(request.startDate ?? "");
  if (monthMatch) {
    const [, year, month] = monthMatch;
    const departureDate = `${year}-${month}-15`;
    return { departureDate, returnDate: addDays(departureDate, Math.max(1, request.tripLengthDays - 1)) };
  }
  return null;
}

function googleFlightSearchLink(request: TripRequest, destination: DestinationOption) {
  const query = `${request.origin} to ${destinationLabel(destination)} ${request.startDate ?? ""}`.trim();
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

function destinationLabel(destination: DestinationOption) {
  return destination.country && destination.country !== "Global destination" ? `${destination.name}, ${destination.country}` : destination.name;
}

function formatFlightTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function parseIsoDuration(value?: string) {
  if (!value) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(value);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function segmentDurationMinutes(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isDateOnly(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
