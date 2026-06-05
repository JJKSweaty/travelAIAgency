import { describe, expect, it } from "vitest";
import { destinations, flightQuotesFor, hotelMarketQuotesFor } from "./fallback-data";
import type { TripRequest } from "./types";

const request: TripRequest = {
  origin: "Toronto, Canada",
  preferredDestinationEnabled: true,
  destination: "Lisbon, Portugal",
  startDate: "2026-07",
  tripLengthDays: 5,
  totalBudget: 2400,
  travelers: 2,
  travelStyle: "balanced",
  interests: ["food"],
  transportPreference: "flexible"
};

describe("fallback travel links", () => {
  it("builds valid flight provider links with route and month context", () => {
    const quotes = flightQuotesFor(destinations[0], request);
    expect(quotes.every((quote) => new URL(quote.link).protocol === "https:")).toBe(true);
    expect(decodeURIComponent(quotes[0].link)).toContain("July 2026");
    expect(decodeURIComponent(quotes[0].link)).toContain("Toronto, Canada");
  });

  it("builds valid hotel provider links with destination search context", () => {
    const quotes = hotelMarketQuotesFor(destinations[0], request);
    expect(quotes.every((quote) => new URL(quote.link).protocol === "https:")).toBe(true);
    expect(decodeURIComponent(quotes[0].link)).toContain("Lisbon, Portugal");
  });
});
