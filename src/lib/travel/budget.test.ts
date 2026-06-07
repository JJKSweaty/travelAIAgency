import { describe, expect, it } from "vitest";
import { destinations } from "./fallback-data";
import { allocateBudget } from "./budget";
import type { TripRequest } from "./types";

const baseRequest: TripRequest = {
  origin: "Toronto",
  preferredDestinationEnabled: false,
  tripLengthDays: 5,
  totalBudget: 2500,
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food", "nature"],
  transportPreference: "flexible"
};

describe("allocateBudget", () => {
  it("marks low budgets as tight with warnings", () => {
    const budget = allocateBudget({ ...baseRequest, totalBudget: 600 }, destinations[3]);
    expect(budget.feasibility).toBe("tight");
    expect(budget.warnings.length).toBeGreaterThan(0);
  });

  it("marks medium budgets as workable", () => {
    const budget = allocateBudget({ ...baseRequest, totalBudget: 3000 }, destinations[0]);
    expect(budget.feasibility).toBe("workable");
    expect(budget.totalEstimated).toBeGreaterThan(0);
  });

  it("marks high budgets as comfortable", () => {
    const budget = allocateBudget({ ...baseRequest, totalBudget: 9000 }, destinations[1]);
    expect(budget.feasibility).toBe("comfortable");
    expect(budget.remaining).toBeGreaterThan(0);
  });
});
