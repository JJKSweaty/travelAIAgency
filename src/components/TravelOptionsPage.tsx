"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BedDouble, ExternalLink, Plane, SlidersHorizontal, Star } from "lucide-react";
import { formatMoney } from "@/lib/travel/currency";
import { isTripSaved, readCurrentTrip, updateSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { HotelOption, PriceQuote, SelectedHotelOption, SelectedQuoteOption, TripPlan } from "@/lib/travel/types";

type TravelOptionsPageProps = {
  kind: "hotels" | "flights";
};

export function TravelOptionsPage({ kind }: TravelOptionsPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = readCurrentTrip();
    setPlan(current);
    if (current) void isTripSaved(current.id).then(setSaved);
  }, []);

  const currency = plan?.request.currency;
  const options = useMemo(() => {
    if (!plan) return [];
    return kind === "hotels" ? plan.hotels : plan.priceComparison.flights;
  }, [kind, plan]);
  const lowestPrice = Math.min(...options.map((option) => ("nightlyPrice" in option ? option.nightlyPrice : option.estimatedPrice)), Number.POSITIVE_INFINITY);
  const fallbackBudget = Number.isFinite(lowestPrice) ? lowestPrice : 0;
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    if (!plan || budget > 0) return;
    if (kind === "hotels") {
      const nights = Math.max(1, plan.request.tripLengthDays - 1);
      setBudget(Math.max(fallbackBudget, Math.round(plan.budget.lodging / nights)));
    } else {
      setBudget(Math.max(fallbackBudget, plan.budget.transport));
    }
  }, [budget, fallbackBudget, kind, plan]);

  function persist(next: TripPlan) {
    setPlan(next);
    writeCurrentTrip(next);
    if (saved) void updateSavedTrip(next);
  }

  function selectHotel(hotel: HotelOption) {
    if (!plan) return;
    const selectedHotel: SelectedHotelOption = {
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      nightlyPrice: hotel.nightlyPrice,
      source: hotel.source,
      link: hotel.link
    };
    persist({
      ...plan,
      selectedHotel,
      selectedStay: {
        type: "hotel",
        label: hotel.name,
        location: hotel.location
      }
    });
  }

  function selectQuote(quote: PriceQuote) {
    if (!plan) return;
    const selectedQuote: SelectedQuoteOption = {
      id: quote.id,
      category: quote.category,
      provider: quote.provider,
      displayName: quote.displayName,
      estimatedPrice: quote.estimatedPrice,
      unit: quote.unit,
      link: quote.link,
      source: quote.source,
      linkLabel: quote.linkLabel
    };
    persist(kind === "hotels" ? { ...plan, selectedHotelQuote: selectedQuote } : { ...plan, selectedFlightQuote: selectedQuote });
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

  const hotelMode = kind === "hotels";
  const title = hotelMode ? "Choose a hotel" : "Choose a flight search";
  const subtitle = hotelMode
    ? "Filter suggested stays and open major hotel search surfaces to verify live prices."
    : "Filter flight estimates and open major flight search surfaces to verify live fares.";
  const filteredHotels = hotelMode ? plan.hotels.filter((hotel) => hotel.nightlyPrice <= budget).sort((a, b) => a.nightlyPrice - b.nightlyPrice) : [];
  const filteredQuotes = !hotelMode ? plan.priceComparison.flights.filter((quote) => quote.estimatedPrice <= budget).sort((a, b) => a.estimatedPrice - b.estimatedPrice) : [];
  const providerQuotes = hotelMode ? plan.priceComparison.hotels : plan.priceComparison.flights;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium text-ink/70" onClick={() => router.push("/results")}>
          <ArrowLeft size={16} aria-hidden />
          Results
        </button>
        <button className="rounded-lg border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink/68 hover:text-reef" onClick={() => router.push("/results")}>
          Keep starting estimate
        </button>
      </div>

      <section className="rounded-lg bg-ink p-6 text-paper sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">{plan.destination.name}</p>
            <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/72">{subtitle}</p>
          </div>
          <label className="rounded-lg bg-white/10 p-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-paper/72">
              <SlidersHorizontal size={16} aria-hidden />
              Max {hotelMode ? "nightly" : "round-trip"} budget
            </span>
            <input className="mt-3 w-full accent-coral" type="range" min={Math.max(40, Math.round(fallbackBudget * 0.7))} max={Math.max(100, Math.round(fallbackBudget * 2.2))} step={10} value={budget} onChange={(event) => setBudget(Number(event.target.value))} />
            <div className="mt-2 text-2xl font-semibold">{formatMoney(budget, currency)}</div>
          </label>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <h2 className="text-lg font-semibold">{hotelMode ? "Suggested stays within budget" : "Flight searches within budget"}</h2>
          {hotelMode && filteredHotels.length === 0 ? <EmptyBudgetMessage label="hotels" budget={budget} currency={currency} /> : null}
          {!hotelMode && filteredQuotes.length === 0 ? <EmptyBudgetMessage label="flights" budget={budget} currency={currency} /> : null}
          {hotelMode
            ? filteredHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} selected={plan.selectedHotel?.id === hotel.id || plan.selectedStay?.label === hotel.name} currency={currency} onSelect={() => selectHotel(hotel)} />
              ))
            : filteredQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} selected={plan.selectedFlightQuote?.id === quote.id} currency={currency} onSelect={() => selectQuote(quote)} />
              ))}
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg bg-white p-5 shadow-subtle">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {hotelMode ? <BedDouble size={18} aria-hidden /> : <Plane size={18} aria-hidden />}
              Major provider searches
            </h2>
            <div className="mt-4 grid gap-3">
              {providerQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} selected={hotelMode ? plan.selectedHotelQuote?.id === quote.id : plan.selectedFlightQuote?.id === quote.id} currency={currency} compact onSelect={() => selectQuote(quote)} />
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function HotelCard({ hotel, selected, currency, onSelect }: { hotel: HotelOption; selected: boolean; currency: TripPlan["request"]["currency"]; onSelect: () => void }) {
  return (
    <article className={`rounded-lg border bg-white p-5 shadow-subtle ${selected ? "border-reef" : "border-ink/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{hotel.name}</h3>
          <p className="mt-1 text-sm text-ink/58">{hotel.location}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-reef/10 px-2 py-1 text-reef">Planner estimate</span>
            <span className="rounded bg-ink/6 px-2 py-1 text-ink/58">{Math.round(hotel.confidence * 100)}% confidence</span>
            <span className="inline-flex items-center gap-1 rounded bg-gold/12 px-2 py-1 text-ink/64">
              <Star size={12} aria-hidden />
              {hotel.rating.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{formatMoney(hotel.nightlyPrice, currency)}</p>
          <p className="text-xs text-ink/48">per night</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold ${selected ? "bg-reef/10 text-reef" : "bg-reef text-white"}`} onClick={onSelect}>
          {selected ? "Selected stay" : "Select stay"}
        </button>
        <a className="focus-ring inline-flex items-center gap-2 rounded-lg border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/62 hover:text-reef" href={hotel.link} target="_blank" rel="noreferrer">
          Open search
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
    </article>
  );
}

function QuoteCard({ quote, selected, currency, compact = false, onSelect }: { quote: PriceQuote; selected: boolean; currency: TripPlan["request"]["currency"]; compact?: boolean; onSelect: () => void }) {
  return (
    <article className={`rounded-lg border bg-white ${compact ? "p-3" : "p-5 shadow-subtle"} ${selected ? "border-reef" : "border-ink/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={compact ? "font-semibold" : "text-xl font-semibold"}>{quote.displayName}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-reef/10 px-2 py-1 text-reef">{quote.source === "live" ? "Live provider" : "Planner estimate"}</span>
            <span className="rounded bg-ink/6 px-2 py-1 text-ink/58">{quote.linkLabel?.startsWith("Exact") ? "Exact date search" : "Open provider search"}</span>
            {!compact ? <span className="rounded bg-ink/6 px-2 py-1 text-ink/58">{Math.round(quote.confidence * 100)}% confidence</span> : null}
          </div>
        </div>
        <div className="text-right">
          <p className={compact ? "font-semibold" : "text-2xl font-semibold"}>{formatMoney(quote.estimatedPrice, currency)}</p>
          <p className="text-xs text-ink/48">/{quote.unit}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={`focus-ring rounded-lg px-3 py-2 text-sm font-semibold ${selected ? "bg-reef/10 text-reef" : "bg-reef text-white"}`} onClick={onSelect}>
          {selected ? "Selected" : "Select"}
        </button>
        <a className="focus-ring inline-flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/62 hover:text-reef" href={quote.link} target="_blank" rel="noreferrer">
          Open
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
    </article>
  );
}

function EmptyBudgetMessage({ label, budget, currency }: { label: string; budget: number; currency: TripPlan["request"]["currency"] }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 text-sm text-ink/62">
      No {label} are currently under {formatMoney(budget, currency)}. Raise the budget filter or keep Roamly's starting estimate.
    </div>
  );
}
