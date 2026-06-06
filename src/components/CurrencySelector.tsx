"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { currencyOptions } from "@/lib/travel/currency";
import type { CurrencyCode } from "@/lib/travel/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const currencyKey = "roamly.currency";

export function readCurrencyPreference(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(currencyKey) as CurrencyCode | null;
  return currencyOptions.some((option) => option.code === value) ? value : null;
}

export function writeCurrencyPreference(currency: CurrencyCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(currencyKey, currency);
  window.dispatchEvent(new CustomEvent("roamly:currency-change", { detail: currency }));
}

export function CurrencySelector() {
  const [currency, setCurrency] = useState<CurrencyCode>(() => readCurrencyPreference() ?? "CAD");

  function changeCurrency(value: string) {
    const next = value as CurrencyCode;
    setCurrency(next);
    writeCurrencyPreference(next);
  }

  return (
    <div className="flex min-w-[118px] items-center gap-2 rounded-lg border border-ink/10 bg-white px-2 py-1.5 shadow-subtle">
      <DollarSign size={16} className="shrink-0 text-reef" aria-hidden />
      <span className="sr-only">Currency</span>
      <Select value={currency} onValueChange={changeCurrency}>
        <SelectTrigger className="h-8 border-0 bg-transparent px-0 py-0 shadow-none" aria-label="Currency">
          <SelectValue aria-label="Currency" />
        </SelectTrigger>
        <SelectContent>
          {currencyOptions.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
