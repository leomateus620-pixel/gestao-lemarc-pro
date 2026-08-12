/**
 * Pure helpers that convert closed work sessions (source of truth for the
 * technician time tracking) into per-day labor segments used by the admin
 * "Apuração de horas", the PDF and the reports.
 *
 * Two rules matter here:
 * 1. A session that crosses midnight in São Paulo local time is split into one
 *    segment per day (day 1: start -> 23:59, day 2: 00:00 -> end), so dates and
 *    times stay coherent everywhere.
 * 2. Segment keys are stable so already-materialized labor rows can be matched
 *    against sessions and only the missing ones get appended (e.g. the work of
 *    the following day, after a pause overnight).
 */

const SP_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const SP_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function spDate(iso: string): string {
  return SP_DATE.format(new Date(iso));
}
export function spTime(iso: string): string {
  return SP_TIME.format(new Date(iso));
}
export function minutesBetween(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb) || tb <= ta) return 0;
  return Math.max(0, Math.round((tb - ta) / 60000));
}

export type SessionLike = {
  id: string;
  technician_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes?: number | null;
};

export type LaborSegment = {
  session_id: string;
  technician_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  /** 0-based index of the segment inside its own session (midnight split). */
  segment_index: number;
  segment_count: number;
};

/** Local-midnight boundaries (as UTC instants) strictly inside the session. */
function localMidnightsBetween(startIso: string, endIso: string): number[] {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const out: number[] = [];
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return out;

  // Walk day by day from the local start date to the local end date.
  let cursor = startMs;
  let guard = 0;
  while (guard++ < 400) {
    const localDate = spDate(new Date(cursor).toISOString());
    // Instant of the next local midnight after `cursor`: take the local clock
    // time and subtract it from `cursor`, then add a full day.
    const [h, m, s] = spTime(new Date(cursor).toISOString()).split(":").map(Number);
    const sinceMidnight = ((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)) * 1000;
    const nextMidnight = cursor - sinceMidnight + 24 * 3600 * 1000;
    if (nextMidnight >= endMs) break;
    out.push(nextMidnight);
    cursor = nextMidnight;
    if (localDate === spDate(new Date(endMs).toISOString())) break;
  }
  return out;
}

/**
 * Split one closed session into per-local-day segments. The segment durations
 * always sum exactly to the session duration (the stored `duration_minutes`
 * wins when present, since technicians/admins may have adjusted it).
 */
export function splitSessionByDay(session: SessionLike): LaborSegment[] {
  const rawDuration = minutesBetween(session.started_at, session.ended_at);
  const targetDuration =
    session.duration_minutes && session.duration_minutes > 0
      ? session.duration_minutes
      : rawDuration;
  if (targetDuration <= 0) return [];

  const boundaries = localMidnightsBetween(session.started_at, session.ended_at);
  const points = [
    new Date(session.started_at).getTime(),
    ...boundaries,
    new Date(session.ended_at).getTime(),
  ];

  const rawSegments = [] as { start: number; end: number; minutes: number }[];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    if (minutes <= 0 && points.length > 2) continue;
    rawSegments.push({ start, end, minutes });
  }
  if (rawSegments.length === 0) return [];

  // Scale to the target duration, keeping the sum exact.
  const rawTotal = rawSegments.reduce((a, s) => a + s.minutes, 0) || 1;
  let assigned = 0;
  const durations = rawSegments.map((s, idx) => {
    if (idx === rawSegments.length - 1) return Math.max(0, targetDuration - assigned);
    const value = Math.round((s.minutes * targetDuration) / rawTotal);
    assigned += value;
    return value;
  });

  const segments: LaborSegment[] = [];
  rawSegments.forEach((s, idx) => {
    const duration = durations[idx] ?? 0;
    if (duration <= 0) return;
    const startIso = new Date(s.start).toISOString();
    const endIso = new Date(s.end).toISOString();
    const workDate = spDate(startIso);
    const isLast = idx === rawSegments.length - 1;
    const startTime = idx === 0 ? spTime(startIso) : "00:00:00";
    const endTime = isLast ? spTime(endIso) : "23:59:59";
    segments.push({
      session_id: session.id,
      technician_id: session.technician_id,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration,
      segment_index: idx,
      segment_count: rawSegments.length,
    });
  });

  // Re-index after dropping empty segments.
  return segments.map((s, idx) => ({
    ...s,
    segment_index: idx,
    segment_count: segments.length,
  }));
}

export function splitSessionsByDay(sessions: SessionLike[]): LaborSegment[] {
  const out = sessions.flatMap(splitSessionByDay);
  out.sort((a, b) => {
    const d = a.work_date.localeCompare(b.work_date);
    if (d !== 0) return d;
    return a.start_time.localeCompare(b.start_time);
  });
  return out;
}

function hm(time: string): string {
  return time.slice(0, 5);
}

/** Minutos desde 00:00 de um "HH:mm(:ss)". */
function toMinutes(time: string): number {
  const [h, m] = hm(time).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Limite operacional de uma sessão de trabalho contínua (sem pausa).
 * Acima disso a sessão é considerada "esquecida em aberto" e NUNCA é
 * materializada automaticamente como horas — o admin precisa ajustar.
 */
export const MAX_SESSION_MINUTES = 14 * 60;

/**
 * Sessão suspeita: duração acima do limite operacional ou que atravessa a
 * meia-noite local sem nenhuma pausa. Ambos os casos indicam que o técnico
 * (ou o encerramento em equipe) deixou o cronômetro rodando, e geravam os
 * blocos fantasma de 00:00–23:59 (24:00) na apuração.
 */
export function isSuspiciousSession(session: SessionLike): boolean {
  const duration =
    session.duration_minutes && session.duration_minutes > 0
      ? session.duration_minutes
      : minutesBetween(session.started_at, session.ended_at);
  if (duration > MAX_SESSION_MINUTES) return true;
  return spDate(session.started_at) !== spDate(session.ended_at);
}

/** Sessões seguras para materialização automática. */
export function filterMaterializableSessions<T extends SessionLike>(sessions: T[]): T[] {
  return sessions.filter((s) => !isSuspiciousSession(s));
}

/** Sessões que precisam de ajuste manual do admin. */
export function filterSuspiciousSessions<T extends SessionLike>(sessions: T[]): T[] {
  return sessions.filter((s) => isSuspiciousSession(s));
}

/**
 * Existe alguma linha do mesmo técnico, no mesmo dia, cujo intervalo se
 * sobrepõe ao do segmento? Comparação por sobreposição (e não por chave
 * exata) evita duplicar horas quando o admin ajustou entrada/saída.
 */
export function overlapsExisting(
  segment: { technician_id: string | null; work_date: string; start_time: string; end_time: string },
  existing: {
    technician_id: string | null;
    work_date: string;
    start_time: string;
    end_time: string;
  }[],
): boolean {
  const start = toMinutes(segment.start_time);
  const end = toMinutes(segment.end_time);
  return existing.some((e) => {
    if ((e.technician_id ?? "") !== (segment.technician_id ?? "")) return false;
    if (e.work_date !== segment.work_date) return false;
    const es = toMinutes(e.start_time);
    const ee = toMinutes(e.end_time);
    return start < ee && es < end;
  });
}

/** Stable identity of a labor row / segment, tolerant to seconds precision. */
export function segmentKey(e: {
  technician_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
}): string {
  return `${e.technician_id ?? ""}|${e.work_date}|${hm(e.start_time)}|${hm(e.end_time)}`;
}

/**
 * Segments that are not represented by any existing labor row — i.e. the work
 * recorded after the labor table had already been materialized (typically the
 * next day, after an overnight pause).
 */
export function findMissingSegments(
  segments: LaborSegment[],
  existing: {
    technician_id: string | null;
    work_date: string;
    start_time: string;
    end_time: string;
  }[],
): LaborSegment[] {
  const known = [...existing];
  const out: LaborSegment[] = [];
  for (const s of segments) {
    // Sessões esquecidas em aberto nunca viram horas automáticas.
    if (s.duration_minutes > MAX_SESSION_MINUTES) continue;
    // Sobreposição com uma linha existente = a hora já está apurada.
    if (overlapsExisting(s, known)) continue;
    known.push(s);
    out.push(s);
  }
  return out;
}