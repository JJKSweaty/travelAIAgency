import Link from "next/link";
import { BedDouble, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/travel/currency";
import type { CurrencyCode, PriceComparison, PriceQuote } from "@/lib/travel/types";

export function PriceComparisonChart({ comparison, currency }: { comparison: PriceComparison; currency?: CurrencyCode }) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Price comparison</h2>
          <p className="mt-1 text-sm text-ink/60">Compare package estimates and choose the option that best fits this trip.</p>
        </div>
        <div className="hidden rounded-lg bg-reef/10 px-3 py-2 text-sm font-semibold text-reef sm:block">
          {comparison.lowestFlight && comparison.lowestHotel
            ? `${formatMoney(comparison.lowestFlight.estimatedPrice + comparison.lowestHotel.estimatedPrice, currency)} low pair`
            : "Estimate mode"}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <QuoteGroup title="Flights" icon={<Plane size={18} />} quotes={comparison.flights} currency={currency} href="/options/flights" cta="Compare flights" />
        <QuoteGroup title="Hotels" icon={<BedDouble size={18} />} quotes={comparison.hotels} currency={currency} href="/options/hotels" cta="Compare stays" />
      </div>
    </section>
  );
}

function QuoteGroup({ title, icon, quotes, currency, href, cta }: { title: string; icon: React.ReactNode; quotes: PriceQuote[]; currency?: CurrencyCode; href: string; cta: string }) {
  const max = Math.max(...quotes.map((quote) => quote.estimatedPrice), 1);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-ink/60">
        {icon}
        {title}
      </h3>
      <div className="grid gap-3">
        {quotes.map((quote, index) => {
          const width = Math.max(18, Math.round((quote.estimatedPrice / max) * 100));
          return (
            <div key={quote.id} className="rounded-lg bg-white/76 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{quoteLabel(quote, index)}</span>
                <span className="font-semibold">
                  {formatMoney(quote.estimatedPrice, currency)} <span className="text-xs font-medium text-ink/48">/{quote.unit}</span>
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink/10">
                <div className={`h-2 rounded-full ${index === 0 ? "bg-reef" : "bg-gold"}`} style={{ width: `${width}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/50">
                <span className="flex flex-wrap gap-2 font-medium">
                  <Badge>{quote.category === "flight" ? "Flight package" : "Stay package"}</Badge>
                  <Badge variant="secondary">{quote.linkLabel?.startsWith("Exact") ? "Date-aware" : "Flexible dates"}</Badge>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

function quoteLabel(quote: PriceQuote, index: number) {
  if (quote.category === "flight") {
    return ["Best value fare", "Flexible fare", "Lower fare", "Comfort fare"][index] ?? "Flight fare";
  }
  return ["Value stay estimate", "Central stay estimate", "Flexible stay estimate", "Upgraded stay estimate"][index] ?? "Stay estimate";
}
