import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const originalSerpApiKey = process.env.SERPAPI_KEY;
const originalKiwiApiKey = process.env.KIWI_TEQUILA_API_KEY;
const originalTequilaApiKey = process.env.TEQUILA_API_KEY;

describe("GET /api/travel/flights", () => {
  afterEach(() => {
    process.env.SERPAPI_KEY = originalSerpApiKey;
    process.env.KIWI_TEQUILA_API_KEY = originalKiwiApiKey;
    process.env.TEQUILA_API_KEY = originalTequilaApiKey;
    vi.unstubAllGlobals();
  });

  it("calls SerpApi Google Flights with the single server key and normalizes results", async () => {
    process.env.SERPAPI_KEY = "test-serpapi-key";
    delete process.env.KIWI_TEQUILA_API_KEY;
    delete process.env.TEQUILA_API_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          google_flights_url: "https://www.google.com/travel/flights",
          best_flights: [
            {
              price: 640,
              total_duration: 455,
              type: "Round trip",
              booking_token: "booking-token",
              flights: [
                {
                  airline: "Air Canada",
                  flight_number: "AC 800",
                  travel_class: "Economy",
                  departure_airport: { id: "YYZ", time: "2026-07-10 20:10" },
                  arrival_airport: { id: "LIS", time: "2026-07-11 08:45" }
                }
              ]
            }
          ],
          other_flights: []
        })
      )
    );

    const response = await GET(
      new Request("http://localhost/api/travel/flights?origin=YYZ&destination=LIS&departureDate=2026-07-10&returnDate=2026-07-17&adults=2&currency=CAD&travelClass=1")
    );
    const body = await response.json();
    const fetchUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));

    expect(fetchUrl.origin + fetchUrl.pathname).toBe("https://serpapi.com/search.json");
    expect(fetchUrl.searchParams.get("engine")).toBe("google_flights");
    expect(fetchUrl.searchParams.get("api_key")).toBe("test-serpapi-key");
    expect(fetchUrl.searchParams.get("travel_class")).toBe("1");
    expect(body.flights[0]).toMatchObject({
      source: "SerpApi Google Flights",
      sourceUrl: "https://www.google.com/travel/flights",
      bookingToken: "booking-token",
      pricePerTraveler: 640,
      totalPrice: 640
    });
    expect(JSON.stringify(body)).not.toContain("test-serpapi-key");
  });

  it("returns an empty array when SerpApi has no flight groups", async () => {
    process.env.SERPAPI_KEY = "test-serpapi-key-empty";
    delete process.env.KIWI_TEQUILA_API_KEY;
    delete process.env.TEQUILA_API_KEY;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ best_flights: [], other_flights: [] })));

    const response = await GET(new Request("http://localhost/api/travel/flights?origin=YYZ&destination=LIS&departureDate=2026-09-10"));
    const body = await response.json();

    expect(body.flights).toEqual([]);
    expect(body.links.length).toBeGreaterThan(0);
  });

  it("falls back to Kiwi when SerpApi is not configured", async () => {
    delete process.env.SERPAPI_KEY;
    process.env.KIWI_TEQUILA_API_KEY = "test-kiwi-key";
    delete process.env.TEQUILA_API_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: [
            {
              id: "kiwi-1",
              flyFrom: "YYZ",
              flyTo: "LIS",
              price: 580,
              deep_link: "https://kiwi.example/flight",
              airlines: ["AC"],
              duration: { total: 27300 },
              route: [
                {
                  airline: "AC",
                  flight_no: 800,
                  flyFrom: "YYZ",
                  flyTo: "LIS",
                  local_departure: "2026-07-10T20:10:00",
                  local_arrival: "2026-07-11T08:45:00"
                }
              ]
            }
          ]
        })
      )
    );

    const response = await GET(new Request("http://localhost/api/travel/flights?origin=YYZ&destination=LIS&departureDate=2026-07-10&returnDate=2026-07-17&adults=2&currency=CAD"));
    const body = await response.json();

    expect(body.flights[0]).toMatchObject({
      source: "Kiwi Tequila",
      sourceUrl: "https://kiwi.example/flight",
      airlineName: "AC",
      totalPrice: 580
    });
    expect(JSON.stringify(body)).not.toContain("test-kiwi-key");
  });

  it("returns provider links instead of an error when no live flight key is configured", async () => {
    delete process.env.SERPAPI_KEY;
    delete process.env.KIWI_TEQUILA_API_KEY;
    delete process.env.TEQUILA_API_KEY;

    const response = await GET(new Request("http://localhost/api/travel/flights?origin=YYZ&destination=LIS&departureDate=2026-08-10"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.flights).toEqual([]);
    expect(body.links.length).toBeGreaterThan(0);
    expect(body.message).toMatch(/not configured/i);
  });
});
