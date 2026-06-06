import type { TripPlan } from "@/lib/travel/types";

export function createTripPlan(overrides: Partial<TripPlan> = {}): TripPlan {
  const plan: TripPlan = {
    id: "test",
    createdAt: new Date().toISOString(),
    request: {
      origin: "Toronto",
      preferredDestinationEnabled: true,
      destination: "Lisbon",
      dateMode: "exact",
      startDate: "2026-07-10",
      endDate: "2026-07-14",
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
      {
        id: "h-value",
        name: "Hotel Mundial",
        location: "Baixa",
        nightlyPrice: 90,
        rating: 4.2,
        source: "Demo hotel catalog",
        link: "https://example.com/value",
        confidence: 0.67,
        priceSource: "estimate",
        starRating: 4,
        reviewCount: 10400,
        description: "Large central hotel near Rossio, tram routes, and Baixa restaurants.",
        amenities: ["Free Wi-Fi", "Restaurant", "Breakfast available"],
        cancellationNote: "Check cancellation terms on the partner site.",
        distanceKm: 0.5
      },
      {
        id: "h",
        name: "Memmo Alfama",
        location: "Alfama",
        nightlyPrice: 120,
        rating: 4.7,
        source: "Demo hotel catalog",
        link: "https://example.com/hotel",
        confidence: 0.7,
        priceSource: "estimate",
        starRating: 4,
        reviewCount: 1100,
        description: "Boutique stay in Alfama with river-view spaces and walkable old-town access.",
        amenities: ["Free Wi-Fi", "Bar", "Breakfast available"],
        cancellationNote: "Check cancellation terms on the partner site.",
        distanceKm: 0.9
      }
    ],
    priceComparison: {
      flights: [
        {
          id: "f",
          category: "flight",
          provider: "google-flights",
          displayName: "Air Canada Main cabin",
          estimatedPrice: 420,
          unit: "round-trip",
          link: "https://example.com/flights",
          source: "fallback",
          confidence: 0.6,
          lastChecked: new Date().toISOString(),
          linkLabel: "View flight",
          airline: "Air Canada",
          airlineCode: "AC",
          flightNumber: "AC 800",
          departureAirport: "YYZ",
          arrivalAirport: "LIS",
          departureTime: "8:10 AM",
          arrivalTime: "8:45 PM",
          durationMinutes: 455,
          stops: 0,
          baggage: "Carry-on included",
          fareType: "Main cabin",
          refundableNote: "Check fare rules before booking"
        },
        {
          id: "f-premium",
          category: "flight",
          provider: "expedia",
          displayName: "TAP Air Portugal Flexible ticket",
          estimatedPrice: 760,
          unit: "round-trip",
          link: "https://example.com/expedia",
          source: "fallback",
          confidence: 0.55,
          lastChecked: new Date().toISOString(),
          linkLabel: "View flight",
          airline: "TAP Air Portugal",
          airlineCode: "TP",
          flightNumber: "TP 258",
          departureAirport: "YYZ",
          arrivalAirport: "LIS",
          departureTime: "10:45 PM",
          arrivalTime: "10:20 AM +1",
          durationMinutes: 515,
          stops: 1,
          layoverCity: "OPO",
          baggage: "Checked bag included",
          fareType: "Flexible ticket",
          refundableNote: "Changeable fare; check final rules"
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
            from: "Hotel Mundial",
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
