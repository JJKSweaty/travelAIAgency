"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Calendar, Car, ChefHat, Coffee, ExternalLink, Hotel, MapPinned, Moon, RefreshCcw, Sparkles, Star, Sun, Ticket } from "lucide-react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { PriceComparisonChart } from "@/components/PriceComparisonChart";
import { readCurrentTrip, saveTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { RefinementIntent, TripPlan } from "@/lib/travel/types";

const refinements: { intent: RefinementIntent; label: string }[] = [
  { intent: "cheaper", label: "Cheaper" },
  { intent: "luxury", label: "More luxury" },
  { intent: "food", label: "Food-focused" },
  { intent: "relaxed", label: "More relaxed" },
  { intent: "adventure", label: "More adventure" },
  { intent: "next-destination", label: "Try another destination" },
  { intent: "replace-hotel", label: "Replace hotel" },
  { intent: "regenerate", label: "Regenerate" }
];

export function TripResults() {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [isRefining, setIsRefining] = useState<RefinementIntent | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => setPlan(readCurrentTrip()), 0);
    return () => window.clearTimeout(task);
  }, []);

  async function refine(intent: RefinementIntent) {
    if (!plan) return;
    setIsRefining(intent);
    setRefineError(null);
    try {
      const response = await fetch("/api/refine-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, intent })
      });
      if (!response.ok) throw new Error("Could not refine this trip.");
      const next = (await response.json()) as TripPlan;
      writeCurrentTrip(next);
      setPlan(next);
      setSaved(false);
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Could not refine this trip.");
    } finally {
      setIsRefining(null);
    }
  }

  if (!plan) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">No active plan</p>
        <h1 className="mt-4 text-4xl font-semibold">Generate a trip first.</h1>
        <Link className="mt-8 inline-flex rounded-lg bg-ink px-5 py-3 font-semibold text-paper" href="/">
          Open planner
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-ink/70" onClick={() => router.push("/")}>
          <ArrowLeft size={16} aria-hidden />
          Planner
        </button>
        <button
          className="flex items-center gap-2 rounded-lg bg-reef px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            saveTrip(plan);
            setSaved(true);
          }}
        >
          <Bookmark size={16} aria-hidden />
          {saved ? "Saved" : "Save trip"}
        </button>
      </div>

      <section className="glass-panel overflow-hidden rounded-lg">
        <div
          className="relative min-h-[330px] p-6 text-paper sm:p-8"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(18,21,31,0.88), rgba(18,21,31,0.48)), url(${plan.destination.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="relative grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Recommended destination</p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight">{plan.destination.name}</h1>
              <p className="mt-2 text-xl text-paper/78">{plan.destination.country}</p>
              <p className="mt-6 max-w-2xl text-base leading-7 text-paper/80">{plan.destination.summary}</p>
              <a className="mt-6 inline-flex rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink" href={plan.destination.bookingLink} target="_blank" rel="noreferrer">
                Search travel options
              </a>
            </div>
            <BudgetMeter budget={plan.budget} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-6">
          <Panel title="Refine plan" icon={<RefreshCcw size={18} />}>
            <div className="flex flex-wrap gap-2">
              {refinements.map((item) => (
                <button key={item.intent} className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink/75 transition hover:border-reef hover:text-reef disabled:opacity-60" onClick={() => refine(item.intent)} disabled={Boolean(isRefining)}>
                  {isRefining === item.intent ? "Updating..." : item.label}
                </button>
              ))}
            </div>
            {refineError ? <p className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-sm font-medium text-coral">{refineError}</p> : null}
          </Panel>

          <PriceComparisonChart comparison={plan.priceComparison} />

          <Panel title="Itinerary" icon={<Calendar size={18} />}>
            <div className="grid gap-4">
              {plan.itinerary.map((day) => (
                <div key={day.day} className="grid gap-4 rounded-lg border border-ink/10 bg-white/76 p-4 sm:grid-cols-[94px_1fr]">
                  <div className="sm:border-r sm:border-ink/10 sm:pr-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-reef">Day {day.day}</p>
                    <p className="mt-2 text-lg font-semibold">${day.estimatedCost}</p>
                    <p className="text-xs text-ink/52">estimated day spend</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">{day.title}</h3>
                    <div className="mt-3 grid gap-2">
                      <ItinerarySegment icon={<Coffee size={15} />} label="Morning" text={day.morning} />
                      <ItinerarySegment icon={<Sun size={15} />} label="Afternoon" text={day.afternoon} />
                      <ItinerarySegment icon={<Moon size={15} />} label="Evening" text={day.evening} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Restaurants & food" icon={<ChefHat size={18} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {plan.restaurants.map((restaurant) => (
                <a key={restaurant.id} className="rounded-lg border border-ink/10 bg-white/76 p-4 transition hover:border-reef/40 hover:bg-white" href={restaurant.link} target="_blank" rel="noreferrer">
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-semibold">{restaurant.name}</span>
                      <span className="mt-1 block text-sm capitalize text-ink/62">{restaurant.cuisine}</span>
                    </span>
                    <ExternalLink size={15} className="mt-1 shrink-0 text-ink/42" aria-hidden />
                  </span>
                  <span className="mt-4 grid gap-2 text-sm text-ink/64">
                    <span className="flex items-center gap-2">
                      <MapPinned size={15} aria-hidden />
                      {restaurant.neighborhood}
                    </span>
                    <span className="flex items-center gap-2">
                      <ChefHat size={15} aria-hidden />
                      About ${restaurant.averageMealPrice}/meal
                    </span>
                    <span className="flex items-center gap-2">
                      <Star size={15} aria-hidden />
                      {restaurant.rating.toFixed(1)} rating estimate
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </Panel>

          <Panel title="Budget table" icon={<Sparkles size={18} />}>
            <div className="grid gap-2 text-sm">
              {Object.entries({
                Lodging: plan.budget.lodging,
                Transport: plan.budget.transport,
                Food: plan.budget.food,
                Activities: plan.budget.activities,
                Buffer: plan.budget.buffer
              }).map(([label, value]) => (
                <div key={label} className="flex justify-between rounded-lg bg-white/70 px-4 py-3">
                  <span>{label}</span>
                  <span className="font-semibold">${value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <RecommendationPanel title="Hotels" icon={<Hotel size={18} />} items={plan.hotels.map((hotel) => ({ name: hotel.name, meta: `${hotel.location} - $${hotel.nightlyPrice}/night`, link: hotel.link }))} />
          <RecommendationPanel title="Transport" icon={<Car size={18} />} items={plan.cars.map((car) => ({ name: car.name, meta: `${car.pickupLocation} - $${car.dailyPrice}/day`, link: car.link }))} />
          <RecommendationPanel title="Attractions" icon={<Ticket size={18} />} items={plan.attractions.slice(0, 3).map((attraction) => ({ name: attraction.name, meta: `${attraction.durationHours}h - about $${attraction.estimatedPrice}`, link: attraction.link }))} />
          <Panel title="Alternates" icon={<MapPinned size={18} />}>
            <div className="grid gap-3">
              {plan.alternates.map((destination) => (
                <a key={destination.id} className="rounded-lg bg-white/70 p-3 transition hover:bg-white" href={destination.bookingLink} target="_blank" rel="noreferrer">
                  <span className="block font-semibold">{destination.name}</span>
                  <span className="mt-1 block text-sm text-ink/60">{destination.summary}</span>
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-ink/5 p-4 text-sm text-ink/64">
        {plan.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
      </section>
    </main>
  );
}

function ItinerarySegment({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="grid gap-2 rounded-lg bg-ink/5 px-3 py-3 sm:grid-cols-[118px_1fr]">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-reef">
        {icon}
        {label}
      </span>
      <span className="text-sm leading-6 text-ink/70">{text}</span>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function RecommendationPanel({ title, icon, items }: { title: string; icon: React.ReactNode; items: { name: string; meta: string; link: string }[] }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="grid gap-3">
        {items.map((item) => (
          <a key={item.name} className="rounded-lg bg-white/72 p-3 transition hover:bg-white" href={item.link} target="_blank" rel="noreferrer">
            <span className="block font-semibold">{item.name}</span>
            <span className="mt-1 block text-sm text-ink/60">{item.meta}</span>
          </a>
        ))}
      </div>
    </Panel>
  );
}
