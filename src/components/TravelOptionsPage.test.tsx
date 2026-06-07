import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TravelOptionsPage } from "./TravelOptionsPage";
import { createTripPlan } from "@/test/fixtures";
import { hotelSearchKey } from "@/lib/travel/searchCache";
import type { FlightResult, HotelResult } from "@/lib/travel/types";

const pushMock = vi.fn();
const fetchedAt = new Date().toISOString();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("TravelOptionsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    pushMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("searches hotels automatically for exact-date trips", async () => {
    mockTravelFetch({
      hotels: [
        hotelResult({ id: "hotel-mundial", name: "Hotel Mundial", pricePerNight: 90, totalPrice: 360 }),
        hotelResult({ id: "memmo", name: "Memmo Alfama", pricePerNight: null, totalPrice: null })
      ]
    });
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));

    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /choose your stay/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Hotel Mundial")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(/From SerpApi Google Hotels/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Check latest price.")).toBeInTheDocument();
    expect(screen.queryByText(/^Luxury$/i)).not.toBeInTheDocument();
  });

  it("opens saved trips from cached hotel results without fetching", async () => {
    mockTravelFetch({ hotels: [hotelResult()] });
    const cachedHotel = hotelResult({ id: "cached-hotel", name: "Cached Hotel", pricePerNight: 130, totalPrice: 520 });
    const plan = createTripPlan({
      travelSearchCache: {
        tripId: "test",
        origin: "Toronto",
        destination: "Lisbon, Portugal",
        dates: { departureDate: "2026-07-10", returnDate: "2026-07-14", checkInDate: "2026-07-10", checkOutDate: "2026-07-14" },
        travelers: 2,
        rooms: 1,
        currency: "CAD",
        hotelSearchKey: hotelSearchKey({ destination: "Lisbon, Portugal", checkInDate: "2026-07-10", checkOutDate: "2026-07-14", guests: 2, rooms: 1, currency: "CAD" }),
        cachedHotels: [cachedHotel],
        hotelsFetchedAt: fetchedAt
      }
    });
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));

    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByText("Cached Hotel")).toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalled();
  });

  it("selects a live hotel and persists the active and saved trip", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    mockTravelFetch({ hotels: [hotelResult({ id: "memmo", name: "Memmo Alfama", pricePerNight: 120, totalPrice: 480 })] });
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));

    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /choose your stay/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Memmo Alfama")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /select stay/i }));

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedHotel.id).toBe("memmo");
      expect(current.selectedStay.label).toBe("Memmo Alfama");
      expect(current.selectedHotel.totalPrice).toBe(480);
      expect(current.budget.totalEstimated).toBe(1660);
    });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("roamly.savedTrips") ?? "[]");
      expect(saved[0].selectedHotel.id).toBe("memmo");
    });
    expect(pushMock).toHaveBeenCalledWith("/results");
  });

  it("filters live flight results from normalized SerpApi flights", async () => {
    const user = userEvent.setup();
    mockTravelFetch({
      flights: [
        flightResult({ id: "ac", airlineName: "Air Canada", flightNumber: "AC 800", stops: 0 }),
        flightResult({ id: "tap", airlineName: "TAP Air Portugal", flightNumber: "TP 258", stops: 1, totalPrice: 760 })
      ]
    });
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));

    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /toronto to lisbon/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Air Canada")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^nonstop$/i }));

    expect(screen.getAllByText("Nonstop").length).toBeGreaterThan(0);
    expect(screen.queryByText("TAP Air Portugal")).not.toBeInTheDocument();
    expect(screen.getAllByText(/From SerpApi Google Flights/i).length).toBeGreaterThan(0);
  });

  it("selects a live priced flight and updates the trip total", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    mockTravelFetch({ flights: [flightResult({ id: "ac", airlineName: "Air Canada", flightNumber: "AC 800", totalPrice: 640 })] });
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));

    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /toronto to lisbon/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Air Canada")).toBeInTheDocument());
    const card = screen.getByText("Air Canada").closest(".rounded-lg") ?? document.body;
    await user.click(within(card as HTMLElement).getByRole("button", { name: /select flight/i }));

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedFlightQuote.airline).toBe("Air Canada");
      expect(current.selectedFlightQuote.departureTime).toBeTruthy();
      expect(current.selectedFlightQuote.estimatedPrice).toBe(640);
      expect(current.budget.totalEstimated).toBeGreaterThan(plan.budget.totalEstimated);
    });
    expect(pushMock).toHaveBeenCalledWith("/results");
  });
});

function mockTravelFetch(results: { flights?: FlightResult[]; hotels?: HotelResult[] }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/travel/flights")) {
        return Response.json({ flights: results.flights ?? [], links: [] });
      }
      if (url.includes("/api/travel/hotels")) {
        return Response.json({ hotels: results.hotels ?? [], links: [] });
      }
      return Response.json({});
    })
  );
}

function flightResult(overrides: Partial<FlightResult> = {}): FlightResult {
  return {
    id: "flight",
    source: "SerpApi Google Flights",
    sourceUrl: "https://www.google.com/travel/flights",
    airlineName: "Air Canada",
    airlineLogoUrl: null,
    flightNumber: "AC 800",
    originAirport: "YYZ",
    destinationAirport: "LIS",
    departureTime: "2026-07-10 20:10",
    arrivalTime: "2026-07-11 08:45",
    duration: 455,
    stops: 0,
    layovers: [],
    cabin: "Economy",
    baggage: ["Carry-on included"],
    fareType: "Round trip",
    pricePerTraveler: 640,
    totalPrice: 640,
    currency: "CAD",
    fetchedAt,
    isLivePrice: true,
    dataQuality: "provider",
    bookingToken: "booking-token",
    ...overrides
  };
}

function hotelResult(overrides: Partial<HotelResult> = {}): HotelResult {
  return {
    id: "hotel",
    source: "SerpApi Google Hotels",
    sourceUrl: "https://example.com/hotel",
    propertyToken: "property-token",
    name: "Hotel Mundial",
    imageUrl: "https://example.com/hotel.jpg",
    address: "Baixa, Lisbon",
    latitude: 38.71,
    longitude: -9.13,
    area: null,
    distanceFromCenter: 0.5,
    starRating: 4,
    guestRating: 4.5,
    reviewCount: 1200,
    description: "Central hotel near transit.",
    amenities: ["Free Wi-Fi", "Breakfast available"],
    cancellationPolicy: null,
    pricePerNight: 120,
    totalPrice: 480,
    currency: "CAD",
    taxesIncluded: null,
    fetchedAt,
    isLivePrice: true,
    dataQuality: "provider",
    ...overrides
  };
}
