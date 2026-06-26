import type { DisplacementInput, DisplacementType, LaborEntryInput } from "@/types/financials";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Parse "HH:mm" or "HH:mm:ss" into minutes since 00:00. */
export function timeToMinutes(value: string): number {
  if (!value) throw new Error("Hora inválida");
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) throw new Error(`Hora inválida: ${value}`);
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) throw new Error(`Hora inválida: ${value}`);
  return h * 60 + mi;
}

/** Returns minutes between start/end (same day). Throws if end <= start. */
export function computeDurationMinutes(start: string, end: string): number {
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (b <= a) {
    throw new Error("A hora de saída precisa ser maior que a hora de entrada.");
  }
  return b - a;
}

/** Minutes -> decimal hours rounded to 4 decimals. */
export function minutesToDecimalHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round((minutes / 60) * 10000) / 10000;
}

/** Compute subtotal in cents = round(minutes * rate / 60). Stays integer-safe. */
export function computeSubtotalCents(minutes: number, rateCents: number): number {
  if (!Number.isFinite(minutes) || !Number.isFinite(rateCents)) return 0;
  if (minutes <= 0 || rateCents <= 0) return 0;
  return Math.round((minutes * rateCents) / 60);
}

export function computeDisplacementCents(d: DisplacementInput): number {
  switch (d.type) {
    case "none":
      return 0;
    case "fixed":
      return Math.max(0, Math.round(d.fixed_total_cents || 0));
    case "per_km": {
      const km = Math.max(0, Number(d.km_total) || 0);
      const rate = Math.max(0, Math.round(d.rate_cents || 0));
      return Math.round(km * rate);
    }
  }
}

/** Parse human BRL input ("R$ 85,00", "85.50", "1.520,00") to cents. */
export function parseBRLToCents(input: string | number | null | undefined): number {
  if (input == null || input === "") return 0;
  if (typeof input === "number") {
    return Math.round(input * 100);
  }
  let s = String(input)
    .trim()
    .replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Treat dots as thousands separator, comma as decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatBRL(cents: number): string {
  return BRL.format((Number(cents) || 0) / 100);
}

export function formatHHmm(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export function formatDecimalHours(totalMinutes: number): string {
  const dec = minutesToDecimalHours(totalMinutes);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(dec);
}

export type ComputedEntry = LaborEntryInput & {
  duration_minutes: number;
  subtotal_cents: number;
};

export function enrichEntry(entry: LaborEntryInput): ComputedEntry {
  const duration = computeDurationMinutes(entry.start_time, entry.end_time);
  return {
    ...entry,
    duration_minutes: duration,
    subtotal_cents: computeSubtotalCents(duration, entry.hourly_rate_cents),
  };
}

export type FinanceTotals = {
  totalLaborMinutes: number;
  totalLaborCents: number;
  displacementCents: number;
  materialsCents: number;
  grandTotalCents: number;
};

export function computeTotals(
  entries: ComputedEntry[],
  displacement: DisplacementInput,
  materialsCents = 0,
): FinanceTotals {
  const totalLaborMinutes = entries.reduce((acc, e) => acc + e.duration_minutes, 0);
  const totalLaborCents = entries.reduce((acc, e) => acc + e.subtotal_cents, 0);
  const displacementCents = computeDisplacementCents(displacement);
  const materials = Math.max(0, Math.round(materialsCents || 0));
  return {
    totalLaborMinutes,
    totalLaborCents,
    displacementCents,
    materialsCents: materials,
    grandTotalCents: totalLaborCents + displacementCents + materials,
  };
}

export function describeDisplacement(d: DisplacementInput): string {
  if (d.type === "none") return "Sem deslocamento";
  if (d.type === "fixed") return `Valor fixo — ${formatBRL(d.fixed_total_cents)}`;
  const total = computeDisplacementCents(d);
  const count = d.count > 0 ? `${d.count} desloc.` : null;
  const km = d.km_total > 0 ? `${d.km_total.toLocaleString("pt-BR")} km` : null;
  const rate = d.rate_cents > 0 ? `${formatBRL(d.rate_cents)}/km` : null;
  return [count, km, rate, formatBRL(total)].filter(Boolean).join(" · ");
}

export const displacementTypes: DisplacementType[] = ["none", "per_km", "fixed"];
