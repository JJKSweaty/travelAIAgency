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
        ? [`"${request.destination}" is being planned as a custom global destination with generic fallback estimates. Verify local prices and availability before booking.`]
        : []),
      ...(!request.preferredDestinationEnabled && !hasBudgetFit ? ["No curated destination fits this budget cleanly, so the lowest-cost fallback option was selected."] : [])
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
    return { data: hotelsFor(destination, request), source: "fallback", providerName: "Fallback hotel index", confidence: 0.7 };
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
          sourceNote: "Fallback estimates from major travel search surfaces. Open source links to verify live prices before booking."
        }
      ],
      source: "fallback",
      providerName: "Fallback travel price comparison",
      confidence: 0.58
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
    const days = Array.from({ length: request.tripLengthDays }, (_, index) => {
      const attraction = attractions[(index + variantOffset) % Math.max(attractions.length, 1)];
      const restaurant = restaurants[(index + variantOffset) % Math.max(restaurants.length, 1)];
      const active = request.travelStyle === "packed";
      const relaxed = request.travelStyle === "relaxed";
      return {
        day: index + 1,
        title: index === 0 ? `Arrival and ${destination.name} orientation` : `${interestLabel(attraction?.category)} day`,
        morning: index === 0 ? `Arrive from ${request.origin} and check into a central stay.` : relaxed ? `Slow breakfast near ${restaurant?.neighborhood ?? "the center"} and a neighborhood walk.` : `Start early with ${attraction?.name ?? "a local highlight"}.`,
        afternoon: active ? `Add a second stop around ${destination.name} before a short recharge.` : `Spend focused time at ${attraction?.name ?? "a signature attraction"}.`,
        evening: `Dinner at ${restaurant?.name ?? "a local favorite"} with room in the budget for a flexible night plan.`,
        estimatedCost: Math.round(destination.averageDailyFood * request.travelers + destination.averageDailyActivities * (active ? 1.25 : relaxed ? 0.75 : 1))
      };
    });

    return { data: days, source: "fallback", providerName: "Deterministic itinerary synthesizer", confidence: 0.68 };
  }
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
    summary: "A user-entered global destination planned with generic fallback estimates. Open linked sources to verify local prices and availability.",
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

function interestLabel(interest?: Interest): string {
  if (!interest) return "Discovery";
  return interest.charAt(0).toUpperCase() + interest.slice(1);
}
