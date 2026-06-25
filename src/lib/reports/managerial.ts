import type {
  ClientAggregate,
  IncompleteCounters,
  ManagerialReport,
  ManagerialSummary,
  ReportOrderRow,
  ServiceTypeAggregate,
  StatusBreakdown,
  TechnicianAggregate,
} from "@/types/reports";
import { serviceTypeLabel, statusLabel } from "@/types/serviceOrder";

const BILLING_AWAIT_STATUSES = new Set(["finished", "review", "approved"]);

export function buildManagerialReport(rows: ReportOrderRow[]): ManagerialReport {
  const summary = computeSummary(rows);
  const byStatus = computeStatusBreakdown(rows, summary.totalOrders);
  const topClients = computeTopClients(rows);
  const topTechnicians = computeTopTechnicians(rows);
  const byServiceType = computeServiceTypes(rows);
  const observations = rows.filter(
    (r) => (r.description ?? "").trim().length > 0,
  );
  const incomplete = computeIncomplete(rows);
  return {
    summary,
    byStatus,
    topClients,
    topTechnicians,
    byServiceType,
    observations,
    incomplete,
    orders: rows,
  };
}

function computeSummary(rows: ReportOrderRow[]): ManagerialSummary {
  let finished = 0;
  let running = 0;
  let pending = 0;
  let review = 0;
  let awaitingBilling = 0;
  let totalMinutes = 0;
  let leadSum = 0;
  let leadCount = 0;
  let estimatedValue = 0;
  const clientSet = new Set<string>();
  const techSet = new Set<string>();

  for (const r of rows) {
    totalMinutes += r.worked_minutes_effective;
    if (r.worked_minutes_effective > 0 && (r.hour_rate ?? 0) > 0) {
      estimatedValue += (r.worked_minutes_effective / 60) * (r.hour_rate ?? 0);
    }
    if (r.status === "finished" || r.status === "approved") finished++;
    else if (r.status === "running" || r.status === "transit" || r.status === "dispatched")
      running++;
    else if (r.status === "pending") pending++;
    else if (r.status === "review") review++;

    if (
      BILLING_AWAIT_STATUSES.has(r.status) &&
      (r.billing_status === "pending" || r.billing_status === "ready")
    ) {
      awaitingBilling++;
    }

    if (r.lead_time_minutes !== null) {
      leadSum += r.lead_time_minutes;
      leadCount++;
    }

    if (r.client_id) clientSet.add(r.client_id);
    if (r.technician_id) techSet.add(r.technician_id);
  }

  const totalOrders = rows.length;
  return {
    totalOrders,
    finished,
    running,
    pending,
    review,
    awaitingBilling,
    totalHours: totalMinutes / 60,
    avgLeadMinutes: leadCount > 0 ? Math.round(leadSum / leadCount) : null,
    estimatedValue,
    completionRate: totalOrders > 0 ? finished / totalOrders : 0,
    clientsInvolved: clientSet.size,
    techniciansInvolved: techSet.size,
  };
}

function computeStatusBreakdown(
  rows: ReportOrderRow[],
  total: number,
): StatusBreakdown[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([key, count]) => ({
      key,
      label: statusLabel[key as keyof typeof statusLabel] ?? key,
      count,
      percent: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function computeTopClients(rows: ReportOrderRow[]): ClientAggregate[] {
  const map = new Map<string, ClientAggregate>();
  for (const r of rows) {
    const id = r.client_id ?? "__none__";
    const name = r.client_id ? (r.client_name ?? "Cliente sem nome") : "Sem cliente";
    const value =
      (r.worked_minutes ?? 0) > 0 && (r.hour_rate ?? 0) > 0
        ? ((r.worked_minutes ?? 0) / 60) * (r.hour_rate ?? 0)
        : 0;
    const cur = map.get(id);
    if (cur) {
      cur.orders++;
      cur.hours += (r.worked_minutes ?? 0) / 60;
      cur.estimatedValue += value;
      if (r.status === "finished" || r.status === "approved") cur.finished++;
      else if (r.status === "pending") cur.pending++;
    } else {
      map.set(id, {
        id: r.client_id,
        name,
        orders: 1,
        finished: r.status === "finished" || r.status === "approved" ? 1 : 0,
        pending: r.status === "pending" ? 1 : 0,
        hours: (r.worked_minutes ?? 0) / 60,
        estimatedValue: value,
      });
    }
  }
  return Array.from(map.values())
    .filter((c) => c.orders > 0)
    .sort((a, b) => b.orders - a.orders || b.hours - a.hours)
    .slice(0, 15);
}

function computeTopTechnicians(rows: ReportOrderRow[]): TechnicianAggregate[] {
  const map = new Map<
    string,
    TechnicianAggregate & { _leadSum: number; _leadCount: number }
  >();
  for (const r of rows) {
    const id = r.technician_id ?? "__none__";
    const name = r.technician_id
      ? (r.technician_name ?? "Técnico sem nome")
      : "Sem técnico atribuído";
    const value =
      (r.worked_minutes ?? 0) > 0 && (r.hour_rate ?? 0) > 0
        ? ((r.worked_minutes ?? 0) / 60) * (r.hour_rate ?? 0)
        : 0;
    const cur = map.get(id);
    if (cur) {
      cur.orders++;
      cur.hours += (r.worked_minutes ?? 0) / 60;
      cur.estimatedValue += value;
      if (r.status === "finished" || r.status === "approved") cur.finished++;
      if (r.lead_time_minutes !== null) {
        cur._leadSum += r.lead_time_minutes;
        cur._leadCount++;
      }
    } else {
      map.set(id, {
        id: r.technician_id,
        name,
        orders: 1,
        finished: r.status === "finished" || r.status === "approved" ? 1 : 0,
        hours: (r.worked_minutes ?? 0) / 60,
        avgLeadMinutes: null,
        estimatedValue: value,
        _leadSum: r.lead_time_minutes ?? 0,
        _leadCount: r.lead_time_minutes !== null ? 1 : 0,
      });
    }
  }
  return Array.from(map.values())
    .map(({ _leadSum, _leadCount, ...rest }) => ({
      ...rest,
      avgLeadMinutes: _leadCount > 0 ? Math.round(_leadSum / _leadCount) : null,
    }))
    .sort((a, b) => b.orders - a.orders || b.hours - a.hours)
    .slice(0, 15);
}

function computeServiceTypes(rows: ReportOrderRow[]): ServiceTypeAggregate[] {
  const map = new Map<string, ServiceTypeAggregate>();
  for (const r of rows) {
    let key = r.service_type ?? "__none__";
    let label: string;
    if (key === "outro" && r.service_type_other && r.service_type_other.trim()) {
      key = `outro:${r.service_type_other.trim()}`;
      label = r.service_type_other.trim();
    } else if (key === "__none__") {
      label = "Sem tipo";
    } else {
      label = serviceTypeLabel[key as keyof typeof serviceTypeLabel] ?? key;
    }
    const cur = map.get(key);
    if (cur) cur.count++;
    else map.set(key, { key, label, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function computeIncomplete(rows: ReportOrderRow[]): IncompleteCounters {
  let withoutTechnician = 0;
  let withoutHourRate = 0;
  let withoutWorkedMinutes = 0;
  let withoutClosedAt = 0;
  for (const r of rows) {
    if (!r.technician_id) withoutTechnician++;
    if ((r.hour_rate ?? 0) <= 0) withoutHourRate++;
    if ((r.worked_minutes ?? 0) <= 0) withoutWorkedMinutes++;
    if (!r.closed_at) withoutClosedAt++;
  }
  return { withoutTechnician, withoutHourRate, withoutWorkedMinutes, withoutClosedAt };
}

export function describePeriod(filters: {
  period: string;
  from?: string | null;
  to?: string | null;
}): string {
  const map: Record<string, string> = {
    today: "Hoje",
    week: "Semana atual (últimos 7 dias)",
    month: "Mês atual (últimos 30 dias)",
    last30: "Últimos 30 dias",
    quarter: "Últimos 90 dias",
    year: "Últimos 12 meses",
    all: "Todos os períodos",
  };
  if (filters.period === "custom") {
    const f = filters.from ? new Date(filters.from) : null;
    const t = filters.to ? new Date(filters.to) : null;
    const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
    return `Personalizado · ${f ? fmt.format(f) : "—"} → ${t ? fmt.format(t) : "—"}`;
  }
  return map[filters.period] ?? filters.period;
}