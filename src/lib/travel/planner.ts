import { allocateBudget } from "./budget";
import { isOpenRouterConfigured, OpenRouterItineraryGenerator } from "./ai";
import { convertUsdFields, formatMoney, fromUsd, normalizeCurrency, toUsd } from "./currency";
import { buildDayTransitPlans } from "./transit";
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
const itineraryGenerator = new OpenRouterItineraryGenerator();

export async function planTrip(request: TripRequest): Promise<TripPlan> {
  const currency = normalizeCurrency(request.currency);
  const displayRequest: TripRequest = { ...request, currency };
  const planningRequest: TripRequest = { ...displayRequest, totalBudget: toUsd(displayRequest.totalBudget, currency) };
  const destinations = await destinationProvider.findDestinations(planningRequest);
  const destination = destinations.data[0];
  const alternates = destinations.data.slice(1, 3);
  const [hotels, cars, restaurants, attractions, priceComparison] = await Promise.all([
    hotelProvider.searchHotels(destination, planningRequest),
    carProvider.searchCars(destination, planningRequest),
    restaurantProvider.searchRestaurants(destination, planningRequest),
    attractionProvider.searchAttractions(destination, planningRequest),
    travelPriceProvider.comparePrices(destination, planningRequest)
  ]);
  const itinerary = await itineraryGenerator.generateItinerary({
    destination,
    request: planningRequest,
    restaurants: restaurants.data,
    attractions: attractions.data
  });
  const budget = convertBudget(allocateBudget(planningRequest, destination), currency);
  const sortedHotels = hotels.data.sort((a, b) => a.nightlyPrice - b.nightlyPrice);
  const availableHotels = sortedHotels.filter((hotel) => !(request.excludedHotelIds ?? []).includes(hotel.id));
  const recommendedHotels = availableHotels.length ? availableHotels : sortedHotels;
  const selectedStay = recommendedHotels[0]
    ? {
        type: "hotel" as const,
        label: recommendedHotels[0].name,
        location: recommendedHotels[0].location
      }
    : {
        type: "airbnb" as const,
        label: "Airbnb / private stay",
        location: `${destination.name} center`
      };
  const displayHotels = recommendedHotels.map((hotel) => convertUsdFields(hotel, currency, ["nightlyPrice"]));
  const selectedHotel = displayHotels[0]
    ? {
        id: displayHotels[0].id,
        name: displayHotels[0].name,
        location: displayHotels[0].location,
        nightlyPrice: displayHotels[0].nightlyPrice,
        source: displayHotels[0].source,
        link: displayHotels[0].link
      }
    : undefined;
  const displayCars = cars.data.sort((a, b) => a.dailyPrice - b.dailyPrice).map((car) => convertUsdFields(car, currency, ["dailyPrice"]));
  const displayRestaurants = restaurants.data.map((restaurant) => convertUsdFields(restaurant, currency, ["averageMealPrice"]));
  const displayAttractions = attractions.data.map((attraction) => convertUsdFields(attraction, currency, ["estimatedPrice"]));
  const displayItinerary = itinerary.data.map((day) => {
    const converted = { ...day, estimatedCost: fromUsd(day.estimatedCost, currency) };
    return {
      ...converted,
      transit: buildDayTransitPlans({
        day: converted,
        fromStay: selectedStay,
        transportPreference: displayRequest.transportPreference,
        cityTravelPreference: displayRequest.cityTravelPreference
      })
    };
  });

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    request: displayRequest,
    destination,
    alternates,
    budget,
    hotels: displayHotels,
    priceComparison: convertPriceComparison(priceComparison.data[0], currency),
    cars: displayCars,
    restaurants: displayRestaurants,
    attractions: displayAttractions,
    itinerary: displayItinerary,
    selectedStay,
    selectedHotel,
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
      "Destination ranking considers budget fit, trip style, and current travel appeal.",
      ...(destinations.warnings ?? []),
      ...budget.warnings
    ]
  };
}

function convertBudget(budget: ReturnType<typeof allocateBudget>, currency: ReturnType<typeof normalizeCurrency>) {
  return {
    ...budget,
    lodging: fromUsd(budget.lodging, currency),
    transport: fromUsd(budget.transport, currency),
    food: fromUsd(budget.food, currency),
    activities: fromUsd(budget.activities, currency),
    buffer: fromUsd(budget.buffer, currency),
    totalEstimated: fromUsd(budget.totalEstimated, currency),
    remaining: fromUsd(budget.remaining, currency)
  };
}

function convertPriceComparison(priceComparison: TripPlan["priceComparison"], currency: ReturnType<typeof normalizeCurrency>) {
  const flights = priceComparison.flights.map((quote) => ({ ...quote, estimatedPrice: fromUsd(quote.estimatedPrice, currency) }));
  const hotels = priceComparison.hotels.map((quote) => ({ ...quote, estimatedPrice: fromUsd(quote.estimatedPrice, currency) }));
  return {
    ...priceComparison,
    flights,
    hotels,
    lowestFlight: priceComparison.lowestFlight ? { ...priceComparison.lowestFlight, estimatedPrice: fromUsd(priceComparison.lowestFlight.estimatedPrice, currency) } : undefined,
    lowestHotel: priceComparison.lowestHotel ? { ...priceComparison.lowestHotel, estimatedPrice: fromUsd(priceComparison.lowestHotel.estimatedPrice, currency) } : undefined
  };
}

export async function refineTrip(plan: TripPlan, intent: RefinementIntent): Promise<TripPlan> {
  const nextRequest: TripRequest = { ...plan.request };

  if (intent === "cheaper") {
    nextRequest.totalBudget = Math.max(250, Math.min(nextRequest.totalBudget, Math.round(plan.budget.totalEstimated * 0.78)));
    nextRequest.preferredDestinationEnabled = false;
    nextRequest.destination = "";
    nextRequest.transportPreference = "public-transit";
    nextRequest.cityTravelPreference = "public-transit";
    nextRequest.travelStyle = "relaxed";
    nextRequest.tripLengthDays = Math.max(3, nextRequest.tripLengthDays > 4 ? nextRequest.tripLengthDays - 1 : nextRequest.tripLengthDays);
    if (nextRequest.dateMode === "exact") {
      nextRequest.dateMode = "month";
      nextRequest.endDate = "";
    }
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

  let refined = await planTrip(nextRequest);
  if (intent === "cheaper" && refined.budget.totalEstimated > plan.budget.totalEstimated * 0.88) {
    refined = await planTrip({
      ...nextRequest,
      totalBudget: Math.max(250, Math.round(nextRequest.totalBudget * 0.86)),
      tripLengthDays: Math.max(3, nextRequest.tripLengthDays - 1),
      excludedDestinationIds: Array.from(new Set([...(nextRequest.excludedDestinationIds ?? []), refined.destination.id]))
    });
  }

  return {
    ...refined,
    notes: [...refinementNotes(intent, plan, refined), ...refined.notes]
  };
}

function refinementNotes(intent: RefinementIntent, previous: TripPlan, refined: TripPlan) {
  if (intent !== "cheaper") return [`Refined for: ${intent.replace("-", " ")}.`];

  const currency = refined.request.currency;
  const savings = Math.max(0, previous.budget.totalEstimated - refined.budget.totalEstimated);
  const destinationChanged = previous.destination.id !== refined.destination.id;
  const daysChanged = previous.request.tripLengthDays !== refined.request.tripLengthDays;
  const dateChanged = previous.request.dateMode === "exact" && refined.request.dateMode === "month";
  const hotel = refined.hotels[0];
  const flight = refined.priceComparison.flights[0];
  const tradeoffs = [
    destinationChanged ? `different destination (${refined.destination.name})` : "same destination with lower-cost choices",
    daysChanged ? `${refined.request.tripLengthDays} trip days` : "same trip length",
    dateChanged ? "more flexible month search instead of exact dates" : "flexible timing where available",
    "public transit over car-first planning",
    hotel ? `value stay around ${formatMoney(hotel.nightlyPrice, currency)}/night` : "value stay package",
    flight ? `flight package around ${formatMoney(flight.estimatedPrice, currency)}` : "lower fare package"
  ];

  return [
    `A cheaper search found ${savings > 0 ? `${formatMoney(savings, currency)} in estimated savings` : "a lower-cost package mix"} compared with the previous plan.`,
    `Tradeoffs: ${tradeoffs.join("; ")}.`
  ];
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
      supabase: isSupabaseEnvConfigured() ? "configured" : "guest-mode",
      ai: isOpenRouterConfigured() ? "openrouter-ready" : "fallback",
      aiModel: process.env.OPENROUTER_MODEL ?? "nvidia/nemotron-3.5-content-safety:free"
    },
    fallbackAvailable: true
  };
}

function isSupabaseEnvConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}
