import type { BudgetBreakdown, DestinationOption, TripRequest } from "./types";
import { estimateRoundTripFlightCost } from "./costEstimates";

const styleMultipliers = {
  relaxed: { lodging: 0.4, transport: 0.16, food: 0.2, activities: 0.12, buffer: 0.12 },
  balanced: { lodging: 0.36, transport: 0.17, food: 0.21, activities: 0.15, buffer: 0.11 },
  packed: { lodging: 0.32, transport: 0.17, food: 0.2, activities: 0.22, buffer: 0.09 }
} as const;

export function allocateBudget(request: TripRequest, destination: DestinationOption): BudgetBreakdown {
  const split = styleMultipliers[request.travelStyle];
  const total = request.totalBudget;
  const lodging = Math.round(total * split.lodging);
  const transport = Math.round(total * split.transport);
  const food = Math.round(total * split.food);
  const activities = Math.round(total * split.activities);
  const buffer = Math.max(0, total - lodging - transport - food - activities);

  const nights = Math.max(1, request.tripLengthDays - 1);
  const estimatedHotel = destination.averageNightlyHotel * nights;
  const estimatedFood = destination.averageDailyFood * request.tripLengthDays * request.travelers;
  const estimatedActivities = destination.averageDailyActivities * request.tripLengthDays * request.travelers;
  const estimatedGroundTransport =
    request.transportPreference === "rental-car"
      ? (destination.costLevel >= 4 ? 68 : destination.costLevel === 3 ? 52 : 39) * request.tripLengthDays
      : (destination.costLevel >= 4 ? 40 : 26) * request.tripLengthDays * request.travelers;
  const estimatedFlight = estimateRoundTripFlightCost(request, destination);
  const estimatedTransport = estimatedGroundTransport + estimatedFlight;

  const totalEstimated = Math.round(estimatedHotel + estimatedFood + estimatedActivities + estimatedTransport);
  const remaining = total - totalEstimated;
  const ratio = total / Math.max(totalEstimated, 1);
  const warnings: string[] = [];

  if (total < request.travelers * request.tripLengthDays * 85) {
    warnings.push("This is a very tight budget for the trip length and traveler count.");
  }

  if (remaining < 0) {
    warnings.push("The recommended package estimate is over budget. Use cheaper refinements, reduce trip length, or choose a closer lower-fare destination.");
  }

  if (lodging / Math.max(nights, 1) < destination.averageNightlyHotel * 0.72) {
    warnings.push("Hotel budget is below the destination average, so value stays are prioritized.");
  }

  return {
    lodging,
    transport,
    food,
    activities,
    buffer,
    totalEstimated,
    remaining,
    feasibility: ratio < 0.9 ? "tight" : ratio < 1.2 ? "workable" : "comfortable",
    warnings
  };
}


export function budgetFitScore(budget: BudgetBreakdown): number {
  if (budget.totalEstimated <= 0) return 0;
  const score = Math.round((1 - Math.max(0, -budget.remaining) / budget.totalEstimated) * 100);
  return Math.max(12, Math.min(100, score + (budget.feasibility === "comfortable" ? 8 : 0)));
}
