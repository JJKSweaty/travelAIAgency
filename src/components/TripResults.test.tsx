import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TripResults } from "./TripResults";
import type { TripPlan } from "@/lib/travel/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const plan: TripPlan = {
  id: "test",
  createdAt: new Date().toISOString(),
  request: {
    origin: "Toronto",
    preferredDestinationEnabled: true,
    destination: "Lisbon",
    tripLengthDays: 3,
    totalBudget: 2000,
    travelers: 2,
    travelStyle: "balanced",
    interests: ["food"],
    transportPreference: "flexible"
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
    transport: 250,
    food: 450,
    activities: 250,
    buffer: 150,
    totalEstimated: 1600,
    remaining: 400,
    feasibility: "comfortable",
    warnings: []
  },
  hotels: [{ id: "h", name: "Central House", location: "Center", nightlyPrice: 120, rating: 4.4, source: "test", link: "https://example.com", confidence: 0.7 }],
  priceComparison: {
    flights: [
      {
        id: "f",
        category: "flight",
        provider: "google-flights",
        displayName: "Google Flights",
        estimatedPrice: 420,
        unit: "round-trip",
        link: "https://example.com",
        source: "fallback",
        confidence: 0.6,
        lastChecked: new Date().toISOString()
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
        link: "https://example.com",
        source: "fallback",
        confidence: 0.6,
        lastChecked: new Date().toISOString()
      }
    ],
    sourceNote: "Fallback estimates.",
    lowestFlight: undefined,
    lowestHotel: undefined
  },
  cars: [{ id: "c", name: "Transit allowance", pickupLocation: "City", dailyPrice: 25, rating: 4, source: "test", link: "https://example.com", confidence: 0.7 }],
  restaurants: [{ id: "r", name: "Market Table", cuisine: "local", neighborhood: "Old town", averageMealPrice: 25, rating: 4.5, source: "test", link: "https://example.com", confidence: 0.7 }],
  attractions: [{ id: "a", name: "Tasting route", category: "food", estimatedPrice: 30, durationHours: 3, source: "test", link: "https://example.com", confidence: 0.7 }],
  itinerary: [{ day: 1, title: "Arrival", morning: "Arrive", afternoon: "Explore", evening: "Dinner", estimatedCost: 90 }],
  providerSummary: { hotels: "fallback", priceComparison: "fallback", cars: "fallback", restaurants: "fallback", attractions: "fallback", itinerary: "fallback" },
  notes: ["Prices are estimates."]
};

describe("TripResults", () => {
  it("renders major result sections from the active trip", async () => {
    window.sessionStorage.setItem("aiTravelAgency.currentTrip", JSON.stringify(plan));
    render(<TripResults />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lisbon" })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /price comparison/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /hotels/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /restaurants & food/i })).toBeInTheDocument();
    expect(screen.getByText(/morning/i)).toBeInTheDocument();
    expect(screen.getByText(/afternoon/i)).toBeInTheDocument();
    expect(screen.getByText(/about \$25\/meal/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save trip/i })).toBeInTheDocument();
  });
});
