import { FallbackItineraryGenerator, type ItineraryGenerator } from "./providers";
import type { AttractionOption, DestinationOption, ItineraryDay, ProviderResult, RestaurantOption, TripRequest } from "./types";

type OllamaResponse = {
  response?: string;
};

type ItineraryArgs = {
  destination: DestinationOption;
  request: TripRequest;
  restaurants: RestaurantOption[];
  attractions: AttractionOption[];
};

export function isOllamaConfigured() {
  return Boolean(process.env.OLLAMA_MODEL);
}

export class OllamaItineraryGenerator implements ItineraryGenerator {
  private fallback = new FallbackItineraryGenerator();

  async generateItinerary(args: ItineraryArgs): Promise<ProviderResult<ItineraryDay>> {
    if (!isOllamaConfigured()) return this.fallback.generateItinerary(args);

    try {
      const data = await callOllama(args);
      const itinerary = normalizeItinerary(data, args.request.tripLengthDays);
      if (!itinerary.length) return this.fallback.generateItinerary(args);
      return {
        data: itinerary,
        source: "live",
        providerName: `Local Ollama (${process.env.OLLAMA_MODEL})`,
        confidence: 0.62
      };
    } catch {
      return this.fallback.generateItinerary(args);
    }
  }
}

async function callOllama(args: ItineraryArgs): Promise<unknown> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), Number(process.env.OLLAMA_TIMEOUT_MS ?? 8000));
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: {
          temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.85),
          top_p: Number(process.env.OLLAMA_TOP_P ?? 0.9)
        },
        prompt: buildPrompt(args)
      })
    });

    if (!response.ok) throw new Error("Ollama request failed");
    const payload = (await response.json()) as OllamaResponse;
    if (!payload.response) throw new Error("Ollama returned no response text");
    return JSON.parse(payload.response);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt({ destination, request, restaurants, attractions }: ItineraryArgs) {
  return JSON.stringify({
    instruction:
      "Return JSON only. Create a vivid, fun, locally specific travel itinerary using the provided restaurants and attractions. Avoid generic filler like 'explore the city' unless it is tied to a concrete place, neighborhood, food, view, route, or rhythm. Keep each segment practical, concise, and energetic. Do not include booking claims or exact price claims.",
    schema: {
      itinerary: [
        {
          day: 1,
          title: "short title",
          morning: "one practical sentence",
          afternoon: "one practical sentence",
          evening: "one practical sentence",
          estimatedCost: 100
        }
      ]
    },
    trip: {
      destination: `${destination.name}, ${destination.country}`,
      origin: request.origin,
      days: request.tripLengthDays,
      dateMode: request.dateMode ?? "month",
      startDate: request.startDate,
      endDate: request.endDate,
      travelers: request.travelers,
      style: request.travelStyle,
      interests: request.interests,
      budget: request.totalBudget,
      transportPreference: request.transportPreference
    },
    restaurants: restaurants.map((restaurant) => ({
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      neighborhood: restaurant.neighborhood,
      averageMealPrice: restaurant.averageMealPrice
    })),
    attractions: attractions.map((attraction) => ({
      name: attraction.name,
      category: attraction.category,
      durationHours: attraction.durationHours,
      estimatedPrice: attraction.estimatedPrice
    }))
  });
}

function normalizeItinerary(data: unknown, expectedDays: number): ItineraryDay[] {
  const source = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.itinerary) ? data.itinerary : [];
  return source
    .slice(0, expectedDays)
    .map((item, index) => normalizeDay(item, index + 1))
    .filter((day): day is ItineraryDay => Boolean(day));
}

function normalizeDay(item: unknown, day: number): ItineraryDay | null {
  if (!isRecord(item)) return null;
  const title = stringValue(item.title);
  const morning = stringValue(item.morning);
  const afternoon = stringValue(item.afternoon);
  const evening = stringValue(item.evening);
  const estimatedCost = Math.max(0, Math.round(Number(item.estimatedCost ?? 0)));

  if (!title || !morning || !afternoon || !evening) return null;
  return { day, title, morning, afternoon, evening, estimatedCost };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}
