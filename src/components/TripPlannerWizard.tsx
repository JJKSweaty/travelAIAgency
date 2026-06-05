"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Car, ChefHat, Compass, DollarSign, MapPin, Plane, Route, Sparkles, Users } from "lucide-react";
import { writeCurrentTrip } from "@/lib/travel/storage";
import { currencyOptions, formatMoney } from "@/lib/travel/currency";
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

export function TripPlannerWizard() {
  const router = useRouter();
  const [request, setRequest] = useState<TripRequest>(initialRequest);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<LocationOption[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<LocationOption[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

  const currency = request.currency ?? "USD";
  const perPersonDay = useMemo(() => Math.round(request.totalBudget / Math.max(1, request.travelers * request.tripLengthDays)), [request]);
  const budgetTone = perPersonDay < 90 ? "Tight" : perPersonDay < 180 ? "Workable" : "Comfortable";

  useLocationSuggestions(request.origin, true, "origin", setOriginSuggestions);
  useLocationSuggestions(request.destination ?? "", request.preferredDestinationEnabled, "destination", setDestinationSuggestions);

  function toggleInterest(interest: Interest) {
    setRequest((current) => {
      const exists = current.interests.includes(interest);
      const interests = exists ? current.interests.filter((item) => item !== interest) : [...current.interests, interest];
      return { ...current, interests: interests.length ? interests : current.interests };
    });
  }

  async function submit() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      if (!response.ok) throw new Error("Trip details need a quick adjustment before planning.");
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
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
      <div className="glass-panel overflow-hidden rounded-lg">
        <div className="relative min-h-[260px] bg-ink p-6 text-paper sm:p-8">
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-coral">Roamly planner</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">Shape a trip around your budget.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-paper/78">
              Choose a destination or let Roamly find a strong fit, then balance stays, transport, food, activities, and daily routes.
            </p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px]">
            <Field label="Origin" icon={<Plane size={17} />}>
              <div className="relative">
                <input
                  className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3"
                  value={request.origin}
                  role="combobox"
                  aria-expanded={showOriginSuggestions}
                  aria-controls="origin-suggestions"
                  aria-autocomplete="list"
                  onFocus={() => setShowOriginSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowOriginSuggestions(false), 120)}
                  onChange={(event) => {
                    setRequest({ ...request, origin: event.target.value });
                    setShowOriginSuggestions(true);
                  }}
                />
                <LocationSuggestionList
                  id="origin-suggestions"
                  visible={showOriginSuggestions}
                  locations={originSuggestions}
                  selectedValue={request.origin}
                  onSelect={(location) => {
                    setRequest({ ...request, origin: location.label });
                    setShowOriginSuggestions(false);
                  }}
                />
              </div>
            </Field>
            <Field label="Destination mode" icon={<MapPin size={17} />}>
              <button
                className="focus-ring flex w-full items-center justify-between rounded-lg border border-ink/10 bg-white px-3 py-3 text-left"
                onClick={() => {
                  const preferredDestinationEnabled = !request.preferredDestinationEnabled;
                  setRequest({ ...request, preferredDestinationEnabled });
                  if (!preferredDestinationEnabled) setDestinationSuggestions([]);
                }}
              >
                {request.preferredDestinationEnabled ? "Use my destination" : "Find trending/hot"}
                <Sparkles size={16} className="text-coral" aria-hidden />
              </button>
            </Field>
            <Field label="Currency" icon={<DollarSign size={17} />}>
              <select className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" value={currency} onChange={(event) => setRequest({ ...request, currency: event.target.value as CurrencyCode })}>
                {currencyOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {request.preferredDestinationEnabled ? (
            <Field label="Preferred destination" icon={<Compass size={17} />}>
              <div className="relative">
                <input
                  className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3"
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
                    setShowDestinationSuggestions(true);
                  }}
                />
                <LocationSuggestionList
                  id="destination-suggestions"
                  visible={showDestinationSuggestions}
                  locations={destinationSuggestions}
                  selectedValue={request.destination ?? ""}
                  onSelect={(location) => {
                    setRequest({ ...request, destination: location.label });
                    setShowDestinationSuggestions(false);
                  }}
                />
              </div>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date mode" icon={<CalendarDays size={17} />}>
              <div className="grid grid-cols-2 rounded-lg border border-ink/10 bg-white p-1">
                {(["month", "exact"] as TravelDateMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`focus-ring rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${request.dateMode === mode ? "bg-ink text-paper" : "text-ink/68 hover:bg-ink/6"}`}
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
                  <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="date" value={request.startDate ?? ""} onChange={(event) => setRequest(syncExactStartDate(request, event.target.value))} />
                </Field>
                <Field label="Return" icon={<CalendarDays size={17} />}>
                  <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="date" value={request.endDate ?? ""} onChange={(event) => setRequest(syncExactEndDate(request, event.target.value))} />
                </Field>
              </>
            ) : (
              <Field label="Travel month" icon={<CalendarDays size={17} />}>
                <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="month" value={request.startDate ?? ""} onChange={(event) => setRequest({ ...request, dateMode: "month", startDate: event.target.value, endDate: "" })} />
              </Field>
            )}
            <Field label="Trip length" icon={<CalendarDays size={17} />}>
              <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="number" min={1} max={21} value={request.tripLengthDays} onChange={(event) => setRequest(syncTripLength(request, Number(event.target.value)))} />
            </Field>
            <Field label="Travelers" icon={<Users size={17} />}>
              <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="number" min={1} max={12} value={request.travelers} onChange={(event) => setRequest({ ...request, travelers: Number(event.target.value) })} />
            </Field>
            <Field label="Total budget" icon={<DollarSign size={17} />}>
              <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="number" min={250} step={50} value={request.totalBudget} onChange={(event) => setRequest({ ...request, totalBudget: Number(event.target.value) })} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Travel style" icon={<Sparkles size={17} />}>
              <select className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" value={request.travelStyle} onChange={(event) => setRequest({ ...request, travelStyle: event.target.value as TravelStyle })}>
                <option value="relaxed">Relaxed</option>
                <option value="balanced">Balanced</option>
                <option value="packed">Packed</option>
              </select>
            </Field>
            <Field label="Transport" icon={<Car size={17} />}>
              <select className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" value={request.transportPreference} onChange={(event) => setRequest({ ...request, transportPreference: event.target.value as TransportPreference })}>
                <option value="flexible">Flexible</option>
                <option value="rental-car">Rental car</option>
                <option value="public-transit">Transit/rideshare</option>
              </select>
            </Field>
            <Field label="In-city travel" icon={<Route size={17} />}>
              <select className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" value={request.cityTravelPreference ?? "mixed"} onChange={(event) => setRequest({ ...request, cityTravelPreference: event.target.value as CityTravelPreference })}>
                <option value="mixed">Mixed</option>
                <option value="walkable">Walkable</option>
                <option value="public-transit">Public transit</option>
                <option value="rideshare">Rideshare</option>
                <option value="rental-car">Rental car</option>
              </select>
            </Field>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink/70">
              <ChefHat size={17} aria-hidden />
              Interests
            </div>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
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
          </div>

          {error ? <p className="rounded-lg bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</p> : null}

          <button className="focus-ring rounded-lg bg-ink px-5 py-4 font-semibold text-paper transition hover:bg-reef disabled:cursor-not-allowed disabled:opacity-60" onClick={submit} disabled={isLoading}>
            {isLoading ? "Planning trip..." : "Generate trip plan"}
          </button>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className="glass-panel rounded-lg p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Live budget read</p>
          <p className="mt-3 text-4xl font-semibold">{formatMoney(perPersonDay, currency)}</p>
          <p className="mt-1 text-sm text-ink/60">per traveler per day</p>
          <div className="mt-4 h-3 rounded-full bg-ink/10">
            <div className="h-3 rounded-full bg-coral" style={{ width: `${Math.min(100, Math.max(18, perPersonDay / 3))}%` }} />
          </div>
          <p className="mt-4 text-sm font-medium">{budgetTone} starting point</p>
        </div>
        <div className="rounded-lg bg-white/70 p-5 shadow-soft">
          <p className="text-sm font-semibold text-ink">What Roamly returns</p>
          <div className="mt-4 grid gap-3 text-sm text-ink/70">
            <span>Hotel short list with booking links</span>
            <span>Car or transit estimate</span>
            <span>Restaurants and popular places</span>
            <span>Day-by-day itinerary with costs</span>
            <span>Two alternates when budget allows</span>
          </div>
        </div>
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
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const task = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/location-suggestions?q=${encodeURIComponent(query)}&mode=${mode}`, {
          signal: controller.signal
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { locations?: LocationOption[] };
        setSuggestions(payload.locations ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSuggestions([]);
      }
    }, 140);

    return () => {
      controller.abort();
      window.clearTimeout(task);
    };
  }, [enabled, mode, query, setSuggestions]);
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
            <span className="shrink-0 text-xs font-medium capitalize text-ink/52">{location.source}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-ink/58">
            {location.costLevel ? <span className="rounded bg-ink/6 px-2 py-1">Cost {location.costLevel}/5</span> : null}
            {location.detail ? <span className="rounded bg-ink/6 px-2 py-1">{location.detail}</span> : null}
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
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/70">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
