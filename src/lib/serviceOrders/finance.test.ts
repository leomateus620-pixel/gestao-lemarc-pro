import { describe, expect, it } from "vitest";
import {
  computeDisplacementCents,
  computeDurationMinutes,
  computeSubtotalCents,
  computeTotals,
  enrichEntry,
  formatBRL,
  minutesToDecimalHours,
  parseBRLToCents,
  timeToMinutes,
} from "./finance";

describe("computeDurationMinutes", () => {
  it("calcula 9h30 entre 08:00 e 17:30", () => {
    expect(computeDurationMinutes("08:00", "17:30")).toBe(9 * 60 + 30);
  });
  it("calcula 7h18 entre 07:42 e 15:00", () => {
    expect(computeDurationMinutes("07:42", "15:00")).toBe(7 * 60 + 18);
  });
  it("rejeita saída anterior à entrada", () => {
    expect(() => computeDurationMinutes("17:00", "08:00")).toThrow();
  });
});

describe("minutesToDecimalHours", () => {
  it("9h30 = 9.5", () => {
    expect(minutesToDecimalHours(9 * 60 + 30)).toBe(9.5);
  });
  it("10h55 ≈ 10.9167", () => {
    expect(minutesToDecimalHours(10 * 60 + 55)).toBeCloseTo(10.9167, 4);
  });
});

describe("computeSubtotalCents", () => {
  it("9.5h × R$ 85,00 = R$ 807,50", () => {
    const cents = computeSubtotalCents(9 * 60 + 30, 8500);
    expect(cents).toBe(80750);
    expect(formatBRL(cents).replace(/\s/g, " ")).toBe("R$ 807,50");
  });
  it("retorna 0 quando faltam dados", () => {
    expect(computeSubtotalCents(0, 8500)).toBe(0);
    expect(computeSubtotalCents(60, 0)).toBe(0);
  });
});

describe("parseBRLToCents", () => {
  it("aceita vírgula", () => expect(parseBRLToCents("85,00")).toBe(8500));
  it("aceita ponto decimal", () => expect(parseBRLToCents("85.5")).toBe(8550));
  it("aceita formato brasileiro 1.520,00", () => expect(parseBRLToCents("R$ 1.520,00")).toBe(152000));
  it("aceita número", () => expect(parseBRLToCents(2.5)).toBe(250));
});

describe("computeDisplacementCents", () => {
  it("none = 0", () =>
    expect(
      computeDisplacementCents({
        type: "none",
        count: 0,
        km_total: 0,
        rate_cents: 0,
        fixed_total_cents: 0,
      }),
    ).toBe(0));
  it("per_km: 190 km × R$ 2,50 = R$ 475,00", () => {
    expect(
      computeDisplacementCents({
        type: "per_km",
        count: 1,
        km_total: 190,
        rate_cents: 250,
        fixed_total_cents: 0,
      }),
    ).toBe(47500);
  });
  it("fixed mantém o valor informado", () => {
    expect(
      computeDisplacementCents({
        type: "fixed",
        count: 1,
        km_total: 0,
        rate_cents: 0,
        fixed_total_cents: 42750,
      }),
    ).toBe(42750);
  });
});

describe("computeTotals", () => {
  it("soma múltiplos técnicos e dias + deslocamento", () => {
    const a = enrichEntry({
      technician_id: "t1",
      work_date: "2026-06-15",
      start_time: "08:00",
      end_time: "17:30",
      hourly_rate_cents: 8500,
    });
    const b = enrichEntry({
      technician_id: "t2",
      work_date: "2026-06-15",
      start_time: "08:00",
      end_time: "17:30",
      hourly_rate_cents: 6000,
    });
    const c = enrichEntry({
      technician_id: "t1",
      work_date: "2026-06-16",
      start_time: "07:00",
      end_time: "12:00",
      hourly_rate_cents: 8500,
    });
    const totals = computeTotals(
      [a, b, c],
      { type: "per_km", count: 2, km_total: 100, rate_cents: 250, fixed_total_cents: 0 },
      0,
    );
    expect(totals.totalLaborMinutes).toBe(a.duration_minutes + b.duration_minutes + c.duration_minutes);
    expect(totals.totalLaborCents).toBe(a.subtotal_cents + b.subtotal_cents + c.subtotal_cents);
    expect(totals.displacementCents).toBe(25000);
    expect(totals.grandTotalCents).toBe(totals.totalLaborCents + totals.displacementCents);
  });
});

describe("timeToMinutes", () => {
  it("aceita HH:mm:ss", () => expect(timeToMinutes("09:30:00")).toBe(570));
});