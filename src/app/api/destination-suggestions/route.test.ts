import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/destination-suggestions", () => {
  it("returns matching curated destinations", async () => {
    const response = GET(new Request("http://localhost/api/destination-suggestions?q=lis&travelMonth=2026-07"));
    const body = await response.json();
    expect(body.destinations[0].name).toBe("Lisbon");
  });

  it("requires a travel month before searching destinations", async () => {
    const response = GET(new Request("http://localhost/api/destination-suggestions?q=lis"));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.message).toMatch(/choose a travel month/i);
    expect(body.destinations).toEqual([]);
  });
});
