import { FallbackItineraryGenerator, type ItineraryGenerator } from "./providers";
import { allocateBudget } from "./budget";
import type { AttractionOption, DestinationOption, ItineraryDay, ProviderResult, RestaurantOption, TripRequest } from "./types";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ItineraryArgs = {
  destination: DestinationOption;
  request: TripRequest;
  restaurants: RestaurantOption[];
  attractions: AttractionOption[];
};

const defaultModel = "nvidia/nemotron-3.5-content-safety:free";

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export class OpenRouterItineraryGenerator implements ItineraryGenerator {
  private fallback = new FallbackItineraryGenerator();

  async generateItinerary(args: ItineraryArgs): Promise<ProviderResult<ItineraryDay>> {
    if (!isOpenRouterConfigured()) return this.fallback.generateItinerary(args);

    try {
      const data = await callOpenRouter(args);
      const itinerary = normalizeItinerary(data, args);
      if (!itinerary.length) return this.fallback.generateItinerary(args);
      return {
        data: itinerary,
        source: "live",
        providerName: `OpenRouter (${process.env.OPENROUTER_MODEL ?? defaultModel})`,
        confidence: 0.62
      };
    } catch {
      return this.fallback.generateItinerary(args);
    }
  }
}

async function callOpenRouter(args: ItineraryArgs): Promise<unknown> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), Number(process.env.OPENROUTER_TIMEOUT_MS ?? 12000));
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(process.env.OPENROUTER_HTTP_REFERER ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER } : {}),
        ...(process.env.OPENROUTER_X_TITLE ? { "X-Title": process.env.OPENROUTER_X_TITLE } : {})
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? defaultModel,
        temperature: Number(process.env.OPENROUTER_TEMPERATURE ?? 0.8),
        top_p: Number(process.env.OPENROUTER_TOP_P ?? 0.9),
        max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS ?? 1100),
        messages: [
          {
            role: "user",
            content: buildPrompt(args)
          }
        ]
      })
    });

    if (!response.ok) throw new Error("OpenRouter request failed");
    const payload = (await response.json()) as OpenRouterResponse;
    const rawContent = payload.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("OpenRouter returned no content");
    return parseJsonFromContent(rawContent);
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt({ destination, request, restaurants, attractions }: ItineraryArgs) {
  const dayBudgets = deriveDailyBudgetTargets(request, destination);
  return JSON.stringify({
    instruction:
      "Return JSON only. Create a vivid, fun, locally specific itinerary that feels unique to the destination and avoids repetitive labels like 'Museum Day' or 'Adventure Day'. Use varied day themes such as food, neighborhoods, views, markets, nightlife, recovery, and activity balance. Keep each segment concise and concrete with place-like specificity. Vary estimatedCost by day and keep totals roughly aligned with provided day budget targets. Do not include booking claims or exact price claims.",
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
      transportPreference: request.transportPreference,
      dayBudgetTargets: dayBudgets
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

function normalizeItinerary(data: unknown, args: ItineraryArgs): ItineraryDay[] {
  const expectedDays = args.request.tripLengthDays;
  const source = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.itinerary) ? data.itinerary : [];
  const days = source
    .slice(0, expectedDays)
    .map((item, index) => normalizeDay(item, index + 1))
    .filter((day): day is ItineraryDay => Boolean(day));
  return applyCostVariance(days, args.request, args.destination);
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

function deriveDailyBudgetTargets(request: TripRequest, destination: DestinationOption): number[] {
  const budget = allocateBudget(request, destination);
  const dayCount = Math.max(1, request.tripLengthDays);
  const totalTarget = budget.food + budget.activities + Math.round(budget.transport * 0.55);
  const profile =
    request.travelStyle === "packed"
      ? [1.0, 1.15, 1.08, 1.22, 0.94, 1.28, 1.1]
      : request.travelStyle === "relaxed"
        ? [0.82, 0.94, 1.05, 0.9, 1.12, 0.88, 1.04]
        : [0.9, 1.06, 0.98, 1.12, 0.95, 1.2, 1.03];
  const weights = Array.from({ length: dayCount }, (_, index) => profile[index % profile.length]);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => Math.max(35, Math.round((totalTarget * weight) / Math.max(totalWeight, 1))));
}

function applyCostVariance(days: ItineraryDay[], request: TripRequest, destination: DestinationOption): ItineraryDay[] {
  if (!days.length) return days;
  if (days.length === 1) return days;
  const uniqueCosts = new Set(days.map((day) => day.estimatedCost)).size;
  if (uniqueCosts > 1) return days;

  const targets = deriveDailyBudgetTargets(request, destination);
  return days.map((day, index) => ({ ...day, estimatedCost: targets[index] ?? day.estimatedCost }));
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

function parseJsonFromContent(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const withoutFenceStart = trimmed.replace(/^```(?:json)?\s*/i, "");
    const withoutFence = withoutFenceStart.replace(/\s*```$/, "");
    return JSON.parse(withoutFence);
  }
  return JSON.parse(trimmed);
}
