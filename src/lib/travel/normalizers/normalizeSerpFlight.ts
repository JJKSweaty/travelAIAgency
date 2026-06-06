import {
  normalizeSerpApiFlightGroup,
  type FlightNormalizeParams,
  type SerpApiFlightGroup
} from "./normalizeFlight";

export function normalizeSerpFlight(group: SerpApiFlightGroup, index: number, params: FlightNormalizeParams) {
  return normalizeSerpApiFlightGroup(group, index, params);
}

export type { FlightNormalizeParams, SerpApiFlightGroup };
