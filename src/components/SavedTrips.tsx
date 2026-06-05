"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudUpload, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/travel/currency";
import { getSaveMode, importGuestTrips, listSavedTrips, readSavedTrips, removeSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { TripPlan } from "@/lib/travel/types";

export function SavedTrips() {
  const [trips, setTrips] = useState<TripPlan[]>([]);
  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [guestCount, setGuestCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function refresh() {
    try {
      setError(null);
      const nextMode = await getSaveMode();
      setMode(nextMode);
      setGuestCount(readSavedTrips().length);
      setTrips(await listSavedTrips());
    } catch {
      setError("Saved trips could not be loaded. Guest trips are still available on this device.");
      setTrips(readSavedTrips());
    }
  }

  async function remove(id: string) {
    await removeSavedTrip(id);
    await refresh();
  }

  async function importLocalTrips() {
    try {
      await importGuestTrips();
      await refresh();
    } catch {
      setError("Guest trips could not be imported. Check your Supabase trips table and RLS policies.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Saved plans</p>
        <h1 className="mt-3 text-4xl font-semibold">{mode === "account" ? "Your Roamly library" : "Guest trip library"}</h1>
        </div>
        {mode === "account" && guestCount > 0 ? (
          <button className="inline-flex items-center gap-2 rounded-lg bg-reef px-4 py-2 text-sm font-semibold text-white" onClick={importLocalTrips}>
            <CloudUpload size={16} aria-hidden />
            Import guest trips
          </button>
        ) : null}
      </div>
      {error ? <p className="mb-4 rounded-lg bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</p> : null}
      {trips.length === 0 ? (
        <div className="glass-panel rounded-lg p-8">
          <p className="text-ink/70">No saved trips yet.</p>
          <Link className="mt-5 inline-flex rounded-lg bg-ink px-4 py-3 font-semibold text-paper" href="/">
            Start planning
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <article key={trip.id} className="glass-panel overflow-hidden rounded-lg">
              <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${trip.destination.imageUrl})` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{trip.destination.name}</h2>
                    <p className="mt-1 text-sm text-ink/60">
                      {trip.request.tripLengthDays} days - {formatMoney(trip.request.totalBudget, trip.request.currency)} budget
                    </p>
                  </div>
                  <button className="rounded-lg bg-white/70 p-2 text-coral" aria-label={`Delete ${trip.destination.name}`} onClick={() => remove(trip.id)}>
                    <Trash2 size={17} aria-hidden />
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/66">{trip.destination.summary}</p>
                <Link
                  className="mt-5 inline-flex rounded-lg bg-reef px-4 py-2 text-sm font-semibold text-white"
                  href="/results"
                  onClick={() => writeCurrentTrip(trip)}
                >
                  Open plan
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
