"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Mail } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthState = {
  email: string | null;
  input: string;
  password: string;
  message: string | null;
  loading: boolean;
};

export function AuthControl() {
  const [state, setState] = useState<AuthState>({ email: null, input: "", password: "", message: null, loading: false });
  const configured = isSupabaseConfigured();

  useEffect(() => {
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
      options: { emailRedirectTo: typeof window === "undefined" ? undefined : window.location.origin }
    });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "Could not send sign-in link." : "Check your email for the Roamly sign-in link."
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
      message: error ? "Could not sign in with that email and password." : null,
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
  }

  if (!configured) {
    return <span className="hidden rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink/58 shadow-subtle sm:inline-flex">Guest mode</span>;
  }

  if (state.email) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-44 truncate text-sm font-medium text-ink/62 sm:inline">{state.email}</span>
        <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink/70 shadow-subtle transition hover:text-coral" onClick={signOut}>
          <LogOut size={15} aria-hidden />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="sr-only" htmlFor="auth-email">
        Email
      </label>
      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-subtle">
        <Mail size={15} className="text-reef" aria-hidden />
        <input
          id="auth-email"
          className="w-36 bg-transparent text-sm outline-none placeholder:text-ink/38 sm:w-44"
          type="email"
          placeholder="email for saves"
          value={state.input}
          onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))}
        />
      </div>
      <label className="sr-only" htmlFor="auth-password">
        Password
      </label>
      <input
        id="auth-password"
        className="focus-ring w-32 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm shadow-subtle placeholder:text-ink/38 sm:w-40"
        type="password"
        placeholder="password"
        value={state.password}
        onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))}
      />
      <button className="focus-ring inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper transition hover:bg-reef disabled:opacity-60" disabled={state.loading} onClick={signInWithPassword}>
        <LogIn size={15} aria-hidden />
        {state.loading ? "Working" : "Log in"}
      </button>
      <button className="focus-ring rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink/70 shadow-subtle transition hover:text-reef disabled:opacity-60" disabled={state.loading} onClick={createAccount}>
        Create
      </button>
      <button className="focus-ring rounded-lg px-2 py-2 text-xs font-semibold text-ink/52 transition hover:text-reef disabled:opacity-60" disabled={state.loading} onClick={sendMagicLink}>
        Magic link
      </button>
      {state.message ? <span className="basis-full text-right text-xs font-medium text-ink/58">{state.message}</span> : null}
    </div>
  );
}
