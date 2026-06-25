import type { AssignedTechnician, ServiceOrder, TechnicianLite } from "@/types/serviceOrder";
import type { ReportOrderRow, ReportTechnician } from "@/types/reports";

/**
 * Returns the list of technicians for a Service Order. Uses the M2M
 * `technicians` array when populated, falling back to the legacy single
 * `technician` field. Returns `[]` when no technician is assigned.
 */
export function getOrderTechnicians(
  order: Pick<ServiceOrder, "technicians" | "technician"> | null | undefined,
): AssignedTechnician[] {
  if (!order) return [];
  if (order.technicians && order.technicians.length > 0) return order.technicians;
  if (order.technician) {
    return [{ ...order.technician, is_primary: true }];
  }
  return [];
}

export function getReportRowTechnicians(row: ReportOrderRow): ReportTechnician[] {
  if (row.technicians && row.technicians.length > 0) return row.technicians;
  if (row.technician_id && row.technician_name) {
    return [{ id: row.technician_id, name: row.technician_name, role: null, is_primary: true }];
  }
  return [];
}

/**
 * Compact display string for a list of technicians (cards / tables).
 * `max` controls how many names are shown explicitly before `+N`.
 */
export function formatTechnicianList(
  technicians: { full_name?: string | null; name?: string | null }[] | null | undefined,
  max = 2,
): string {
  if (!technicians || technicians.length === 0) return "Sem técnico definido";
  const names = technicians
    .map((t) => (t as { full_name?: string | null }).full_name ?? (t as { name?: string | null }).name ?? "")
    .filter(Boolean);
  if (names.length === 0) return "Sem técnico definido";
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export type TechnicianHoursBucket = {
  id: string;
  name: string;
  minutes: number;
  orders: number;
  finished: number;
  leadSum: number;
  leadCount: number;
  estimatedValue: number;
};

const FINISHED_STATUSES = new Set(["finished", "approved"]);

/**
 * Aggregates minutes/orders per technician across a set of rows. Each OS
 * contributes its full duration to every technician assigned — this is the
 * agreed productivity rule. Rows without any technician are bucketed as
 * "Sem técnico atribuído".
 */
export function groupMinutesByTechnician(
  rows: ReportOrderRow[],
): TechnicianHoursBucket[] {
  const map = new Map<string, TechnicianHoursBucket>();
  for (const r of rows) {
    const techs = getReportRowTechnicians(r);
    const value =
      r.worked_minutes_effective > 0 && (r.hour_rate ?? 0) > 0
        ? (r.worked_minutes_effective / 60) * (r.hour_rate ?? 0)
        : 0;
    if (techs.length === 0) {
      bump(map, "__none__", "Sem técnico atribuído", r, value);
      continue;
    }
    for (const t of techs) {
      bump(map, t.id, t.name, r, value);
    }
  }
  return Array.from(map.values());
}

function bump(
  map: Map<string, TechnicianHoursBucket>,
  id: string,
  name: string,
  r: ReportOrderRow,
  value: number,
) {
  const cur = map.get(id);
  const isFinished = FINISHED_STATUSES.has(r.status);
  if (cur) {
    cur.orders++;
    cur.minutes += r.worked_minutes_effective;
    cur.estimatedValue += value;
    if (isFinished) cur.finished++;
    if (r.lead_time_minutes !== null) {
      cur.leadSum += r.lead_time_minutes;
      cur.leadCount++;
    }
  } else {
    map.set(id, {
      id,
      name,
      minutes: r.worked_minutes_effective,
      orders: 1,
      finished: isFinished ? 1 : 0,
      leadSum: r.lead_time_minutes ?? 0,
      leadCount: r.lead_time_minutes !== null ? 1 : 0,
      estimatedValue: value,
    });
  }
}

/**
 * Pure helper: derives effective worked minutes for a service order using
 * the same rule as the reports module (reported minutes > derived from
 * started/finished timestamps, capped at 24h > 0).
 */
export function getServiceOrderWorkedMinutes(
  order: Pick<ServiceOrder, "worked_minutes" | "started_at" | "finished_at">,
): { minutes: number; source: "reported" | "derived" | "none" } {
  if (typeof order.worked_minutes === "number" && order.worked_minutes > 0) {
    return { minutes: order.worked_minutes, source: "reported" };
  }
  if (order.started_at && order.finished_at) {
    const a = new Date(order.started_at).getTime();
    const b = new Date(order.finished_at).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      const minutes = Math.round((b - a) / 60000);
      return { minutes: Math.min(minutes, 24 * 60), source: "derived" };
    }
  }
  return { minutes: 0, source: "none" };
}

export type { TechnicianLite };