import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthControl } from "./AuthControl";
import { AuthPage } from "./AuthPage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createTripPlan } from "@/test/fixtures";

const upsertMock = vi.fn();
const mockClient = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOtp: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn()
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(() => mockClient)
}));

describe("AuthControl", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    upsertMock.mockResolvedValue({ error: null });
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockClient.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockClient.from.mockReturnValue({ upsert: upsertMock });
  });

  it("links the compact header auth control to the auth page", async () => {
    render(<AuthControl />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/auth");
  });

  it("renders account link when sign-in is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    render(<AuthControl />);
    expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute("href", "/auth");
  });

  it("imports guest trips after login", async () => {
    const user = userEvent.setup();
    const plan = createTripPlan();
    window.localStorage.setItem("roamly.savedTrips", JSON.stringify([plan]));
    mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1", email: "traveler@example.com" } } } });

    render(<AuthPage />);

    await waitFor(() => expect(screen.getByText("traveler@example.com")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /add to account/i }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    expect(window.localStorage.getItem("roamly.savedTrips")).toBeNull();
    expect(screen.getByText(/added 1 saved trip/i)).toBeInTheDocument();
  });
});
