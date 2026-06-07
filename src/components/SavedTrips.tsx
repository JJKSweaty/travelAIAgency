"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CloudUpload, MapPinned, Trash2, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      setError("Saved trips could not be loaded. Browser-saved trips are still available.");
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
      setError("We could not add those trips to your account. Try again in a moment.");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-lg border border-ink/10 bg-white/90 p-5 shadow-subtle">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Saved plans</p>
          <h1 className="mt-3 text-4xl font-semibold">{mode === "account" ? "Your Roamly library" : "Saved trips"}</h1>
          <p className="mt-2 text-sm text-ink/60">{mode === "account" ? "Trips saved to your account." : "Trips saved on this device."}</p>
        </div>
        {mode === "account" && guestCount > 0 ? (
          <Button variant="reef" onClick={importLocalTrips}>
            <CloudUpload size={16} aria-hidden />
            Add device trips
          </Button>
        ) : null}
      </div>
      {error ? <p className="mb-4 rounded-lg bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</p> : null}
      {trips.length === 0 ? (
        <Card>
          <CardContent className="grid gap-5 p-8 text-center sm:justify-items-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-reef/10 text-reef">
              <MapPinned size={22} aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">No saved trips yet</h2>
              <p className="mt-2 text-sm text-ink/60">Save a generated itinerary to compare hotels, flights, and daily plans later.</p>
            </div>
            <Button asChild>
              <Link href="/">Start planning</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${trip.destination.imageUrl})` }} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">{trip.destination.name}</CardTitle>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <CalendarDays size={13} aria-hidden />
                        {trip.request.tripLengthDays} days
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <WalletCards size={13} aria-hidden />
                        {formatMoney(trip.request.totalBudget, trip.request.currency)}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="text-coral hover:text-coral" aria-label={`Delete ${trip.destination.name}`} onClick={() => remove(trip.id)}>
                    <Trash2 size={17} aria-hidden />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">{trip.destination.summary}</p>
                <Button asChild variant="reef" size="sm" className="mt-5">
                  <Link href="/results" onClick={() => writeCurrentTrip(trip)}>
                    Open plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
