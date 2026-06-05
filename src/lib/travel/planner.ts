import { allocateBudget } from "./budget";
import { isOllamaConfigured, OllamaItineraryGenerator } from "./ai";
import {
  type AttractionProvider,
  type CarSearchProvider,
  FallbackAttractionProvider,
  FallbackCarSearchProvider,
  FallbackDestinationTrendProvider,
  FallbackHotelSearchProvider,
  FallbackRestaurantProvider,
  FallbackTravelPriceProvider,
  type HotelSearchProvider,
  type RestaurantProvider,
  type TravelPriceProvider
} from "./providers";
import type { RefinementIntent, TripPlan, TripRequest } from "./types";

const destinationProvider = new FallbackDestinationTrendProvider();
const hotelProvider: HotelSearchProvider = new FallbackHotelSearchProvider();
const carProvider: CarSearchProvider = new FallbackCarSearchProvider();
const restaurantProvider: RestaurantProvider = new FallbackRestaurantProvider();
const attractionProvider: AttractionProvider = new FallbackAttractionProvider();
const travelPriceProvider: TravelPriceProvider = new FallbackTravelPriceProvider();
const itineraryGenerator = new OllamaItineraryGenerator();

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  const destinations = await destinationProvider.findDestinations(request);
  const destination = destinations.data[0];
  const alternates = destinations.data.slice(1, 3);
  const [hotels, cars, restaurants, attractions, priceComparison] = await Promise.all([
    hotelProvider.searchHotels(destination, request),
    carProvider.searchCars(destination, request),
    restaurantProvider.searchRestaurants(destination, request),
    attractionProvider.searchAttractions(destination, request),
    travelPriceProvider.comparePrices(destination, request)
  ]);
  const itinerary = await itineraryGenerator.generateItinerary({
    destination,
    request,
    restaurants: restaurants.data,
    attractions: attractions.data
  });
  const budget = allocateBudget(request, destination);
  const sortedHotels = hotels.data.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
  const availableHotels = sortedHotels.filter((hotel) => !(request.excludedHotelIds ?? []).includes(hotel.id));
  const recommendedHotels = availableHotels.length ? availableHotels : sortedHotels;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    request,
    destination,
    alternates,
    budget,
    hotels: recommendedHotels,
    priceComparison: priceComparison.data[0],
    cars: cars.data.sort((a, b) => a.dailyPrice - b.dailyPrice),
    restaurants: restaurants.data,
    attractions: attractions.data,
    itinerary: itinerary.data,
    providerSummary: {
      hotels: hotels.source,
      priceComparison: priceComparison.source,
      cars: cars.source,
      restaurants: restaurants.source,
      attractions: attractions.source,
      itinerary: itinerary.source
    },
    notes: [
      "Prices are planning estimates and should be verified before booking.",
      priceComparison.data[0].sourceNote,
      destinations.source === "fallback" ? "Destination ranking uses curated trend seeds and supports custom free-text destinations." : "Destination ranking uses live trend data.",
      ...(destinations.warnings ?? []),
      ...budget.warnings
    ]
  };
}

export async function refineTrip(plan: TripPlan, intent: RefinementIntent): Promise<TripPlan> {
  const nextRequest: TripRequest = { ...plan.request };

  if (intent === "cheaper") {
    nextRequest.totalBudget = Math.max(250, Math.min(nextRequest.totalBudget, Math.round(plan.budget.totalEstimated * 0.92)));
    nextRequest.preferredDestinationEnabled = false;
    nextRequest.destination = "";
    nextRequest.transportPreference = "public-transit";
    nextRequest.travelStyle = "relaxed";
    nextRequest.interests = Array.from(new Set([...nextRequest.interests, "budget"]));
    nextRequest.excludedDestinationIds = Array.from(new Set([...(nextRequest.excludedDestinationIds ?? []), plan.destination.id]));
    nextRequest.excludedHotelIds = [];
  }
  if (intent === "luxury") {
    nextRequest.totalBudget = Math.round(nextRequest.totalBudget * 1.18);
    nextRequest.interests = Array.from(new Set([...nextRequest.interests, "luxury"]));
  }
  if (intent === "food") nextRequest.interests = Array.from(new Set(["food", ...nextRequest.interests]));
  if (intent === "relaxed") nextRequest.travelStyle = "relaxed";
  if (intent === "adventure") nextRequest.interests = Array.from(new Set(["adventure", "nature", ...nextRequest.interests]));
  if (intent === "next-destination") {
    nextRequest.preferredDestinationEnabled = false;
    nextRequest.destination = "";
    nextRequest.excludedDestinationIds = Array.from(new Set([...(nextRequest.excludedDestinationIds ?? []), plan.destination.id]));
  }
  if (intent === "replace-hotel") nextRequest.totalBudget = Math.round(nextRequest.totalBudget * 1.04);
  if (intent === "replace-hotel" && plan.hotels[0]) {
    nextRequest.excludedHotelIds = Array.from(new Set([...(nextRequest.excludedHotelIds ?? []), plan.hotels[0].id]));
  }
  if (intent === "regenerate") nextRequest.itineraryVariant = (nextRequest.itineraryVariant ?? 0) + 1;

  const refined = await planTrip(nextRequest);
  return {
    ...refined,
    notes: [`Refined for: ${intent.replace("-", " ")}.`, ...refined.notes]
  };
}

export function providerHealth() {
  return {
    configuredProviders: {
      destinations: process.env.TRAVEL_TRENDS_API_KEY ? "live-ready" : "fallback",
      locations: "open-meteo-geocoding",
      hotels: process.env.HOTELS_API_KEY ? "live-ready" : "fallback",
      priceComparison: process.env.TRAVEL_PRICE_API_KEY ? "live-ready" : "fallback",
      cars: process.env.CARS_API_KEY ? "live-ready" : "fallback",
      restaurants: process.env.RESTAURANTS_API_KEY ? "live-ready" : "fallback",
      attractions: process.env.ATTRACTIONS_API_KEY ? "live-ready" : "fallback",
      ai: isOllamaConfigured() ? "ollama-ready" : "fallback",
      aiModel: process.env.OLLAMA_MODEL ?? null
    },
    fallbackAvailable: true
  };
}
