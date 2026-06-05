import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaItineraryGenerator } from "./ai";
import type { AttractionOption, DestinationOption, RestaurantOption, TripRequest } from "./types";

const destination: DestinationOption = {
  id: "lisbon",
  name: "Lisbon",
  country: "Portugal",
  summary: "Food and neighborhoods.",
  imageUrl: "https://example.com",
  costLevel: 2,
  trendingScore: 94,
  bestFor: ["food"],
  averageNightlyHotel: 140,
  averageDailyFood: 50,
  averageDailyActivities: 40,
  bookingLink: "https://example.com"
};

const request: TripRequest = {
  origin: "Toronto",
  preferredDestinationEnabled: true,
  destination: "Lisbon",
  tripLengthDays: 1,
  totalBudget: 1200,
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food"],
  transportPreference: "flexible"
};

const restaurants: RestaurantOption[] = [{ id: "r", name: "Market Table", cuisine: "local", neighborhood: "Old town", averageMealPrice: 25, rating: 4.5, source: "test", link: "https://example.com", confidence: 0.7 }];
const attractions: AttractionOption[] = [{ id: "a", name: "Tasting route", category: "food", estimatedPrice: 30, durationHours: 3, source: "test", link: "https://example.com", confidence: 0.7 }];

describe("OllamaItineraryGenerator", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_BASE_URL;
  });

  it("normalizes structured Ollama itinerary output", async () => {
    process.env.OLLAMA_MODEL = "llama3.1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            itinerary: [{ title: "Market day", morning: "Start at a cafe.", afternoon: "Visit the tasting route.", evening: "Dinner near Old town.", estimatedCost: 95 }]
          })
        })
      })
    );

    const result = await new OllamaItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("live");
    expect(result.data[0]).toMatchObject({ day: 1, title: "Market day", estimatedCost: 95 });
  });

  it("falls back when Ollama returns invalid JSON", async () => {
    process.env.OLLAMA_MODEL = "llama3.1";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: "not json" })
      })
    );

    const result = await new OllamaItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("fallback");
    expect(result.data[0].title).toContain("Arrival");
  });

  it("falls back when the local request fails", async () => {
    process.env.OLLAMA_MODEL = "llama3.1";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await new OllamaItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("fallback");
  });
});
