"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, CloudUpload, KeyRound, Lock, LogIn, LogOut, Mail, MapPinned, Plane, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { importGuestTrips, readSavedTrips } from "@/lib/travel/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "signup" | "magic";

type AuthPageState = {
  email: string | null;
  input: string;
  password: string;
  message: string | null;
  messageTone: "success" | "error";
  loading: boolean;
  guestCount: number;
  mode: AuthMode;
};

export function AuthPage() {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<AuthPageState>({ email: null, input: "", password: "", message: null, messageTone: "success", loading: false, guestCount: 0, mode: "login" });
  const availableTripCount = deviceTripCount(state.guestCount);

  useEffect(() => {
    const task = window.setTimeout(() => {
      setState((current) => ({ ...current, guestCount: readSavedTrips().length }));
    }, 0);
    const supabase = getSupabaseClient();
    if (!supabase) return () => window.clearTimeout(task);

    supabase.auth.getSession().then(({ data }) => {
      setState((current) => ({ ...current, email: data.session?.user.email ?? null }));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((current) => ({ ...current, email: session?.user.email ?? null, message: null }));
    });
    return () => {
      window.clearTimeout(task);
      data.subscription.unsubscribe();
    };
  }, []);

  function setMode(mode: AuthMode) {
    setState((current) => ({ ...current, mode, message: null }));
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setMessage(message: string, messageTone: AuthPageState["messageTone"] = "success") {
    setState((current) => ({ ...current, message, messageTone, loading: false }));
  }

  async function sendMagicLink() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!validateEmail(email)) {
      setMessage("Enter a valid email address.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/auth` }
    });
    setMessage(error ? "We could not send the sign-in link. Try again." : "Check your email for a secure sign-in link.", error ? "error" : "success");
  }

  async function signInWithPassword() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!validateEmail(email) || !state.password) {
      setMessage("Enter your email and password.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password: state.password });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "The email or password does not match." : "You are signed in.",
      messageTone: error ? "error" : "success",
      password: error ? current.password : ""
    }));
  }

  async function createAccount() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!validateEmail(email) || state.password.length < 6) {
      setMessage("Use an email and a password with at least 6 characters.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signUp({ email, password: state.password });
    setMessage(error ? "We could not create the account. Try again." : "Account created. Check your email to finish setup.", error ? "error" : "success");
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setState((current) => ({ ...current, email: null, message: "You are signed out.", messageTone: "success" }));
  }

  async function importLocalTrips() {
    try {
      const imported = await importGuestTrips();
      setState((current) => ({ ...current, guestCount: readSavedTrips().length, message: imported ? `Added ${imported} saved trip${imported === 1 ? "" : "s"} to your account.` : "No trips to move right now.", messageTone: "success" }));
    } catch {
      setMessage("We could not move those saved trips. Try again in a moment.", "error");
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.mode === "login") await signInWithPassword();
    if (state.mode === "signup") await createAccount();
    if (state.mode === "magic") await sendMagicLink();
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <section className="relative min-h-[520px] overflow-hidden rounded-lg bg-ink text-paper shadow-soft">
        <div
          className="absolute inset-0 opacity-55"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80)",
            backgroundPosition: "center",
            backgroundSize: "cover"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/76 to-reef/45" />
        <div className="relative flex h-full min-h-[520px] flex-col justify-between p-6 sm:p-8">
          <div>
            <Badge variant="coral" className="bg-coral text-white">
              Roamly account
            </Badge>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">Save trips and compare options later.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-paper/78">
              Save your itineraries, revisit hotel and flight choices, and pick up planning from any device.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ValueTile icon={<MapPinned size={18} />} label="Saved plans" text="Return to trip details later." />
            <ValueTile icon={<Plane size={18} />} label="Fast changes" text="Compare options without starting over." />
            <ValueTile icon={<ShieldCheck size={18} />} label="Private by design" text="Your plans stay with your account." />
          </div>
        </div>
      </section>

      <section className="grid content-center gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-ink/10 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{state.email ? "You are signed in" : "Plan smarter with Roamly"}</CardTitle>
                <CardDescription>{state.email ? "Your saved trips are ready whenever you come back." : "Sign in to save trips, compare choices, and access details later."}</CardDescription>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-reef/10 text-reef">
                <Sparkles size={18} aria-hidden />
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-5">
            {!configured ? (
              <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-sm text-ink/70">
                <p className="font-semibold text-ink">Account sign-in is temporarily unavailable.</p>
                <p className="mt-1">You can still plan trips and return to them in this browser.</p>
              </div>
            ) : state.email ? (
              <div className="rounded-lg border border-reef/20 bg-reef/5 p-5">
                <Badge>
                  <CheckCircle2 size={14} aria-hidden />
                  Signed in
                </Badge>
                <p className="mt-4 break-all text-xl font-semibold">{state.email}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild>
                    <Link href="/saved">
                      Open saved trips
                      <ArrowRight size={16} aria-hidden />
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={signOut}>
                    <LogOut size={16} aria-hidden />
                    Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <form className="grid gap-5" onSubmit={submitAuth}>
                <div className="grid grid-cols-3 rounded-lg border border-ink/10 bg-paper p-1">
                  <AuthModeButton active={state.mode === "login"} icon={<LogIn size={15} />} label="Log in" onClick={() => setMode("login")} />
                  <AuthModeButton active={state.mode === "signup"} icon={<UserPlus size={15} />} label="Create" onClick={() => setMode("signup")} />
                  <AuthModeButton active={state.mode === "magic"} icon={<KeyRound size={15} />} label="Email link" onClick={() => setMode("magic")} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail size={17} aria-hidden />
                    Email
                  </Label>
                  <Input id="email" type="email" autoComplete="email" value={state.input} onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))} />
                </div>

                {state.mode !== "magic" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock size={17} aria-hidden />
                      Password
                    </Label>
                    <Input id="password" type="password" autoComplete={state.mode === "signup" ? "new-password" : "current-password"} value={state.password} onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))} />
                  </div>
                ) : null}

                <Button disabled={state.loading} type="submit" size="lg">
                  {state.loading ? "Working..." : authCta(state.mode)}
                </Button>
              </form>
            )}

            {state.message ? (
              <p className={`mt-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${state.messageTone === "error" ? "bg-coral/10 text-coral" : "bg-reef/10 text-reef"}`}>
                {state.messageTone === "error" ? <AlertCircle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
                {state.message}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">Available trips</p>
              <p className="mt-1 text-sm text-ink/60">You have {availableTripCount} trip{availableTripCount === 1 ? "" : "s"} ready to continue.</p>
            </div>
            {configured && state.email && availableTripCount > 0 ? (
              <Button variant="reef" onClick={importLocalTrips}>
                <CloudUpload size={16} aria-hidden />
                Add to account
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/">Continue planning</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function deviceTripCount(fallback: number) {
  if (typeof window === "undefined") return fallback;
  return Math.max(fallback, readSavedTrips().length);
}

function ValueTile({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur">
      <span className="text-coral">{icon}</span>
      <p className="mt-3 font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-5 text-paper/68">{text}</p>
    </div>
  );
}

function AuthModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-semibold transition ${active ? "bg-white text-ink shadow-subtle" : "text-ink/58 hover:text-reef"}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function authCta(mode: AuthMode) {
  if (mode === "signup") return "Create account";
  if (mode === "magic") return "Send magic link";
  return "Log in";
}
