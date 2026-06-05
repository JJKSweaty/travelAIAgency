"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudUpload, LogIn, LogOut, Mail, UserPlus } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { importGuestTrips, readSavedTrips } from "@/lib/travel/storage";

type AuthPageState = {
  email: string | null;
  input: string;
  password: string;
  message: string | null;
  loading: boolean;
  guestCount: number;
};

export function AuthPage() {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<AuthPageState>({ email: null, input: "", password: "", message: null, loading: false, guestCount: 0 });

  useEffect(() => {
    setState((current) => ({ ...current, guestCount: readSavedTrips().length }));
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setState((current) => ({ ...current, email: data.session?.user.email ?? null }));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((current) => ({ ...current, email: session?.user.email ?? null, message: null }));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function sendMagicLink() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase || !email) return;
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/auth` }
    });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "Could not send the sign-in link." : "Check your email for the Roamly sign-in link."
    }));
  }

  async function signInWithPassword() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase || !email || !state.password) return;
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password: state.password });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "Could not sign in with that email and password." : "Signed in.",
      password: error ? current.password : ""
    }));
  }

  async function createAccount() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase || !email || state.password.length < 6) {
      setState((current) => ({ ...current, message: "Use an email and a password with at least 6 characters." }));
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signUp({ email, password: state.password });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "Could not create that account." : "Account created. Check email if confirmation is enabled, then sign in."
    }));
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setState((current) => ({ ...current, email: null, message: "Signed out." }));
  }

  async function importLocalTrips() {
    try {
      const imported = await importGuestTrips();
      setState((current) => ({ ...current, guestCount: readSavedTrips().length, message: imported ? `Imported ${imported} guest trip${imported === 1 ? "" : "s"}.` : "No guest trips to import." }));
    } catch {
      setState((current) => ({ ...current, message: "Guest trips could not be imported. Check the Supabase trips table and RLS policies." }));
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <section className="glass-panel rounded-lg p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-reef">Account</p>
        <h1 className="mt-3 text-4xl font-semibold">Save trips locally or sync with Supabase.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/64">
          Guest mode keeps plans on this device. Logging in stores saved trips in your Supabase-backed Roamly library.
        </p>

        {!configured ? (
          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-5">
            <p className="font-semibold">Supabase is not configured.</p>
            <p className="mt-2 text-sm leading-6 text-ink/62">Roamly will continue in guest mode until `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.</p>
          </div>
        ) : state.email ? (
          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-reef">Signed in</p>
            <p className="mt-2 text-xl font-semibold">{state.email}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="focus-ring rounded-lg bg-reef px-4 py-3 text-sm font-semibold text-white" href="/saved">
                Open saved trips
              </Link>
              <button className="focus-ring inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink/70 hover:text-coral" onClick={signOut}>
                <LogOut size={16} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/70">
                <Mail size={17} aria-hidden />
                Email
              </span>
              <input
                className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3"
                type="email"
                value={state.input}
                onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-2 text-sm font-semibold text-ink/70">Password</span>
              <input
                className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3"
                type="password"
                value={state.password}
                onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper hover:bg-reef disabled:opacity-60" disabled={state.loading} onClick={signInWithPassword}>
                <LogIn size={16} aria-hidden />
                Log in
              </button>
              <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-ink/70 shadow-subtle hover:text-reef disabled:opacity-60" disabled={state.loading} onClick={createAccount}>
                <UserPlus size={16} aria-hidden />
                Create account
              </button>
              <button className="focus-ring rounded-lg border border-ink/10 px-4 py-3 text-sm font-semibold text-ink/62 hover:text-reef disabled:opacity-60" disabled={state.loading} onClick={sendMagicLink}>
                Magic link
              </button>
            </div>
          </div>
        )}

        {state.message ? <p className="mt-5 rounded-lg bg-reef/10 px-4 py-3 text-sm font-medium text-reef">{state.message}</p> : null}
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg bg-white p-5 shadow-subtle">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-reef">Guest mode</p>
          <p className="mt-3 text-3xl font-semibold">{state.guestCount}</p>
          <p className="mt-1 text-sm text-ink/58">saved on this device</p>
          {configured && state.email && state.guestCount > 0 ? (
            <button className="focus-ring mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-reef px-4 py-3 text-sm font-semibold text-white" onClick={importLocalTrips}>
              <CloudUpload size={16} aria-hidden />
              Import guest trips
            </button>
          ) : null}
        </div>
        <Link className="rounded-lg bg-ink px-4 py-3 text-center text-sm font-semibold text-paper" href="/">
          Continue as guest
        </Link>
      </aside>
    </main>
  );
}
