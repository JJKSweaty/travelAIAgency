import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TravelOptionsPage } from "./TravelOptionsPage";
import { createTripPlan } from "@/test/fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe("TravelOptionsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("filters hotel options by nightly budget", async () => {
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));
    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /choose a hotel/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/max nightly budget/i), { target: { value: "100" } });

    expect(screen.getByText("Value Rooms")).toBeInTheDocument();
    expect(screen.queryByText("Central House")).not.toBeInTheDocument();
    expect(screen.getByText("Booking.com")).toBeInTheDocument();
  });

  it("selects a hotel and persists the active and saved trip", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));
    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByText("Central House")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: /select stay/i })[1]);

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedHotel.id).toBe("h");
      expect(current.selectedStay.label).toBe("Central House");
    });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("roamly.savedTrips") ?? "[]");
      expect(saved[0].selectedHotel.id).toBe("h");
    });
  });

  it("filters flights by round-trip budget and keeps provider links visible", async () => {
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));
    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /choose a flight search/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/max round-trip budget/i), { target: { value: "300" } });

    expect(screen.getByText(/no flights are currently under CA\$300/i)).toBeInTheDocument();
    expect(screen.getByText("Google Flights")).toBeInTheDocument();
  });

  it("selects a flight quote and leaves default estimates when skipped", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));
    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getAllByText("Google Flights").length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole("button", { name: /^select$/i })[0]);

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedFlightQuote.id).toBe("f");
    });
    expect(screen.getByRole("button", { name: /keep starting estimate/i })).toBeInTheDocument();
  });
});
