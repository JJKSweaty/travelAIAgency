import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LibraryBig } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "aiTravelAgency",
  description: "Budget-aware AI trip planning with hotels, transport, food, and itinerary recommendations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-paper">
              <Compass size={20} aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-reef">aiTravelAgency</span>
              <span className="block text-xs text-ink/60">Budget-first trip intelligence</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link className="rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-white/70 hover:text-ink" href="/">
              Planner
            </Link>
            <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-white/70 hover:text-ink" href="/saved">
              <LibraryBig size={16} aria-hidden />
              Saved
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
