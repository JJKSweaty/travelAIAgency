"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { readSavedTrips, removeSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { TripPlan } from "@/lib/travel/types";

export function SavedTrips() {
  const [trips, setTrips] = useState<TripPlan[]>([]);

  useEffect(() => {
    const task = window.setTimeout(() => setTrips(readSavedTrips()), 0);
    return () => window.clearTimeout(task);
  }, []);

  function remove(id: string) {
    removeSavedTrip(id);
    setTrips(readSavedTrips());
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Saved plans</p>
        <h1 className="mt-3 text-4xl font-semibold">Your local trip library</h1>
      </div>
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
                      {trip.request.tripLengthDays} days - ${trip.request.totalBudget.toLocaleString()} budget
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
