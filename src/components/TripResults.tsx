"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BedDouble, Bookmark, Calendar, Car, ChefHat, ChevronDown, Coffee, Hotel, MapPinned, Moon, Plane, Plus, RefreshCcw, Route, Star, Sun, Ticket, WalletCards } from "lucide-react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { PriceComparisonChart } from "@/components/PriceComparisonChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyTripSelectionsToBudget } from "@/lib/travel/pricing";
import { isTripSaved, readCurrentTrip, saveTrip, updateSavedTrip, writeCurrentTrip } from "@/lib/travel/storage";
import { buildTransitPlan } from "@/lib/travel/transit";
import { formatMoney } from "@/lib/travel/currency";
import type { ItineraryAddition, ItineraryAdditionCategory, ItineraryDay, RefinementIntent, TransitPlan, TripPlan, TripStaySelection } from "@/lib/travel/types";

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
        rememberRecentDestination(normalized.destination.id);
        setSaved(await isTripSaved(normalized.id).catch(() => false));
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
  }

  async function refine(intent: RefinementIntent) {
    if (!plan) return;
    setIsRefining(intent);
    setRefineError(null);
    try {
      const planForRefinement = withRecentDestinationExclusions(plan, intent);
      const response = await fetch("/api/refine-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planForRefinement, intent })
      });
      if (!response.ok) throw new Error("Could not refine this trip.");
      const next = (await response.json()) as TripPlan;
      persist({ ...next, selectedStay: next.selectedStay ?? hotelToStay(next), itinerary: next.itinerary.map((day) => ({ ...day, additions: day.additions ?? [], transit: day.transit ?? [] })) });
      rememberRecentDestination(next.destination.id);
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
              providerListingId: hotel.placeId ?? hotel.id,
              name: hotel.name,
              location: hotel.location,
              nightlyPrice: hotel.nightlyPrice,
              priceAtSelection: hotel.nightlyPrice,
              currentPrice: hotel.nightlyPrice,
              source: hotel.source,
              link: hotel.link,
              rating: hotel.rating,
              reviewCount: hotel.reviewCount,
              imageUrl: hotel.imageUrl,
              starRating: hotel.starRating,
              amenities: hotel.amenities,
              cancellationNote: hotel.cancellationNote,
              totalPrice: hotel.totalPrice,
              totalPriceAtSelection: hotel.totalPrice,
              currentTotalPrice: hotel.totalPrice,
              priceSource: hotel.priceSource
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
            void saveTrip(plan).then(() => setSaved(true)).catch(() => setSaved(false));
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
                <TravelActionCard href="/options/hotels" icon={<BedDouble size={18} />} title={lowestHotel ? (lowestHotel.priceSource === "unavailable" ? "Hotels with partner rates" : `Stays from ${formatMoney(lowestHotel.nightlyPrice, currency)}/night`) : "Review stay options"} meta={plan.selectedHotel?.name ?? plan.selectedHotelQuote?.displayName ?? plan.selectedStay?.label ?? "Compare stays for this trip"} />
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
                  <Select
                    value={plan.selectedStay?.type === "airbnb" ? "airbnb" : plan.selectedStay?.label ?? ""}
                    onValueChange={(value) => {
                      if (value === "airbnb") {
                        setSelectedStay({ type: "airbnb", label: "Airbnb / private stay", location: plan.selectedStay?.location ?? "" });
                        return;
                      }
                      const selectedHotel = plan.hotels.find((hotel) => hotel.name === value);
                      if (!selectedHotel) return;
                      setSelectedStay({ type: "hotel", label: selectedHotel.name, location: selectedHotel.location });
                    }}
                  >
                    <SelectTrigger aria-label="Stay base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {plan.hotels.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.name}>
                          {hotel.name} ({hotel.location})
                        </SelectItem>
                      ))}
                      <SelectItem value="airbnb">Airbnb / private stay</SelectItem>
                    </SelectContent>
                  </Select>
                  {plan.selectedStay?.type === "airbnb" ? (
                    <Input
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
                    </span>
                  </span>
                </article>
              ))}
            </div>
          </Panel>

          <TripCostPanel plan={plan} />
        </div>

        <div className="grid content-start gap-6">
          <TripSummaryPanel plan={plan} />
          <RecommendationPanel title="Hotels" icon={<Hotel size={18} />} ctaHref="/options/hotels" ctaLabel="Compare stays" items={plan.hotels.map((hotel) => ({ name: hotel.name, meta: `${hotel.location} - ${formatMoney(hotel.nightlyPrice, currency)}/night`, tag: "Stay option" }))} />
          <RecommendationPanel title="Transport" icon={<Car size={18} />} items={plan.cars.map((car) => ({ name: car.name, meta: `${car.pickupLocation} - ${formatMoney(car.dailyPrice, currency)}/day`, tag: "Local transport" }))} />
          <RecommendationPanel title="Attractions" icon={<Ticket size={18} />} items={plan.attractions.slice(0, 3).map((attraction) => ({ name: attraction.name, meta: `${attraction.durationHours}h - about ${formatMoney(attraction.estimatedPrice, currency)}`, tag: "Activity" }))} />
          <Panel title="Alternates" icon={<MapPinned size={18} />}>
            <div className="grid gap-3">
              {plan.alternates.map((destination) => (
                <div key={destination.id} className="rounded-lg bg-white/70 p-3">
                  <span className="block font-semibold">{destination.name}</span>
                  <span className="mt-1 block text-sm text-ink/60">{destination.summary}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="rounded bg-reef/10 px-2 py-1 text-reef">Alternative destination</span>
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

function TripSummaryPanel({ plan }: { plan: TripPlan }) {
  const currency = plan.request.currency;
  const lowestFlight = [...plan.priceComparison.flights].sort((a, b) => a.estimatedPrice - b.estimatedPrice)[0];
  const selectedHotelCurrentPrice = plan.selectedHotel?.currentPrice ?? plan.selectedHotel?.nightlyPrice;
  const selectedHotelSavedPrice = plan.selectedHotel?.priceAtSelection ?? plan.selectedHotel?.nightlyPrice;
  const selectedHotelPriceChange = priceChangeCopy(selectedHotelSavedPrice, selectedHotelCurrentPrice, currency);
  const selectedHotelPrice = plan.selectedHotel
    ? plan.selectedHotel.priceSource === "unavailable"
      ? "check rates"
      : `${formatMoney(selectedHotelCurrentPrice ?? 0, currency)}/night${selectedHotelPriceChange ? ` - ${selectedHotelPriceChange}` : ""}`
    : "";
  const selectedFlightDetail = "";
  return (
    <Panel title="Trip summary" icon={<Route size={18} />}>
      <div className="grid gap-3 text-sm">
        <SummaryRow label="Dates" value={dateSummary(plan)} />
        <SummaryRow label="Travelers" value={`${plan.request.travelers} traveler${plan.request.travelers === 1 ? "" : "s"}`} />
        <SummaryRow label="Trip estimate" value={formatMoney(plan.budget.totalEstimated, currency)} />
        <SummaryRow label="Budget" value={formatMoney(plan.request.totalBudget, currency)} />
        <SummaryRow label="Selected stay" value={plan.selectedHotel ? `${plan.selectedHotel.name} ${selectedHotelPrice}` : plan.selectedStay?.label ?? "Choose a stay"} />
        <SummaryRow
          label="Selected flight"
          value={
            plan.selectedFlightQuote
              ? `${plan.selectedFlightQuote.displayName} ${formatMoney(plan.selectedFlightQuote.estimatedPrice, currency)}${selectedFlightDetail ? ` · ${selectedFlightDetail}` : ""}`
              : lowestFlight
                ? `Flights from ${formatMoney(lowestFlight.estimatedPrice, currency)}`
                : "Choose a flight"
          }
        />
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

function TripCostPanel({ plan }: { plan: TripPlan }) {
  const currency = plan.request.currency;
  const nights = Math.max(1, plan.request.tripLengthDays - 1);
  const selectedHotelNightly = plan.selectedHotel?.currentPrice ?? plan.selectedHotel?.nightlyPrice ?? plan.selectedHotelQuote?.estimatedPrice ?? plan.hotels[0]?.nightlyPrice ?? plan.destination.averageNightlyHotel;
  const selectedFlight = plan.selectedFlightQuote?.currentPrice ?? plan.selectedFlightQuote?.estimatedPrice ?? 0;
  const lodging = Math.round(selectedHotelNightly * nights);
  const localTransport = plan.cars[0] ? Math.round(plan.cars[0].dailyPrice * plan.request.tripLengthDays) : plan.budget.transport;
  const food = plan.budget.food;
  const activities = plan.budget.activities;
  const hotelPriceKnown = plan.selectedHotel?.priceSource !== "unavailable";
  const hotelPriceChange = priceChangeCopy(plan.selectedHotel?.priceAtSelection ?? plan.selectedHotel?.nightlyPrice, plan.selectedHotel?.currentPrice ?? plan.selectedHotel?.nightlyPrice, currency);
  const flightPriceChange = priceChangeCopy(plan.selectedFlightQuote?.priceAtSelection ?? plan.selectedFlightQuote?.estimatedPrice, plan.selectedFlightQuote?.currentPrice ?? plan.selectedFlightQuote?.estimatedPrice, currency);
  const rows = [
    { label: "Flight", value: selectedFlight, detail: plan.selectedFlightQuote ? flightPriceChange ?? plan.selectedFlightQuote.displayName : "Not selected yet" },
    { label: "Hotel", value: hotelPriceKnown ? lodging : 0, detail: hotelPriceKnown ? hotelPriceChange ?? `${nights} night${nights === 1 ? "" : "s"} at ${formatMoney(selectedHotelNightly, currency)}/night` : "Open the hotel page for current rates" },
    { label: "Local transport", value: localTransport, detail: plan.cars[0]?.name ?? "Transit and rideshare estimate" },
    { label: "Activities", value: activities, detail: "Itinerary activity estimate" },
    { label: "Food", value: food, detail: "Meals and casual dining estimate" }
  ];

  return (
    <Panel title="Trip cost" icon={<WalletCards size={18} />}>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 rounded-lg bg-white/72 px-4 py-3">
            <span>
              <span className="block font-semibold">{row.label}</span>
              <span className="mt-1 block text-sm text-ink/56">{row.detail}</span>
            </span>
            <span className="shrink-0 font-semibold">{row.value > 0 ? formatMoney(row.value, currency) : "Select"}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-lg bg-ink px-4 py-4 text-paper">
          <span className="font-semibold">Total trip estimate</span>
          <span className="text-2xl font-semibold">{formatMoney(plan.budget.totalEstimated, currency)}</span>
        </div>
      </div>
    </Panel>
  );
}

function priceChangeCopy(savedPrice: number | undefined, currentPrice: number | undefined, currency: TripPlan["request"]["currency"]) {
  if (savedPrice === undefined || currentPrice === undefined || savedPrice === currentPrice) return null;
  return `Price changed from ${formatMoney(savedPrice, currency)} to ${formatMoney(currentPrice, currency)}`;
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
  const [openTransitKey, setOpenTransitKey] = useState<string | null>(null);

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
          <div className="mt-3 grid gap-2 rounded-lg bg-reef/10 px-3 py-3 text-xs text-ink/64">
            <span className="font-semibold uppercase tracking-[0.12em] text-reef">Getting around</span>
            {(day.transit ?? []).map((transit) => (
              <TransitDetailCard
                key={`${transit.from}-${transit.to}`}
                transit={transit}
                currency={currency}
                open={openTransitKey === `${transit.from}-${transit.to}`}
                onToggle={() => setOpenTransitKey(openTransitKey === `${transit.from}-${transit.to}` ? null : `${transit.from}-${transit.to}`)}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-ink/10 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-reef">Add to day {day.day}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_120px_96px]">
            <Input placeholder="Add place, activity, or food stop" value={drafts[day.day]?.title ?? ""} onChange={(event) => updateDraft(day.day, { title: event.target.value })} />
            <Select value={drafts[day.day]?.category ?? "activity"} onValueChange={(value) => updateDraft(day.day, { category: value as ItineraryAdditionCategory })}>
              <SelectTrigger aria-label={`Category for day ${day.day}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="show">Show</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="relaxation">Relaxation</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={`Cost (${currency ?? "USD"})`} type="number" min={0} value={drafts[day.day]?.estimatedCost ?? ""} onChange={(event) => updateDraft(day.day, { estimatedCost: event.target.value })} />
            <Button variant="reef" onClick={() => addDayItem(day.day)}>
              <Plus size={14} aria-hidden />
              Add
            </Button>
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
                    <div className="mt-2">
                      <TransitDetailCard
                        transit={item.transit}
                        currency={currency}
                        open={openTransitKey === item.id}
                        onToggle={() => setOpenTransitKey(openTransitKey === item.id ? null : item.id)}
                      />
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

function TransitDetailCard({ transit, currency, open, onToggle }: { transit: TransitPlan; currency: TripPlan["request"]["currency"]; open: boolean; onToggle: () => void }) {
  const cost = transitCostEstimate(transit);
  return (
    <div className="rounded-lg bg-white text-ink shadow-sm">
      <button className="focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium" onClick={onToggle}>
        <span className="inline-flex items-center gap-2">
          <Route size={14} className="text-reef" aria-hidden />
          {transit.summary}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-ink/10 px-3 py-3 text-sm text-ink/64 sm:grid-cols-3">
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink/42">Time</span>
            {transit.durationMinutes} min
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink/42">Estimated cost</span>
            {cost > 0 ? formatMoney(cost, currency) : "Usually free"}
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-ink/42">Note</span>
            {transitNote(transit)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="bg-white/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RecommendationPanel({ title, icon, items, ctaHref, ctaLabel }: { title: string; icon: React.ReactNode; items: { name: string; meta: string; tag?: string }[]; ctaHref?: string; ctaLabel?: string }) {
  return (
    <Panel title={title} icon={icon}>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.name} className="rounded-lg bg-white/72 p-3">
            <span className="block font-semibold">{item.name}</span>
            <span className="mt-1 block text-sm text-ink/60">{item.meta}</span>
            {item.tag ? (
              <span className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded bg-reef/10 px-2 py-1 text-reef">{item.tag}</span>
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

function transitCostEstimate(transit: TransitPlan) {
  if (transit.mode === "walk" || transit.mode === "bike") return 0;
  if (transit.mode === "metro" || transit.mode === "public-transit") return 4;
  if (transit.mode === "rideshare") return Math.max(10, Math.round(7 + transit.durationMinutes * 0.7));
  if (transit.mode === "drive") return Math.max(8, Math.round(6 + transit.durationMinutes * 0.45));
  return 5;
}

function transitNote(transit: TransitPlan) {
  if (transit.mode === "walk") return "Good for nearby itinerary stops.";
  if (transit.mode === "metro" || transit.mode === "public-transit") return "Use local passes or tap-to-pay where available.";
  if (transit.mode === "rideshare") return "Best for late evenings or luggage-heavy moves.";
  if (transit.mode === "drive") return "Check parking before leaving the stay.";
  if (transit.mode === "bike") return "Works best in daylight and protected lanes.";
  return "Use this as a planning estimate.";
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
    .filter((note) => !/fallback|provider|supabase|api|serpapi|backend|mock|debug|test|raw|ai generated/i.test(note));
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

const recentDestinationIdsKey = "roamly.recentDestinationIds";

function withRecentDestinationExclusions(plan: TripPlan, intent: RefinementIntent): TripPlan {
  if (intent !== "cheaper" && intent !== "next-destination") return plan;
  const excludedDestinationIds = Array.from(
    new Set([...(plan.request.excludedDestinationIds ?? []), ...readRecentDestinationIds(), plan.destination.id])
  ).slice(-16);
  return {
    ...plan,
    request: {
      ...plan.request,
      excludedDestinationIds
    }
  };
}

function rememberRecentDestination(id: string) {
  if (typeof window === "undefined") return;
  const next = [id, ...readRecentDestinationIds().filter((item) => item !== id)].slice(0, 16);
  window.sessionStorage.setItem(recentDestinationIdsKey, JSON.stringify(next));
}

function readRecentDestinationIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(recentDestinationIdsKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
