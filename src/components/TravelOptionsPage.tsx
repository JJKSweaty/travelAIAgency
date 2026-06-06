"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BedDouble, Clock, MapPinned, Plane, ShieldCheck, SlidersHorizontal, Star, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/travel/currency";
import { applyTripSelectionsToBudget } from "@/lib/travel/pricing";
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
    const task = window.setTimeout(() => {
      const current = readCurrentTrip();
      const priced = current ? applyTripSelectionsToBudget(current) : current;
      setPlan(priced);
      if (priced) writeCurrentTrip(priced);
      if (current) void isTripSaved(current.id).then(setSaved);
    }, 0);
    return () => window.clearTimeout(task);
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
    const task = window.setTimeout(() => {
      if (kind === "hotels") {
        const nights = Math.max(1, plan.request.tripLengthDays - 1);
        setBudget(Math.max(fallbackBudget, Math.round(plan.budget.lodging / nights)));
      } else {
        setBudget(Math.max(fallbackBudget, plan.budget.transport));
      }
    }, 0);
    return () => window.clearTimeout(task);
  }, [budget, fallbackBudget, kind, plan]);

  function persist(next: TripPlan) {
    const priced = applyTripSelectionsToBudget(next);
    setPlan(priced);
    writeCurrentTrip(priced);
    if (saved) void updateSavedTrip(priced);
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
      selectedHotelQuote: undefined,
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
    persist(
      kind === "hotels"
        ? {
            ...plan,
            selectedHotel: undefined,
            selectedHotelQuote: selectedQuote,
            selectedStay: { type: "hotel", label: `${quote.displayName} stay package`, location: plan.destination.name }
          }
        : { ...plan, selectedFlightQuote: selectedQuote }
    );
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
  const title = hotelMode ? "Choose a stay package" : "Choose a flight package";
  const subtitle = hotelMode
    ? "Compare value stays, stronger locations, better reviews, and upgraded packages for this trip."
    : "Compare cheaper fares, better flight times, fewer stops, and more comfortable packages for this trip.";
  const filteredHotels = hotelMode ? plan.hotels.filter((hotel) => hotel.nightlyPrice <= budget).sort((a, b) => a.nightlyPrice - b.nightlyPrice) : [];
  const filteredQuotes = !hotelMode ? plan.priceComparison.flights.filter((quote) => quote.estimatedPrice <= budget).sort((a, b) => a.estimatedPrice - b.estimatedPrice) : [];
  const providerQuotes = hotelMode ? plan.priceComparison.hotels : plan.priceComparison.flights;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={() => router.push("/results")}>
          <ArrowLeft size={16} aria-hidden />
          Trip summary
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/results")}>
          Keep starting estimate
        </Button>
      </div>

      <section className="overflow-hidden rounded-lg bg-ink text-paper shadow-soft">
        <div
          className="p-6 sm:p-8"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(18,21,31,0.92), rgba(18,21,31,0.58)), url(${plan.destination.imageUrl})`,
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">{plan.destination.name}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/72">{subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="dark" className="bg-white/12 text-paper">Best deals compared</Badge>
              <Badge variant="dark" className="bg-white/12 text-paper">Trip total updates instantly</Badge>
            </div>
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
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          <h2 className="text-lg font-semibold">{hotelMode ? "Stay options within budget" : "Flight packages within budget"}</h2>
          {hotelMode && filteredHotels.length === 0 ? <EmptyBudgetMessage label="hotels" budget={budget} currency={currency} /> : null}
          {!hotelMode && filteredQuotes.length === 0 ? <EmptyBudgetMessage label="flights" budget={budget} currency={currency} /> : null}
          {hotelMode
            ? filteredHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} baseline={lowestPrice} selected={plan.selectedHotel?.id === hotel.id || plan.selectedStay?.label === hotel.name} currency={currency} onSelect={() => selectHotel(hotel)} />
              ))
            : filteredQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} baseline={lowestPrice} selected={plan.selectedFlightQuote?.id === quote.id} currency={currency} onSelect={() => selectQuote(quote)} />
              ))}
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {hotelMode ? <BedDouble size={18} aria-hidden /> : <Plane size={18} aria-hidden />}
              Compared deal sources
            </h2>
            </CardHeader>
            <CardContent className="grid gap-3">
              {providerQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} baseline={lowestPrice} selected={hotelMode ? plan.selectedHotelQuote?.id === quote.id : plan.selectedFlightQuote?.id === quote.id} currency={currency} compact onSelect={() => selectQuote(quote)} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <WalletCards size={16} aria-hidden />
                Current trip estimate
              </p>
              <p className="mt-2 text-3xl font-semibold">{formatMoney(plan.budget.totalEstimated, currency)}</p>
              <p className="mt-1 text-sm text-ink/60">{formatMoney(plan.budget.remaining, currency)} compared with your trip budget.</p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function HotelCard({ hotel, baseline, selected, currency, onSelect }: { hotel: HotelOption; baseline: number; selected: boolean; currency: TripPlan["request"]["currency"]; onSelect: () => void }) {
  const tradeoff = hotelTradeoff(hotel, baseline);
  return (
    <article className={`rounded-lg border bg-white p-5 shadow-subtle ${selected ? "border-reef" : "border-ink/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{hotel.name}</h3>
          <p className="mt-1 text-sm text-ink/58">{hotel.location}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <Badge>{tradeoff.label}</Badge>
            <Badge variant="secondary">{Math.round(hotel.confidence * 100)}% price confidence</Badge>
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
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-ink/5 px-3 py-3 text-sm leading-5 text-ink/68">
        <MapPinned size={16} className="mt-0.5 shrink-0 text-reef" aria-hidden />
        {tradeoff.text}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant={selected ? "outline" : "reef"} onClick={onSelect}>
          {selected ? "Selected stay" : "Select stay"}
        </Button>
      </div>
    </article>
  );
}

function QuoteCard({ quote, baseline, selected, currency, compact = false, onSelect }: { quote: PriceQuote; baseline: number; selected: boolean; currency: TripPlan["request"]["currency"]; compact?: boolean; onSelect: () => void }) {
  const tradeoff = quoteTradeoff(quote, baseline);
  return (
    <article className={`rounded-lg border bg-white ${compact ? "p-3" : "p-5 shadow-subtle"} ${selected ? "border-reef" : "border-ink/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={compact ? "font-semibold" : "text-xl font-semibold"}>{quote.displayName}</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
            <Badge>{tradeoff.label}</Badge>
            <Badge variant="secondary">{quote.linkLabel?.startsWith("Exact") ? "Date-aware estimate" : "Flexible date estimate"}</Badge>
            {!compact ? <Badge variant="secondary">{Math.round(quote.confidence * 100)}% price confidence</Badge> : null}
          </div>
        </div>
        <div className="text-right">
          <p className={compact ? "font-semibold" : "text-2xl font-semibold"}>{formatMoney(quote.estimatedPrice, currency)}</p>
          <p className="text-xs text-ink/48">/{quote.unit}</p>
        </div>
      </div>
      {!compact ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-ink/5 px-3 py-3 text-sm leading-5 text-ink/68">
          {quote.category === "flight" ? <Clock size={16} className="mt-0.5 shrink-0 text-reef" aria-hidden /> : <ShieldCheck size={16} className="mt-0.5 shrink-0 text-reef" aria-hidden />}
          {tradeoff.text}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={selected ? "outline" : "reef"} size="sm" onClick={onSelect}>
          {selected ? "Selected" : "Select"}
        </Button>
      </div>
    </article>
  );
}

function EmptyBudgetMessage({ label, budget, currency }: { label: string; budget: number; currency: TripPlan["request"]["currency"] }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5 text-sm text-ink/62">
      No {label} are currently under {formatMoney(budget, currency)}. Raise the budget filter or keep Roamly&apos;s starting estimate.
    </div>
  );
}

function hotelTradeoff(hotel: HotelOption, baseline: number) {
  if (hotel.nightlyPrice <= baseline * 1.02) {
    return { label: "Cheaper stay", text: "Lowest nightly cost. Tradeoff: expect a simpler room or a location farther from the busiest areas." };
  }
  if (hotel.rating >= 4.5) {
    return { label: "Better reviewed", text: "Higher guest rating and a stronger comfort profile. Tradeoff: higher nightly cost." };
  }
  if (/center|central|old|downtown/i.test(hotel.location)) {
    return { label: "Better location", text: "Closer to the core itinerary areas. Tradeoff: you pay more for convenience." };
  }
  return { label: "Balanced pick", text: "A middle-ground stay with a reasonable price and practical location for this itinerary." };
}

function quoteTradeoff(quote: PriceQuote, baseline: number) {
  if (quote.estimatedPrice <= baseline * 1.02) {
    return quote.category === "flight"
      ? { label: "Cheaper flight", text: "Lowest fare package. Tradeoff: it may involve less convenient times, longer routing, or fewer included comforts." }
      : { label: "Cheaper hotel deal", text: "Lowest nightly package. Tradeoff: compare location and cancellation terms before committing." };
  }
  if (quote.estimatedPrice >= baseline * 1.45) {
    return quote.category === "flight"
      ? { label: "Comfort upgrade", text: "Higher-cost flight package that may offer better times, fewer stops, or a more comfortable cabin." }
      : { label: "Stay upgrade", text: "Higher-cost stay package with room to prioritize location, reviews, or property quality." };
  }
  return quote.category === "flight"
    ? { label: "Balanced flight", text: "A middle option for travelers who want a better schedule without jumping to premium pricing." }
    : { label: "Balanced hotel", text: "A middle option that can trade a modest price increase for better location or reviews." };
}
