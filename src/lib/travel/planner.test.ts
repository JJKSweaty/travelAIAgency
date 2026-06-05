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
    expect(cheaper.notes[0]).toContain("cheaper");
  });

  it("moves to another destination with the same budget settings", async () => {
    const plan = await planTrip({ ...request, preferredDestinationEnabled: false, destination: "" });
    const next = await refineTrip(plan, "next-destination");
    expect(next.destination.id).not.toBe(plan.destination.id);
    expect(next.request.totalBudget).toBe(plan.request.totalBudget);
    expect(next.request.excludedDestinationIds).toContain(plan.destination.id);
  });
});
