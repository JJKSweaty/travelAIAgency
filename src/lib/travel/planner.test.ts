import { describe, expect, it } from "vitest";
import { planTrip, providerHealth, refineTrip } from "./planner";
import type { TripRequest } from "./types";

const request: TripRequest = {
  origin: "Toronto",
  preferredDestinationEnabled: true,
  destination: "Lisbon",
  tripLengthDays: 4,
  totalBudget: 2400,
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food", "museums"],
  transportPreference: "flexible"
};

describe("planTrip", () => {
  it("respects a preferred destination when fallback data includes it", async () => {
    const plan = await planTrip(request);
    expect(plan.destination.name).toBe("Lisbon");
    expect(plan.hotels.length).toBeGreaterThan(0);
    expect(plan.priceComparison.flights.length).toBeGreaterThan(0);
    expect(plan.priceComparison.hotels.length).toBeGreaterThan(0);
    expect(plan.itinerary).toHaveLength(4);
  });

  it("preserves selected currency and returns converted display estimates", async () => {
    const plan = await planTrip({ ...request, totalBudget: 2400, currency: "CAD", cityTravelPreference: "public-transit" });
    expect(plan.request.currency).toBe("CAD");
    expect(plan.budget.lodging).toBeGreaterThan(800);
    expect(plan.itinerary[0].transit).toHaveLength(3);
    expect(plan.itinerary[0].transit?.[0].summary).toMatch(/Morning:/);
  });

  it("surfaces exact Google travel searches first when exact dates are provided", async () => {
    const plan = await planTrip({ ...request, dateMode: "exact", startDate: "2026-07-10", endDate: "2026-07-14", tripLengthDays: 5 });
    expect(plan.priceComparison.flights[0]).toMatchObject({ provider: "google-flights", linkLabel: "Exact flight search" });
    expect(plan.priceComparison.hotels[0]).toMatchObject({ provider: "google-hotels", linkLabel: "Exact hotel search" });
    expect(decodeURIComponent(plan.priceComparison.hotels[0].link)).toContain("check-in Jul 10, 2026");
  });

  it("handles trending mode without a destination", async () => {
    const plan = await planTrip({ ...request, preferredDestinationEnabled: false, destination: "" });
    expect(plan.destination.name.length).toBeGreaterThan(0);
    expect(plan.alternates).toHaveLength(2);
  });

  it("adds a note when preferred destination free text is not curated", async () => {
    const plan = await planTrip({ ...request, destination: "Atlantis" });
    expect(plan.notes.some((note) => note.includes("custom global destination"))).toBe(true);
  });

  it("keeps provider health available without live keys", () => {
    expect(providerHealth().fallbackAvailable).toBe(true);
  });

  it("applies cheaper refinements", async () => {
    const plan = await planTrip(request);
    const cheaper = await refineTrip(plan, "cheaper");
    expect(cheaper.request.totalBudget).toBeLessThan(plan.request.totalBudget);
    expect(cheaper.request.preferredDestinationEnabled).toBe(false);
    expect(cheaper.request.transportPreference).toBe("public-transit");
    expect(cheaper.request.excludedDestinationIds).toContain(plan.destination.id);
    expect(cheaper.budget.totalEstimated).toBeLessThan(plan.budget.totalEstimated);
    expect(cheaper.notes[0]).toContain("cheaper");
  });

  it("replaces the top hotel option", async () => {
    const plan = await planTrip(request);
    const next = await refineTrip(plan, "replace-hotel");
    expect(next.request.excludedHotelIds).toContain(plan.hotels[0].id);
    expect(next.hotels[0].id).not.toBe(plan.hotels[0].id);
  });

  it("regenerates fallback itinerary variants", async () => {
    const plan = await planTrip(request);
    const next = await refineTrip(plan, "regenerate");
    expect(next.request.itineraryVariant).toBe((plan.request.itineraryVariant ?? 0) + 1);
    expect(next.itinerary[0].afternoon).not.toBe(plan.itinerary[0].afternoon);
  });

  it("moves to another destination with the same budget settings", async () => {
    const plan = await planTrip({ ...request, preferredDestinationEnabled: false, destination: "" });
    const next = await refineTrip(plan, "next-destination");
    expect(next.destination.id).not.toBe(plan.destination.id);
    expect(next.request.totalBudget).toBe(plan.request.totalBudget);
    expect(next.request.excludedDestinationIds).toContain(plan.destination.id);
  });
});
