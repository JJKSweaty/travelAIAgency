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
      vi.fn(async (input) => {
        const url = String(input);
        const isOrigin = url.includes("mode=origin");
        return {
          ok: true,
          json: async () => ({
            locations: [
              isOrigin
                ? { id: "geocoding-toronto", name: "Toronto", country: "Canada", label: "Toronto, Canada", source: "geocoding", detail: "Ontario, Canada" }
                : {
                    id: "curated-lisbon",
                    name: "Lisbon",
                    country: "Portugal",
                    label: "Lisbon, Portugal",
                    source: "curated",
                    detail: "Curated travel seed",
                    costLevel: 2,
                    bestFor: ["food", "budget"]
                  }
            ]
          })
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the guided planning controls", () => {
    render(<TripPlannerWizard />);
    expect(screen.getByRole("heading", { name: /shape a trip around your budget/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/origin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/travel month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total budget/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/in-city travel/i)).toBeInTheDocument();
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
    expect(screen.getByRole("combobox", { name: /preferred destination/i })).toHaveValue("Lisbon, Portugal");
  });

  it("shows origin autocomplete suggestions and applies a selected origin", async () => {
    const user = userEvent.setup();
    render(<TripPlannerWizard />);
    await user.clear(screen.getByRole("combobox", { name: /origin/i }));
    await user.type(screen.getByRole("combobox", { name: /origin/i }), "tor");
    await user.click(await screen.findByRole("option", { name: /toronto/i }));
    expect(screen.getByRole("combobox", { name: /origin/i })).toHaveValue("Toronto, Canada");
  });

  it("supports exact travel dates and keeps trip length aligned", async () => {
    const user = userEvent.setup();
    render(<TripPlannerWizard />);
    await user.click(screen.getByRole("button", { name: /^exact$/i }));
    await user.type(screen.getByLabelText(/depart/i), "2026-07-10");
    expect(screen.getByLabelText(/return/i)).toHaveValue("2026-07-14");
    await user.clear(screen.getByLabelText(/return/i));
    await user.type(screen.getByLabelText(/return/i), "2026-07-17");
    expect(screen.getByLabelText(/trip length/i)).toHaveValue(8);
  });
});
