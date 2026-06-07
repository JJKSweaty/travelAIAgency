"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, ChefHat, Compass, DollarSign, Gauge, Hotel, MapPin, MapPinned, Plane, Route, Search, Users, WalletCards } from "lucide-react";
import { readCurrencyPreference } from "@/components/CurrencySelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { writeCurrentTrip } from "@/lib/travel/storage";
import { formatMoney } from "@/lib/travel/currency";
import { rememberRecentLocation } from "@/lib/travel/locationSearch";
import { hasTravelMonth, travelMonthFromRequest, travelMonthRequiredMessage } from "@/lib/travel/travelDates";
import type { CityTravelPreference, CurrencyCode, Interest, LocationOption, LocationSuggestionMode, TransportPreference, TravelDateMode, TravelStyle, TripPlan, TripRequest } from "@/lib/travel/types";

const interestOptions: { id: Interest; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "nightlife", label: "Nightlife" },
  { id: "nature", label: "Nature" },
  { id: "museums", label: "Museums" },
  { id: "beaches", label: "Beaches" },
  { id: "family", label: "Family" },
  { id: "luxury", label: "Luxury" },
  { id: "budget", label: "Budget" },
  { id: "adventure", label: "Adventure" }
];

const initialRequest: TripRequest = {
  origin: "Toronto",
  preferredDestinationEnabled: false,
  destination: "",
  dateMode: "month",
  startDate: "",
  endDate: "",
  tripLengthDays: 5,
  totalBudget: 2400,
  currency: "CAD",
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food", "nature"],
  transportPreference: "flexible",
  cityTravelPreference: "mixed"
};

const trackerSplits = {
  relaxed: { lodging: 0.4, transport: 0.16, food: 0.2, activities: 0.12 },
  balanced: { lodging: 0.36, transport: 0.17, food: 0.21, activities: 0.15 },
  packed: { lodging: 0.32, transport: 0.17, food: 0.2, activities: 0.22 }
} as const;

export function TripPlannerWizard() {
  const router = useRouter();
  const [request, setRequest] = useState<TripRequest>(() => ({ ...initialRequest, currency: readCurrencyPreference() ?? initialRequest.currency }));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<LocationOption[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<LocationOption[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [originSuggestionQuery, setOriginSuggestionQuery] = useState("");
  const [destinationSuggestionQuery, setDestinationSuggestionQuery] = useState("");

  const currency = request.currency ?? "USD";
  const budgetTracker = useMemo(() => deriveBudgetTracker(request), [request]);

  useLocationSuggestions(originSuggestionQuery, showOriginSuggestions, "origin", setOriginSuggestions);
  useLocationSuggestions(destinationSuggestionQuery, request.preferredDestinationEnabled && showDestinationSuggestions, "destination", setDestinationSuggestions);

  useEffect(() => {
    function handleCurrency(event: Event) {
      const next = (event as CustomEvent<CurrencyCode>).detail;
      setRequest((current) => ({ ...current, currency: next }));
    }

    window.addEventListener("roamly:currency-change", handleCurrency);
    return () => window.removeEventListener("roamly:currency-change", handleCurrency);
  }, []);

  function toggleInterest(interest: Interest) {
    setRequest((current) => {
      const exists = current.interests.includes(interest);
      const interests = exists ? current.interests.filter((item) => item !== interest) : [...current.interests, interest];
      return { ...current, interests: interests.length ? interests : current.interests };
    });
  }

  async function submit() {
    if (!hasTravelMonth(request)) {
      setError(travelMonthRequiredMessage);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Trip details need a quick adjustment before planning.");
      }
      const plan = (await response.json()) as TripPlan;
      writeCurrentTrip(plan);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a trip plan.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:px-8">
      <Card className="overflow-hidden">
        <div className="relative min-h-[280px] bg-ink p-6 text-paper sm:p-8">
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80)",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
          <div className="relative max-w-2xl">
            <Badge variant="coral" className="bg-coral text-white">Trip planner</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">Shape a trip around your budget.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-paper/78">
              Choose a destination or let Roamly find a strong fit, then compare stays, flights, food, activities, and daily routes in one plan.
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8">
          <StepSection step="Step 1" title="Route" icon={<Compass size={17} />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Origin" icon={<Plane size={17} />}>
                <div className="relative">
                  <Input
                    value={request.origin}
                    role="combobox"
                    aria-expanded={showOriginSuggestions}
                    aria-controls="origin-suggestions"
                    aria-autocomplete="list"
                    onFocus={() => setShowOriginSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowOriginSuggestions(false), 120)}
                    onChange={(event) => {
                      setRequest({ ...request, origin: event.target.value });
                      setOriginSuggestionQuery(event.target.value);
                      setShowOriginSuggestions(true);
                    }}
                  />
                  <LocationSuggestionList
                    id="origin-suggestions"
                    visible={showOriginSuggestions}
                    locations={originSuggestions}
                    selectedValue={request.origin}
                    onSelect={(location) => {
                      rememberRecentLocation(location);
                      setRequest({ ...request, origin: location.label });
                      setShowOriginSuggestions(false);
                    }}
                  />
                </div>
              </Field>
              <Field label="Destination mode" icon={<MapPin size={17} />}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between bg-white"
                  onClick={() => {
                    const preferredDestinationEnabled = !request.preferredDestinationEnabled;
                    setRequest({ ...request, preferredDestinationEnabled });
                    if (!preferredDestinationEnabled) setDestinationSuggestions([]);
                  }}
                >
                  {request.preferredDestinationEnabled ? "Use my destination" : "Recommend destination"}
                  <MapPinned size={16} className="text-reef" aria-hidden />
                </Button>
              </Field>
            </div>

            {request.preferredDestinationEnabled ? (
              <Field label="Preferred destination" icon={<Compass size={17} />}>
                <div className="relative">
                  <Input
                    placeholder="Lisbon, Nairobi, Sapporo..."
                    value={request.destination}
                    role="combobox"
                    aria-expanded={showDestinationSuggestions}
                    aria-controls="destination-suggestions"
                    aria-autocomplete="list"
                    onFocus={() => setShowDestinationSuggestions(true)}
                    onBlur={() => window.setTimeout(() => setShowDestinationSuggestions(false), 120)}
                    onChange={(event) => {
                      setRequest({ ...request, destination: event.target.value });
                      setDestinationSuggestionQuery(event.target.value);
                      setShowDestinationSuggestions(true);
                    }}
                  />
                  <LocationSuggestionList
                    id="destination-suggestions"
                    visible={showDestinationSuggestions}
                    locations={destinationSuggestions}
                    selectedValue={request.destination ?? ""}
                    onSelect={(location) => {
                      rememberRecentLocation(location);
                      setRequest({ ...request, destination: location.label });
                      setShowDestinationSuggestions(false);
                    }}
                  />
                </div>
              </Field>
            ) : null}
          </StepSection>

          <StepSection step="Step 2" title="Dates and travelers" icon={<CalendarDays size={17} />}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date mode" icon={<CalendarDays size={17} />}>
              <div className="grid grid-cols-2 rounded-lg border border-ink/10 bg-white p-1">
                {(["month", "exact"] as TravelDateMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${request.dateMode === mode ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5"}`}
                    onClick={() => setRequest({ ...request, dateMode: mode, startDate: "", endDate: "" })}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </Field>
            {request.dateMode === "exact" ? (
              <>
                <Field label="Depart" icon={<CalendarDays size={17} />}>
                  <Input type="date" value={request.startDate ?? ""} onChange={(event) => setRequest(syncExactStartDate(request, event.target.value))} />
                </Field>
                <Field label="Return" icon={<CalendarDays size={17} />}>
                  <Input type="date" value={request.endDate ?? ""} onChange={(event) => setRequest(syncExactEndDate(request, event.target.value))} />
                </Field>
              </>
            ) : (
              <Field label="Travel month" icon={<CalendarDays size={17} />}>
                <Input type="month" value={request.startDate ?? ""} onChange={(event) => setRequest({ ...request, dateMode: "month", startDate: event.target.value, endDate: "" })} />
              </Field>
            )}
            <Field label="Trip length" icon={<CalendarDays size={17} />}>
              <Input type="number" min={1} max={21} value={request.tripLengthDays} onChange={(event) => setRequest(syncTripLength(request, Number(event.target.value)))} />
            </Field>
            <Field label="Travelers" icon={<Users size={17} />}>
              <Input type="number" min={1} max={12} value={request.travelers} onChange={(event) => setRequest({ ...request, travelers: Number(event.target.value) })} />
            </Field>
            </div>
          </StepSection>

          <StepSection step="Step 3" title="Budget and pace" icon={<WalletCards size={17} />}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Total budget" icon={<DollarSign size={17} />}>
                <Input type="number" min={250} step={50} value={request.totalBudget} onChange={(event) => setRequest({ ...request, totalBudget: Number(event.target.value) })} />
              </Field>
              <Field label="Travel style" icon={<Gauge size={17} />}>
                <Select value={request.travelStyle} onValueChange={(value) => setRequest({ ...request, travelStyle: value as TravelStyle })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relaxed">Relaxed</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Transport" icon={<Car size={17} />}>
                <Select value={request.transportPreference} onValueChange={(value) => setRequest({ ...request, transportPreference: value as TransportPreference })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible</SelectItem>
                    <SelectItem value="rental-car">Rental car</SelectItem>
                    <SelectItem value="public-transit">Transit/rideshare</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="In-city travel" icon={<Route size={17} />}>
                <Select value={request.cityTravelPreference ?? "mixed"} onValueChange={(value) => setRequest({ ...request, cityTravelPreference: value as CityTravelPreference })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="walkable">Walkable</SelectItem>
                    <SelectItem value="public-transit">Public transit</SelectItem>
                    <SelectItem value="rideshare">Rideshare</SelectItem>
                    <SelectItem value="rental-car">Rental car</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </StepSection>

          <StepSection step="Step 4" title="Trip focus" icon={<ChefHat size={17} />}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink/70">
              <ChefHat size={17} aria-hidden />
              Interests
            </div>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
                  type="button"
                  key={interest.id}
                  className={`focus-ring rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    request.interests.includes(interest.id) ? "border-reef bg-reef text-white" : "border-ink/10 bg-white text-ink/70 hover:border-reef/40"
                  }`}
                  onClick={() => toggleInterest(interest.id)}
                >
                  {interest.label}
                </button>
              ))}
            </div>
          </StepSection>

          {error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</p> : null}

          <Button className="h-12 text-base" onClick={submit} disabled={isLoading}>
            {isLoading ? "Building plan..." : "Build trip plan"}
          </Button>
        </div>
      </Card>

      <aside className="grid content-start gap-4">
        <LiveBudgetTracker tracker={budgetTracker} currency={currency} />
        <LiveSearchReadiness request={request} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Planning output</CardTitle>
            <CardDescription>Each generated plan includes the core details needed to compare and adjust the trip.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-ink/70">
            <span className="rounded-lg bg-ink/5 px-3 py-2">Hotel and flight comparison pages</span>
            <span className="rounded-lg bg-ink/5 px-3 py-2">Destination transport options</span>
            <span className="rounded-lg bg-ink/5 px-3 py-2">Restaurants and popular places</span>
            <span className="rounded-lg bg-ink/5 px-3 py-2">Day-by-day itinerary with costs</span>
            <span className="rounded-lg bg-ink/5 px-3 py-2">Lower-cost alternates when the budget is tight</span>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}

function useLocationSuggestions(
  query: string,
  enabled: boolean,
  mode: LocationSuggestionMode,
  setSuggestions: (locations: LocationOption[]) => void
) {
  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const cacheKey = locationSuggestionCacheKey(mode, trimmed);
    const cached = readLocationSuggestionCache(cacheKey);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    const controller = new AbortController();
    const task = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/location-suggestions?q=${encodeURIComponent(trimmed)}&mode=${mode}`, {
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { locations?: LocationOption[] };
        const locations = payload.locations ?? [];
        writeLocationSuggestionCache(cacheKey, locations);
        setSuggestions(locations);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      }
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(task);
    };
  }, [enabled, mode, query, setSuggestions]);
}

function locationSuggestionCacheKey(mode: LocationSuggestionMode, query: string) {
  return `roamly.locationSuggestions.${mode}.${query.trim().toLowerCase()}`;
}

function readLocationSuggestionCache(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocationOption[]) : null;
  } catch {
    return null;
  }
}

function writeLocationSuggestionCache(key: string, locations: LocationOption[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(locations));
}

function locationSourceLabel(location: LocationOption) {
  if (location.source === "custom") return "Typed";
  if (location.airportCode) return location.airportCode;
  return "City match";
}

function LocationSuggestionList({
  id,
  visible,
  locations,
  selectedValue,
  onSelect
}: {
  id: string;
  visible: boolean;
  locations: LocationOption[];
  selectedValue: string;
  onSelect: (location: LocationOption) => void;
}) {
  if (!visible || !locations.length) return null;

  return (
    <div id={id} role="listbox" className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-ink/10 bg-white p-2 shadow-soft">
      {locations.map((location) => (
        <button
          key={location.id}
          type="button"
          role="option"
          aria-selected={selectedValue === location.label}
          className="focus-ring grid w-full gap-2 rounded-lg px-3 py-3 text-left transition hover:bg-reef/10"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(location)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="font-semibold">{location.label}</span>
            <span className="shrink-0 text-xs font-medium text-ink/52">{locationSourceLabel(location)}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-ink/58">
            {location.costLevel ? <span className="rounded bg-ink/5 px-2 py-1">Cost {location.costLevel}/5</span> : null}
            {location.detail ? <span className="rounded bg-ink/5 px-2 py-1">{location.detail}</span> : null}
            {location.bestFor?.slice(0, 3).map((interest) => (
              <span key={interest} className="rounded bg-coral/10 px-2 py-1 text-coral">
                {interest}
              </span>
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

function syncExactStartDate(request: TripRequest, startDate: string): TripRequest {
  if (!startDate) return { ...request, dateMode: "exact", startDate, endDate: "" };
  const endDate = request.endDate && daysBetween(startDate, request.endDate) > 0 ? request.endDate : addDays(startDate, request.tripLengthDays - 1);
  return { ...request, dateMode: "exact", startDate, endDate };
}

function syncExactEndDate(request: TripRequest, endDate: string): TripRequest {
  if (!request.startDate || !endDate) return { ...request, dateMode: "exact", endDate };
  const days = daysBetween(request.startDate, endDate);
  return { ...request, dateMode: "exact", endDate, tripLengthDays: days > 0 ? Math.min(21, Math.max(1, days + 1)) : request.tripLengthDays };
}

function syncTripLength(request: TripRequest, tripLengthDays: number): TripRequest {
  const nextLength = Math.min(21, Math.max(1, tripLengthDays));
  if (request.dateMode !== "exact" || !request.startDate) return { ...request, tripLengthDays: nextLength };
  return { ...request, tripLengthDays: nextLength, endDate: addDays(request.startDate, nextLength - 1) };
}

function addDays(dateValue: string, days: number) {
  const date = parseDateOnly(dateValue);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold leading-none text-ink/72">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function StepSection({ step, title, icon, children }: { step: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-reef/10 text-reef">{icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/42">{step}</p>
            <h2 className="font-semibold text-ink">{title}</h2>
          </div>
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

type BudgetTracker = ReturnType<typeof deriveBudgetTracker>;

function LiveBudgetTracker({ tracker, currency }: { tracker: BudgetTracker; currency: CurrencyCode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-subtle">
      <div className="bg-ink p-5 text-paper">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/60">Budget tracker</p>
            <p className="mt-3 text-4xl font-semibold">{formatMoney(tracker.dailySpendTarget, currency)}</p>
            <p className="mt-1 text-sm text-paper/62">daily spend target</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tracker.toneClass}`}>{tracker.tone}</span>
        </div>
        <div className="mt-5 h-2 rounded-full bg-white/15">
          <div className={`h-2 rounded-full ${tracker.barClass}`} style={{ width: `${tracker.percent}%` }} />
        </div>
        <p className="mt-4 text-sm font-medium text-paper/76">{tracker.action}</p>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <BudgetMetric icon={<WalletCards size={15} />} label="Trip total" value={formatMoney(tracker.total, currency)} />
          <BudgetMetric icon={<Users size={15} />} label="Traveler/day" value={formatMoney(tracker.perTravelerDay, currency)} />
        </div>
        <div className="grid gap-2">
          {tracker.rows.map((row) => (
            <BudgetSplitRow key={row.label} label={row.label} value={formatMoney(row.value, currency)} percent={row.percent} tone={row.tone} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveSearchReadiness({ request }: { request: TripRequest }) {
  const travelMonth = travelMonthFromRequest(request);
  const exactDates = request.dateMode === "exact" && Boolean(request.startDate && request.endDate);
  const destinationReady = !request.preferredDestinationEnabled || Boolean(request.destination?.trim());
  const ready = Boolean(travelMonth && destinationReady);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Flight and stay search</CardTitle>
            <CardDescription>{ready ? "Current price checks can run from the comparison pages." : "Choose a travel month before building a plan."}</CardDescription>
          </div>
          <Badge variant={ready ? "default" : "secondary"}>{ready ? "Ready" : "Planning"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <ReadinessRow icon={<CalendarDays size={15} />} label="Dates" value={exactDates ? `${request.startDate} to ${request.endDate}` : travelMonth ?? "Choose month"} ready={Boolean(travelMonth)} />
        <ReadinessRow icon={<Plane size={15} />} label="Flights" value={travelMonth ? "Fare check ready" : "Choose month"} ready={Boolean(travelMonth)} />
        <ReadinessRow icon={<Hotel size={15} />} label="Hotels" value={travelMonth ? "Rate check ready" : "Choose month"} ready={Boolean(travelMonth)} />
        <ReadinessRow icon={<Search size={15} />} label="Destination" value={destinationReady ? "Ready" : "Choose a destination"} ready={destinationReady} />
      </CardContent>
    </Card>
  );
}

function ReadinessRow({ icon, label, value, ready }: { icon: React.ReactNode; label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-ink/5 px-3 py-2">
      <span className="flex items-center gap-2 text-ink/62">
        <span className={ready ? "text-reef" : "text-ink/38"}>{icon}</span>
        {label}
      </span>
      <span className="text-right font-semibold text-ink/78">{value}</span>
    </div>
  );
}

function BudgetMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-paper/70 p-3">
      <span className="flex items-center gap-2 text-xs font-medium text-ink/52">
        {icon}
        {label}
      </span>
      <span className="mt-2 block text-lg font-semibold text-ink">{value}</span>
    </div>
  );
}

function BudgetSplitRow({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: "reef" | "gold" | "coral" }) {
  return (
    <div className="rounded-lg bg-ink/5 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink/62">{label}</span>
        <span className="font-semibold text-ink/82">{value}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-ink/10">
        <div className={`h-1.5 rounded-full ${tone === "reef" ? "bg-reef" : tone === "gold" ? "bg-gold" : "bg-coral"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function deriveBudgetTracker(request: TripRequest) {
  const split = trackerSplits[request.travelStyle];
  const total = Math.max(0, request.totalBudget);
  const travelers = Math.max(1, request.travelers);
  const days = Math.max(1, request.tripLengthDays);
  const nights = Math.max(1, days - 1);
  const travelerDays = travelers * days;
  const transportBoost = request.transportPreference === "rental-car" ? 0.04 : request.transportPreference === "public-transit" ? -0.02 : 0;
  const transportShare = Math.max(0.12, split.transport + transportBoost);
  const lodging = Math.round(total * split.lodging);
  const transport = Math.round(total * transportShare);
  const food = Math.round(total * split.food);
  const activities = Math.round(total * split.activities);
  const buffer = Math.max(0, total - lodging - transport - food - activities);
  const perTravelerDay = Math.round(total / travelerDays);
  const dailySpendTarget = Math.round((food + activities) / travelerDays);
  const roomTarget = Math.round(lodging / nights);
  const transportTarget = Math.round(transport / travelers);
  const score = perTravelerDay < 90 ? 32 : perTravelerDay < 180 ? 66 : 92;
  const tone = perTravelerDay < 90 ? "Tight" : perTravelerDay < 180 ? "Balanced" : "Flexible";

  return {
    total,
    tone,
    percent: score,
    perTravelerDay,
    dailySpendTarget,
    toneClass: tone === "Tight" ? "bg-coral/20 text-coral" : tone === "Balanced" ? "bg-gold/25 text-paper" : "bg-reef/20 text-reef",
    barClass: tone === "Tight" ? "bg-coral" : tone === "Balanced" ? "bg-gold" : "bg-reef",
    action: tone === "Tight" ? "Shorten, choose transit, or raise budget." : tone === "Balanced" ? "Book flights/stays before upgrades." : "Room for selective upgrades.",
    rows: [
      { label: "Room target", value: roomTarget, percent: percentOf(lodging, total), tone: "reef" as const },
      { label: "Flight + ground", value: transportTarget, percent: percentOf(transport, total), tone: request.transportPreference === "rental-car" ? ("gold" as const) : ("reef" as const) },
      { label: "Food / day", value: Math.round(food / travelerDays), percent: percentOf(food, total), tone: "reef" as const },
      { label: "Activities / day", value: Math.round(activities / travelerDays), percent: percentOf(activities, total), tone: "gold" as const },
      { label: "Buffer", value: buffer, percent: percentOf(buffer, total), tone: buffer < total * 0.08 ? ("coral" as const) : ("reef" as const) }
    ]
  };
}

function percentOf(value: number, total: number) {
  return Math.min(100, Math.max(5, Math.round((value / Math.max(1, total)) * 100)));
}
