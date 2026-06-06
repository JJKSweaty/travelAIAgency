import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/location-suggestions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns local airport suggestions for origins without remote fetches", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const response = await GET(new Request("http://localhost/api/location-suggestions?q=montreal&mode=origin"));
    const body = await response.json();
    expect(body.locations[0]).toMatchObject({ label: "Montreal, Canada", airportCode: "YUL", source: "curated" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("finds Rio de Janeiro and Kerala from the local airport/city index", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const rioResponse = await GET(new Request("http://localhost/api/location-suggestions?q=rio&mode=destination"));
    const rioBody = await rioResponse.json();
    const keralaResponse = await GET(new Request("http://localhost/api/location-suggestions?q=kerala&mode=destination"));
    const keralaBody = await keralaResponse.json();

    expect(rioBody.locations[0]).toMatchObject({ label: "Rio de Janeiro, Brazil", airportCode: "GIG", source: "curated" });
    expect(keralaBody.locations[0]).toMatchObject({ label: "Kerala, India", airportCode: "COK", source: "curated" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses Open-Meteo geocoding for locations outside the local index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ id: 2128295, name: "Sapporo", country: "Japan", admin1: "Hokkaido", latitude: 43.0667, longitude: 141.35, population: 1973395 }]
        })
      })
    );

    const response = await GET(new Request("http://localhost/api/location-suggestions?q=sapporo&mode=destination"));
    const body = await response.json();

    expect(body.locations[0]).toMatchObject({ label: "Sapporo, Japan", source: "geocoding" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to a typed destination when geocoding has no result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] })
      })
    );

    const response = await GET(new Request("http://localhost/api/location-suggestions?q=Atlantis&mode=destination"));
    const body = await response.json();
    expect(body.locations[0]).toMatchObject({ label: "Atlantis", country: "Global destination", source: "custom" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
