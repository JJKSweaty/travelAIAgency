import { Plane, BedDouble } from "lucide-react";
import type { PriceComparison, PriceQuote } from "@/lib/travel/types";

export function PriceComparisonChart({ comparison }: { comparison: PriceComparison }) {
  return (
    <section className="glass-panel rounded-lg p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Price comparison</h2>
          <p className="mt-1 text-sm text-ink/60">Estimated source-by-source prices. Open a source to verify live availability.</p>
        </div>
        <div className="hidden rounded-lg bg-reef/10 px-3 py-2 text-sm font-semibold text-reef sm:block">
          {comparison.lowestFlight && comparison.lowestHotel
            ? `$${(comparison.lowestFlight.estimatedPrice + comparison.lowestHotel.estimatedPrice).toLocaleString()} low pair`
            : "Estimate mode"}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <QuoteGroup title="Flights" icon={<Plane size={18} />} quotes={comparison.flights} />
        <QuoteGroup title="Hotels" icon={<BedDouble size={18} />} quotes={comparison.hotels} />
      </div>
    </section>
  );
}

function QuoteGroup({ title, icon, quotes }: { title: string; icon: React.ReactNode; quotes: PriceQuote[] }) {
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
            <a key={quote.id} className="rounded-lg bg-white/76 p-3 transition hover:bg-white" href={quote.link} target="_blank" rel="noreferrer">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{quote.displayName}</span>
                <span className="font-semibold">
                  ${quote.estimatedPrice.toLocaleString()} <span className="text-xs font-medium text-ink/48">/{quote.unit}</span>
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink/10">
                <div className={`h-2 rounded-full ${index === 0 ? "bg-reef" : "bg-gold"}`} style={{ width: `${width}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink/50">
                <span>{quote.source === "live" ? "Live quote" : "Estimated quote"}</span>
                <span>{Math.round(quote.confidence * 100)}% confidence</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
