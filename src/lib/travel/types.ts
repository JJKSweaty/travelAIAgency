export type TravelStyle = "relaxed" | "balanced" | "packed";
export type TransportPreference = "rental-car" | "public-transit" | "flexible";
export type LocationSuggestionMode = "origin" | "destination";
export type Interest =
  | "food"
  | "nightlife"
  | "nature"
  | "museums"
  | "beaches"
  | "family"
  | "luxury"
  | "budget"
  | "adventure";

export type TripRequest = {
  origin: string;
  preferredDestinationEnabled: boolean;
  destination?: string;
  startDate?: string;
  endDate?: string;
  tripLengthDays: number;
  totalBudget: number;
  travelers: number;
  travelStyle: TravelStyle;
  interests: Interest[];
  transportPreference: TransportPreference;
  excludedDestinationIds?: string[];
  excludedHotelIds?: string[];
  itineraryVariant?: number;
};

export type ProviderResult<T> = {
  data: T[];
  source: "live" | "fallback";
  providerName: string;
  confidence: number;
  warnings?: string[];
};

export type LocationOption = {
  id: string;
  name: string;
  country: string;
  label: string;
  source: "geocoding" | "curated" | "custom";
  detail?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  costLevel?: DestinationOption["costLevel"];
  bestFor?: Interest[];
};

export type BudgetBreakdown = {
  lodging: number;
  transport: number;
  food: number;
  activities: number;
  buffer: number;
  totalEstimated: number;
  remaining: number;
  feasibility: "tight" | "workable" | "comfortable";
  warnings: string[];
};

export type DestinationOption = {
  id: string;
  name: string;
  country: string;
  summary: string;
  imageUrl: string;
  costLevel: 1 | 2 | 3 | 4 | 5;
  trendingScore: number;
  bestFor: Interest[];
  averageNightlyHotel: number;
  averageDailyFood: number;
  averageDailyActivities: number;
  bookingLink: string;
};

export type HotelOption = {
  id: string;
  name: string;
  location: string;
  nightlyPrice: number;
  rating: number;
  source: string;
  link: string;
  confidence: number;
};

export type CarOption = {
  id: string;
  name: string;
  pickupLocation: string;
  dailyPrice: number;
  rating: number;
  source: string;
  link: string;
  confidence: number;
};

export type RestaurantOption = {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  averageMealPrice: number;
  rating: number;
  source: string;
  link: string;
  confidence: number;
};

export type AttractionOption = {
  id: string;
  name: string;
  category: Interest;
  estimatedPrice: number;
  durationHours: number;
  source: string;
  link: string;
  confidence: number;
};

export type PriceQuote = {
  id: string;
  category: "flight" | "hotel";
  provider: string;
  displayName: string;
  estimatedPrice: number;
  unit: "round-trip" | "night";
  link: string;
  source: "live" | "fallback";
  confidence: number;
  lastChecked: string;
};

export type PriceComparison = {
  flights: PriceQuote[];
  hotels: PriceQuote[];
  lowestFlight?: PriceQuote;
  lowestHotel?: PriceQuote;
  sourceNote: string;
};

export type ItineraryDay = {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  estimatedCost: number;
};

export type TripPlan = {
  id: string;
  createdAt: string;
  request: TripRequest;
  destination: DestinationOption;
  alternates: DestinationOption[];
  budget: BudgetBreakdown;
  hotels: HotelOption[];
  priceComparison: PriceComparison;
  cars: CarOption[];
  restaurants: RestaurantOption[];
  attractions: AttractionOption[];
  itinerary: ItineraryDay[];
  providerSummary: {
    hotels: ProviderResult<HotelOption>["source"];
    priceComparison: ProviderResult<PriceComparison>["source"];
    cars: ProviderResult<CarOption>["source"];
    restaurants: ProviderResult<RestaurantOption>["source"];
    attractions: ProviderResult<AttractionOption>["source"];
    itinerary: ProviderResult<ItineraryDay>["source"];
  };
  notes: string[];
};

export type RefinementIntent =
  | "cheaper"
  | "luxury"
  | "food"
  | "relaxed"
  | "adventure"
  | "next-destination"
  | "replace-hotel"
  | "regenerate";
