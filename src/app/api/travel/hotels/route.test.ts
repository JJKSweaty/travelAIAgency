import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const originalSerpApiKey = process.env.SERPAPI_KEY;

describe("GET /api/travel/hotels", () => {
  afterEach(() => {
    process.env.SERPAPI_KEY = originalSerpApiKey;
    vi.unstubAllGlobals();
  });

  it("calls SerpApi Google Hotels with the single server key and normalizes properties", async () => {
    process.env.SERPAPI_KEY = "test-serpapi-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          properties: [
            {
              name: "Memmo Alfama",
              link: "https://example.com/hotel",
              property_token: "property-token",
              gps_coordinates: { latitude: 38.71, longitude: -9.13 },
              extracted_hotel_class: 4,
              overall_rating: 4.7,
              reviews: 1100,
              amenities: ["Free Wi-Fi"],
              rate_per_night: { extracted_lowest: 210 },
              total_rate: { extracted_lowest: 840 },
              images: [{ thumbnail: "https://example.com/hotel.jpg" }]
            }
          ]
        })
      )
    );

    const response = await GET(
      new Request("http://localhost/api/travel/hotels?destination=Lisbon&checkInDate=2026-07-10&checkOutDate=2026-07-14&adults=2&children=1&rooms=2&currency=CAD")
    );
    const body = await response.json();
    const fetchUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]));

    expect(fetchUrl.origin + fetchUrl.pathname).toBe("https://serpapi.com/search.json");
    expect(fetchUrl.searchParams.get("engine")).toBe("google_hotels");
    expect(fetchUrl.searchParams.get("api_key")).toBe("test-serpapi-key");
    expect(fetchUrl.searchParams.get("gl")).toBe("ca");
    expect(fetchUrl.searchParams.get("children")).toBe("1");
    expect(fetchUrl.searchParams.get("rooms")).toBe("2");
    expect(body.hotels[0]).toMatchObject({
      source: "SerpApi Google Hotels",
      sourceUrl: "https://example.com/hotel",
      propertyToken: "property-token",
      pricePerNight: 210,
      totalPrice: 840
    });
    expect(JSON.stringify(body)).not.toContain("test-serpapi-key");
  });

  it("returns an empty array when SerpApi has no properties", async () => {
    process.env.SERPAPI_KEY = "test-serpapi-key-empty";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ properties: [] })));

    const response = await GET(new Request("http://localhost/api/travel/hotels?destination=Lisbon&checkInDate=2026-08-10&checkOutDate=2026-08-14"));
    const body = await response.json();

    expect(body.hotels).toEqual([]);
    expect(body.links.length).toBeGreaterThan(0);
  });
});
