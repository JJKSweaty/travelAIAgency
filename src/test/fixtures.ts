import type { TripPlan } from "@/lib/travel/types";

export function createTripPlan(overrides: Partial<TripPlan> = {}): TripPlan {
  const plan: TripPlan = {
    id: "test",
    createdAt: new Date().toISOString(),
    request: {
      origin: "Toronto",
      preferredDestinationEnabled: true,
      destination: "Lisbon",
      tripLengthDays: 3,
      totalBudget: 2000,
      currency: "CAD",
      travelers: 2,
      travelStyle: "balanced",
      interests: ["food"],
      transportPreference: "flexible",
      cityTravelPreference: "mixed"
    },
    destination: {
      id: "lisbon",
      name: "Lisbon",
      country: "Portugal",
      summary: "Sunny neighborhoods and strong food culture.",
      imageUrl: "https://example.com/lisbon.jpg",
      costLevel: 2,
      trendingScore: 94,
      bestFor: ["food"],
      averageNightlyHotel: 140,
      averageDailyFood: 50,
      averageDailyActivities: 40,
      bookingLink: "https://example.com"
    },
    alternates: [],
    budget: {
      lodging: 700,
      transport: 500,
      food: 450,
      activities: 250,
      buffer: 150,
      totalEstimated: 1600,
      remaining: 400,
      feasibility: "comfortable",
      warnings: []
    },
    hotels: [
      { id: "h-value", name: "Value Rooms", location: "Transit area", nightlyPrice: 90, rating: 4.1, source: "test", link: "https://example.com/value", confidence: 0.67 },
      { id: "h", name: "Central House", location: "Center", nightlyPrice: 120, rating: 4.4, source: "test", link: "https://example.com/hotel", confidence: 0.7 }
    ],
    priceComparison: {
      flights: [
        {
          id: "f",
          category: "flight",
          provider: "google-flights",
          displayName: "Google Flights",
          estimatedPrice: 420,
          unit: "round-trip",
          link: "https://example.com/flights",
          source: "fallback",
          confidence: 0.6,
          lastChecked: new Date().toISOString(),
          linkLabel: "Exact flight search"
        },
        {
          id: "f-premium",
          category: "flight",
          provider: "expedia",
          displayName: "Expedia",
          estimatedPrice: 760,
          unit: "round-trip",
          link: "https://example.com/expedia",
          source: "fallback",
          confidence: 0.55,
          lastChecked: new Date().toISOString(),
          linkLabel: "Open provider search"
        }
      ],
      hotels: [
        {
          id: "hm",
          category: "hotel",
          provider: "booking",
          displayName: "Booking.com",
          estimatedPrice: 125,
          unit: "night",
          link: "https://example.com/booking",
          source: "fallback",
          confidence: 0.6,
          lastChecked: new Date().toISOString(),
          linkLabel: "Exact hotel search"
        }
      ],
      sourceNote: "Fallback estimates.",
      lowestFlight: undefined,
      lowestHotel: undefined
    },
    cars: [{ id: "c", name: "Transit allowance", pickupLocation: "City", dailyPrice: 25, rating: 4, source: "test", link: "https://example.com/cars", confidence: 0.7 }],
    restaurants: [{ id: "r", name: "Market Table", cuisine: "local", neighborhood: "Old town", averageMealPrice: 25, rating: 4.5, source: "test", link: "https://example.com/food", confidence: 0.7 }],
    attractions: [{ id: "a", name: "Tasting route", category: "food", estimatedPrice: 30, durationHours: 3, source: "test", link: "https://example.com/attraction", confidence: 0.7 }],
    itinerary: [
      {
        day: 1,
        title: "Arrival",
        morning: "Arrive",
        afternoon: "Explore",
        evening: "Dinner",
        estimatedCost: 90,
        transit: [
          {
            mode: "metro",
            durationMinutes: 20,
            summary: "Morning: Metro about 20 min",
            from: "Central House",
            to: "Arrive",
            mapLink: "https://example.com/maps"
          }
        ]
      }
    ],
    providerSummary: { hotels: "fallback", priceComparison: "fallback", cars: "fallback", restaurants: "fallback", attractions: "fallback", itinerary: "fallback" },
    notes: ["Prices are estimates."]
  };

  return { ...plan, ...overrides };
}
