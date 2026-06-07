import { destinations } from "./fallback-data";
import { FallbackDestinationTrendProvider, FallbackItineraryGenerator, type DestinationTrendProvider, type ItineraryGenerator } from "./providers";
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

export class OpenRouterDestinationTrendProvider implements DestinationTrendProvider {
  private fallback = new FallbackDestinationTrendProvider();

  async findDestinations(request: TripRequest): Promise<ProviderResult<DestinationOption>> {
    if (request.preferredDestinationEnabled || !isOpenRouterConfigured()) {
      return this.fallback.findDestinations(request);
    }

    try {
      const data = await callOpenRouterContent(buildDestinationPrompt(request), Number(process.env.OPENROUTER_DESTINATION_TIMEOUT_MS ?? 14000));
      const aiDestinations = normalizeDestinationSuggestions(data, request);
      const fallback = await this.fallback.findDestinations(request);
      const merged = mergeDestinations([...aiDestinations, ...fallback.data]);
      const fitting = merged.filter((destination) => allocateBudget(request, destination).remaining >= 0);

      if (!fitting.length) return fallback;

      return {
        data: fitting,
        source: "live",
        providerName: `OpenRouter destination planner (${process.env.OPENROUTER_MODEL ?? defaultModel})`,
        confidence: 0.68,
        warnings: fallback.warnings
      };
    } catch {
      return this.fallback.findDestinations(request);
    }
  }
}

async function callOpenRouter(args: ItineraryArgs): Promise<unknown> {
  return callOpenRouterContent(buildPrompt(args), Number(process.env.OPENROUTER_TIMEOUT_MS ?? 12000));
}

async function callOpenRouterContent(content: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), timeoutMs);
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
            content
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

function buildDestinationPrompt(request: TripRequest) {
  const seedSummaries = destinations
    .map((destination) => ({
      name: destination.name,
      country: destination.country,
      averageNightlyHotel: destination.averageNightlyHotel,
      averageDailyFood: destination.averageDailyFood,
      averageDailyActivities: destination.averageDailyActivities,
      costLevel: destination.costLevel,
      bestFor: destination.bestFor
    }))
    .slice(0, 40);

  return JSON.stringify({
    instruction:
      "Return JSON only. Recommend affordable travel destinations for this exact trip budget. Prefer places whose full package can fit the budget including round-trip transport from origin, lodging, food, activities, and local transport. Include obvious nearby or package-friendly choices when appropriate, such as domestic Canada, Cuba, Dominican Republic, Mexico, or other low-cost destinations. Do not recommend anything likely over budget.",
    schema: {
      destinations: [
        {
          name: "Varadero",
          country: "Cuba",
          summary: "why this fits the budget",
          costLevel: 1,
          averageNightlyHotel: 80,
          averageDailyFood: 10,
          averageDailyActivities: 10,
          bestFor: ["beaches", "budget", "family"]
        }
      ]
    },
    trip: {
      origin: request.origin,
      budgetUsd: request.totalBudget,
      days: request.tripLengthDays,
      travelers: request.travelers,
      startDate: request.startDate,
      endDate: request.endDate,
      style: request.travelStyle,
      interests: request.interests,
      transportPreference: request.transportPreference
    },
    existingSeeds: seedSummaries
  });
}

function normalizeDestinationSuggestions(data: unknown, request: TripRequest): DestinationOption[] {
  const source = Array.isArray(data) ? data : isRecord(data) && Array.isArray(data.destinations) ? data.destinations : [];
  return source
    .map((item, index) => normalizeDestinationSuggestion(item, request, index))
    .filter((destination): destination is DestinationOption => Boolean(destination))
    .filter((destination) => allocateBudget(request, destination).remaining >= 0)
    .sort((a, b) => allocateBudget(request, b).remaining - allocateBudget(request, a).remaining)
    .slice(0, 6);
}

function normalizeDestinationSuggestion(item: unknown, request: TripRequest, index: number): DestinationOption | null {
  if (!isRecord(item)) return null;
  const name = stringValue(item.name);
  const country = stringValue(item.country);
  if (!name || !country) return null;

  const existing = destinations.find((destination) => destination.name.toLowerCase() === name.toLowerCase() && destination.country.toLowerCase() === country.toLowerCase());
  if (existing) return existing;

  const bestFor = normalizeInterests(item.bestFor, request);
  const costLevel = integerInRange(item.costLevel, 1, 5) as DestinationOption["costLevel"];
  const averageNightlyHotel = integerInRange(item.averageNightlyHotel, 35, 260);
  const averageDailyFood = integerInRange(item.averageDailyFood, 8, 95);
  const averageDailyActivities = integerInRange(item.averageDailyActivities, 8, 95);
  const label = `${name}, ${country}`;

  return {
    id: `ai-${slug(label)}-${index + 1}`,
    name,
    country,
    summary: stringValue(item.summary) || "AI-suggested value destination selected because the package estimate fits this budget.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    costLevel,
    trendingScore: 82,
    bestFor,
    averageNightlyHotel,
    averageDailyFood,
    averageDailyActivities,
    bookingLink: `https://www.google.com/travel/explore?q=${encodeURIComponent(label)}`
  };
}

function normalizeInterests(value: unknown, request: TripRequest) {
  const allowed = new Set(["food", "nightlife", "nature", "museums", "beaches", "family", "luxury", "budget", "adventure"]);
  const raw = Array.isArray(value) ? value : [];
  const interests = raw.filter((item): item is string => typeof item === "string" && allowed.has(item)) as DestinationOption["bestFor"];
  const merged = Array.from(new Set([...interests, ...request.interests, "budget"])) as DestinationOption["bestFor"];
  return merged.slice(0, 4);
}

function integerInRange(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : min;
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function mergeDestinations(values: DestinationOption[]) {
  const seen = new Set<string>();
  const merged: DestinationOption[] = [];
  for (const destination of values) {
    const key = `${destination.name},${destination.country}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(destination);
  }
  return merged;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "destination";
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
