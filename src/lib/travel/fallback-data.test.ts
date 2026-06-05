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

  it("builds exact date flight and hotel search links when exact dates are selected", () => {
    const exactRequest = { ...request, dateMode: "exact" as const, startDate: "2026-07-10", endDate: "2026-07-14", tripLengthDays: 5 };
    const flight = flightQuotesFor(destinations[0], exactRequest)[0];
    const hotels = hotelMarketQuotesFor(destinations[0], exactRequest);
    const googleHotel = hotels[0];
    const booking = hotels[1];

    expect(flight.linkLabel).toBe("Exact flight search");
    expect(decodeURIComponent(flight.link)).toContain("depart Jul 10, 2026 return Jul 14, 2026");
    expect(googleHotel.linkLabel).toBe("Exact hotel search");
    expect(decodeURIComponent(googleHotel.link)).toContain("check-in Jul 10, 2026 check-out Jul 14, 2026");
    expect(booking.link).toContain("checkin=2026-07-10");
    expect(booking.link).toContain("checkout=2026-07-14");
  });
});
