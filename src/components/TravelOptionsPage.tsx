"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Hotel,
  Luggage,
  MapPinned,
  Plane,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Utensils,
  Wifi
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/travel/currency";
import { applyTripSelectionsToBudget } from "@/lib/travel/pricing";
import {
  buildFlightResults,
  buildHotelResults,
  filterFlightResults,
  filterHotelResults,
  flightToSelectedQuote,
  hotelToSelectedHotel,
  sortFlightResults,
  sortHotelResults,
  tripNights,
  type FlightDepartureFilter,
  type FlightFilterState,
  type FlightPackageFilter,
  type FlightSearchOption,
  type FlightSort,
  type HotelFilterState,
  type HotelProximityFilter,
  type HotelSearchOption,
  type HotelSort,
  type HotelTierFilter
} from "@/lib/travel/search-results";
import { isTripSaved, readCurrentTrip, updateSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { CurrencyCode, TripPlan } from "@/lib/travel/types";

type TravelOptionsPageProps = {
  kind: "hotels" | "flights";
};

export function TravelOptionsPage({ kind }: TravelOptionsPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const task = window.setTimeout(() => {
      async function loadCurrent() {
        const current = readCurrentTrip();
        const priced = current ? applyTripSelectionsToBudget(current) : current;
        setPlan(priced);
        if (priced) {
          writeCurrentTrip(priced);
          setSaved(await isTripSaved(priced.id));
        }
        setLoading(false);
      }

      void loadCurrent();
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  function persist(next: TripPlan) {
    const priced = applyTripSelectionsToBudget(next);
    setPlan(priced);
    writeCurrentTrip(priced);
    if (saved) void updateSavedTrip(priced);
    return priced;
  }

  function selectFlight(option: FlightSearchOption) {
    if (!plan) return;
    persist({ ...plan, selectedFlightQuote: flightToSelectedQuote(option) });
    router.push("/results");
  }

  function selectHotel(option: HotelSearchOption) {
    if (!plan) return;
    const selectedHotel = hotelToSelectedHotel(option);
    persist({
      ...plan,
      selectedHotelQuote: undefined,
      selectedHotel,
      selectedStay: {
        type: "hotel",
        label: option.name,
        location: option.location
      }
    });
    router.push("/results");
  }

  if (loading) return <OptionsSkeleton kind={kind} />;

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

  return kind === "flights" ? (
    <FlightResultsExperience plan={plan} onSelect={selectFlight} onBack={() => router.push("/results")} />
  ) : (
    <HotelResultsExperience plan={plan} onSelect={selectHotel} onBack={() => router.push("/results")} />
  );
}

function FlightResultsExperience({ plan, onSelect, onBack }: { plan: TripPlan; onSelect: (option: FlightSearchOption) => void; onBack: () => void }) {
  const currency = plan.request.currency;
  const options = useMemo(() => buildFlightResults(plan), [plan]);
  const [sort, setSort] = useState<FlightSort>("best-value");
  const [filters, setFilters] = useState<FlightFilterState>({
    stops: "any",
    airline: "any",
    departure: "any",
    packageLevel: "any"
  });
  const airlines = useMemo(() => Array.from(new Set(options.map((option) => option.airline))).sort(), [options]);
  const visibleOptions = useMemo(() => sortFlightResults(filterFlightResults(options, filters), sort), [filters, options, sort]);
  const cheapest = sortFlightResults(options, "cheapest")[0];
  const fastest = sortFlightResults(options, "fastest")[0];
  const bestValue = sortFlightResults(options, "best-value")[0];

  function resetFilters() {
    setFilters({ stops: "any", airline: "any", departure: "any", packageLevel: "any" });
    setSort("best-value");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <OptionsTopBar onBack={onBack} />

      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-subtle sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Flight results</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {plan.request.origin} to {plan.destination.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-ink/62">
              <span className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1">
                <CalendarDays size={15} aria-hidden />
                {dateSummary(plan)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1">
                <Plane size={15} aria-hidden />
                Round-trip, {plan.request.travelers} traveler{plan.request.travelers === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="grid gap-2 rounded-lg bg-ink p-4 text-paper sm:min-w-[280px]">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/58">Current trip total</span>
            <span className="text-3xl font-semibold">{formatMoney(plan.budget.totalEstimated, currency)}</span>
            <span className="text-sm text-paper/64">Selecting a flight updates this estimate.</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <FlightFilterPanel filters={filters} setFilters={setFilters} airlines={airlines} onReset={resetFilters} />

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-subtle">
            <div className="grid gap-3 md:grid-cols-3">
              <FlightSortButton label="Best value" active={sort === "best-value"} onClick={() => setSort("best-value")} detail={bestValue ? `${bestValue.airline} ${formatMoney(bestValue.price, currency)}` : "Recommended"} />
              <FlightSortButton label="Cheapest" active={sort === "cheapest"} onClick={() => setSort("cheapest")} detail={cheapest ? formatMoney(cheapest.price, currency) : "Lowest fare"} />
              <FlightSortButton label="Fastest" active={sort === "fastest"} onClick={() => setSort("fastest")} detail={fastest ? formatDuration(fastest.durationMinutes) : "Shortest route"} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink/62">
              {visibleOptions.length} flight{visibleOptions.length === 1 ? "" : "s"} for this trip
            </p>
            <Badge variant="secondary">Estimated fares</Badge>
          </div>

          {visibleOptions.length ? (
            visibleOptions.map((option) => (
              <FlightCard
                key={option.id}
                option={option}
                currency={currency}
                selected={plan.selectedFlightQuote?.id === option.id || plan.selectedFlightQuote?.id === option.sourceQuoteId}
                onSelect={() => onSelect(option)}
              />
            ))
          ) : (
            <EmptyState title="No flights match these filters" description="Clear a filter or switch back to Best value to see more routes for this trip." actionLabel="Reset filters" onAction={resetFilters} />
          )}
        </div>
      </section>
    </main>
  );
}

function HotelResultsExperience({ plan, onSelect, onBack }: { plan: TripPlan; onSelect: (option: HotelSearchOption) => void; onBack: () => void }) {
  const currency = plan.request.currency;
  const nights = tripNights(plan);
  const options = useMemo(() => buildHotelResults(plan), [plan]);
  const [sort, setSort] = useState<HotelSort>("best-value");
  const [filters, setFilters] = useState<HotelFilterState>({
    freeCancellation: false,
    breakfastIncluded: false,
    proximity: "any",
    starRating: "any",
    tier: "any"
  });
  const visibleOptions = useMemo(() => sortHotelResults(filterHotelResults(options, filters), sort), [filters, options, sort]);
  const lowest = sortHotelResults(options, "lowest-price")[0];
  const rated = sortHotelResults(options, "highest-rated")[0];
  const closest = sortHotelResults(options, "closest")[0];

  function resetFilters() {
    setFilters({ freeCancellation: false, breakfastIncluded: false, proximity: "any", starRating: "any", tier: "any" });
    setSort("best-value");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <OptionsTopBar onBack={onBack} />

      <section
        className="overflow-hidden rounded-lg bg-ink text-paper shadow-soft"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(18,21,31,0.88), rgba(18,21,31,0.5)), url(${plan.destination.imageUrl})`,
          backgroundPosition: "center",
          backgroundSize: "cover"
        }}
      >
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coral">Stays in {plan.destination.name}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">Choose your stay</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-paper/76">
              Curated hotel-style options for {nights} night{nights === 1 ? "" : "s"}, matched to the trip budget, itinerary, and location.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="dark" className="bg-white/12 text-paper">Images and amenities</Badge>
              <Badge variant="dark" className="bg-white/12 text-paper">Trip total updates instantly</Badge>
            </div>
          </div>
          <div className="rounded-lg bg-white/12 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/62">Current trip total</p>
            <p className="mt-2 text-3xl font-semibold">{formatMoney(plan.budget.totalEstimated, currency)}</p>
            <p className="mt-1 text-sm text-paper/68">Selecting a stay updates lodging for the trip.</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <HotelFilterPanel filters={filters} setFilters={setFilters} onReset={resetFilters} />

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-subtle">
            <div className="grid gap-3 md:grid-cols-4">
              <HotelSortButton label="Best value" active={sort === "best-value"} onClick={() => setSort("best-value")} detail="Location + rating" />
              <HotelSortButton label="Lowest price" active={sort === "lowest-price"} onClick={() => setSort("lowest-price")} detail={lowest ? `${formatMoney(lowest.nightlyPrice, currency)}/night` : "Lowest nightly"} />
              <HotelSortButton label="Highest rated" active={sort === "highest-rated"} onClick={() => setSort("highest-rated")} detail={rated ? `${rated.rating.toFixed(1)} guest rating` : "Top reviews"} />
              <HotelSortButton label="Closest to city center" active={sort === "closest"} onClick={() => setSort("closest")} detail={closest ? `${closest.distanceKm.toFixed(1)} km to center` : "City center"} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink/62">
              {visibleOptions.length} stay{visibleOptions.length === 1 ? "" : "s"} for this destination
            </p>
            <Badge variant="secondary">{nights} night total shown</Badge>
          </div>

          {visibleOptions.length ? (
            visibleOptions.map((option) => (
              <HotelCard
                key={option.id}
                option={option}
                currency={currency}
                selected={plan.selectedHotel?.id === option.id || plan.selectedStay?.label === option.name}
                onSelect={() => onSelect(option)}
              />
            ))
          ) : (
            <EmptyState title="No stays match these filters" description="Clear a filter or switch to Best value to restore the curated stay list." actionLabel="Reset filters" onAction={resetFilters} />
          )}
        </div>
      </section>
    </main>
  );
}

function FlightFilterPanel({
  filters,
  setFilters,
  airlines,
  onReset
}: {
  filters: FlightFilterState;
  setFilters: (filters: FlightFilterState) => void;
  airlines: string[];
  onReset: () => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter size={18} aria-hidden />
          Filter flights
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <FilterGroup label="Stops">
          <ChipRow>
            <FilterChip active={filters.stops === "any"} onClick={() => setFilters({ ...filters, stops: "any" })}>Any</FilterChip>
            <FilterChip active={filters.stops === "nonstop"} onClick={() => setFilters({ ...filters, stops: "nonstop" })}>Nonstop</FilterChip>
            <FilterChip active={filters.stops === "one-stop"} onClick={() => setFilters({ ...filters, stops: "one-stop" })}>One stop</FilterChip>
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Airline">
          <Select value={filters.airline} onValueChange={(value) => setFilters({ ...filters, airline: value })}>
            <SelectTrigger aria-label="Airline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any airline</SelectItem>
              {airlines.map((airline) => (
                <SelectItem key={airline} value={airline}>
                  {airline}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup label="Departure time">
          <ChipRow>
            {(["any", "morning", "afternoon", "evening"] satisfies FlightDepartureFilter[]).map((value) => (
              <FilterChip key={value} active={filters.departure === value} onClick={() => setFilters({ ...filters, departure: value })}>
                {titleCase(value)}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Package quality">
          <ChipRow>
            {(["any", "basic", "standard", "flexible", "premium"] satisfies FlightPackageFilter[]).map((value) => (
              <FilterChip key={value} active={filters.packageLevel === value} onClick={() => setFilters({ ...filters, packageLevel: value })}>
                {value === "any" ? "Any" : titleCase(value)}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterGroup>

        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={15} aria-hidden />
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

function HotelFilterPanel({
  filters,
  setFilters,
  onReset
}: {
  filters: HotelFilterState;
  setFilters: (filters: HotelFilterState) => void;
  onReset: () => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal size={18} aria-hidden />
          Filter stays
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <FilterGroup label="Included">
          <div className="grid gap-2">
            <ToggleRow active={filters.freeCancellation} label="Free cancellation" onClick={() => setFilters({ ...filters, freeCancellation: !filters.freeCancellation })} />
            <ToggleRow active={filters.breakfastIncluded} label="Breakfast included" onClick={() => setFilters({ ...filters, breakfastIncluded: !filters.breakfastIncluded })} />
          </div>
        </FilterGroup>

        <FilterGroup label="Location">
          <ChipRow>
            {(["any", "near-attractions", "beachfront"] satisfies HotelProximityFilter[]).map((value) => (
              <FilterChip key={value} active={filters.proximity === value} onClick={() => setFilters({ ...filters, proximity: value })}>
                {value === "any" ? "Any" : value === "beachfront" ? "Beachfront" : "Near attractions"}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Hotel star rating">
          <Select value={filters.starRating} onValueChange={(value) => setFilters({ ...filters, starRating: value as HotelFilterState["starRating"] })}>
            <SelectTrigger aria-label="Hotel star rating">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any rating</SelectItem>
              <SelectItem value="3">3 stars and up</SelectItem>
              <SelectItem value="4">4 stars and up</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
            </SelectContent>
          </Select>
        </FilterGroup>

        <FilterGroup label="Price style">
          <ChipRow>
            {(["any", "budget", "midrange", "luxury"] satisfies HotelTierFilter[]).map((value) => (
              <FilterChip key={value} active={filters.tier === value} onClick={() => setFilters({ ...filters, tier: value })}>
                {value === "any" ? "Any" : titleCase(value)}
              </FilterChip>
            ))}
          </ChipRow>
        </FilterGroup>

        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={15} aria-hidden />
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

function FlightCard({ option, currency, selected, onSelect }: { option: FlightSearchOption; currency?: CurrencyCode; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={selected ? "border-reef ring-2 ring-reef/20" : undefined}>
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_180px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{option.airline}</h2>
                <Badge variant={option.stops === 0 ? "default" : "secondary"}>{option.stopLabel}</Badge>
                <Badge variant="gold">{option.packageLevel}</Badge>
              </div>
              <p className="mt-1 text-sm text-ink/56">{option.flightNumber} · {option.routeDetail}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[110px_1fr_110px] sm:items-center">
            <TimeBlock label="Depart" value={option.departureTime} />
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-reef" />
                <span className="h-px flex-1 bg-ink/18" />
                <Plane className="h-4 w-4 text-ink/42" aria-hidden />
                <span className="h-px flex-1 bg-ink/18" />
                <span className="h-2 w-2 rounded-full bg-coral" />
              </div>
              <p className="text-center text-sm font-medium text-ink/62">
                {formatDuration(option.durationMinutes)} · {option.stopLabel}
              </p>
            </div>
            <TimeBlock label="Arrive" value={option.arrivalTime} alignRight />
          </div>

          <div className="mt-5 grid gap-2 text-sm text-ink/62 sm:grid-cols-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
              <Luggage size={15} aria-hidden />
              {option.baggage}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
              <Clock size={15} aria-hidden />
              {titleCase(option.departureWindow)} departure
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
              <ShieldCheck size={15} aria-hidden />
              {option.fareNote}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-lg bg-paper p-4 text-left lg:text-right">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/52">Round-trip</p>
            <p className="mt-1 text-3xl font-semibold">{formatMoney(option.price, currency)}</p>
            <p className="mt-1 text-xs text-ink/52">Taxes and fees estimated</p>
          </div>
          <Button variant={selected ? "outline" : "reef"} onClick={onSelect}>
            <CheckCircle2 size={16} aria-hidden />
            {selected ? "Selected" : "Select flight"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HotelCard({ option, currency, selected, onSelect }: { option: HotelSearchOption; currency?: CurrencyCode; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={selected ? "overflow-hidden border-reef ring-2 ring-reef/20" : "overflow-hidden"}>
      <CardContent className="grid gap-0 p-0 md:grid-cols-[300px_1fr]">
        <div className="min-h-[230px] bg-cover bg-center md:min-h-full" style={{ backgroundImage: `url(${option.imageUrl})` }} aria-label={`${option.name} hotel image`} />
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{option.name}</h2>
                <Badge variant="gold">{option.starRating} star</Badge>
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink/58">
                <MapPinned size={15} aria-hidden />
                {option.location} · {option.distanceKm.toFixed(1)} km to center
              </p>
              <p className="mt-3 text-sm leading-6 text-ink/66">{option.description}</p>
            </div>

            <div className="rounded-lg bg-paper p-4 lg:text-right">
              <p className="text-sm font-semibold text-ink">
                {formatMoney(option.nightlyPrice, currency)} <span className="text-xs font-medium text-ink/48">/ night</span>
              </p>
              <p className="mt-1 text-2xl font-semibold">{formatMoney(option.totalPrice, currency)}</p>
              <p className="text-xs text-ink/52">total before final taxes</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 font-semibold text-ink/72">
              <Star size={14} aria-hidden />
              {option.rating.toFixed(1)} ({option.reviewCount.toLocaleString()} reviews)
            </span>
            <Badge variant={option.tier === "luxury" ? "coral" : "secondary"}>{titleCase(option.tier)}</Badge>
            <Badge>{option.proximity === "beachfront" ? "Beachfront or coastal" : "Near attractions"}</Badge>
          </div>

          <div className="grid gap-2 text-sm text-ink/62 sm:grid-cols-2 lg:grid-cols-4">
            {option.amenities.map((amenity) => (
              <span key={amenity} className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
                {amenityIcon(amenity)}
                {amenity}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p className="text-sm font-medium text-ink/62">{option.cancellationNote}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={option.link} target="_blank" rel="noreferrer">View deal</a>
              </Button>
              <Button variant={selected ? "outline" : "reef"} size="sm" onClick={onSelect}>
                <CheckCircle2 size={16} aria-hidden />
                {selected ? "Selected" : "Select stay"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OptionsTopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Button variant="secondary" size="sm" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden />
        Trip summary
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Planner</Link>
      </Button>
    </div>
  );
}

function FlightSortButton({ label, detail, active, onClick }: { label: string; detail: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`focus-ring rounded-lg border px-4 py-3 text-left transition ${active ? "border-reef bg-reef/10 text-reef" : "border-ink/10 bg-white text-ink hover:border-reef/40"}`} onClick={onClick}>
      <span className="block font-semibold">{label}</span>
      <span className="mt-1 block text-sm text-ink/56">{detail}</span>
    </button>
  );
}

function HotelSortButton({ label, detail, active, onClick }: { label: string; detail: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`focus-ring rounded-lg border px-4 py-3 text-left transition ${active ? "border-reef bg-reef/10 text-reef" : "border-ink/10 bg-white text-ink hover:border-reef/40"}`} onClick={onClick}>
      <span className="block font-semibold">{label}</span>
      <span className="mt-1 block text-sm text-ink/56">{detail}</span>
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink/72">{label}</p>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`focus-ring rounded-full border px-3 py-1.5 text-sm font-semibold transition ${active ? "border-reef bg-reef text-white" : "border-ink/10 bg-white text-ink/64 hover:border-reef/40 hover:text-reef"}`} onClick={onClick}>
      {children}
    </button>
  );
}

function ToggleRow({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`focus-ring flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${active ? "border-reef bg-reef/10 text-reef" : "border-ink/10 bg-white text-ink/66 hover:border-reef/40"}`} onClick={onClick}>
      {label}
      <span className={`flex h-5 w-5 items-center justify-center rounded border ${active ? "border-reef bg-reef text-white" : "border-ink/20 bg-white"}`}>
        {active ? <CheckCircle2 size={14} aria-hidden /> : null}
      </span>
    </button>
  );
}

function TimeBlock({ label, value, alignRight = false }: { label: string; value: string; alignRight?: boolean }) {
  return (
    <div className={alignRight ? "sm:text-right" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/48">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-ink/20 bg-white p-8 text-center shadow-subtle">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-reef/10 text-reef">
        <Filter size={18} aria-hidden />
      </div>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/62">{description}</p>
      <Button className="mt-5" variant="outline" onClick={onAction}>
        <RotateCcw size={15} aria-hidden />
        {actionLabel}
      </Button>
    </div>
  );
}

function OptionsSkeleton({ kind }: { kind: TravelOptionsPageProps["kind"] }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-subtle">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardContent className="grid gap-3 p-5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className={kind === "hotels" ? "h-72 w-full" : "h-56 w-full"} />
          <Skeleton className={kind === "hotels" ? "h-72 w-full" : "h-56 w-full"} />
        </div>
      </section>
    </main>
  );
}

function dateSummary(plan: TripPlan) {
  if (plan.request.dateMode === "exact" && plan.request.startDate) {
    return [plan.request.startDate, plan.request.endDate].filter(Boolean).join(" to ");
  }
  return plan.request.startDate || `${plan.request.tripLengthDays} days`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return `${hours}h ${remainder}m`;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

function amenityIcon(amenity: string) {
  if (/breakfast|restaurant/i.test(amenity)) return <Utensils size={14} aria-hidden />;
  if (/wi-fi/i.test(amenity)) return <Wifi size={14} aria-hidden />;
  if (/cancel/i.test(amenity)) return <ShieldCheck size={14} aria-hidden />;
  if (/transfer|transit/i.test(amenity)) return <Plane size={14} aria-hidden />;
  if (/front desk|workspace|laundry/i.test(amenity)) return <Briefcase size={14} aria-hidden />;
  return <Hotel size={14} aria-hidden />;
}
