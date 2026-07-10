import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import type { ReportFilters } from "@/types/reports";

export const periodSchema = z.enum([
  "today",
  "week",
  "month",
  "quarter",
  "year",
  "last30",
  "all",
  "custom",
]);

export const statusSchema = z.enum([
  "pending",
  "dispatched",
  "transit",
  "running",
  "finished",
  "review",
  "approved",
  "cancelled",
]);

export const prioritySchema = z.enum(["baixa", "media", "alta", "urgente"]);

export const serviceTypeSchema = z.enum([
  "mecanica",
  "eletrica",
  "automacao",
  "montagem",
  "instalacao",
  "visita",
  "emergencia",
  "outro",
]);

export const billingStatusSchema = z.enum(["pending", "ready", "billed", "cancelled"]);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const reportSearchSchema = z.object({
  period: fallback(periodSchema, "month").default("month"),
  from: fallback(dateStringSchema, undefined).optional(),
  to: fallback(dateStringSchema, undefined).optional(),
  clientId: fallback(z.string().optional(), undefined).optional(),
  unitId: fallback(z.string().optional(), undefined).optional(),
  technicianId: fallback(z.string().optional(), undefined).optional(),
  status: fallback(statusSchema.optional(), undefined).optional(),
  priority: fallback(prioritySchema.optional(), undefined).optional(),
  serviceType: fallback(serviceTypeSchema.optional(), undefined).optional(),
  billingStatus: fallback(billingStatusSchema.optional(), undefined).optional(),
  onlyWithRate: fallback(z.boolean().optional(), undefined).optional(),
  onlyCompleted: fallback(z.boolean().optional(), undefined).optional(),
  onlyAwaitingBilling: fallback(z.boolean().optional(), undefined).optional(),
  onlyWithObservations: fallback(z.boolean().optional(), undefined).optional(),
});

export type ReportSearch = z.infer<typeof reportSearchSchema>;

export function createDefaultReportFilters(clientId: string | null = null): ReportFilters {
  return {
    period: "month",
    from: null,
    to: null,
    clientId,
    unitId: null,
    technicianId: null,
    status: null,
    priority: null,
    serviceType: null,
    billingStatus: null,
    onlyWithRate: null,
    onlyCompleted: null,
    onlyAwaitingBilling: null,
    onlyWithObservations: null,
  };
}

export function resetReportFilters(filters: ReportFilters, preserveClient = false): ReportFilters {
  return createDefaultReportFilters(preserveClient ? (filters.clientId ?? null) : null);
}

export function searchToFilters(search: ReportSearch): ReportFilters {
  return {
    period: search.period,
    from: search.from ?? null,
    to: search.to ?? null,
    clientId: search.clientId ?? null,
    unitId: search.unitId ?? null,
    technicianId: search.technicianId ?? null,
    status: search.status ?? null,
    priority: search.priority ?? null,
    serviceType: search.serviceType ?? null,
    billingStatus: search.billingStatus ?? null,
    onlyWithRate: search.onlyWithRate ?? null,
    onlyCompleted: search.onlyCompleted ?? null,
    onlyAwaitingBilling: search.onlyAwaitingBilling ?? null,
    onlyWithObservations: search.onlyWithObservations ?? null,
  };
}

export const PERIOD_OPTIONS: { key: ReportFilters["period"]; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana (7 dias)" },
  { key: "month", label: "Mês (30 dias)" },
  { key: "last30", label: "Últimos 30 dias" },
  { key: "quarter", label: "Trimestre (90 dias)" },
  { key: "year", label: "Ano (365 dias)" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

export function getPeriodLabel(period: ReportFilters["period"]): string {
  return PERIOD_OPTIONS.find((option) => option.key === period)?.label ?? "Período selecionado";
}

function parseLocalDate(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolvePeriodRange(filters: ReportFilters): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  if (filters.period === "all") return { from: null, to: null };
  if (filters.period === "custom") {
    const f = parseLocalDate(filters.from);
    const t = parseLocalDate(filters.to);
    if (f && t && f.getTime() > t.getTime()) return { from: null, to: null };
    return {
      from: f ? startOfDay(f) : null,
      to: t ? endOfDay(t) : null,
    };
  }
  const to = new Date(now);
  const from = new Date(now);
  switch (filters.period) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "week":
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "last30":
    case "month":
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "quarter":
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from.setDate(from.getDate() - 365);
      from.setHours(0, 0, 0, 0);
      break;
  }
  return { from, to };
}

export function isCustomRangeInvalid(filters: ReportFilters): boolean {
  if (filters.period !== "custom") return false;
  const f = parseLocalDate(filters.from);
  const t = parseLocalDate(filters.to);
  return !!(f && t && f.getTime() > t.getTime());
}

export function countActiveFilters(filters: ReportFilters): number {
  let n = 0;
  if (filters.period !== "month") n++;
  if (filters.clientId) n++;
  if (filters.unitId) n++;
  if (filters.technicianId) n++;
  if (filters.status) n++;
  if (filters.priority) n++;
  if (filters.serviceType) n++;
  if (filters.billingStatus) n++;
  if (filters.onlyWithRate) n++;
  if (filters.onlyCompleted) n++;
  if (filters.onlyAwaitingBilling) n++;
  if (filters.onlyWithObservations) n++;
  return n;
}
