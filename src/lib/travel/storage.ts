"use client";

import type { TripPlan } from "./types";
import { getSupabaseClient } from "@/lib/supabase/client";

const currentTripKey = "roamly.currentTrip";
const savedTripsKey = "roamly.savedTrips";
const legacyCurrentTripKey = "aiTravelAgency.currentTrip";
const legacySavedTripsKey = "aiTravelAgency.savedTrips";

type SaveMode = "guest" | "account";

export function writeCurrentTrip(plan: TripPlan) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(currentTripKey, JSON.stringify(plan));
}

export function readCurrentTrip(): TripPlan | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(currentTripKey) ?? window.sessionStorage.getItem(legacyCurrentTripKey);
  return raw ? (JSON.parse(raw) as TripPlan) : null;
}

export function saveTripLocally(plan: TripPlan) {
  if (typeof window === "undefined") return;
  const existing = readSavedTrips();
  const next = [plan, ...existing.filter((trip) => trip.id !== plan.id)].slice(0, 12);
  window.localStorage.setItem(savedTripsKey, JSON.stringify(next));
}

export function isTripSavedLocally(id: string): boolean {
  if (typeof window === "undefined") return false;
  return readSavedTrips().some((trip) => trip.id === id);
}

export function updateSavedTripLocally(plan: TripPlan) {
  if (typeof window === "undefined") return;
  const existing = readSavedTrips();
  if (!existing.some((trip) => trip.id === plan.id)) return;
  const next = existing.map((trip) => (trip.id === plan.id ? plan : trip));
  window.localStorage.setItem(savedTripsKey, JSON.stringify(next));
}

export function readSavedTrips(): TripPlan[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(savedTripsKey) ?? window.localStorage.getItem(legacySavedTripsKey);
  return raw ? (JSON.parse(raw) as TripPlan[]) : [];
}

export function removeSavedTripLocally(id: string) {
  if (typeof window === "undefined") return;
  const next = readSavedTrips().filter((trip) => trip.id !== id);
  window.localStorage.setItem(savedTripsKey, JSON.stringify(next));
}

export async function getSaveMode(): Promise<SaveMode> {
  const supabase = getSupabaseClient();
  if (!supabase) return "guest";
  const { data } = await supabase.auth.getSession();
  return data.session?.user ? "account" : "guest";
}

export async function listSavedTrips(): Promise<TripPlan[]> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = sessionData.session?.user;
  if (!supabase || !user) return readSavedTrips();

  const { data, error } = await supabase.from("trips").select("plan").eq("user_id", user.id).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.plan as TripPlan);
}

export async function saveTrip(plan: TripPlan): Promise<SaveMode> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = sessionData.session?.user;
  if (!supabase || !user) {
    saveTripLocally(plan);
    return "guest";
  }

  const { error } = await supabase.from("trips").upsert(
    {
      user_id: user.id,
      plan_id: plan.id,
      plan,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,plan_id" }
  );
  if (error) throw error;
  return "account";
}

export async function isTripSaved(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = sessionData.session?.user;
  if (!supabase || !user) return isTripSavedLocally(id);

  const { data, error } = await supabase.from("trips").select("plan_id").eq("user_id", user.id).eq("plan_id", id).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function updateSavedTrip(plan: TripPlan) {
  if (!(await isTripSaved(plan.id))) return;
  await saveTrip(plan);
}

export async function removeSavedTrip(id: string) {
  const supabase = getSupabaseClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = sessionData.session?.user;
  if (!supabase || !user) {
    removeSavedTripLocally(id);
    return;
  }

  const { error } = await supabase.from("trips").delete().eq("user_id", user.id).eq("plan_id", id);
  if (error) throw error;
}

export async function importGuestTrips(): Promise<number> {
  const trips = readSavedTrips();
  const supabase = getSupabaseClient();
  const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const user = sessionData.session?.user;
  if (!supabase || !user || trips.length === 0) return 0;

  const { error } = await supabase.from("trips").upsert(
    trips.map((plan) => ({
      user_id: user.id,
      plan_id: plan.id,
      plan,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "user_id,plan_id" }
  );
  if (error) throw error;
  window.localStorage.removeItem(savedTripsKey);
  window.localStorage.removeItem(legacySavedTripsKey);
  return trips.length;
}
