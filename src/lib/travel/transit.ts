import type { TransitPlan, TransportPreference, TripStaySelection } from "./types";

export function buildTransitPlan({
  fromStay,
  toPlace,
  transportPreference
}: {
  fromStay?: TripStaySelection;
  toPlace: string;
  transportPreference: TransportPreference;
}): TransitPlan {
  const from = fromStay ? `${fromStay.label} (${fromStay.location})` : "Your stay";
  const to = toPlace.trim() || "planned stop";
  const base = Math.max(8, stableMinuteSeed(`${from}|${to}`));
  const mode = chooseMode(base, transportPreference);
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

function chooseMode(baseMinutes: number, preference: TransportPreference): TransitPlan["mode"] {
  if (preference === "rental-car") return baseMinutes < 18 ? "walk" : "drive";
  if (preference === "public-transit") return baseMinutes < 16 ? "walk" : "public-transit";

  if (baseMinutes <= 14) return "walk";
  if (baseMinutes <= 30) return "public-transit";
  return "rideshare";
}

function adjustMinutesByMode(baseMinutes: number, mode: TransitPlan["mode"]): number {
  if (mode === "walk") return Math.max(6, Math.round(baseMinutes * 0.9));
  if (mode === "public-transit") return Math.round(baseMinutes * 1.05);
  if (mode === "drive") return Math.round(baseMinutes * 0.85);
  return Math.round(baseMinutes * 0.8);
}

function buildSummary(mode: TransitPlan["mode"], durationMinutes: number): string {
  if (mode === "walk") return `Walk about ${durationMinutes} min`;
  if (mode === "public-transit") return `Transit about ${durationMinutes} min`;
  if (mode === "drive") return `Drive about ${durationMinutes} min`;
  return `Rideshare about ${durationMinutes} min`;
}

function googleTravelMode(mode: TransitPlan["mode"]): string {
  if (mode === "public-transit") return "transit";
  if (mode === "drive" || mode === "rideshare") return "driving";
  return "walking";
}

function stableMinuteSeed(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 997;
  }
  return 10 + (hash % 28);
}
