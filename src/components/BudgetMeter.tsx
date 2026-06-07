import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, WalletCards } from "lucide-react";
import { budgetFitScore } from "@/lib/travel/budget";
import { formatMoney } from "@/lib/travel/currency";
import type { BudgetBreakdown, CurrencyCode } from "@/lib/travel/types";

type BudgetAction = {
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function BudgetMeter({ budget, currency, actions = [] }: { budget: BudgetBreakdown; currency?: CurrencyCode; actions?: BudgetAction[] }) {
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
  const recommendations = buildBudgetRecommendations(budget, topCategory.label, currency);

  return (
    <div className="rounded-lg bg-ink p-5 text-paper shadow-subtle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-paper/60">Budget fit</p>
          <p className="mt-1 text-3xl font-semibold">{score}%</p>
          <p className="mt-1 text-xs text-paper/50">Estimated spend {formatMoney(budget.totalEstimated, currency)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm capitalize ${overBudget ? "bg-coral/20 text-coral" : "bg-white/12 text-paper/80"}`}>
          {overBudget ? <AlertTriangle size={14} aria-hidden /> : <CheckCircle2 size={14} aria-hidden />}
          {budget.feasibility}
        </span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/15">
        <div className={`h-3 rounded-full transition-all ${overBudget ? "bg-coral" : "bg-reef"}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-4 text-sm leading-6 text-paper/70">
        {overBudget
          ? `This plan is over budget by ${formatMoney(Math.abs(budget.remaining), currency)}. ${topCategory.label} is the largest category.`
          : `${formatMoney(budget.remaining, currency)} remains after the recommended plan. ${topCategory.label} is the largest category.`}
      </p>
      <div className="mt-4 grid gap-2 text-sm">
        {categories.map((category) => (
          <div key={category.label} className="rounded-lg bg-white/10 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-paper/70">{category.label}</span>
              <span className="font-semibold">{formatMoney(category.value, currency)}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div className="h-1.5 rounded-full bg-white/50" style={{ width: `${Math.min(100, Math.max(6, Math.round((category.value / Math.max(1, budget.totalEstimated)) * 100)))}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-white/10 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-paper/60">
          <WalletCards size={14} aria-hidden />
          Budget moves
        </p>
        <div className="mt-3 grid gap-2">
          {recommendations.map((recommendation) => (
            <p key={recommendation} className="text-sm leading-5 text-paper/75">
              {recommendation}
            </p>
          ))}
        </div>
      </div>
      {actions.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.label} className="group rounded-lg bg-white px-3 py-3 text-ink transition hover:bg-paper" href={action.href}>
                <BudgetActionContent action={action} />
              </Link>
            ) : (
              <button key={action.label} className="group rounded-lg bg-white px-3 py-3 text-left text-ink transition hover:bg-paper disabled:opacity-60" onClick={action.onClick} disabled={action.disabled}>
                <BudgetActionContent action={action} />
              </button>
            )
          )}
        </div>
      ) : null}
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

function BudgetActionContent({ action }: { action: BudgetAction }) {
  return (
    <>
      <span className="flex items-center justify-between gap-3 text-sm font-semibold">
        {action.label}
        <ArrowRight size={15} className="shrink-0 text-reef transition group-hover:translate-x-0.5" aria-hidden />
      </span>
      <span className="mt-1 block text-xs leading-5 text-ink/60">{action.description}</span>
    </>
  );
}

function buildBudgetRecommendations(budget: BudgetBreakdown, topCategory: string, currency?: CurrencyCode) {
  if (budget.remaining < 0) {
    return [
      `Cut about ${formatMoney(Math.abs(budget.remaining), currency)} from ${topCategory.toLowerCase()} or switch to a cheaper destination.`,
      "Use public transit and value stays before trimming food or core activities."
    ];
  }

  if (budget.feasibility === "comfortable") {
    return [
      `Keep at least ${formatMoney(Math.min(budget.buffer, budget.remaining), currency)} as a price-change buffer.`,
      `Upgrade selectively in ${topCategory.toLowerCase()} after comparing package options.`
    ];
  }

  return [
    `${topCategory} is the main lever. Compare options before adding paid activities.`,
    "Hold the buffer until flights and lodging choices are selected."
  ];
}
