"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { currencyOptions } from "@/lib/travel/currency";
import type { CurrencyCode } from "@/lib/travel/types";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

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
  const selected = currencyOptions.find((option) => option.code === currency) ?? currencyOptions[0];

  function changeCurrency(value: string) {
    const next = value as CurrencyCode;
    setCurrency(next);
    writeCurrencyPreference(next);
  }

  return (
    <Select value={currency} onValueChange={changeCurrency}>
      <SelectTrigger
        className="h-10 w-[118px] shrink-0 justify-start gap-2 rounded-md border-ink/10 bg-white px-2.5 text-ink shadow-subtle hover:border-reef/40 hover:bg-paper/70 data-[state=open]:border-reef/50 data-[state=open]:ring-2 data-[state=open]:ring-reef/15"
        aria-label={`Currency, ${selected.label}`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-reef/10 text-reef">
          <Banknote size={15} aria-hidden />
        </span>
        <span className="grid min-w-0 text-left leading-none">
          <span className="text-sm font-semibold">{selected.code}</span>
          <span className="mt-0.5 truncate text-[11px] font-medium text-ink/52">Currency</span>
        </span>
      </SelectTrigger>
      <SelectContent className="w-[220px]">
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
