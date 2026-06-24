import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";
import type { ReportFilters } from "@/types/reports";

export const periodSchema = z.enum([
  "today",
  "week",
  "month",
  "quarter",
  "year",
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

export const reportSearchSchema = z.object({
  period: fallback(periodSchema, "month").default("month"),
  from: fallback(z.string().optional(), undefined).optional(),
  to: fallback(z.string().optional(), undefined).optional(),
  clientId: fallback(z.string().optional(), undefined).optional(),
  unitId: fallback(z.string().optional(), undefined).optional(),
  technicianId: fallback(z.string().optional(), undefined).optional(),
  status: fallback(statusSchema.optional(), undefined).optional(),
  priority: fallback(prioritySchema.optional(), undefined).optional(),
  serviceType: fallback(serviceTypeSchema.optional(), undefined).optional(),
  billingStatus: fallback(billingStatusSchema.optional(), undefined).optional(),
  onlyWithRate: fallback(z.boolean().optional(), undefined).optional(),
});

export type ReportSearch = z.infer<typeof reportSearchSchema>;

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
  };
}

export const PERIOD_OPTIONS: { key: ReportFilters["period"]; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "quarter", label: "Trimestre" },
  { key: "year", label: "Ano" },
  { key: "all", label: "Tudo" },
  { key: "custom", label: "Personalizado" },
];

export function resolvePeriodRange(filters: ReportFilters): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  if (filters.period === "all") return { from: null, to: null };
  if (filters.period === "custom") {
    return {
      from: filters.from ? new Date(filters.from) : null,
      to: filters.to ? new Date(filters.to) : null,
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
      break;
    case "month":
      from.setMonth(from.getMonth() - 1);
      break;
    case "quarter":
      from.setMonth(from.getMonth() - 3);
      break;
    case "year":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return { from, to };
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
  return n;
}