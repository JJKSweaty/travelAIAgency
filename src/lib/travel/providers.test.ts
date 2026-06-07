import { describe, expect, it } from "vitest";
import { allocateBudget } from "./budget";
import { FallbackDestinationTrendProvider, suggestDestinations } from "./providers";
import type { TripRequest } from "./types";

const request: TripRequest = {
  origin: "Toronto",
  preferredDestinationEnabled: true,
  destination: "Seoul",
  dateMode: "exact",
  startDate: "2026-07-10",
  endDate: "2026-07-14",
  tripLengthDays: 5,
  totalBudget: 2400,
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food"],
  transportPreference: "flexible"
};

describe("destination providers", () => {
  it("ranks partial destination suggestions by match strength", () => {
    const suggestions = suggestDestinations("port");
    expect(suggestions[0].name).toBe("Porto");
    expect(suggestions.length).toBeGreaterThan(1);
  });

  it("supports country and interest suggestions", () => {
    expect(suggestDestinations("Portugal").map((destination) => destination.name)).toContain("Porto");
    expect(suggestDestinations("beaches").some((destination) => destination.bestFor.includes("beaches"))).toBe(true);
  });

  it("includes Tokyo in curated suggestions", () => {
    expect(suggestDestinations("tok")[0].name).toBe("Tokyo");
  });

  it("returns a custom suggestion when no curated destination matches", () => {
    const suggestions = suggestDestinations("Atlantis");
    expect(suggestions[0]).toMatchObject({ name: "Atlantis", country: "Global destination" });
  });

  it("parses a custom destination country from free text", () => {
    const suggestions = suggestDestinations("Nairobi, Kenya");
    expect(suggestions[0]).toMatchObject({ name: "Nairobi", country: "Kenya" });
  });

  it("keeps exact preferred destinations ahead of trending results", async () => {
    const provider = new FallbackDestinationTrendProvider();
    const result = await provider.findDestinations(request);
    expect(result.data[0].name).toBe("Seoul");
  });

  it("prioritizes budget-fitting destinations in trending mode", async () => {
    const provider = new FallbackDestinationTrendProvider();
    const budgetRequest = { ...request, preferredDestinationEnabled: false, destination: "", totalBudget: 1900 };
    const result = await provider.findDestinations(budgetRequest);
    expect(allocateBudget(budgetRequest, result.data[0]).remaining).toBeGreaterThanOrEqual(0);
  });

  it("keeps very low budgets focused on nearby or Caribbean value destinations", async () => {
    const provider = new FallbackDestinationTrendProvider();
    const budgetRequest = { ...request, preferredDestinationEnabled: false, destination: "", totalBudget: 1200, travelers: 1, interests: ["beaches", "budget"] };
    const result = await provider.findDestinations(budgetRequest);
    expect(["Canada", "Cuba", "Dominican Republic", "Mexico"]).toContain(result.data[0].country);
    expect(allocateBudget(budgetRequest, result.data[0]).remaining).toBeGreaterThanOrEqual(0);
  });

  it("warns when free text does not match the curated index", async () => {
    const provider = new FallbackDestinationTrendProvider();
    const result = await provider.findDestinations({ ...request, destination: "Atlantis" });
    expect(result.data[0].name).toBe("Atlantis");
    expect(result.warnings?.[0]).toContain("broader market estimates");
  });
});
