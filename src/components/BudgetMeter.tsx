import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { budgetFitScore } from "@/lib/travel/budget";
import { formatMoney } from "@/lib/travel/currency";
import type { BudgetBreakdown, CurrencyCode } from "@/lib/travel/types";

export function BudgetMeter({ budget, currency }: { budget: BudgetBreakdown; currency?: CurrencyCode }) {
  const score = budgetFitScore(budget);
  const overBudget = budget.remaining < 0;
  const categories = [
    { label: "Lodging", value: budget.lodging },
    { label: "Transport", value: budget.transport },
    { label: "Food", value: budget.food },
    { label: "Activities", value: budget.activities },
    { label: "Buffer", value: budget.buffer }
  ];
  const topCategory = categories.slice(0, 4).sort((a, b) => b.value - a.value)[0];

  return (
    <div className="rounded-lg bg-ink p-5 text-paper">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-paper/55">Budget fit</p>
          <p className="mt-1 text-3xl font-semibold">{score}%</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm capitalize ${overBudget ? "bg-coral/20 text-coral" : "bg-white/12 text-paper/80"}`}>
          {overBudget ? <AlertTriangle size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
          {budget.feasibility}
        </span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/15">
        <div className={`h-3 rounded-full transition-all ${overBudget ? "bg-coral" : "bg-reef"}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-4 text-sm leading-6 text-paper/72">
        {overBudget
          ? `This plan is over budget by ${formatMoney(Math.abs(budget.remaining), currency)}. ${topCategory.label} is the largest category.`
          : `${formatMoney(budget.remaining, currency)} remains after the recommended plan. ${topCategory.label} is the largest category.`}
      </p>
      <div className="mt-4 grid gap-2 text-sm">
        {categories.map((category) => (
          <div key={category.label} className="flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
            <span className="text-paper/68">{category.label}</span>
            <span className="font-semibold">{formatMoney(category.value, currency)}</span>
          </div>
        ))}
      </div>
      {budget.warnings.length > 0 ? (
        <div className="mt-4 grid gap-2 text-xs leading-5 text-coral">
          {budget.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
