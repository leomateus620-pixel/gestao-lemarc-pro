import type { ServiceOrder, ServiceOrderStatus } from "@/types/serviceOrder";

export const TECHNICIAN_HOME_LIMIT = 20;

const ACTIVE_STATUSES = new Set<ServiceOrderStatus>([
  "pending",
  "dispatched",
  "transit",
  "running",
]);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RECENT_FINISHED_WINDOW_MS = 48 * HOUR_MS;

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Data de referência da OS para ordenação/relevância: opened_at → created_at → updated_at. */
export function technicianOrderReferenceTime(order: ServiceOrder): number {
  return (
    toTime(order.opened_at) ??
    toTime(order.created_at) ??
    toTime(order.updated_at) ??
    0
  );
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isTechnicianRelevantOrder(order: ServiceOrder, now: number): boolean {
  if (order.status === "cancelled") return false;

  if (ACTIVE_STATUSES.has(order.status)) return true;

  const refTime = technicianOrderReferenceTime(order);
  const yesterdayStart = startOfDay(now) - DAY_MS;

  if (order.status === "finished" || order.status === "review") {
    const closedAt = toTime(order.finished_at) ?? toTime(order.updated_at) ?? refTime;
    return now - closedAt <= RECENT_FINISHED_WINDOW_MS;
  }

  if (order.status === "approved") {
    return refTime >= yesterdayStart;
  }

  return refTime >= yesterdayStart;
}

export function sortTechnicianOrders(orders: ServiceOrder[]): ServiceOrder[] {
  return [...orders].sort((a, b) => {
    const diff = technicianOrderReferenceTime(b) - technicianOrderReferenceTime(a);
    if (diff !== 0) return diff;
    if (a.number !== b.number) return b.number - a.number;
    return a.id.localeCompare(b.id, "pt-BR");
  });
}

export function splitTechnicianHomeOrders(
  orders: ServiceOrder[],
  now: number = Date.now(),
): { primary: ServiceOrder[]; older: ServiceOrder[] } {
  const sorted = sortTechnicianOrders(orders);
  const relevant: ServiceOrder[] = [];
  const older: ServiceOrder[] = [];
  for (const order of sorted) {
    if (isTechnicianRelevantOrder(order, now)) relevant.push(order);
    else older.push(order);
  }
  const primary = relevant.slice(0, TECHNICIAN_HOME_LIMIT);
  const overflow = relevant.slice(TECHNICIAN_HOME_LIMIT);
  return { primary, older: [...overflow, ...older] };
}