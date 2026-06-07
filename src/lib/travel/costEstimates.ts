import type { DestinationOption, TripRequest } from "./types";

export function estimateRoundTripFlightCost(request: Pick<TripRequest, "origin" | "travelers">, destination: DestinationOption): number {
  const travelers = Math.max(1, request.travelers);
  const perTraveler = estimatedRoundTripFlightPerTraveler(request.origin, destination);
  return Math.round(perTraveler * travelers);
}

function estimatedRoundTripFlightPerTraveler(origin: string, destination: DestinationOption) {
  const originRegion = travelRegion(origin);
  const destinationRegion = travelRegion(`${destination.name}, ${destination.country}`);
  const destinationKey = `${destination.name} ${destination.country}`.toLowerCase();

  if (originRegion === destinationRegion) {
    if (destinationRegion === "canada") return destination.costLevel >= 4 ? 260 : 180;
    if (destinationRegion === "usa") return 240;
    if (destinationRegion === "mexico-caribbean") return /cuba|dominican|punta cana/i.test(destinationKey) ? 300 : 360;
    if (destinationRegion === "europe") return 170;
    return 240;
  }

  if (originRegion === "canada" || originRegion === "usa") {
    if (destinationRegion === "canada") return destination.costLevel >= 4 ? 260 : 180;
    if (destinationRegion === "usa") return 300;
    if (destinationRegion === "mexico-caribbean") {
      if (/cuba|dominican|punta cana/i.test(destinationKey)) return 330;
      if (/cancun|cabo|mexico city|cartagena/i.test(destinationKey)) return 410;
      return 480;
    }
    if (destinationRegion === "central-south-america") return /colombia/i.test(destinationKey) ? 520 : 740;
    if (destinationRegion === "europe") return /portugal|iceland/i.test(destinationKey) ? 680 : 820;
    if (destinationRegion === "north-africa-middle-east") return /morocco/i.test(destinationKey) ? 820 : 980;
    if (destinationRegion === "asia") return /bali|thailand/i.test(destinationKey) ? 1050 : 1120;
    if (destinationRegion === "oceania") return 1450;
    if (destinationRegion === "africa") return 1180;
  }

  const regionFallback: Record<string, number> = {
    canada: 220,
    usa: 320,
    "mexico-caribbean": 430,
    "central-south-america": 720,
    europe: 760,
    "north-africa-middle-east": 920,
    asia: 1080,
    oceania: 1380,
    africa: 1120,
    other: 900
  };
  return regionFallback[destinationRegion] ?? regionFallback.other;
}

function travelRegion(value: string) {
  const normalized = value.toLowerCase();
  if (/canada|toronto|montreal|ottawa|vancouver|calgary|edmonton|halifax|yul|yyz|yvr|yyc/.test(normalized)) return "canada";
  if (/united states|usa|new york|los angeles|san diego|miami|new orleans|chicago|boston|lax|nyc|jfk|mia/.test(normalized)) return "usa";
  if (/mexico|cancun|cabo|los cabos|cuba|havana|varadero|dominican|punta cana|jamaica|bahamas|aruba|cartagena|colombia/.test(normalized)) {
    return /cartagena|colombia/.test(normalized) ? "central-south-america" : "mexico-caribbean";
  }
  if (/brazil|argentina|rio|buenos aires|peru|chile/.test(normalized)) return "central-south-america";
  if (/portugal|spain|france|italy|united kingdom|netherlands|czechia|greece|iceland|lisbon|porto|barcelona|london|paris|rome|amsterdam|athens|prague|reykjavik/.test(normalized)) return "europe";
  if (/morocco|turkiye|turkey|united arab emirates|dubai|istanbul|marrakesh/.test(normalized)) return "north-africa-middle-east";
  if (/japan|korea|singapore|hong kong|thailand|indonesia|bali|tokyo|kyoto|seoul|bangkok/.test(normalized)) return "asia";
  if (/australia|new zealand|sydney|queenstown/.test(normalized)) return "oceania";
  if (/south africa|cape town|kenya|nairobi/.test(normalized)) return "africa";
  return "other";
}
