import type { TripPlan } from "./types";

const currentTripKey = "aiTravelAgency.currentTrip";
const savedTripsKey = "aiTravelAgency.savedTrips";

export function writeCurrentTrip(plan: TripPlan) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(currentTripKey, JSON.stringify(plan));
}

export function readCurrentTrip(): TripPlan | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(currentTripKey);
  return raw ? (JSON.parse(raw) as TripPlan) : null;
}

export function saveTrip(plan: TripPlan) {
  if (typeof window === "undefined") return;
  const existing = readSavedTrips();
  const next = [plan, ...existing.filter((trip) => trip.id !== plan.id)].slice(0, 12);
  window.localStorage.setItem(savedTripsKey, JSON.stringify(next));
}

export function readSavedTrips(): TripPlan[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(savedTripsKey);
  return raw ? (JSON.parse(raw) as TripPlan[]) : [];
}

export function removeSavedTrip(id: string) {
  if (typeof window === "undefined") return;
  const next = readSavedTrips().filter((trip) => trip.id !== id);
  window.localStorage.setItem(savedTripsKey, JSON.stringify(next));
}
