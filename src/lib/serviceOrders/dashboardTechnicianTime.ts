import { pauseReasonLabel, type TimeSession } from "@/lib/serviceOrders/timeSessions";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import type { AssignedTechnician, ServiceOrder, TechnicianLite } from "@/types/serviceOrder";

export type DashboardLaborEntry = {
  id: string;
  service_order_id: string;
  technician_id: string | null;
  duration_minutes: number;
  technician?: Pick<TechnicianLite, "id" | "full_name" | "role"> | null;
};

export type DashboardTechnicianTimeDataset = {
  sessions: TimeSession[];
  laborEntries: DashboardLaborEntry[];
};

export type TechnicianTimeState = "operating" | "paused" | "waiting" | "finished" | "no_time";

export type TechnicianTimeSource =
  | "service_order_time_sessions"
  | "service_order_labor_entries"
  | "service_orders_worked_minutes"
  | "none";

export type TechnicianTimeAccuracy = "recorded" | "estimated" | "none";

export type TechnicianTimeSummary = {
  orderId: string;
  technicianId: string;
  technicianName: string;
  initials: string;
  isAssigned: boolean;
  state: TechnicianTimeState;
  source: TechnicianTimeSource;
  accuracy: TechnicianTimeAccuracy;
  minutes: number;
  closedMinutes: number;
  activeStartedAt: string | null;
  pauseReason: string | null;
  pauseLabel: string | null;
  pauseNotes: string | null;
};

const CLOSED_STATUSES = new Set<ServiceOrder["status"]>(["finished", "approved", "cancelled"]);

const EMPTY_DATASET: DashboardTechnicianTimeDataset = {
  sessions: [],
  laborEntries: [],
};

function minutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 60_000));
}

function sessionMinutes(session: TimeSession, now: Date): number {
  if (session.ended_at) {
    return session.duration_minutes ?? minutesBetween(session.started_at, session.ended_at);
  }
  return minutesBetween(session.started_at, now.toISOString());
}

function technicianInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function technicianFromLabor(entry: DashboardLaborEntry): AssignedTechnician | null {
  if (!entry.technician_id || !entry.technician) return null;
  return {
    id: entry.technician_id,
    full_name: entry.technician.full_name,
    role: entry.technician.role ?? null,
    is_primary: false,
  };
}

function addTechnician(
  map: Map<string, AssignedTechnician & { isAssigned: boolean }>,
  technician: AssignedTechnician,
  isAssigned: boolean,
) {
  if (!technician.id || map.has(technician.id)) return;
  map.set(technician.id, { ...technician, isAssigned });
}

function buildTechnicianMap(
  order: ServiceOrder,
  data: DashboardTechnicianTimeDataset,
): Map<string, AssignedTechnician & { isAssigned: boolean }> {
  const map = new Map<string, AssignedTechnician & { isAssigned: boolean }>();

  for (const technician of getOrderTechnicians(order)) {
    addTechnician(map, technician, true);
  }

  for (const entry of data.laborEntries) {
    const technician = technicianFromLabor(entry);
    if (technician) addTechnician(map, technician, false);
  }

  for (const session of data.sessions) {
    if (!session.technician_id || map.has(session.technician_id)) continue;
    addTechnician(
      map,
      {
        id: session.technician_id,
        full_name: "Técnico sem vínculo",
        role: null,
        is_primary: false,
      },
      false,
    );
  }

  return map;
}

function summarizeFromSessions({
  order,
  technician,
  sessions,
  now,
}: {
  order: ServiceOrder;
  technician: AssignedTechnician & { isAssigned: boolean };
  sessions: TimeSession[];
  now: Date;
}): TechnicianTimeSummary | null {
  const workSessions = sessions
    .filter((session) => session.kind === "work" && session.technician_id === technician.id)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));

  if (workSessions.length === 0) return null;

  const openSession = workSessions.find((session) => !session.ended_at) ?? null;
  const latest = workSessions[workSessions.length - 1];
  const closedMinutes = workSessions
    .filter((session) => session.ended_at)
    .reduce((total, session) => total + sessionMinutes(session, now), 0);
  const minutes = closedMinutes + (openSession ? sessionMinutes(openSession, now) : 0);
  const isClosedOrder = CLOSED_STATUSES.has(order.status);
  const isPaused = !isClosedOrder && !openSession && latest.end_reason === "pause";
  const state: TechnicianTimeState = openSession ? "operating" : isPaused ? "paused" : "finished";

  return {
    orderId: order.id,
    technicianId: technician.id,
    technicianName: technician.full_name,
    initials: technicianInitials(technician.full_name),
    isAssigned: technician.isAssigned,
    state,
    source: "service_order_time_sessions",
    accuracy: "recorded",
    minutes,
    closedMinutes,
    activeStartedAt: openSession?.started_at ?? null,
    pauseReason: isPaused ? latest.pause_reason : null,
    pauseLabel: isPaused ? pauseReasonLabel(latest.pause_reason) || null : null,
    pauseNotes: isPaused ? latest.pause_notes : null,
  };
}

function summarizeFromLabor({
  order,
  technician,
  laborEntries,
}: {
  order: ServiceOrder;
  technician: AssignedTechnician & { isAssigned: boolean };
  laborEntries: DashboardLaborEntry[];
}): TechnicianTimeSummary | null {
  const minutes = laborEntries
    .filter((entry) => entry.technician_id === technician.id)
    .reduce((total, entry) => total + Math.max(0, Math.round(entry.duration_minutes || 0)), 0);

  if (minutes <= 0) return null;

  return {
    orderId: order.id,
    technicianId: technician.id,
    technicianName: technician.full_name,
    initials: technicianInitials(technician.full_name),
    isAssigned: technician.isAssigned,
    state: CLOSED_STATUSES.has(order.status) ? "finished" : "waiting",
    source: "service_order_labor_entries",
    accuracy: "recorded",
    minutes,
    closedMinutes: minutes,
    activeStartedAt: null,
    pauseReason: null,
    pauseLabel: null,
    pauseNotes: null,
  };
}

function summarizeFromLegacyOrder({
  order,
  technician,
  technicianCount,
}: {
  order: ServiceOrder;
  technician: AssignedTechnician & { isAssigned: boolean };
  technicianCount: number;
}): TechnicianTimeSummary | null {
  if (technicianCount !== 1 || !technician.isAssigned) return null;
  const minutes = Math.max(0, Math.round(order.worked_minutes || 0));
  if (minutes <= 0) return null;

  return {
    orderId: order.id,
    technicianId: technician.id,
    technicianName: technician.full_name,
    initials: technicianInitials(technician.full_name),
    isAssigned: technician.isAssigned,
    state: CLOSED_STATUSES.has(order.status) ? "finished" : "waiting",
    source: "service_orders_worked_minutes",
    accuracy: "estimated",
    minutes,
    closedMinutes: minutes,
    activeStartedAt: null,
    pauseReason: null,
    pauseLabel: null,
    pauseNotes: null,
  };
}

function summarizeNoTime(
  order: ServiceOrder,
  technician: AssignedTechnician & { isAssigned: boolean },
): TechnicianTimeSummary {
  const state: TechnicianTimeState = CLOSED_STATUSES.has(order.status) ? "no_time" : "waiting";

  return {
    orderId: order.id,
    technicianId: technician.id,
    technicianName: technician.full_name,
    initials: technicianInitials(technician.full_name),
    isAssigned: technician.isAssigned,
    state,
    source: "none",
    accuracy: "none",
    minutes: 0,
    closedMinutes: 0,
    activeStartedAt: null,
    pauseReason: null,
    pauseLabel: null,
    pauseNotes: null,
  };
}

export function buildDashboardTechnicianTimeSummaries({
  order,
  data = EMPTY_DATASET,
  now = new Date(),
}: {
  order: ServiceOrder;
  data?: DashboardTechnicianTimeDataset;
  now?: Date;
}): TechnicianTimeSummary[] {
  const technicians = Array.from(buildTechnicianMap(order, data).values());
  const technicianCount = getOrderTechnicians(order).length;

  return technicians.map(
    (technician) =>
      summarizeFromSessions({ order, technician, sessions: data.sessions, now }) ??
      summarizeFromLabor({ order, technician, laborEntries: data.laborEntries }) ??
      summarizeFromLegacyOrder({ order, technician, technicianCount }) ??
      summarizeNoTime(order, technician),
  );
}

export function groupDashboardTechnicianTimeByOrder(
  data: DashboardTechnicianTimeDataset,
): Record<string, DashboardTechnicianTimeDataset> {
  const grouped: Record<string, DashboardTechnicianTimeDataset> = {};

  for (const session of data.sessions) {
    const orderId = session.service_order_id;
    grouped[orderId] ??= { sessions: [], laborEntries: [] };
    grouped[orderId].sessions.push(session);
  }

  for (const entry of data.laborEntries) {
    const orderId = entry.service_order_id;
    grouped[orderId] ??= { sessions: [], laborEntries: [] };
    grouped[orderId].laborEntries.push(entry);
  }

  return grouped;
}

export function formatTechnicianTime(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours.toString().padStart(2, "0")}h${remainder.toString().padStart(2, "0")}`;
}
