"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, CloudUpload, KeyRound, LogIn, LogOut, Mail, UserPlus } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { importGuestTrips, readSavedTrips } from "@/lib/travel/storage";

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
      setMessage("Enter a valid email.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/auth` }
    });
    setMessage(error ? "Could not send link." : "Check your email.", error ? "error" : "success");
  }

  async function signInWithPassword() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!validateEmail(email) || !state.password) {
      setMessage("Email and password required.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password: state.password });
    setState((current) => ({
      ...current,
      loading: false,
      message: error ? "Wrong email or password." : "Signed in.",
      messageTone: error ? "error" : "success",
      password: error ? current.password : ""
    }));
  }

  async function createAccount() {
    const email = state.input.trim();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    if (!validateEmail(email) || state.password.length < 6) {
      setMessage("Use email and 6+ character password.", "error");
      return;
    }
    setState((current) => ({ ...current, loading: true, message: null }));
    const { error } = await supabase.auth.signUp({ email, password: state.password });
    setMessage(error ? "Could not create account." : "Account created. Check email.", error ? "error" : "success");
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setState((current) => ({ ...current, email: null, message: "Signed out.", messageTone: "success" }));
  }

  async function importLocalTrips() {
    try {
      const imported = await importGuestTrips();
      setState((current) => ({ ...current, guestCount: readSavedTrips().length, message: imported ? `Imported ${imported} guest trip${imported === 1 ? "" : "s"}.` : "No guest trips.", messageTone: "success" }));
    } catch {
      setMessage("Import failed. Check Supabase RLS.", "error");
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.mode === "login") await signInWithPassword();
    if (state.mode === "signup") await createAccount();
    if (state.mode === "magic") await sendMagicLink();
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
      <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-subtle">
        <div className="border-b border-ink/10 bg-ink p-6 text-paper sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">Roamly account</p>
          <h1 className="mt-3 text-3xl font-semibold">Sync saved trips.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-paper/68">Sign in to keep plans across devices.</p>
        </div>

        {!configured ? (
          <div className="m-6 rounded-lg border border-coral/20 bg-coral/10 p-4 text-sm text-coral">
            <p className="font-semibold">Supabase not configured.</p>
            <p className="mt-1 text-coral/80">Guest saves still work.</p>
          </div>
        ) : state.email ? (
          <div className="m-6 rounded-lg border border-ink/10 bg-paper/70 p-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-reef/10 px-3 py-1 text-sm font-semibold text-reef">
              <CheckCircle2 size={15} aria-hidden />
              Signed in
            </span>
            <p className="mt-4 text-xl font-semibold">{state.email}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="focus-ring rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper hover:bg-reef" href="/saved">
                Open saved trips
              </Link>
              <button className="focus-ring inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink/70 hover:text-coral" onClick={signOut}>
                <LogOut size={16} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form className="m-6 grid gap-5" onSubmit={submitAuth}>
            <div className="grid grid-cols-3 rounded-lg border border-ink/10 bg-paper p-1">
              <AuthModeButton active={state.mode === "login"} icon={<LogIn size={15} />} label="Log in" onClick={() => setMode("login")} />
              <AuthModeButton active={state.mode === "signup"} icon={<UserPlus size={15} />} label="Create" onClick={() => setMode("signup")} />
              <AuthModeButton active={state.mode === "magic"} icon={<KeyRound size={15} />} label="Link" onClick={() => setMode("magic")} />
            </div>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/70">
                <Mail size={17} aria-hidden />
                Email
              </span>
              <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="email" autoComplete="email" value={state.input} onChange={(event) => setState((current) => ({ ...current, input: event.target.value }))} />
            </label>

            {state.mode !== "magic" ? (
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/70">
                  <KeyRound size={17} aria-hidden />
                  Password
                </span>
                <input className="focus-ring w-full rounded-lg border border-ink/10 bg-white px-3 py-3" type="password" autoComplete={state.mode === "signup" ? "new-password" : "current-password"} value={state.password} onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))} />
              </label>
            ) : null}

            <button className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-reef disabled:cursor-not-allowed disabled:opacity-60" disabled={state.loading} type="submit">
              {state.loading ? "Working..." : authCta(state.mode)}
            </button>
          </form>
        )}

        {state.message ? (
          <p className={`mx-6 mb-6 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${state.messageTone === "error" ? "bg-coral/10 text-coral" : "bg-reef/10 text-reef"}`}>
            {state.messageTone === "error" ? <AlertCircle size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
            {state.message}
          </p>
        ) : null}
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-subtle">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-reef">Local saves</p>
          <p className="mt-3 text-4xl font-semibold">{state.guestCount}</p>
          <p className="mt-1 text-sm text-ink/58">on this device</p>
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

function AuthModeButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`focus-ring inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${active ? "bg-white text-ink shadow-subtle" : "text-ink/58 hover:text-reef"}`} onClick={onClick}>
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
