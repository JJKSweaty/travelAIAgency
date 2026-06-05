import { describe, expect, it } from "vitest";
import { buildDayTransitPlans, buildTransitPlan } from "./transit";
import type { ItineraryDay } from "./types";

describe("transit planning", () => {
  it("honors city travel preferences", () => {
    expect(buildTransitPlan({ toPlace: "Central market", transportPreference: "flexible", cityTravelPreference: "rideshare" }).mode).toBe("rideshare");
    expect(buildTransitPlan({ toPlace: "Central market", transportPreference: "flexible", cityTravelPreference: "rental-car" }).mode).toBe("drive");
  });

  it("builds route suggestions for each day segment", () => {
    const day: ItineraryDay = {
      day: 1,
      title: "Arrival",
      morning: "Coffee in the old town.",
      afternoon: "Museum loop near the center.",
      evening: "Dinner by the waterfront.",
      estimatedCost: 100
    };

    const transit = buildDayTransitPlans({ day, transportPreference: "flexible", cityTravelPreference: "public-transit" });
    expect(transit).toHaveLength(3);
    expect(transit[0].summary).toMatch(/Morning:/);
    expect(transit[0].mapLink).toContain("google.com/maps/dir");
  });
});
