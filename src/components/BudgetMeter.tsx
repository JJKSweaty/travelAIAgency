import { budgetFitScore } from "@/lib/travel/budget";
import type { BudgetBreakdown } from "@/lib/travel/types";

export function BudgetMeter({ budget }: { budget: BudgetBreakdown }) {
  const score = budgetFitScore(budget);
  return (
    <div className="rounded-lg bg-ink p-5 text-paper">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-paper/55">Budget fit</p>
          <p className="mt-1 text-3xl font-semibold">{score}%</p>
        </div>
        <span className="rounded-full bg-white/12 px-3 py-1 text-sm capitalize text-paper/80">{budget.feasibility}</span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/15">
        <div className="h-3 rounded-full bg-coral transition-all" style={{ width: `${score}%` }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-paper/75">
        <span>Estimate ${budget.totalEstimated.toLocaleString()}</span>
        <span className="text-right">Remaining ${budget.remaining.toLocaleString()}</span>
      </div>
    </div>
  );
}
