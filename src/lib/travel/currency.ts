import type { CurrencyCode } from "./types";

export const currencyOptions: { code: CurrencyCode; label: string }[] = [
  { code: "CAD", label: "CAD - Canadian dollar" },
  { code: "USD", label: "USD - US dollar" },
  { code: "EUR", label: "EUR - Euro" },
  { code: "GBP", label: "GBP - British pound" },
  { code: "AUD", label: "AUD - Australian dollar" },
  { code: "JPY", label: "JPY - Japanese yen" },
  { code: "MXN", label: "MXN - Mexican peso" }
];

// Static planning rates keep fallback estimates deterministic. Replace this with a live
// exchange-rate adapter only when the app can surface rate timestamps and failures.
const usdToCurrency: Record<CurrencyCode, number> = {
  USD: 1,
  CAD: 1.37,
  EUR: 0.92,
  GBP: 0.78,
  AUD: 1.51,
  JPY: 156,
  MXN: 18.2
};

export function normalizeCurrency(currency?: string): CurrencyCode {
  return currencyOptions.some((option) => option.code === currency) ? (currency as CurrencyCode) : "USD";
}

export function toUsd(amount: number, currency?: CurrencyCode): number {
  const code = normalizeCurrency(currency);
  return Math.round(amount / usdToCurrency[code]);
}

export function fromUsd(amount: number, currency?: CurrencyCode): number {
  const code = normalizeCurrency(currency);
  return Math.round(amount * usdToCurrency[code]);
}

export function convertUsdFields<T extends Record<string, unknown>>(value: T, currency: CurrencyCode, fields: (keyof T)[]): T {
  return fields.reduce(
    (next, field) => {
      const raw = next[field];
      if (typeof raw === "number") next[field] = fromUsd(raw, currency) as T[keyof T];
      return next;
    },
    { ...value }
  );
}

export function formatMoney(amount: number, currency?: CurrencyCode, options?: { maximumFractionDigits?: number }) {
  const code = normalizeCurrency(currency);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    maximumFractionDigits: options?.maximumFractionDigits ?? (code === "JPY" ? 0 : 0)
  }).format(amount);
}
