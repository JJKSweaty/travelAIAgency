import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TravelOptionsPage } from "./TravelOptionsPage";
import { createTripPlan } from "@/test/fixtures";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock })
}));

describe("TravelOptionsPage", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("filters hotel options by price style without showing provider cards", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));
    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /choose your stay/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^budget$/i }));

    expect(screen.getByText("Hotel Mundial")).toBeInTheDocument();
    expect(screen.queryByText("Memmo Alfama")).not.toBeInTheDocument();
    expect(screen.queryByText("Booking.com")).not.toBeInTheDocument();
  });

  it("selects a hotel and persists the active and saved trip", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));
    render(<TravelOptionsPage kind="hotels" />);

    await waitFor(() => expect(screen.getByText("Hotel Mundial")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: /select stay/i })[0]);

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedHotel.id).toBe("h");
      expect(current.selectedStay.label).toBe("Memmo Alfama");
      expect(current.selectedHotel.totalPrice).toBe(240);
      expect(current.budget.totalEstimated).toBe(1660);
    });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem("roamly.savedTrips") ?? "[]");
      expect(saved[0].selectedHotel.id).toBe("h");
    });
    expect(pushMock).toHaveBeenCalledWith("/results");
  });

  it("filters internal flight results without showing provider names as options", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(createTripPlan()));
    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getByRole("heading", { name: /toronto to lisbon/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /^nonstop$/i }));

    expect(screen.getAllByText("Nonstop").length).toBeGreaterThan(0);
    expect(screen.queryByText("Google Flights")).not.toBeInTheDocument();
    expect(screen.queryByText("Expedia")).not.toBeInTheDocument();
  });

  it("selects a flight and updates the trip total", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    window.sessionStorage.setItem("roamly.currentTrip", JSON.stringify(plan));
    render(<TravelOptionsPage kind="flights" />);

    await waitFor(() => expect(screen.getAllByRole("button", { name: /select flight/i }).length).toBeGreaterThan(0));
    await user.click(screen.getAllByRole("button", { name: /select flight/i })[0]);

    await waitFor(() => {
      const current = JSON.parse(window.sessionStorage.getItem("roamly.currentTrip") ?? "{}");
      expect(current.selectedFlightQuote.airline).toBeTruthy();
      expect(current.selectedFlightQuote.departureTime).toBeTruthy();
      expect(current.budget.totalEstimated).toBeGreaterThan(plan.budget.totalEstimated);
    });
    expect(pushMock).toHaveBeenCalledWith("/results");
  });
});
