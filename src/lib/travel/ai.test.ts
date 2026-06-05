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
    delete process.env.OLLAMA_TEMPERATURE;
    delete process.env.OLLAMA_TOP_P;
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

  it("asks Ollama for vivid itinerary JSON with creative generation options", async () => {
    process.env.OLLAMA_MODEL = "llama3.1";
    process.env.OLLAMA_TEMPERATURE = "0.9";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          itinerary: [{ title: "Tile hunt", morning: "Start with tiled lanes.", afternoon: "Ride to the tasting route.", evening: "Dinner near Old town.", estimatedCost: 88 }]
        })
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new OllamaItineraryGenerator().generateItinerary({ destination, request: { ...request, dateMode: "exact", startDate: "2026-07-10", endDate: "2026-07-14" }, restaurants, attractions });
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const prompt = JSON.parse(payload.prompt);
    expect(payload.options.temperature).toBe(0.9);
    expect(prompt.instruction).toContain("vivid, fun, locally specific");
    expect(prompt.trip).toMatchObject({ origin: "Toronto", dateMode: "exact", startDate: "2026-07-10" });
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
