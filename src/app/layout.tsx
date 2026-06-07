import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LibraryBig, Map } from "lucide-react";
import { AuthControl } from "@/components/AuthControl";
import { CurrencySelector } from "@/components/CurrencySelector";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roamly",
  description: "Budget-aware trip planning with hotels, transport, food, and itinerary recommendations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-ink/10 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-paper shadow-subtle">
                <Compass size={20} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-reef">Roamly</span>
                <span className="block truncate text-xs text-ink/60">Trips shaped around your budget</span>
              </span>
            </Link>
            <nav className="flex flex-1 items-center justify-end gap-2">
              <Link className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-paper hover:text-ink sm:inline-flex" href="/">
                <Map size={15} aria-hidden />
                Planner
              </Link>
              <Link className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-paper hover:text-ink sm:flex" href="/saved">
                <LibraryBig size={16} aria-hidden />
                Saved
              </Link>
              <CurrencySelector />
              <AuthControl />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
