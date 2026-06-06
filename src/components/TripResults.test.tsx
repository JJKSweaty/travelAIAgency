import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TripResults } from "./TripResults";
import { createTripPlan } from "@/test/fixtures";
import type { TripPlan } from "@/lib/travel/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

const plan = createTripPlan();

describe("TripResults", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders major result sections from the active trip", async () => {
    window.sessionStorage.setItem("aiTravelAgency.currentTrip", JSON.stringify(plan));
    render(<TripResults />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lisbon" })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /price comparison/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /hotels/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /restaurants & food/i })).toBeInTheDocument();
    expect(screen.getByText(/stays from CA\$90\/night/i)).toBeInTheDocument();
    expect(screen.getByText(/flights from CA\$420 round-trip/i)).toBeInTheDocument();
    expect(screen.queryByText(/search travel options/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /stays from/i })).toHaveAttribute("href", "/options/hotels");
    expect(screen.getByRole("link", { name: /flights from/i })).toHaveAttribute("href", "/options/flights");
    expect(screen.getAllByText(/estimated price/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/getting around/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try another destination/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save trip/i })).toBeInTheDocument();
  });

  it("posts replace-hotel refinements and renders the updated hotel list", async () => {
    const user = userEvent.setup();
    const nextPlan: TripPlan = {
      ...plan,
      request: { ...plan.request, excludedHotelIds: ["h"] },
      hotels: [{ ...plan.hotels[0], id: "h2", name: "Design Stay" }],
      notes: ["Refined for: replace hotel."]
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => nextPlan
    });
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem("aiTravelAgency.currentTrip", JSON.stringify(plan));

    render(<TripResults />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Lisbon" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /replace hotel/i }));

    await waitFor(() => expect(screen.getAllByText("Design Stay").length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/refine-trip",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"intent":"replace-hotel"')
      })
    );
  });
});
