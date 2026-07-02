import type { AssignedTechnician } from "@/types/serviceOrder";

export type TimeSessionKind = "work" | "displacement";
export type TimeSessionEndReason = "pause" | "finish" | "manual" | "resume_correction";
export type TimeSessionSource = "mobile" | "desktop" | "admin_adjustment";

export type TimeSession = {
  id: string;
  service_order_id: string;
  technician_id: string | null;
  kind: TimeSessionKind;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  pause_reason: string | null;
  pause_notes: string | null;
  end_reason: TimeSessionEndReason | null;
  source: TimeSessionSource;
  notes: string | null;
  metadata: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TechnicianTimeState = {
  technicianId: string;
  state: "idle" | "running" | "paused" | "finished";
  currentSessionId: string | null;
  currentStartedAt: string | null;
  lastPauseReason: string | null;
  lastPauseAt: string | null;
  workedMinutes: number;
};

export type OrderLiveState =
  | "idle"
  | "running"
  | "partially_paused"
  | "fully_paused"
  | "finished";

export const PAUSE_REASONS: Array<{ value: string; label: string }> = [
  { value: "almoco", label: "Almoço" },
  { value: "aguardando_cliente", label: "Aguardando cliente" },
  { value: "aguardando_peca", label: "Aguardando peça" },
  { value: "deslocamento_externo", label: "Deslocamento externo" },
  { value: "fim_expediente", label: "Fim do expediente" },
  { value: "hotel_retorno", label: "Hotel / retorno amanhã" },
  { value: "problema_acesso", label: "Problema de acesso ao local" },
  { value: "outro", label: "Outro" },
];

export function pauseReasonLabel(value: string | null | undefined): string {
  if (!value) return "";
  return PAUSE_REASONS.find((r) => r.value === value)?.label ?? value;
}

function minutesBetween(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb) || tb <= ta) return 0;
  return Math.max(0, Math.round((tb - ta) / 60000));
}

/** Live worked minutes for a technician (closed sessions + open one until now). */
export function computeTechnicianWorkedMinutes(
  sessions: TimeSession[],
  technicianId: string,
  now: Date = new Date(),
): number {
  const nowIso = now.toISOString();
  let total = 0;
  for (const s of sessions) {
    if (s.kind !== "work") continue;
    if (s.technician_id !== technicianId) continue;
    if (s.ended_at) total += s.duration_minutes ?? minutesBetween(s.started_at, s.ended_at);
    else total += minutesBetween(s.started_at, nowIso);
  }
  return total;
}

/** Per-technician totals (only closed for reporting/PDF). */
export function computeClosedWorkedMinutesByTech(
  sessions: TimeSession[],
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (s.kind !== "work" || !s.ended_at || !s.technician_id) continue;
    map[s.technician_id] =
      (map[s.technician_id] ?? 0) + (s.duration_minutes ?? minutesBetween(s.started_at, s.ended_at));
  }
  return map;
}

export function getTechnicianState(
  sessions: TimeSession[],
  technicianId: string,
  now: Date = new Date(),
): TechnicianTimeState {
  const mine = sessions
    .filter((s) => s.kind === "work" && s.technician_id === technicianId)
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  const worked = computeTechnicianWorkedMinutes(sessions, technicianId, now);
  if (mine.length === 0) {
    return {
      technicianId,
      state: "idle",
      currentSessionId: null,
      currentStartedAt: null,
      lastPauseReason: null,
      lastPauseAt: null,
      workedMinutes: 0,
    };
  }
  const open = mine.find((s) => !s.ended_at);
  if (open) {
    return {
      technicianId,
      state: "running",
      currentSessionId: open.id,
      currentStartedAt: open.started_at,
      lastPauseReason: null,
      lastPauseAt: null,
      workedMinutes: worked,
    };
  }
  const last = mine[mine.length - 1];
  if (last.end_reason === "pause") {
    return {
      technicianId,
      state: "paused",
      currentSessionId: null,
      currentStartedAt: null,
      lastPauseReason: last.pause_reason,
      lastPauseAt: last.ended_at,
      workedMinutes: worked,
    };
  }
  return {
    technicianId,
    state: "finished",
    currentSessionId: null,
    currentStartedAt: null,
    lastPauseReason: null,
    lastPauseAt: null,
    workedMinutes: worked,
  };
}

export function getOrderLiveState(
  sessions: TimeSession[],
  technicians: AssignedTechnician[],
): OrderLiveState {
  if (technicians.length === 0) return "idle";
  const states = technicians.map((t) => getTechnicianState(sessions, t.id).state);
  if (states.every((s) => s === "idle")) return "idle";
  if (states.some((s) => s === "running")) {
    return states.some((s) => s === "paused") ? "partially_paused" : "running";
  }
  if (states.some((s) => s === "paused")) return "fully_paused";
  return "finished";
}

export type TimelineItem = {
  at: string;
  kind: "start" | "pause" | "resume" | "finish";
  technicianId: string | null;
  reason?: string | null;
  notes?: string | null;
  durationMinutes?: number | null;
};

/** Build a chronological event log from sessions for display. */
export function buildTimeline(sessions: TimeSession[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  const workOnly = sessions
    .filter((s) => s.kind === "work")
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  for (let i = 0; i < workOnly.length; i++) {
    const s = workOnly[i];
    // start or resume (first for tech = start, subsequent = resume)
    const prevForTech = workOnly
      .slice(0, i)
      .filter((x) => x.technician_id === s.technician_id);
    items.push({
      at: s.started_at,
      kind: prevForTech.length === 0 ? "start" : "resume",
      technicianId: s.technician_id,
    });
    if (s.ended_at) {
      items.push({
        at: s.ended_at,
        kind: s.end_reason === "finish" ? "finish" : "pause",
        technicianId: s.technician_id,
        reason: s.pause_reason,
        notes: s.pause_notes,
        durationMinutes: s.duration_minutes,
      });
    }
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

/** Format ISO -> HH:mm local (America/Sao_Paulo). */
export function formatHm(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDateHm(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}