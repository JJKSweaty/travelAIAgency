import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTripPlan } from "@/test/fixtures";
import { isTripSaved, listSavedTrips, readSavedTrips, saveTrip } from "./storage";

const missingTripsTableError = {
  code: "PGRST205",
  details: null,
  hint: null,
  message: "Could not find the table 'public.trips' in the schema cache"
};

const mockClient = {
  auth: {
    getSession: vi.fn()
  },
  from: vi.fn()
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: vi.fn(() => mockClient)
}));

describe("travel storage Supabase fallback", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("saves to browser storage when the Supabase trips table is missing", async () => {
    const plan = createTripPlan();
    mockClient.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: missingTripsTableError })
    });

    await expect(saveTrip(plan)).resolves.toBe("guest");
    expect(readSavedTrips()[0].id).toBe(plan.id);
  });

  it("lists browser-saved trips when account trip storage is unavailable", async () => {
    const plan = createTripPlan();
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));
    mockClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: missingTripsTableError })
        }))
      }))
    });

    await expect(listSavedTrips()).resolves.toEqual([plan]);
  });

  it("checks browser-saved trip state when account trip storage is unavailable", async () => {
    const plan = createTripPlan();
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));
    mockClient.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: missingTripsTableError })
          }))
        }))
      }))
    });

    await expect(isTripSaved(plan.id)).resolves.toBe(true);
  });
});
