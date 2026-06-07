"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
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
    <Select value={currency} onValueChange={changeCurrency}>
      <SelectTrigger className="h-10 w-[132px] gap-2 border-ink/10 bg-white px-3 font-semibold shadow-subtle" aria-label="Currency">
        <Banknote size={16} className="shrink-0 text-reef" aria-hidden />
        <SelectValue aria-label="Currency" />
      </SelectTrigger>
      <SelectContent>
        {currencyOptions.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-semibold">{option.code}</span>
              <span className="truncate text-ink/60">{option.label.replace(`${option.code} - `, "")}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
