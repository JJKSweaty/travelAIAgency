import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TripPlannerWizard } from "./TripPlannerWizard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe("TripPlannerWizard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          destinations: [
            {
              id: "lisbon",
              name: "Lisbon",
              country: "Portugal",
              summary: "Food and neighborhoods.",
              imageUrl: "https://example.com",
              costLevel: 2,
              trendingScore: 94,
              bestFor: ["food", "budget"],
              averageNightlyHotel: 140,
              averageDailyFood: 50,
              averageDailyActivities: 40,
              bookingLink: "https://example.com"
            }
          ]
        })
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the guided planning controls", () => {
    render(<TripPlannerWizard />);
    expect(screen.getByRole("heading", { name: /build the trip around the money/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total budget/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate trip plan/i })).toBeInTheDocument();
  });

  it("reveals destination input when preferred mode is enabled", async () => {
    const user = userEvent.setup();
    render(<TripPlannerWizard />);
    await user.click(screen.getByRole("button", { name: /destination mode/i }));
    expect(screen.getByRole("combobox", { name: /preferred destination/i })).toBeInTheDocument();
  });

  it("shows destination autocomplete suggestions and applies a selected destination", async () => {
    const user = userEvent.setup();
    render(<TripPlannerWizard />);
    await user.click(screen.getByRole("button", { name: /destination mode/i }));
    await user.type(screen.getByRole("combobox", { name: /preferred destination/i }), "lis");
    await user.click(await screen.findByRole("option", { name: /lisbon/i }));
    expect(screen.getByRole("combobox", { name: /preferred destination/i })).toHaveValue("Lisbon");
  });
});
