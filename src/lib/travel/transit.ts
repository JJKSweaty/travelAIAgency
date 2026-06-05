import type { CityTravelPreference, ItineraryDay, TransitPlan, TransportPreference, TripStaySelection } from "./types";

export function buildTransitPlan({
  fromStay,
  toPlace,
  transportPreference,
  cityTravelPreference
}: {
  fromStay?: TripStaySelection;
  toPlace: string;
  transportPreference: TransportPreference;
  cityTravelPreference?: CityTravelPreference;
}): TransitPlan {
  const from = fromStay ? `${fromStay.label} (${fromStay.location})` : "Your stay";
  const to = toPlace.trim() || "planned stop";
  const base = Math.max(8, stableMinuteSeed(`${from}|${to}`));
  const mode = chooseMode(base, transportPreference, cityTravelPreference);
  const durationMinutes = adjustMinutesByMode(base, mode);
  const summary = buildSummary(mode, durationMinutes);

  return {
    mode,
    durationMinutes,
    summary,
    from,
    to,
    mapLink: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=${googleTravelMode(mode)}`
  };
}

export function buildDayTransitPlans({
  day,
  fromStay,
  transportPreference,
  cityTravelPreference
}: {
  day: ItineraryDay;
  fromStay?: TripStaySelection;
  transportPreference: TransportPreference;
  cityTravelPreference?: CityTravelPreference;
}): TransitPlan[] {
  const places = [
    extractTransitTarget(day.morning, "Morning plan"),
    extractTransitTarget(day.afternoon, "Afternoon plan"),
    extractTransitTarget(day.evening, "Evening plan")
  ];
  let currentStay = fromStay;

  return places.map((place, index) => {
    const transit = buildTransitPlan({
      fromStay: currentStay,
      toPlace: place,
      transportPreference,
      cityTravelPreference
    });
    currentStay = { type: "airbnb", label: place, location: "planned stop" };
    return { ...transit, summary: `${segmentLabel(index)}: ${transit.summary}` };
  });
}

function chooseMode(baseMinutes: number, preference: TransportPreference, cityPreference?: CityTravelPreference): TransitPlan["mode"] {
  if (cityPreference === "walkable") return baseMinutes < 22 ? "walk" : "bike";
  if (cityPreference === "public-transit") return baseMinutes < 12 ? "walk" : baseMinutes < 28 ? "metro" : "public-transit";
  if (cityPreference === "rideshare") return baseMinutes < 12 ? "walk" : "rideshare";
  if (cityPreference === "rental-car") return baseMinutes < 14 ? "walk" : "drive";

  if (preference === "rental-car") return baseMinutes < 18 ? "walk" : "drive";
  if (preference === "public-transit") return baseMinutes < 16 ? "walk" : "public-transit";

  if (baseMinutes <= 14) return "walk";
  if (baseMinutes <= 24) return "metro";
  if (baseMinutes <= 32) return "public-transit";
  return "rideshare";
}

function adjustMinutesByMode(baseMinutes: number, mode: TransitPlan["mode"]): number {
  if (mode === "walk") return Math.max(6, Math.round(baseMinutes * 0.9));
  if (mode === "metro") return Math.round(baseMinutes * 0.95);
  if (mode === "bike") return Math.round(baseMinutes * 0.72);
  if (mode === "public-transit") return Math.round(baseMinutes * 1.05);
  if (mode === "drive") return Math.round(baseMinutes * 0.85);
  return Math.round(baseMinutes * 0.8);
}

function buildSummary(mode: TransitPlan["mode"], durationMinutes: number): string {
  if (mode === "walk") return `Walk about ${durationMinutes} min`;
  if (mode === "metro") return `Metro about ${durationMinutes} min`;
  if (mode === "bike") return `Bike about ${durationMinutes} min`;
  if (mode === "public-transit") return `Transit about ${durationMinutes} min`;
  if (mode === "drive") return `Drive about ${durationMinutes} min`;
  return `Rideshare about ${durationMinutes} min`;
}

function googleTravelMode(mode: TransitPlan["mode"]): string {
  if (mode === "public-transit" || mode === "metro") return "transit";
  if (mode === "drive" || mode === "rideshare") return "driving";
  if (mode === "bike") return "bicycling";
  return "walking";
}

function extractTransitTarget(text: string, fallback: string) {
  return text.split(/[,.]/)[0]?.trim() || fallback;
}

function segmentLabel(index: number) {
  return index === 0 ? "Morning" : index === 1 ? "Afternoon" : "Evening";
}

function stableMinuteSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 997;
  }
  return 10 + (hash % 28);
}
