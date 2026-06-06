import { describe, expect, it } from "vitest";
import { flightFallbackLinks, hotelFallbackLinks } from "./deepLinks";
import { validateFlightResult, validateHotelResult } from "./validation";
import type { FlightResult, HotelResult } from "./types";

const fetchedAt = "2026-06-06T12:00:00.000Z";

describe("travel provider validation", () => {
  it("rejects incomplete flight inventory instead of allowing fake cards", () => {
    const flight: FlightResult = {
      id: "f",
      source: "SerpApi Google Flights",
      sourceUrl: "https://www.google.com/travel/flights",
      airlineName: null,
      airlineLogoUrl: null,
      flightNumber: null,
      originAirport: "YYZ",
      destinationAirport: "LIS",
      departureTime: "2026-07-10 10:00 AM",
      arrivalTime: "2026-07-10 11:00 PM",
      duration: 480,
      stops: 0,
      layovers: [],
      cabin: null,
      baggage: [],
      fareType: null,
      pricePerTraveler: 400,
      totalPrice: 800,
      currency: "CAD",
      fetchedAt,
      isLivePrice: true,
      dataQuality: "provider",
      bookingToken: null
    };

    expect(validateFlightResult(flight)).toBeNull();
  });

  it("allows real hotel identity with no price", () => {
    const hotel: HotelResult = {
      id: "h",
      source: "Google Places",
      sourceUrl: "https://maps.google.com",
      name: "Real Hotel",
      imageUrl: "https://example.com/hotel.jpg",
      address: "1 Main St",
      latitude: 43.6,
      longitude: -79.3,
      area: null,
      distanceFromCenter: null,
      starRating: null,
      guestRating: 4.5,
      reviewCount: 100,
      description: null,
      amenities: [],
      cancellationPolicy: null,
      pricePerNight: null,
      totalPrice: null,
      currency: "CAD",
      fetchedAt,
      isLivePrice: false,
      dataQuality: "provider",
      propertyToken: null
    };

    expect(validateHotelResult(hotel)).toEqual(hotel);
  });
});

describe("provider deep links", () => {
  it("prefills fallback flight provider links", () => {
    const links = flightFallbackLinks({
      origin: "YYZ",
      destination: "LIS",
      departureDate: "2026-07-10",
      returnDate: "2026-07-17",
      adults: 2,
      currency: "CAD"
    });

    expect(links.map((link) => link.label)).toEqual(["Search on Google Flights", "Search on Skyscanner", "Search on Kiwi"]);
    expect(links.every((link) => link.url.includes("YYZ") || link.url.includes("yyz") || link.url.includes("source=YYZ"))).toBe(true);
  });

  it("prefills fallback hotel provider links", () => {
    const links = hotelFallbackLinks({
      destination: "Lisbon",
      checkInDate: "2026-07-10",
      checkOutDate: "2026-07-14",
      adults: 2,
      currency: "CAD"
    });

    expect(links.map((link) => link.label)).toEqual(["Search on Expedia", "Search on Booking.com", "Search on Hotels.com"]);
    expect(links.every((link) => decodeURIComponent(link.url).includes("Lisbon"))).toBe(true);
  });
});
