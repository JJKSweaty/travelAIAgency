"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserCircle } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthControl() {
  const [email, setEmail] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return (
      <Link className="hidden rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink/58 shadow-subtle sm:inline-flex" href="/auth">
        Guest mode
      </Link>
    );
  }

  return (
    <Link className="focus-ring inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink/70 shadow-subtle transition hover:text-reef" href="/auth">
      {email ? <UserCircle size={16} aria-hidden /> : <LogIn size={16} aria-hidden />}
      <span className="max-w-36 truncate">{email ?? "Log in"}</span>
    </Link>
  );
}
