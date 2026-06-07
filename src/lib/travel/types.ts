export type TravelStyle = "relaxed" | "balanced" | "packed";
export type TransportPreference = "rental-car" | "public-transit" | "flexible";
export type CityTravelPreference = "walkable" | "public-transit" | "rideshare" | "rental-car" | "mixed";
export type CurrencyCode = "USD" | "CAD" | "EUR" | "GBP" | "AUD" | "JPY" | "MXN";
export type TravelDataSource =
  | "SerpApi Google Flights"
  | "Kiwi Tequila"
  | "Google Places"
  | "SerpApi Google Hotels"
  | "Hotel website"
  | "Provider search";
export type TravelDataQuality = "provider" | "partial" | "search-link" | "unavailable";
export type LocationSuggestionMode = "origin" | "destination";
export type TravelDateMode = "month" | "exact";
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
  dateMode?: TravelDateMode;
  startDate?: string;
  endDate?: string;
  tripLengthDays: number;
  totalBudget: number;
  currency?: CurrencyCode;
  travelers: number;
  travelStyle: TravelStyle;
  interests: Interest[];
  transportPreference: TransportPreference;
  cityTravelPreference?: CityTravelPreference;
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
  airportCode?: string;
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
  packageBaseEstimated?: number;
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
  priceSource?: "live" | "estimate" | "unavailable";
  imageUrl?: string;
  starRating?: number;
  reviewCount?: number;
  description?: string;
  amenities?: string[];
  cancellationNote?: string;
  totalPrice?: number;
  distanceKm?: number;
  bookingLinkLabel?: string;
  placeId?: string;
  photoAttributions?: string[];
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
  linkLabel?: string;
  priceSource?: "live" | "estimate" | "unavailable";
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  stops?: number;
  layoverCity?: string;
  baggage?: string;
  fareType?: string;
  refundableNote?: string;
  pricePerTraveler?: number;
  totalPrice?: number;
};

export type PriceComparison = {
  flights: PriceQuote[];
  hotels: PriceQuote[];
  lowestFlight?: PriceQuote;
  lowestHotel?: PriceQuote;
  sourceNote: string;
};

export type FlightLayover = {
  airport?: string;
  duration?: number | string;
};

export type FlightResult = {
  id: string;
  source: TravelDataSource;
  sourceUrl: string | null;
  airlineName: string | null;
  airlineLogoUrl: string | null;
  flightNumber: string | null;
  originAirport: string | null;
  destinationAirport: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  duration: number | string | null;
  stops: number | null;
  layovers: FlightLayover[];
  cabin: string | null;
  baggage: string[];
  fareType: string | null;
  pricePerTraveler: number | null;
  totalPrice: number | null;
  currency: CurrencyCode;
  fetchedAt: string;
  isLivePrice: boolean;
  dataQuality: TravelDataQuality;
  bookingToken: string | null;
};

export type HotelResult = {
  id: string;
  source: TravelDataSource;
  sourceUrl: string | null;
  propertyToken: string | null;
  name: string;
  imageUrl: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  distanceFromCenter: number | null;
  starRating: number | null;
  guestRating: number | null;
  reviewCount: number | null;
  description: string | null;
  amenities: string[];
  cancellationPolicy: string | null;
  pricePerNight: number | null;
  totalPrice: number | null;
  currency: CurrencyCode;
  taxesIncluded: boolean | null;
  fetchedAt: string;
  isLivePrice: boolean;
  dataQuality: TravelDataQuality;
};

export type ItineraryDay = {
  day: number;
  title: string;
  theme?: string;
  morning: string;
  afternoon: string;
  evening: string;
  estimatedCost: number;
  transit?: TransitPlan[];
  additions?: ItineraryAddition[];
};

export type ItineraryAdditionCategory = "food" | "activity" | "shopping" | "show" | "relaxation" | "custom";

export type TransitPlan = {
  mode: "walk" | "public-transit" | "metro" | "bike" | "rideshare" | "drive";
  durationMinutes: number;
  summary: string;
  from: string;
  to: string;
  mapLink: string;
};

export type ItineraryAddition = {
  id: string;
  title: string;
  category: ItineraryAdditionCategory;
  estimatedCost?: number;
  note?: string;
  transit?: TransitPlan;
  addedAt: string;
};

export type TripStaySelection = {
  type: "hotel" | "airbnb";
  label: string;
  location: string;
};

export type TravelSelectionSearchContext = {
  origin?: string;
  destination?: string;
  travelMonth?: string | null;
  departureDate?: string;
  returnDate?: string;
  tripLengthDays?: number;
  travelers?: number;
  budget?: number;
  currency?: CurrencyCode;
  searchKey?: string;
  selectedAt?: string;
};

export type SelectedHotelOption = {
  id: string;
  providerListingId?: string | null;
  name: string;
  location: string;
  nightlyPrice: number;
  priceAtSelection?: number;
  currentPrice?: number;
  source: string;
  link: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  starRating?: number;
  amenities?: string[];
  cancellationNote?: string;
  totalPrice?: number;
  totalPriceAtSelection?: number;
  currentTotalPrice?: number;
  priceSource?: HotelOption["priceSource"];
  lastPriceCheckedAt?: string;
  searchContext?: TravelSelectionSearchContext;
};

export type SelectedQuoteOption = {
  id: string;
  providerListingId?: string | null;
  category: PriceQuote["category"];
  provider: string;
  displayName: string;
  estimatedPrice: number;
  priceAtSelection?: number;
  currentPrice?: number;
  unit: PriceQuote["unit"];
  link: string;
  source: PriceQuote["source"];
  linkLabel?: string;
  airline?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  stops?: number;
  baggage?: string;
  packageLevel?: string;
  lastPriceCheckedAt?: string;
  searchContext?: TravelSelectionSearchContext;
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
  selectedStay?: TripStaySelection;
  selectedHotel?: SelectedHotelOption;
  selectedFlightQuote?: SelectedQuoteOption;
  selectedHotelQuote?: SelectedQuoteOption;
  travelSearchCache?: TravelSearchCache;
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

export type TravelSearchCache = {
  tripId?: string;
  origin?: string;
  destination?: string;
  travelMonth?: string | null;
  dates?: {
    departureDate?: string;
    returnDate?: string;
    checkInDate?: string;
    checkOutDate?: string;
  };
  tripLengthDays?: number;
  travelers?: number;
  rooms?: number;
  budget?: number;
  currency?: CurrencyCode;
  cabinClass?: string | null;
  flightSearchKey?: string;
  hotelSearchKey?: string;
  cachedFlights?: FlightResult[];
  cachedHotels?: HotelResult[];
  flightsFetchedAt?: string;
  hotelsFetchedAt?: string;
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
