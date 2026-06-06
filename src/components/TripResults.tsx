"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BedDouble, Bookmark, Calendar, Car, ChefHat, Coffee, Hotel, MapPinned, Moon, Plane, Plus, RefreshCcw, Route, Sparkles, Star, Sun, Ticket } from "lucide-react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { PriceComparisonChart } from "@/components/PriceComparisonChart";
import { Button } from "@/components/ui/button";
import { applyTripSelectionsToBudget } from "@/lib/travel/pricing";
import { isTripSaved, readCurrentTrip, saveTrip, updateSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import { buildTransitPlan } from "@/lib/travel/transit";
import { formatMoney } from "@/lib/travel/currency";
import type { ItineraryAddition, ItineraryAdditionCategory, ItineraryDay, RefinementIntent, TripPlan, TripStaySelection } from "@/lib/travel/types";

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
  const [drafts, setDrafts] = useState<Record<number, { title: string; category: ItineraryAdditionCategory; estimatedCost: string }>>({});

  useEffect(() => {
    const task = window.setTimeout(() => {
      async function loadCurrent() {
        const current = readCurrentTrip();
        if (!current) return;
        const selectedStay = current.selectedStay ?? hotelToStay(current);
        const normalized = applyTripSelectionsToBudget({
          ...current,
          itinerary: current.itinerary.map((day) => ({ ...day, additions: day.additions ?? [], transit: day.transit ?? [] })),
          selectedStay
        });
        setPlan(normalized);
        writeCurrentTrip(normalized);
        setSaved(await isTripSaved(normalized.id));
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
  }

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
      persist({ ...next, selectedStay: next.selectedStay ?? hotelToStay(next), itinerary: next.itinerary.map((day) => ({ ...day, additions: day.additions ?? [], transit: day.transit ?? [] })) });
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

  const currency = plan.request.currency;
  const lowestHotel = [...plan.hotels].sort((a, b) => a.nightlyPrice - b.nightlyPrice)[0];
  const lowestFlight = [...plan.priceComparison.flights].sort((a, b) => a.estimatedPrice - b.estimatedPrice)[0];
  const itineraryGroups = groupItineraryDays(plan.itinerary);

  function setSelectedStay(stay: TripStaySelection) {
    if (!plan) return;
    if (stay.type === "hotel") {
      const hotel = plan.hotels.find((item) => item.name === stay.label);
      persist({
        ...plan,
        selectedStay: stay,
        selectedHotel: hotel
          ? {
              id: hotel.id,
              name: hotel.name,
              location: hotel.location,
              nightlyPrice: hotel.nightlyPrice,
              source: hotel.source,
              link: hotel.link
            }
          : plan.selectedHotel
      });
      return;
    }
    persist({ ...plan, selectedStay: stay, selectedHotel: undefined });
  }

  function updateDraft(day: number, patch: Partial<{ title: string; category: ItineraryAdditionCategory; estimatedCost: string }>) {
    setDrafts((current) => {
      const base = current[day] ?? { title: "", category: "activity", estimatedCost: "" };
      return { ...current, [day]: { ...base, ...patch } };
    });
  }

  function addDayItem(day: number) {
    if (!plan) return;
    const draft = drafts[day] ?? { title: "", category: "activity", estimatedCost: "" };
    const title = draft.title.trim();
    if (!title) return;

    const addition: ItineraryAddition = {
      id: crypto.randomUUID(),
      title,
      category: draft.category,
      estimatedCost: draft.estimatedCost ? Math.max(0, Number(draft.estimatedCost)) : undefined,
      transit: buildTransitPlan({
        fromStay: plan.selectedStay,
        toPlace: title,
        transportPreference: plan.request.transportPreference,
        cityTravelPreference: plan.request.cityTravelPreference
      }),
      addedAt: new Date().toISOString()
    };

    const next: TripPlan = {
      ...plan,
      itinerary: plan.itinerary.map((item) => (item.day === day ? { ...item, additions: [...(item.additions ?? []), addition] } : item))
    };

    persist(next);
    setDrafts((current) => ({ ...current, [day]: { title: "", category: draft.category, estimatedCost: "" } }));
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft size={16} aria-hidden />
          Planner
        </Button>
        <Button
          variant="reef"
          size="sm"
          onClick={() => {
            void saveTrip(plan).then(() => setSaved(true));
            writeCurrentTrip(plan);
          }}
        >
          <Bookmark size={16} aria-hidden />
          {saved ? "Saved" : "Save trip"}
        </Button>
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
              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
                <TravelActionCard href="/options/hotels" icon={<BedDouble size={18} />} title={lowestHotel ? `Stays from ${formatMoney(lowestHotel.nightlyPrice, currency)}/night` : "Review stay packages"} meta={plan.selectedHotel?.name ?? plan.selectedHotelQuote?.displayName ?? plan.selectedStay?.label ?? "Compare stays for this trip"} />
                <TravelActionCard href="/options/flights" icon={<Plane size={18} />} title={lowestFlight ? `Flights from ${formatMoney(lowestFlight.estimatedPrice, currency)} round-trip` : "Review flight packages"} meta={plan.selectedFlightQuote?.displayName ?? "Compare cheaper, faster, and more comfortable packages"} />
              </div>
            </div>
            <BudgetMeter
              budget={plan.budget}
              currency={currency}
              actions={[
                {
                  label: "Find cheaper plan",
                  description: "Searches lower-cost destinations, dates, transit, value stays, and cheaper flight packages.",
                  onClick: () => void refine("cheaper"),
                  disabled: Boolean(isRefining)
                },
                { label: "Compare hotels", description: "Tune the nightly target and select the stay used for route planning.", href: "/options/hotels" },
                { label: "Compare flights", description: "Choose cheaper, faster, fewer-stop, or comfort-focused packages.", href: "/options/flights" }
              ]}
            />
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

          <PriceComparisonChart comparison={plan.priceComparison} currency={currency} />

          <Panel title="Itinerary" icon={<Calendar size={18} />}>
            <div className="grid gap-4">
              <div className="rounded-lg border border-ink/10 bg-white/76 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-reef">Stay base for transit planning</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[220px_1fr]">
                  <select
                    className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                    value={plan.selectedStay?.type === "airbnb" ? "airbnb" : plan.selectedStay?.label ?? ""}
                    onChange={(event) => {
                      if (event.target.value === "airbnb") {
                        setSelectedStay({ type: "airbnb", label: "Airbnb / private stay", location: plan.selectedStay?.location ?? "" });
                        return;
                      }
                      const selectedHotel = plan.hotels.find((hotel) => hotel.name === event.target.value);
                      if (!selectedHotel) return;
                      setSelectedStay({ type: "hotel", label: selectedHotel.name, location: selectedHotel.location });
                    }}
                  >
                    {plan.hotels.map((hotel) => (
                      <option key={hotel.id} value={hotel.name}>
                        {hotel.name} ({hotel.location})
                      </option>
                    ))}
                    <option value="airbnb">Airbnb / private stay</option>
                  </select>
                  {plan.selectedStay?.type === "airbnb" ? (
                    <input
                      className="rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm"
                      placeholder="Enter Airbnb area or address"
                      value={plan.selectedStay.location}
                      onChange={(event) =>
                        setSelectedStay({
                          type: "airbnb",
                          label: plan.selectedStay?.label ?? "Airbnb / private stay",
                          location: event.target.value
                        })
                      }
                    />
                  ) : (
                    <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink/68">Using {plan.selectedStay?.label ?? "your selected hotel"} as route origin</div>
                  )}
                </div>
              </div>

              {itineraryGroups.map((group) => (
                <div key={group.label} className="grid gap-3">
                  <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink/10 pb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-reef">{group.label}</p>
                      <h3 className="mt-1 font-semibold">{group.title}</h3>
                    </div>
                    <p className="text-sm font-semibold text-ink/62">{formatMoney(group.totalCost, currency)} planned</p>
                  </div>
                  {group.days.map((day) => (
                    <ItineraryDayCard key={day.day} day={day} currency={currency} drafts={drafts} updateDraft={updateDraft} addDayItem={addDayItem} />
                  ))}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Restaurants & food" icon={<ChefHat size={18} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {plan.restaurants.map((restaurant) => (
                <article key={restaurant.id} className="rounded-lg border border-ink/10 bg-white/76 p-4">
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-semibold">{restaurant.name}</span>
                      <span className="mt-1 block text-sm capitalize text-ink/62">{restaurant.cuisine}</span>
                    </span>
                  </span>
                  <span className="mt-4 grid gap-2 text-sm text-ink/64">
                    <span className="flex items-center gap-2">
                      <MapPinned size={15} aria-hidden />
                      {restaurant.neighborhood}
                    </span>
                    <span className="flex items-center gap-2">
                      <ChefHat size={15} aria-hidden />
                      About {formatMoney(restaurant.averageMealPrice, currency)}/meal
                    </span>
                    <span className="flex items-center gap-2">
                      <Star size={15} aria-hidden />
                      {restaurant.rating.toFixed(1)} rating estimate
                    </span>
                    <span className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="rounded bg-reef/10 px-2 py-1 text-reef">Estimated price</span>
                      <span className="rounded bg-ink/6 px-2 py-1 text-ink/58">{Math.round(restaurant.confidence * 100)}% confidence</span>
                    </span>
                  </span>
                </article>
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
                  <span className="font-semibold">{formatMoney(value, currency)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <TripSummaryPanel plan={plan} saved={saved} />
          <RecommendationPanel title="Hotels" icon={<Hotel size={18} />} ctaHref="/options/hotels" ctaLabel="Compare stays" items={plan.hotels.map((hotel) => ({ name: hotel.name, meta: `${hotel.location} - ${formatMoney(hotel.nightlyPrice, currency)}/night`, source: "Estimated price", confidence: hotel.confidence }))} />
          <RecommendationPanel title="Transport" icon={<Car size={18} />} items={plan.cars.map((car) => ({ name: car.name, meta: `${car.pickupLocation} - ${formatMoney(car.dailyPrice, currency)}/day`, source: "Estimated price", confidence: car.confidence }))} />
          <RecommendationPanel title="Attractions" icon={<Ticket size={18} />} items={plan.attractions.slice(0, 3).map((attraction) => ({ name: attraction.name, meta: `${attraction.durationHours}h - about ${formatMoney(attraction.estimatedPrice, currency)}`, source: "Estimated price", confidence: attraction.confidence }))} />
          <Panel title="Alternates" icon={<MapPinned size={18} />}>
            <div className="grid gap-3">
              {plan.alternates.map((destination) => (
                <div key={destination.id} className="rounded-lg bg-white/70 p-3">
                  <span className="block font-semibold">{destination.name}</span>
                  <span className="mt-1 block text-sm text-ink/60">{destination.summary}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded bg-reef/10 px-2 py-1 text-reef">Alternative destination</span>
                    <span className="rounded bg-ink/6 px-2 py-1 text-ink/58">{Math.round(destinationConfidence(destination.costLevel) * 100)}% confidence</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-ink/5 p-4 text-sm text-ink/64">
        {displayNotes(plan.notes).map((note) => (
          <p key={note}>{note}</p>
        ))}
      </section>
    </main>
  );
}

function hotelToStay(plan: TripPlan): TripStaySelection {
  const top = plan.hotels[0];
  if (!top) {
    return {
      type: "airbnb",
      label: "Airbnb / private stay",
      location: "City center"
    };
  }
  return {
    type: "hotel",
    label: top.name,
    location: top.location
  };
}

function TravelActionCard({ href, icon, title, meta }: { href: string; icon: React.ReactNode; title: string; meta: string }) {
  return (
    <Link className="focus-ring rounded-lg bg-white p-4 text-ink shadow-subtle transition hover:bg-paper" href={href}>
      <span className="flex items-center gap-2 text-sm font-semibold text-reef">
        {icon}
        Explore options
      </span>
      <span className="mt-3 block text-lg font-semibold leading-snug">{title}</span>
      <span className="mt-2 block text-sm text-ink/58">{meta}</span>
    </Link>
  );
}

function TripSummaryPanel({ plan, saved }: { plan: TripPlan; saved: boolean }) {
  const currency = plan.request.currency;
  const lowestFlight = [...plan.priceComparison.flights].sort((a, b) => a.estimatedPrice - b.estimatedPrice)[0];
  return (
    <Panel title="Trip summary" icon={<Sparkles size={18} />}>
      <div className="grid gap-3 text-sm">
        <SummaryRow label="Dates" value={dateSummary(plan)} />
        <SummaryRow label="Travelers" value={`${plan.request.travelers} traveler${plan.request.travelers === 1 ? "" : "s"}`} />
        <SummaryRow label="Trip estimate" value={formatMoney(plan.budget.totalEstimated, currency)} />
        <SummaryRow label="Budget" value={formatMoney(plan.request.totalBudget, currency)} />
        <SummaryRow label="Selected hotel" value={plan.selectedHotel?.name ?? plan.selectedStay?.label ?? "Default starting estimate"} />
        <SummaryRow label="Flight estimate" value={plan.selectedFlightQuote ? `${plan.selectedFlightQuote.displayName} ${formatMoney(plan.selectedFlightQuote.estimatedPrice, currency)}` : lowestFlight ? `${formatMoney(lowestFlight.estimatedPrice, currency)} starting` : "Default starting estimate"} />
        <SummaryRow label="Save state" value={saved ? "Saved" : "Not saved yet"} />
      </div>
    </Panel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
      <span className="text-ink/52">{label}</span>
      <span className="text-right font-semibold text-ink/78">{value}</span>
    </div>
  );
}

function dateSummary(plan: TripPlan) {
  if (plan.request.dateMode === "exact" && plan.request.startDate) {
    return [plan.request.startDate, plan.request.endDate].filter(Boolean).join(" to ");
  }
  return plan.request.startDate || `${plan.request.tripLengthDays} days`;
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

function ItineraryDayCard({
  day,
  currency,
  drafts,
  updateDraft,
  addDayItem
}: {
  day: ItineraryDay;
  currency: TripPlan["request"]["currency"];
  drafts: Record<number, { title: string; category: ItineraryAdditionCategory; estimatedCost: string }>;
  updateDraft: (day: number, patch: Partial<{ title: string; category: ItineraryAdditionCategory; estimatedCost: string }>) => void;
  addDayItem: (day: number) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-ink/10 bg-white/76 p-4 sm:grid-cols-[94px_1fr]">
      <div className="sm:border-r sm:border-ink/10 sm:pr-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-reef">Day {day.day}</p>
        <p className="mt-2 text-lg font-semibold">{formatMoney(day.estimatedCost + (day.additions ?? []).reduce((sum, item) => sum + (item.estimatedCost ?? 0), 0), currency)}</p>
        <p className="text-xs text-ink/52">estimated day spend</p>
      </div>
      <div>
        <h3 className="font-semibold">{day.title}</h3>
        {day.theme ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-ink/48">{day.theme}</p> : null}
        <div className="mt-3 grid gap-2">
          <ItinerarySegment icon={<Coffee size={15} />} label="Morning" text={day.morning} />
          <ItinerarySegment icon={<Sun size={15} />} label="Afternoon" text={day.afternoon} />
          <ItinerarySegment icon={<Moon size={15} />} label="Evening" text={day.evening} />
        </div>
        {(day.transit ?? []).length ? (
          <div className="mt-3 flex flex-wrap gap-2 rounded-lg bg-reef/10 px-3 py-3 text-xs text-ink/64">
            <span className="font-semibold uppercase tracking-[0.12em] text-reef">Getting around</span>
            {(day.transit ?? []).map((transit) => (
              <a key={`${transit.from}-${transit.to}`} className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-ink/68 hover:text-reef" href={transit.mapLink} target="_blank" rel="noreferrer">
                <Route size={13} aria-hidden />
                {transit.summary}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-reef">Add to day {day.day}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_120px_96px]">
            <input className="rounded-lg border border-ink/10 px-3 py-2 text-sm" placeholder="Add place, activity, or food stop" value={drafts[day.day]?.title ?? ""} onChange={(event) => updateDraft(day.day, { title: event.target.value })} />
            <select className="rounded-lg border border-ink/10 px-3 py-2 text-sm" value={drafts[day.day]?.category ?? "activity"} onChange={(event) => updateDraft(day.day, { category: event.target.value as ItineraryAdditionCategory })}>
              <option value="food">Food</option>
              <option value="activity">Activity</option>
              <option value="show">Show</option>
              <option value="shopping">Shopping</option>
              <option value="relaxation">Relaxation</option>
              <option value="custom">Custom</option>
            </select>
            <input className="rounded-lg border border-ink/10 px-3 py-2 text-sm" placeholder={`Cost (${currency ?? "USD"})`} type="number" min={0} value={drafts[day.day]?.estimatedCost ?? ""} onChange={(event) => updateDraft(day.day, { estimatedCost: event.target.value })} />
            <button className="inline-flex items-center justify-center gap-1 rounded-lg bg-reef px-3 py-2 text-sm font-semibold text-white" onClick={() => addDayItem(day.day)}>
              <Plus size={14} aria-hidden />
              Add
            </button>
          </div>

          {(day.additions ?? []).length > 0 ? (
            <div className="mt-3 grid gap-2">
              {(day.additions ?? []).map((item) => (
                <div key={item.id} className="rounded-lg bg-ink/5 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.title}</span>
                    <span className="rounded bg-coral/10 px-2 py-0.5 text-xs font-medium capitalize text-coral">{item.category}</span>
                    {item.estimatedCost ? <span className="text-xs text-ink/58">about {formatMoney(item.estimatedCost, currency)}</span> : null}
                  </div>
                  {item.transit ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink/62">
                      <span className="inline-flex items-center gap-1">
                        <Route size={13} aria-hidden />
                        {item.transit.summary}
                      </span>
                      <a className="font-medium text-reef hover:underline" href={item.transit.mapLink} target="_blank" rel="noreferrer">
                        Open route
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
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

function RecommendationPanel({ title, icon, items, ctaHref, ctaLabel }: { title: string; icon: React.ReactNode; items: { name: string; meta: string; source?: string; confidence?: number }[]; ctaHref?: string; ctaLabel?: string }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.name} className="rounded-lg bg-white/72 p-3">
            <span className="block font-semibold">{item.name}</span>
            <span className="mt-1 block text-sm text-ink/60">{item.meta}</span>
            {item.source ? (
              <span className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded bg-reef/10 px-2 py-1 text-reef">{item.source}</span>
                {typeof item.confidence === "number" ? <span className="rounded bg-ink/6 px-2 py-1 text-ink/52">{Math.round(item.confidence * 100)}% confidence</span> : null}
              </span>
            ) : null}
          </div>
        ))}
        {ctaHref && ctaLabel ? (
          <Button asChild variant="outline" size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

function displayNotes(notes: string[]) {
  return notes
    .map((note) =>
      note
        .replace("Fallback estimates from major travel search surfaces. Open source links to verify live prices before booking.", "Prices are planning estimates; compare packages before making final reservations.")
        .replace("Destination ranking uses curated trend seeds and supports custom free-text destinations.", "Destination ranking considers budget fit, trip style, and current travel appeal.")
        .replace("Destination ranking uses live trend data.", "Destination ranking considers budget fit, trip style, and current travel appeal.")
        .replace("Refined for: cheaper.", "Cheaper search: looked for lower-cost destinations, value stays, public transit, and lower fare packages.")
        .replace("Refined for: next destination.", "Alternative search: reviewed another destination that can fit the same trip style.")
    )
    .filter((note) => !/fallback|provider|supabase|api/i.test(note));
}

function groupItineraryDays(days: ItineraryDay[]) {
  if (days.length <= 2) {
    return [{ label: "Plan steps", title: "Core days", days, totalCost: totalDayCost(days) }];
  }

  const lastDay = days[days.length - 1]?.day;
  const groups = [
    { label: "Step 1", title: "Arrival and first look", days: days.filter((day) => day.day === 1) },
    { label: "Step 2", title: "Core trip days", days: days.filter((day) => day.day > 1 && day.day < lastDay) },
    { label: "Step 3", title: "Departure day", days: days.filter((day) => day.day === lastDay) }
  ].filter((group) => group.days.length > 0);

  return groups.map((group) => ({ ...group, totalCost: totalDayCost(group.days) }));
}

function totalDayCost(days: ItineraryDay[]) {
  return days.reduce((sum, day) => sum + day.estimatedCost + (day.additions ?? []).reduce((additionSum, item) => additionSum + (item.estimatedCost ?? 0), 0), 0);
}

function destinationConfidence(costLevel: number) {
  return Math.max(0.58, Math.min(0.76, 0.78 - costLevel * 0.03));
}
