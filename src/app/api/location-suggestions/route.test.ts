import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/location-suggestions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns global geocoding suggestions for origins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 184745,
              name: "Nairobi",
              country: "Kenya",
              admin1: "Nairobi County",
              latitude: -1.28333,
              longitude: 36.81667,
              population: 2750547
            }
          ]
        })
      })
    );

    const response = await GET(new Request("http://localhost/api/location-suggestions?q=nairobi&mode=origin"));
    const body = await response.json();
    expect(body.locations[0]).toMatchObject({ label: "Nairobi, Kenya", source: "geocoding" });
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
  });
});
