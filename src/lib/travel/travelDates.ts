import type { TripRequest } from "./types";

export const travelMonthRequiredMessage = "Choose a travel month so I can find realistic flight and hotel prices.";
export const exactTravelDatesRequiredMessage = "Choose exact depart and return dates so I can build a realistic trip budget.";

export function hasTravelMonth(request: Pick<TripRequest, "startDate">) {
  return Boolean(travelMonthFromRequest(request));
}

export function travelMonthFromRequest(request: Pick<TripRequest, "startDate">) {
  const value = request.startDate?.trim();
  if (!value) return null;
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthMatch) return `${monthMatch[1]}-${monthMatch[2]}`;
  const dateMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
  if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}`;
  return null;
}

export function isDateOnly(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function isMonthOnly(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export function hasExactTravelDates(request: Pick<TripRequest, "dateMode" | "startDate" | "endDate">) {
  return request.dateMode === "exact" && isDateOnly(request.startDate) && isDateOnly(request.endDate) && request.endDate > request.startDate;
}
