import { describe, expect, it } from "vitest";
import { formatMoney, fromUsd, normalizeCurrency, toUsd } from "./currency";

describe("currency utilities", () => {
  it("normalizes unsupported currency codes to USD", () => {
    expect(normalizeCurrency("CAD")).toBe("CAD");
    expect(normalizeCurrency("BRL")).toBe("USD");
  });

  it("converts between USD and supported planning currencies", () => {
    expect(toUsd(1370, "CAD")).toBe(1000);
    expect(fromUsd(1000, "CAD")).toBe(1370);
  });

  it("formats money with the selected currency", () => {
    expect(formatMoney(2400, "CAD")).toContain("CA$2,400");
    expect(formatMoney(2400, "USD")).toBe("$2,400");
  });
});
