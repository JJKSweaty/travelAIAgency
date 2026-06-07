"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
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
import { flightFallbackLinks, hotelFallbackLinks } from "@/lib/travel/deepLinks";
import { applyTripSelectionsToBudget } from "@/lib/travel/pricing";
import { travelMonthFromRequest } from "@/lib/travel/travelDates";
import {
  FLIGHT_SEARCH_TTL_MS,
  HOTEL_PRICE_TTL_MS,
  flightSearchKey,
  hotelSearchKey,
  isFresh,
  readBrowserSearchCache,
  writeBrowserSearchCache
} from "@/lib/travel/searchCache";
import {
  filterFlightResults,
  filterHotelResults,
  flightResultsToSearchOptions,
  flightToSelectedQuote,
  hotelResultsToSearchOptions,
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
  type ProviderSearchLink
} from "@/lib/travel/search-results";
import { isTripSaved, readCurrentTrip, updateSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import type { CurrencyCode, FlightResult, HotelResult, TripPlan } from "@/lib/travel/types";

type TravelOptionsPageProps = {
  kind: "hotels" | "flights";
};

type ProviderSearchState = {
  loading: boolean;
  searched: boolean;
  message?: string;
  links: ProviderSearchLink[];
};

type ProviderCacheArgs =
  | { kind: "flights"; plan: TripPlan; searchKey: string; fetchedAt: string; flights: FlightResult[] }
  | { kind: "hotels"; plan: TripPlan; searchKey: string; fetchedAt: string; hotels: HotelResult[] };

const emptyProviderSearch: ProviderSearchState = {
  loading: false,
  searched: false,
  links: []
};

export function TravelOptionsPage({ kind }: TravelOptionsPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providerSearch, setProviderSearch] = useState<ProviderSearchState>(emptyProviderSearch);
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const autoSearchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => {
      async function loadCurrent() {
        const current = readCurrentTrip();
        const priced = current ? applyTripSelectionsToBudget(current) : current;
        setPlan(priced);
        if (priced) {
          writeCurrentTrip(priced);
          setSaved(await isTripSaved(priced.id).catch(() => false));
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
    if (saved) void updateSavedTrip(priced).catch(() => undefined);
    return priced;
  }

  const persistProviderCache = useCallback((args: ProviderCacheArgs) => {
    const next = withProviderCache(args);
    setPlan(next);
    writeCurrentTrip(next);
    if (saved) void updateSavedTrip(next).catch(() => undefined);
  }, [saved]);

  const refreshProviderResults = useCallback(async (force = false) => {
    if (!plan) return;
    const request = kind === "flights" ? flightProviderRequest(plan) : hotelProviderRequest(plan);
    if (!request) {
      setProviderSearch({
        loading: false,
        searched: true,
        links: kind === "flights" ? fallbackFlightLinksForPlan(plan) : fallbackHotelLinksForPlan(plan),
        message: "Choose a travel month so I can find realistic flight and hotel prices."
      });
      return;
    }

    const cached = force ? null : readFreshProviderCache(kind, request, plan);
    if (cached) {
      setProviderSearch({ loading: false, searched: true, links: request.fallbackLinks });
      setFlightResults(kind === "flights" ? cached.flights ?? [] : []);
      setHotelResults(kind === "hotels" ? cached.hotels ?? [] : []);
      return;
    }

    setProviderSearch({ loading: true, searched: true, links: request.fallbackLinks });
    try {
      const response = await fetch(request.url);
      const body = (await response.json()) as TravelProviderResponse;
      const nextLinks = body.links?.length ? body.links : request.fallbackLinks;
      if (!response.ok) {
        setProviderSearch({
          loading: false,
          searched: true,
          links: nextLinks,
          message: body.error ?? body.message ?? "I could not check current prices for this search."
        });
        return;
      }

      const fetchedAt = new Date().toISOString();
      if (kind === "flights") {
        const flights = Array.isArray(body.flights) ? body.flights : [];
        setFlightResults(flights);
        setHotelResults([]);
        if (flights.length) {
          writeBrowserSearchCache({ kind: "flights", key: request.searchKey, fetchedAt, results: flights });
          persistProviderCache({ kind: "flights", plan, searchKey: request.searchKey, fetchedAt, flights });
        }
      } else {
        const hotels = Array.isArray(body.hotels) ? body.hotels : [];
        setHotelResults(hotels);
        setFlightResults([]);
        if (hotels.length) {
          writeBrowserSearchCache({ kind: "hotels", key: request.searchKey, fetchedAt, results: hotels });
          persistProviderCache({ kind: "hotels", plan, searchKey: request.searchKey, fetchedAt, hotels });
        }
      }

      setProviderSearch({ loading: false, searched: true, links: nextLinks, message: body.message });
    } catch {
      setProviderSearch({
        loading: false,
        searched: true,
        links: request.fallbackLinks,
        message: "I could not check current prices for this search. Use a search link for the latest options."
      });
    }
  }, [kind, persistProviderCache, plan]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (!plan) {
        setProviderSearch(emptyProviderSearch);
        setFlightResults([]);
        setHotelResults([]);
        return;
      }

      const request = kind === "flights" ? flightProviderRequest(plan) : hotelProviderRequest(plan);

      if (!request) {
        const links = kind === "flights" ? fallbackFlightLinksForPlan(plan) : fallbackHotelLinksForPlan(plan);
        setProviderSearch({
          loading: false,
          searched: true,
          links,
          message: "Choose a travel month so I can find realistic flight and hotel prices."
        });
        setFlightResults([]);
        setHotelResults([]);
        return;
      }

      const cached = readFreshProviderCache(kind, request, plan);
      const autoSearchKey = `${kind}:${request.searchKey}`;
      setProviderSearch({
        loading: !cached && autoSearchKeyRef.current !== autoSearchKey,
        searched: Boolean(cached),
        links: request.fallbackLinks,
        message: cached ? undefined : autoSearchKeyRef.current === autoSearchKey ? "I could not find current options for this exact search. Use a search link or refresh again." : "Checking current prices for these trip dates."
      });
      setFlightResults(kind === "flights" ? cached?.flights ?? [] : []);
      setHotelResults(kind === "hotels" ? cached?.hotels ?? [] : []);

      if (!cached && autoSearchKeyRef.current !== autoSearchKey) {
        autoSearchKeyRef.current = autoSearchKey;
        void refreshProviderResults(false);
      }
    }, 0);

    return () => window.clearTimeout(task);
  }, [kind, plan, refreshProviderResults]);

  function selectFlight(option: FlightSearchOption) {
    if (!plan) return;
    if (!option.hasKnownPrice) return;
    const request = flightProviderRequest(plan);
    persist({ ...plan, selectedFlightQuote: flightToSelectedQuote(option, selectionSearchContext(plan, request?.searchKey)) });
    router.push("/results");
  }

  function selectHotel(option: HotelSearchOption) {
    if (!plan) return;
    const request = hotelProviderRequest(plan);
    const selectedHotel = hotelToSelectedHotel(option, selectionSearchContext(plan, request?.searchKey));
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
    <FlightResultsExperience plan={plan} results={flightResults} providerSearch={providerSearch} onRefresh={() => void refreshProviderResults(true)} onSelect={selectFlight} onBack={() => router.push("/results")} />
  ) : (
    <HotelResultsExperience plan={plan} results={hotelResults} providerSearch={providerSearch} onRefresh={() => void refreshProviderResults(true)} onSelect={selectHotel} onBack={() => router.push("/results")} />
  );
}

function FlightResultsExperience({
  plan,
  results,
  providerSearch,
  onRefresh,
  onSelect,
  onBack
}: {
  plan: TripPlan;
  results: FlightResult[];
  providerSearch: ProviderSearchState;
  onRefresh: () => void;
  onSelect: (option: FlightSearchOption) => void;
  onBack: () => void;
}) {
  const currency = plan.request.currency;
  const options = useMemo(() => flightResultsToSearchOptions(results, providerSearch.links), [providerSearch.links, results]);
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
  const latestFetchedAt = newestFetchedAt(results.map((result) => result.fetchedAt));

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
          <ProviderStatusPanel
            kind="flights"
            count={results.length}
            latestFetchedAt={latestFetchedAt}
            providerSearch={providerSearch}
            tripTotal={plan.budget.totalEstimated}
            currency={currency}
            onRefresh={onRefresh}
            detail="Selecting a flight updates this estimate."
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <FlightFilterPanel filters={filters} setFilters={setFilters} airlines={airlines} onReset={resetFilters} />

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-subtle">
            <div className="grid gap-3 md:grid-cols-3">
              <FlightSortButton label="Best value" active={sort === "best-value"} onClick={() => setSort("best-value")} detail={bestValue ? flightPriceDetail(bestValue, currency) : "Current prices"} />
              <FlightSortButton label="Cheapest" active={sort === "cheapest"} onClick={() => setSort("cheapest")} detail={cheapest ? flightPriceDetail(cheapest, currency) : "Lowest fare"} />
              <FlightSortButton label="Fastest" active={sort === "fastest"} onClick={() => setSort("fastest")} detail={fastest?.durationMinutes ? formatDuration(fastest.durationMinutes) : "Shortest route"} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink/62">
              {visibleOptions.length} flight{visibleOptions.length === 1 ? "" : "s"} for this trip
            </p>
            <Badge variant="secondary">{latestFetchedAt ? updatedAgo(latestFetchedAt) : "Current prices"}</Badge>
          </div>

          {providerSearch.loading ? (
            <OptionsResultSkeleton kind="flights" />
          ) : visibleOptions.length ? (
            visibleOptions.map((option) => (
              <FlightCard
                key={option.id}
                option={option}
                currency={currency}
                selected={
                  plan.selectedFlightQuote?.id === option.id ||
                  plan.selectedFlightQuote?.id === option.sourceQuoteId ||
                  plan.selectedFlightQuote?.providerListingId === option.bookingToken ||
                  plan.selectedFlightQuote?.providerListingId === option.id
                }
                onSelect={() => onSelect(option)}
              />
            ))
          ) : (
            <EmptyState
              title={options.length ? "No flights match these filters" : "No current flights found"}
              description={
                options.length
                  ? "Clear a filter or switch back to Best value to see more routes for this trip."
                  : providerSearch.message ?? "I could not find current flight options for this trip."
              }
              links={options.length ? [] : providerSearch.links}
              actionLabel={options.length ? "Reset filters" : "Refresh prices"}
              onAction={options.length ? resetFilters : onRefresh}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function HotelResultsExperience({
  plan,
  results,
  providerSearch,
  onRefresh,
  onSelect,
  onBack
}: {
  plan: TripPlan;
  results: HotelResult[];
  providerSearch: ProviderSearchState;
  onRefresh: () => void;
  onSelect: (option: HotelSearchOption) => void;
  onBack: () => void;
}) {
  const currency = plan.request.currency;
  const nights = tripNights(plan);
  const options = useMemo(() => preferImageBackedHotelOptions(hotelResultsToSearchOptions(results, plan, providerSearch.links)), [plan, providerSearch.links, results]);
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
  const latestFetchedAt = newestFetchedAt(results.map((result) => result.fetchedAt));

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
          <ProviderStatusPanel
            kind="hotels"
            count={results.length}
            latestFetchedAt={latestFetchedAt}
            providerSearch={providerSearch}
            tripTotal={plan.budget.totalEstimated}
            currency={currency}
            onRefresh={onRefresh}
            detail="Selecting a stay updates lodging for the trip."
            dark
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <HotelFilterPanel filters={filters} setFilters={setFilters} onReset={resetFilters} />

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-ink/10 bg-white p-3 shadow-subtle">
            <div className="grid gap-3 md:grid-cols-4">
              <HotelSortButton label="Best value" active={sort === "best-value"} onClick={() => setSort("best-value")} detail="Location + rating" />
              <HotelSortButton label="Lowest price" active={sort === "lowest-price"} onClick={() => setSort("lowest-price")} detail={lowest ? hotelPriceDetail(lowest, currency) : "Lowest nightly"} />
              <HotelSortButton label="Highest rated" active={sort === "highest-rated"} onClick={() => setSort("highest-rated")} detail={rated?.rating ? `${rated.rating.toFixed(1)} guest rating` : "Top reviews"} />
              <HotelSortButton label="Closest to city center" active={sort === "closest"} onClick={() => setSort("closest")} detail={closest?.distanceKm !== null && closest?.distanceKm !== undefined ? `${closest.distanceKm.toFixed(1)} km to center` : "City center"} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink/62">
              {visibleOptions.length} stay{visibleOptions.length === 1 ? "" : "s"} for this destination
            </p>
            <Badge variant="secondary">{latestFetchedAt ? updatedAgo(latestFetchedAt) : `${nights} night total shown`}</Badge>
          </div>

          {providerSearch.loading ? (
            <OptionsResultSkeleton kind="hotels" />
          ) : visibleOptions.length ? (
            visibleOptions.map((option) => (
              <HotelCard
                key={option.id}
                option={option}
                currency={currency}
                selected={
                  plan.selectedHotel?.id === option.id ||
                  plan.selectedHotel?.providerListingId === option.propertyToken ||
                  plan.selectedHotel?.providerListingId === option.id ||
                  plan.selectedStay?.label === option.name
                }
                onSelect={() => onSelect(option)}
              />
            ))
          ) : (
            <EmptyState
              title={options.length ? "No stays match these filters" : "No hotel results found"}
              description={
                options.length
                  ? "Clear a filter or switch to Best value to restore the stay list."
                  : providerSearch.message ?? "I could not find current hotel options for this trip."
              }
              links={options.length ? [] : providerSearch.links}
              actionLabel={options.length ? "Reset filters" : "Refresh prices"}
              onAction={options.length ? resetFilters : onRefresh}
            />
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

        <FilterGroup label="Fare type">
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
                {option.packageLevel ? <Badge variant="gold">{option.packageLevel}</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-ink/56">{[option.flightNumber, option.routeDetail].filter(Boolean).join(" - ")}</p>
              <p className="mt-1 text-xs font-medium text-ink/42">{option.sourceLabel} - {updatedAgo(option.fetchedAt)}</p>
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
                {[option.durationMinutes ? formatDuration(option.durationMinutes) : null, option.stopLabel].filter(Boolean).join(" - ")}
              </p>
            </div>
            <TimeBlock label="Arrive" value={option.arrivalTime} alignRight />
          </div>

          <div className="mt-5 grid gap-2 text-sm text-ink/62 sm:grid-cols-3">
            {option.baggage ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
                <Luggage size={15} aria-hidden />
                {option.baggage}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
              <Clock size={15} aria-hidden />
              {titleCase(option.departureWindow)} departure
            </span>
            {option.fareNote ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
                <ShieldCheck size={15} aria-hidden />
                {option.fareNote}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-lg bg-paper p-4 text-left lg:text-right">
          <div>
            {option.hasKnownPrice && option.price !== null ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/52">Round-trip</p>
                <p className="mt-1 text-3xl font-semibold">{formatMoney(option.price, currency)}</p>
                <p className="mt-1 text-xs text-ink/52">Current fare</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/52">Fare</p>
                <p className="mt-1 text-2xl font-semibold">View details</p>
              </>
            )}
          </div>
          {option.hasKnownPrice ? (
            <Button variant={selected ? "outline" : "reef"} onClick={onSelect}>
              <CheckCircle2 size={16} aria-hidden />
              {selected ? "Selected" : "Select flight"}
            </Button>
          ) : null}
          {option.link ? (
            <Button asChild variant="outline">
              <a href={option.link} target="_blank" rel="noreferrer">
                <ExternalLink size={16} aria-hidden />
                View details
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function HotelCard({ option, currency, selected, onSelect }: { option: HotelSearchOption; currency?: CurrencyCode; selected: boolean; onSelect: () => void }) {
  return (
    <Card className={selected ? "overflow-hidden border-reef ring-2 ring-reef/20" : "overflow-hidden"}>
      <CardContent className="grid gap-0 p-0 md:grid-cols-[300px_1fr]">
        {option.imageUrl ? (
          <div className="min-h-[230px] bg-cover bg-center md:min-h-full" style={{ backgroundImage: `url(${option.imageUrl})` }} aria-label={`${option.name} hotel image`} />
        ) : (
          <div className="flex min-h-[230px] items-center justify-center bg-ink/5 text-ink/42 md:min-h-full" aria-label={`${option.name} hotel image unavailable`}>
            <Hotel size={42} aria-hidden />
          </div>
        )}
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_190px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{option.name}</h2>
                {option.starRating ? <Badge variant="gold">{option.starRating} star</Badge> : null}
              </div>
              <p className="mt-1 flex items-center gap-2 text-sm text-ink/58">
                <MapPinned size={15} aria-hidden />
                {option.distanceKm !== null ? `${option.location} - ${option.distanceKm.toFixed(1)} km to center` : option.location}
              </p>
              {option.description ? <p className="mt-3 text-sm leading-6 text-ink/66">{option.description}</p> : null}
              <p className="mt-2 text-xs font-medium text-ink/42">{option.sourceLabel} - {updatedAgo(option.fetchedAt)}</p>
            </div>

            <div className="rounded-lg bg-paper p-4 lg:text-right">
              {option.hasKnownPrice ? (
                <>
                  <p className="text-sm font-semibold text-ink">
                    {option.nightlyPrice !== null ? formatMoney(option.nightlyPrice, currency) : "Rate shown by listing"} <span className="text-xs font-medium text-ink/48">/ night</span>
                  </p>
                  {option.totalPrice !== null ? <p className="mt-1 text-2xl font-semibold">{formatMoney(option.totalPrice, currency)}</p> : null}
                  <p className="text-xs text-ink/52">Current price</p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/52">Current rates</p>
                  <p className="mt-1 text-2xl font-semibold">Check latest price.</p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {option.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 font-semibold text-ink/72">
                <Star size={14} aria-hidden />
                {option.rating.toFixed(1)}{option.reviewCount ? ` (${option.reviewCount.toLocaleString()} reviews)` : ""}
              </span>
            ) : null}
          </div>

          {option.amenities.length ? (
            <div className="grid gap-2 text-sm text-ink/62 sm:grid-cols-2 lg:grid-cols-4">
              {option.amenities.map((amenity) => (
                <span key={amenity} className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
                  {amenityIcon(amenity)}
                  {amenity}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p className="text-sm font-medium text-ink/62">{option.cancellationNote ?? "Check terms before booking."}</p>
            <div className="flex flex-wrap gap-2">
              {option.link ? (
                <Button asChild variant="outline" size="sm">
                  <a href={option.link} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden />
                    {option.hasKnownPrice ? "View hotel" : "Check latest price"}
                  </a>
                </Button>
              ) : null}
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

function preferImageBackedHotelOptions(options: HotelSearchOption[]) {
  const withImages = options.filter((option) => Boolean(option.imageUrl));
  if (withImages.length >= 3) return withImages;
  if (!withImages.length) return options;
  const withoutImages = options.filter((option) => !option.imageUrl);
  return [...withImages, ...withoutImages];
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

function ProviderStatusPanel({
  kind,
  count,
  latestFetchedAt,
  providerSearch,
  tripTotal,
  currency,
  onRefresh,
  detail,
  dark = false
}: {
  kind: TravelOptionsPageProps["kind"];
  count: number;
  latestFetchedAt?: string;
  providerSearch: ProviderSearchState;
  tripTotal: number;
  currency?: CurrencyCode;
  onRefresh: () => void;
  detail: string;
  dark?: boolean;
}) {
  const noun = kind === "flights" ? "flight" : "stay";
  const status = providerSearch.loading
    ? "Searching prices"
    : count > 0
      ? `${count} current ${noun}${count === 1 ? "" : "s"}`
      : providerSearch.searched
        ? "Search links ready"
        : "Ready to search";
  const statusDetail = providerSearch.loading
    ? kind === "flights" ? "Checking flight fares for these dates." : "Checking hotel rates for these dates."
    : latestFetchedAt
      ? updatedAgo(latestFetchedAt)
      : providerSearch.message ?? "Use refresh to check current prices.";
  const icon = providerSearch.loading ? <Clock size={15} aria-hidden /> : count > 0 ? <CheckCircle2 size={15} aria-hidden /> : <ExternalLink size={15} aria-hidden />;

  return (
    <Card className={dark ? "border-white/20 bg-white/10 text-paper shadow-none backdrop-blur" : "border-ink bg-ink text-paper"}>
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/60">Current trip total</p>
            <p className="mt-2 text-3xl font-semibold">{formatMoney(tripTotal, currency)}</p>
            <p className="mt-1 text-sm text-paper/64">{detail}</p>
          </div>
          <Badge variant="dark" className="shrink-0 gap-1 bg-white/12 text-paper">
            {icon}
            {providerSearch.loading ? "Live" : count > 0 ? "Updated" : "Links"}
          </Badge>
        </div>

        <div className="rounded-lg bg-white/10 px-3 py-3">
          <p className="text-sm font-semibold">{status}</p>
          <p className="mt-1 text-xs leading-5 text-paper/64">{statusDetail}</p>
        </div>

        <Button variant="secondary" size="sm" onClick={onRefresh} disabled={providerSearch.loading}>
          <RotateCcw size={15} aria-hidden />
          {providerSearch.loading ? "Searching..." : "Refresh prices"}
        </Button>
      </CardContent>
    </Card>
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

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  links = []
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  links?: ProviderSearchLink[];
}) {
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
      {links.length ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {links.map((link) => (
            <Button key={link.id} asChild variant="secondary" size="sm">
              <a href={link.url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} aria-hidden />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
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

function OptionsResultSkeleton({ kind }: { kind: TravelOptionsPageProps["kind"] }) {
  return (
    <div className="grid gap-4">
      <Skeleton className={kind === "hotels" ? "h-72 w-full" : "h-56 w-full"} />
      <Skeleton className={kind === "hotels" ? "h-72 w-full" : "h-56 w-full"} />
      <Skeleton className={kind === "hotels" ? "h-72 w-full" : "h-56 w-full"} />
    </div>
  );
}

type TravelProviderResponse = {
  flights?: FlightResult[];
  hotels?: HotelResult[];
  links?: ProviderSearchLink[];
  message?: string;
  error?: string;
};

type ProviderRouteRequest = {
  url: string;
  fallbackLinks: ProviderSearchLink[];
  searchKey: string;
};

function readFreshProviderCache(kind: TravelOptionsPageProps["kind"], request: ProviderRouteRequest, plan: TripPlan) {
  const cache = plan.travelSearchCache;
  if (kind === "flights") {
    if (cache?.flightSearchKey === request.searchKey && cache.cachedFlights && isFresh(cache.flightsFetchedAt, FLIGHT_SEARCH_TTL_MS)) {
      return { flights: cache.cachedFlights };
    }
    const browserCache = readBrowserSearchCache("flights", request.searchKey);
    if (browserCache?.kind === "flights" && isFresh(browserCache.fetchedAt, FLIGHT_SEARCH_TTL_MS)) {
      return { flights: browserCache.results };
    }
  } else {
    if (cache?.hotelSearchKey === request.searchKey && cache.cachedHotels && isFresh(cache.hotelsFetchedAt, HOTEL_PRICE_TTL_MS)) {
      return { hotels: cache.cachedHotels };
    }
    const browserCache = readBrowserSearchCache("hotels", request.searchKey);
    if (browserCache?.kind === "hotels" && isFresh(browserCache.fetchedAt, HOTEL_PRICE_TTL_MS)) {
      return { hotels: browserCache.results };
    }
  }
  return null;
}

function withProviderCache(args: { kind: "flights"; plan: TripPlan; searchKey: string; fetchedAt: string; flights: FlightResult[] } | { kind: "hotels"; plan: TripPlan; searchKey: string; fetchedAt: string; hotels: HotelResult[] }): TripPlan {
  const plan = refreshSelectedPrices(args);
  const dates = providerTravelDates(plan);
  const rooms = Math.max(1, Math.ceil(plan.request.travelers / 2));
  const travelMonth = travelMonthFromRequest(plan.request);
  const base = {
    ...(plan.travelSearchCache ?? {}),
    tripId: plan.id,
    origin: plan.request.origin,
    destination: destinationLabel(plan),
    travelMonth,
    dates: dates
      ? {
          departureDate: dates.departureDate,
          returnDate: dates.returnDate,
          checkInDate: dates.departureDate,
          checkOutDate: dates.returnDate
        }
        : plan.travelSearchCache?.dates,
    tripLengthDays: plan.request.tripLengthDays,
    travelers: plan.request.travelers,
    rooms,
    budget: plan.request.totalBudget,
    currency: plan.request.currency,
    cabinClass: null
  };

  return args.kind === "flights"
    ? {
        ...plan,
        travelSearchCache: {
          ...base,
          flightSearchKey: args.searchKey,
          cachedFlights: args.flights,
          flightsFetchedAt: args.fetchedAt
        }
      }
    : {
        ...plan,
        travelSearchCache: {
          ...base,
          hotelSearchKey: args.searchKey,
          cachedHotels: args.hotels,
          hotelsFetchedAt: args.fetchedAt
        }
      };
}

function refreshSelectedPrices(args: ProviderCacheArgs): TripPlan {
  if (args.kind === "flights") {
    const selected = args.plan.selectedFlightQuote;
    if (!selected) return args.plan;
    const match = args.flights.find((flight) => selected.id === flight.id || selected.providerListingId === flight.bookingToken || selected.providerListingId === flight.id);
    const currentPrice = match?.totalPrice ?? match?.pricePerTraveler ?? null;
    if (!match || currentPrice === null) return args.plan;
    return {
      ...args.plan,
      selectedFlightQuote: {
        ...selected,
        estimatedPrice: currentPrice,
        currentPrice,
        lastPriceCheckedAt: args.fetchedAt,
        searchContext: selected.searchContext ?? selectionSearchContext(args.plan, args.searchKey)
      }
    };
  }

  const selected = args.plan.selectedHotel;
  if (!selected) return args.plan;
  const match = args.hotels.find((hotel) => selected.id === hotel.id || selected.providerListingId === hotel.propertyToken || selected.providerListingId === hotel.id || selected.name === hotel.name);
  if (!match) return args.plan;
  const currentPrice = match.pricePerNight ?? (match.totalPrice !== null ? Math.round(match.totalPrice / Math.max(1, args.plan.request.tripLengthDays - 1)) : null);
  if (currentPrice === null) return args.plan;
  return {
    ...args.plan,
    selectedHotel: {
      ...selected,
      currentPrice,
      currentTotalPrice: match.totalPrice ?? selected.currentTotalPrice,
      imageUrl: selected.imageUrl ?? match.imageUrl ?? undefined,
      lastPriceCheckedAt: args.fetchedAt,
      searchContext: selected.searchContext ?? selectionSearchContext(args.plan, args.searchKey)
    }
  };
}

function selectionSearchContext(plan: TripPlan, searchKey?: string) {
  const dates = providerTravelDates(plan);
  return {
    origin: plan.request.origin,
    destination: destinationLabel(plan),
    travelMonth: travelMonthFromRequest(plan.request),
    departureDate: dates?.departureDate,
    returnDate: dates?.returnDate,
    tripLengthDays: plan.request.tripLengthDays,
    travelers: plan.request.travelers,
    budget: plan.request.totalBudget,
    currency: plan.request.currency,
    searchKey,
    selectedAt: new Date().toISOString()
  };
}

function flightProviderRequest(plan: TripPlan): ProviderRouteRequest | null {
  const dates = providerTravelDates(plan);
  if (!dates) return null;
  const origin = airportIdFor(plan.request.origin);
  const destination = airportIdFor(plan.destination.name);
  const travelMonth = travelMonthFromRequest(plan.request);
  const params = new URLSearchParams({
    origin,
    destination,
    departureDate: dates.departureDate,
    returnDate: dates.returnDate,
    adults: String(Math.max(1, plan.request.travelers)),
    currency: plan.request.currency ?? "CAD",
    tripLengthDays: String(Math.max(1, plan.request.tripLengthDays)),
    budget: String(Math.max(0, plan.request.totalBudget))
  });
  if (travelMonth) params.set("travelMonth", travelMonth);
  const searchKey = flightSearchKey({
    origin,
    destination,
    travelMonth,
    departureDate: dates.departureDate,
    returnDate: dates.returnDate,
    tripLengthDays: Math.max(1, plan.request.tripLengthDays),
    travelers: Math.max(1, plan.request.travelers),
    budget: Math.max(0, plan.request.totalBudget),
    currency: plan.request.currency ?? "CAD",
    cabinClass: null
  });
  const fallbackLinks = fallbackFlightLinksForPlan(plan);
  return { url: `/api/travel/flights?${params}`, fallbackLinks, searchKey };
}

function hotelProviderRequest(plan: TripPlan): ProviderRouteRequest | null {
  const dates = providerTravelDates(plan);
  if (!dates) return null;
  const rooms = Math.max(1, Math.ceil(plan.request.travelers / 2));
  const travelMonth = travelMonthFromRequest(plan.request);
  const params = new URLSearchParams({
    destination: destinationLabel(plan),
    checkInDate: dates.departureDate,
    checkOutDate: dates.returnDate,
    adults: String(Math.max(1, plan.request.travelers)),
    rooms: String(rooms),
    currency: plan.request.currency ?? "CAD",
    tripLengthDays: String(Math.max(1, plan.request.tripLengthDays)),
    budget: String(Math.max(0, plan.request.totalBudget))
  });
  if (travelMonth) params.set("travelMonth", travelMonth);
  const searchKey = hotelSearchKey({
    destination: destinationLabel(plan),
    travelMonth,
    checkInDate: dates.departureDate,
    checkOutDate: dates.returnDate,
    tripLengthDays: Math.max(1, plan.request.tripLengthDays),
    guests: Math.max(1, plan.request.travelers),
    rooms,
    budget: Math.max(0, plan.request.totalBudget),
    currency: plan.request.currency ?? "CAD"
  });
  const fallbackLinks = fallbackHotelLinksForPlan(plan);
  return { url: `/api/travel/hotels?${params}`, fallbackLinks, searchKey };
}

function fallbackFlightLinksForPlan(plan: TripPlan): ProviderSearchLink[] {
  const dates = providerTravelDates(plan);
  return flightFallbackLinks({
    origin: airportIdFor(plan.request.origin),
    destination: airportIdFor(plan.destination.name),
    departureDate: dates?.departureDate ?? plan.request.startDate,
    returnDate: dates?.returnDate ?? plan.request.endDate,
    adults: plan.request.travelers,
    currency: plan.request.currency
  });
}

function fallbackHotelLinksForPlan(plan: TripPlan): ProviderSearchLink[] {
  const dates = providerTravelDates(plan);
  return hotelFallbackLinks({
    destination: destinationLabel(plan),
    checkInDate: dates?.departureDate ?? plan.request.startDate,
    checkOutDate: dates?.returnDate ?? plan.request.endDate,
    adults: plan.request.travelers,
    currency: plan.request.currency
  });
}

function providerTravelDates(plan: TripPlan) {
  if (isDateOnly(plan.request.startDate)) {
    return {
      departureDate: plan.request.startDate,
      returnDate: isDateOnly(plan.request.endDate) ? plan.request.endDate : addDays(plan.request.startDate, Math.max(1, plan.request.tripLengthDays - 1))
    };
  }

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(plan.request.startDate ?? "");
  if (monthMatch) {
    const [, year, month] = monthMatch;
    const departureDate = `${year}-${month}-15`;
    return {
      departureDate,
      returnDate: addDays(departureDate, Math.max(1, plan.request.tripLengthDays - 1))
    };
  }

  return null;
}

function destinationLabel(plan: TripPlan) {
  return plan.destination.country && plan.destination.country !== "Global destination" ? `${plan.destination.name}, ${plan.destination.country}` : plan.destination.name;
}

function airportIdFor(value: string) {
  const codeMatch = /\b[A-Z]{3}\b/.exec(value);
  if (codeMatch) return codeMatch[0];
  const normalized = value.trim().toLowerCase();
  const airportCodes: Record<string, string> = {
    toronto: "YYZ",
    lisbon: "LIS",
    "mexico city": "MEX",
    kyoto: "KIX",
    tokyo: "TYO",
    vancouver: "YVR",
    "san diego": "SAN",
    marrakesh: "RAK",
    barcelona: "BCN",
    seoul: "SEL",
    singapore: "SIN",
    "hong kong": "HKG",
    london: "LON",
    paris: "PAR",
    rome: "ROM",
    istanbul: "IST",
    bangkok: "BKK",
    "new orleans": "MSY",
    "new york": "NYC",
    "los angeles": "LAX",
    miami: "MIA",
    porto: "OPO",
    prague: "PRG",
    reykjavik: "KEF",
    "cape town": "CPT",
    "buenos aires": "BUE",
    queenstown: "ZQN",
    amsterdam: "AMS",
    dubai: "DXB",
    sydney: "SYD",
    athens: "ATH",
    "rio de janeiro": "RIO",
    cartagena: "CTG"
  };
  return airportCodes[normalized] ?? airportCodes[normalized.split(",")[0]?.trim()] ?? value.trim();
}

function isDateOnly(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function flightPriceDetail(option: FlightSearchOption, currency?: CurrencyCode) {
  return option.price !== null ? `${option.airline} ${formatMoney(option.price, currency)}` : `${option.airline} view details`;
}

function hotelPriceDetail(option: HotelSearchOption, currency?: CurrencyCode) {
  return option.nightlyPrice !== null ? `${formatMoney(option.nightlyPrice, currency)}/night` : "Check latest price";
}

function updatedAgo(value: string) {
  const fetched = Date.parse(value);
  if (!Number.isFinite(fetched)) return "Updated recently";
  const minutes = Math.max(0, Math.floor((Date.now() - fetched) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes === 1) return "Updated 1 min ago";
  return `Updated ${minutes} min ago`;
}

function newestFetchedAt(values: string[]) {
  const newest = values
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((a, b) => b.time - a.time)[0];
  return newest?.value;
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
