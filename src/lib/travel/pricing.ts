import type { BudgetBreakdown, TripPlan } from "./types";

export function applyTripSelectionsToBudget(plan: TripPlan): TripPlan {
  const budget = recalculateBudget(plan);
  return { ...plan, budget };
}

function recalculateBudget(plan: TripPlan): BudgetBreakdown {
  const baseTotal = plan.budget.packageBaseEstimated ?? plan.budget.totalEstimated;
  const nights = Math.max(1, plan.request.tripLengthDays - 1);
  const hotelDelta = (selectedNightlyHotel(plan) - baselineNightlyHotel(plan)) * nights;
  const flightDelta = plan.selectedFlightQuote ? selectedFlight(plan) : 0;
  const totalEstimated = Math.max(0, Math.round(baseTotal + hotelDelta + flightDelta));
  const remaining = Math.round(plan.request.totalBudget - totalEstimated);

  return {
    ...plan.budget,
    packageBaseEstimated: baseTotal,
    totalEstimated,
    remaining,
    feasibility: totalEstimated <= 0 ? "comfortable" : plan.request.totalBudget / totalEstimated < 0.9 ? "tight" : plan.request.totalBudget / totalEstimated < 1.2 ? "workable" : "comfortable"
  };
}

function baselineNightlyHotel(plan: TripPlan) {
  const hotelPrices = plan.hotels.map((hotel) => hotel.nightlyPrice);
  const marketPrices = plan.priceComparison.hotels.map((quote) => quote.estimatedPrice);
  const prices = [...hotelPrices, ...marketPrices];
  return prices.length ? Math.min(...prices) : plan.destination.averageNightlyHotel;
}

function selectedNightlyHotel(plan: TripPlan) {
  if (plan.selectedHotelQuote?.estimatedPrice) return plan.selectedHotelQuote.estimatedPrice;
  if (plan.selectedHotel?.nightlyPrice) return plan.selectedHotel.nightlyPrice;
  return baselineNightlyHotel(plan);
}

function selectedFlight(plan: TripPlan) {
  return plan.selectedFlightQuote?.estimatedPrice ?? 0;
}
