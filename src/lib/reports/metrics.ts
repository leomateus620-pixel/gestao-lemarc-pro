import type {
  GroupBucket,
  ReportOrderRow,
  ReportOverview,
  ReportSeries,
  TrendPoint,
} from "@/types/reports";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
} from "@/types/serviceOrder";

const CLOSED_STATUSES = new Set(["finished", "approved", "cancelled"]);
const PENDING_BILLING_STATUSES = new Set(["finished", "review", "approved"]);

export function computeOrderRow(row: {
  worked_minutes: number | null;
  hour_rate: number | null;
  opened_at: string;
  closed_at: string | null;
}): { estimated_value: number; lead_time_minutes: number | null } {
  const minutes = row.worked_minutes ?? 0;
  const rate = row.hour_rate ?? 0;
  const estimated_value = (minutes / 60) * rate;
  let lead: number | null = null;
  if (row.closed_at) {
    const a = new Date(row.opened_at).getTime();
    const b = new Date(row.closed_at).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      lead = Math.round((b - a) / 60000);
    }
  }
  return { estimated_value, lead_time_minutes: lead };
}

export function computeOverview(rows: ReportOrderRow[]): ReportOverview {
  let totalHours = 0;
  let estimatedValue = 0;
  let finishedOrders = 0;
  let runningOrders = 0;
  let pendingBilling = 0;
  let leadSum = 0;
  let leadCount = 0;
  let ordersMissingRate = 0;

  for (const r of rows) {
    totalHours += (r.worked_minutes ?? 0) / 60;
    estimatedValue += r.estimated_value;
    if (r.status === "finished" || r.status === "approved") finishedOrders++;
    if (r.status === "running" || r.status === "transit" || r.status === "dispatched")
      runningOrders++;
    if (
      r.billing_status === "ready" ||
      (PENDING_BILLING_STATUSES.has(r.status) && r.billing_status === "pending")
    ) {
      pendingBilling++;
    }
    if (r.lead_time_minutes !== null) {
      leadSum += r.lead_time_minutes;
      leadCount++;
    }
    if ((r.hour_rate ?? 0) <= 0 && (r.worked_minutes ?? 0) > 0) ordersMissingRate++;
  }

  const totalOrders = rows.length;
  const completionRate = totalOrders > 0 ? finishedOrders / totalOrders : 0;
  const avgTicket = finishedOrders > 0 ? estimatedValue / finishedOrders : 0;

  return {
    totalOrders,
    finishedOrders,
    runningOrders,
    pendingBilling,
    totalHours,
    estimatedValue,
    avgLeadTimeMinutes: leadCount > 0 ? Math.round(leadSum / leadCount) : null,
    completionRate,
    avgTicket,
    ordersMissingRate,
  };
}

function bucket(
  rows: ReportOrderRow[],
  keyFn: (r: ReportOrderRow) => string | null,
  labelFn: (key: string) => string,
  valueFn: (r: ReportOrderRow) => number = () => 1,
  fallback = "Não informado",
): GroupBucket[] {
  const map = new Map<string, { label: string; value: number }>();
  for (const r of rows) {
    const k = keyFn(r) ?? "__none__";
    const label = k === "__none__" ? fallback : labelFn(k);
    const cur = map.get(k);
    const v = valueFn(r);
    if (cur) cur.value += v;
    else map.set(k, { label, value: v });
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, label: v.label, value: Math.round(v.value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function computeSeries(rows: ReportOrderRow[]): ReportSeries {
  const byStatus = bucket(
    rows,
    (r) => r.status,
    (k) => statusLabel[k as keyof typeof statusLabel] ?? k,
  );
  const byPriority = bucket(
    rows,
    (r) => r.priority,
    (k) => priorityLabel[k as keyof typeof priorityLabel] ?? k,
    () => 1,
    "Sem prioridade",
  );
  const byServiceType = bucket(
    rows,
    (r) => r.service_type,
    (k) => serviceTypeLabel[k as keyof typeof serviceTypeLabel] ?? k,
    () => 1,
    "Sem tipo",
  );
  const byClient = bucket(
    rows,
    (r) => r.client_id,
    (k) => rows.find((r) => r.client_id === k)?.client_name ?? "—",
    () => 1,
    "Sem cliente",
  ).slice(0, 8);
  const byTechnicianHours = bucket(
    rows,
    (r) => r.technician_id,
    (k) => rows.find((r) => r.technician_id === k)?.technician_name ?? "—",
    (r) => (r.worked_minutes ?? 0) / 60,
    "Sem técnico",
  ).slice(0, 8);
  const byClientValue = bucket(
    rows,
    (r) => r.client_id,
    (k) => rows.find((r) => r.client_id === k)?.client_name ?? "—",
    (r) => r.estimated_value,
    "Sem cliente",
  )
    .filter((b) => b.value > 0)
    .slice(0, 8);

  // Average lead time by technician (minutes)
  const leadMap = new Map<string, { label: string; sum: number; count: number }>();
  for (const r of rows) {
    if (r.lead_time_minutes === null) continue;
    const k = r.technician_id ?? "__none__";
    const label = r.technician_name ?? "Sem técnico";
    const cur = leadMap.get(k);
    if (cur) {
      cur.sum += r.lead_time_minutes;
      cur.count++;
    } else {
      leadMap.set(k, { label, sum: r.lead_time_minutes, count: 1 });
    }
  }
  const avgLeadByTechnician: GroupBucket[] = Array.from(leadMap.entries())
    .map(([key, v]) => ({ key, label: v.label, value: Math.round(v.sum / v.count) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 8);

  // Monthly trend
  const trendMap = new Map<string, TrendPoint>();
  for (const r of rows) {
    const d = new Date(r.opened_at);
    if (Number.isNaN(d.getTime())) continue;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const cur = trendMap.get(month);
    const hours = (r.worked_minutes ?? 0) / 60;
    if (cur) {
      cur.orders++;
      cur.hours += hours;
      cur.value += r.estimated_value;
    } else {
      trendMap.set(month, { month, label, orders: 1, hours, value: r.estimated_value });
    }
  }
  const trend = Array.from(trendMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    byStatus,
    byPriority,
    byServiceType,
    byClient,
    byTechnicianHours,
    byClientValue,
    avgLeadByTechnician,
    trend,
  };
}

export function groupByUnit(rows: ReportOrderRow[]): GroupBucket[] {
  return bucket(
    rows,
    (r) => r.client_unit_id,
    (k) => rows.find((r) => r.client_unit_id === k)?.client_unit_name ?? "—",
    () => 1,
    "Sem unidade",
  );
}

export function groupByTechnician(rows: ReportOrderRow[]): GroupBucket[] {
  return bucket(
    rows,
    (r) => r.technician_id,
    (k) => rows.find((r) => r.technician_id === k)?.technician_name ?? "—",
    () => 1,
    "Sem técnico",
  );
}