import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenRouterItineraryGenerator } from "./ai";
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

describe("OpenRouterItineraryGenerator", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.OPENROUTER_TEMPERATURE;
    delete process.env.OPENROUTER_TOP_P;
  });

  it("normalizes structured OpenRouter itinerary output", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "nvidia/nemotron-3.5-content-safety:free";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  itinerary: [{ title: "Market day", morning: "Start at a cafe.", afternoon: "Visit the tasting route.", evening: "Dinner near Old town.", estimatedCost: 95 }]
                })
              }
            }
          ]
        })
      })
    );

    const result = await new OpenRouterItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("live");
    expect(result.data[0]).toMatchObject({ day: 1, title: "Market day", estimatedCost: 95 });
  });

  it("asks OpenRouter for vivid itinerary JSON with creative generation options", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODEL = "nvidia/nemotron-3.5-content-safety:free";
    process.env.OPENROUTER_TEMPERATURE = "0.9";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                itinerary: [{ title: "Tile hunt", morning: "Start with tiled lanes.", afternoon: "Ride to the tasting route.", evening: "Dinner near Old town.", estimatedCost: 88 }]
              })
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterItineraryGenerator().generateItinerary({ destination, request: { ...request, dateMode: "exact", startDate: "2026-07-10", endDate: "2026-07-14" }, restaurants, attractions });
    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const prompt = JSON.parse(payload.messages[0].content);
    expect(payload.temperature).toBe(0.9);
    expect(prompt.instruction).toContain("vivid, fun, locally specific");
    expect(prompt.trip).toMatchObject({ origin: "Toronto", dateMode: "exact", startDate: "2026-07-10" });
  });

  it("falls back when OpenRouter returns invalid JSON", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "not json"
              }
            }
          ]
        })
      })
    );

    const result = await new OpenRouterItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("fallback");
    expect(result.data[0].title).toContain("Arrival");
  });

  it("falls back when the OpenRouter request fails", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await new OpenRouterItineraryGenerator().generateItinerary({ destination, request, restaurants, attractions });
    expect(result.source).toBe("fallback");
  });
});
