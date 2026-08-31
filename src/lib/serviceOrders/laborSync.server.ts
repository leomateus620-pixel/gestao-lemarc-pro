/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types don't yet include new columns. */
/**
 * Server-only helper that rematerializes `service_order_labor_entries`
 * from the closed `service_order_time_sessions` (single source of truth)
 * and recomputes `service_order_financials` + legacy fields on
 * `service_orders`. Reused by both the admin-facing "Apuração de horas"
 * read path and by the technician-facing time-history edit action, so
 * PDF, reports and dashboards always reflect the same numbers.
 */
import { computeSubtotalCents } from "@/lib/serviceOrders/finance";
import {
  findMissingSegments,
  filterMaterializableSessions,
  isAdminReviewedStatus,
  minutesBetween,
  pendingLaborMinutes,
  splitSessionsByDay,
} from "@/lib/serviceOrders/laborDerivation";

type ClosedSession = {
  id: string;
  technician_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  technician_reviewed_at?: string | null;
  technician_reviewed_by?: string | null;
};

type TechInfo = {
  id: string;
  full_name: string;
  role: string | null;
  hourly_rate_cents: number | null;
};

export type ReconcileOutcome = {
  /** Linhas de apuração criadas nesta execução. */
  appended: number;
  /** Minutos do histórico que continuam fora da apuração após a execução. */
  pendingMinutes: number;
  /** Reconciliação não concluiu (erro de gravação/leitura) — vale nova tentativa. */
  failed: boolean;
  /** Bloqueado de propósito (ajuste do admin / OS revisada). */
  locked?: boolean;
  error?: string;
};

export type LaborSyncOutcome =
  | { synced: true; totalLaborMinutes: number; totalLaborCents: number }
  | { synced: false; reason: "locked_by_admin" };

/**
 * Recompute `service_order_financials.total_labor_minutes/cents/grand_total`
 * and `service_orders.worked_minutes/hour_rate` from the current
 * `service_order_labor_entries` rows. Idempotent.
 */
export async function recomputeOrderFinancials(
  sb: any,
  orderId: string,
  adjustedBy: string | null,
): Promise<void> {
  const { data: rows, error } = await sb
    .from("service_order_labor_entries")
    .select("duration_minutes, subtotal_cents")
    .eq("service_order_id", orderId);
  if (error) throw new Error(error.message);
  const totalLaborMinutes = (rows ?? []).reduce(
    (a: number, r: any) => a + (r.duration_minutes ?? 0),
    0,
  );
  const totalLaborCents = (rows ?? []).reduce(
    (a: number, r: any) => a + (r.subtotal_cents ?? 0),
    0,
  );

  const { data: fin } = await sb
    .from("service_order_financials")
    .select("*")
    .eq("service_order_id", orderId)
    .maybeSingle();

  const displacementCents = fin?.displacement_total_cents ?? 0;
  const materialsCents = fin?.materials_total_cents ?? 0;
  const patch: Record<string, unknown> = {
    service_order_id: orderId,
    total_labor_minutes: totalLaborMinutes,
    total_labor_cents: totalLaborCents,
    grand_total_cents: totalLaborCents + displacementCents + materialsCents,
  };
  if (adjustedBy) {
    patch.labor_entries_adjusted_at = new Date().toISOString();
    patch.labor_entries_adjusted_by = adjustedBy;
  }
  const { error: upErr } = await sb
    .from("service_order_financials")
    .upsert(patch, { onConflict: "service_order_id" });
  if (upErr) throw new Error(upErr.message);

  const weightedRate =
    totalLaborMinutes > 0
      ? Math.round((totalLaborCents * 60) / totalLaborMinutes) / 100
      : null;
  await sb
    .from("service_orders")
    .update({ worked_minutes: totalLaborMinutes, hour_rate: weightedRate })
    .eq("id", orderId);
}

/**
 * Rebuild `service_order_labor_entries` from closed time sessions, then
 * recompute financials. Skipped (and returns `locked_by_admin`) when an
 * admin has already consolidated the labor entries manually — in that
 * case the caller should reject the technician edit with a clear
 * message directing the user to talk to the administrator.
 */
export async function syncLaborEntriesFromSessions(
  sb: any,
  orderId: string,
  syncedByUserId: string,
): Promise<LaborSyncOutcome> {
  const [{ data: fin }, { data: order }] = await Promise.all([
    sb
      .from("service_order_financials")
      .select("labor_entries_adjusted_at, finalized_at")
      .eq("service_order_id", orderId)
      .maybeSingle(),
    sb.from("service_orders").select("status").eq("id", orderId).maybeSingle(),
  ]);

  if (
    fin?.labor_entries_adjusted_at ||
    fin?.finalized_at ||
    isAdminReviewedStatus(order?.status)
  ) {
    return { synced: false, reason: "locked_by_admin" };
  }

  const { data: sessionsRaw, error: sessErr } = await sb
    .from("service_order_time_sessions")
    .select("id, technician_id, kind, started_at, ended_at, duration_minutes, technician_reviewed_at, technician_reviewed_by")
    .eq("service_order_id", orderId)
    .eq("kind", "work")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true });
  if (sessErr) throw new Error(sessErr.message);

  const closedAll: ClosedSession[] = (sessionsRaw ?? [])
    .filter(
      (s: any) =>
        s.technician_id && s.started_at && s.ended_at && (s.duration_minutes ?? 0) > 0,
    )
    .map((s: any) => ({
      id: s.id,
      technician_id: s.technician_id,
      started_at: s.started_at,
      ended_at: s.ended_at,
      duration_minutes: s.duration_minutes ?? minutesBetween(s.started_at, s.ended_at),
      technician_reviewed_at: s.technician_reviewed_at ?? null,
      technician_reviewed_by: s.technician_reviewed_by ?? null,
    }));
  // Sessões esquecidas em aberto (>14h / atravessando dias) nunca viram horas.
  const closed = filterMaterializableSessions(closedAll);

  // Preserve current rates/role/description so the recompute doesn't zero them out.
  const { data: existing, error: exErr } = await sb
    .from("service_order_labor_entries")
    .select("technician_id, role, hourly_rate_cents")
    .eq("service_order_id", orderId);
  if (exErr) throw new Error(exErr.message);

  const rateByTech = new Map<string, number>();
  const roleByTech = new Map<string, string | null>();
  for (const e of existing ?? []) {
    if (!e.technician_id) continue;
    if (!rateByTech.has(e.technician_id) && (e.hourly_rate_cents ?? 0) > 0) {
      rateByTech.set(e.technician_id, e.hourly_rate_cents);
    }
    if (!roleByTech.has(e.technician_id)) roleByTech.set(e.technician_id, e.role ?? null);
  }

  const missingTechIds = Array.from(
    new Set(closed.map((s) => s.technician_id).filter((id) => !rateByTech.has(id))),
  );
  if (missingTechIds.length > 0) {
    const { data: techRows } = await sb
      .from("technicians")
      .select("id, full_name, role, hourly_rate_cents")
      .in("id", missingTechIds);
    for (const t of (techRows ?? []) as TechInfo[]) {
      if (t.hourly_rate_cents != null && !rateByTech.has(t.id)) {
        rateByTech.set(t.id, t.hourly_rate_cents);
      }
      if (!roleByTech.has(t.id)) roleByTech.set(t.id, t.role);
    }
  }

  // Group by technician for "Intervalo N de M" numbering.
  const byTech = new Map<string, ClosedSession[]>();
  for (const s of closed) {
    const list = byTech.get(s.technician_id) ?? [];
    list.push(s);
    byTech.set(s.technician_id, list);
  }

  const inserts: Record<string, unknown>[] = [];
  for (const [techId, list] of byTech) {
    list.sort((a, b) => a.started_at.localeCompare(b.started_at));
    const rate = rateByTech.get(techId) ?? 0;
    const role = roleByTech.get(techId) ?? null;
    // Split sessions crossing midnight into one row per local day.
    const segments = splitSessionsByDay(list);
    segments.forEach((seg, idx) => {
      inserts.push({
        service_order_id: orderId,
        technician_id: techId,
        role,
        work_date: seg.work_date,
        start_time: seg.start_time,
        end_time: seg.end_time,
        duration_minutes: seg.duration_minutes,
        hourly_rate_cents: rate,
        subtotal_cents: computeSubtotalCents(seg.duration_minutes, rate),
        description:
          segments.length > 1
            ? `Intervalo ${idx + 1} de ${segments.length}`
            : "Trabalho executado",
        technician_reviewed_at: seg.technician_reviewed_at ?? null,
        technician_reviewed_by: seg.technician_reviewed_by ?? null,
        created_by: syncedByUserId,
        entry_source: "session_sync",
      });
    });
  }


  const { error: delErr } = await sb
    .from("service_order_labor_entries")
    .delete()
    .eq("service_order_id", orderId);
  if (delErr) throw new Error(delErr.message);

  if (inserts.length > 0) {
    const { error: insErr } = await sb.from("service_order_labor_entries").insert(inserts);
    if (insErr) throw new Error(insErr.message);
  }

  await recomputeOrderFinancials(sb, orderId, null);

  const totalLaborMinutes = inserts.reduce(
    (a, r) => a + Number(r.duration_minutes ?? 0),
    0,
  );
  const totalLaborCents = inserts.reduce(
    (a, r) => a + Number(r.subtotal_cents ?? 0),
    0,
  );
  return { synced: true, totalLaborMinutes, totalLaborCents };
}

/**
 * Append-only reconciliation: makes sure every closed work session is
 * represented in `service_order_labor_entries`, then recomputes the order
 * totals. Existing rows are never modified or deleted, so admin adjustments
 * stay intact — the hours recorded on the following day (after an overnight
 * pause) simply get appended for review.
 *
 * Best-effort: never throws, so the technician time-tracking flow can't break.
 */
export async function reconcileLaborFromSessions(
  sb: any,
  orderId: string,
  userId: string | null,
): Promise<ReconcileOutcome> {
  try {
    const [{ data: sessionsRaw }, { data: existing }] = await Promise.all([
      sb
        .from("service_order_time_sessions")
        .select(
          "id, technician_id, started_at, ended_at, duration_minutes, technician_reviewed_at, technician_reviewed_by",
        )
        .eq("service_order_id", orderId)
        .eq("kind", "work")
        .not("ended_at", "is", null)
        .order("started_at", { ascending: true }),
      sb
        .from("service_order_labor_entries")
        .select("technician_id, role, hourly_rate_cents, work_date, start_time, end_time")
        .eq("service_order_id", orderId),
    ]);

    const [{ data: finRow }, { data: orderRow }] = await Promise.all([
      sb
        .from("service_order_financials")
        .select("labor_entries_adjusted_at, finalized_at")
        .eq("service_order_id", orderId)
        .maybeSingle(),
      sb.from("service_orders").select("status").eq("id", orderId).maybeSingle(),
    ]);
    const adjustedAt = finRow?.labor_entries_adjusted_at ?? null;
    // OS já revisada pelo admin: nunca acrescentar horas automaticamente.
    // "finished" (técnico encerrou) continua liberado para reconciliação.
    if (finRow?.finalized_at || isAdminReviewedStatus(orderRow?.status)) {
      return { appended: 0, pendingMinutes: 0, failed: false, locked: true };
    }

    const closedAll = (sessionsRaw ?? [])
      .filter((s: any) => s.technician_id && s.started_at && s.ended_at)
      // With an admin consolidation in place, only newer work is appended.
      .filter((s: any) => !adjustedAt || new Date(s.ended_at) > new Date(adjustedAt))
      .map((s: any) => ({
        id: s.id,
        technician_id: s.technician_id as string,
        started_at: s.started_at as string,
        ended_at: s.ended_at as string,
        duration_minutes:
          (s.duration_minutes ?? 0) > 0
            ? (s.duration_minutes as number)
            : minutesBetween(s.started_at, s.ended_at),
      }));
    // Sessões esquecidas em aberto exigem ajuste manual do admin.
    const closed = filterMaterializableSessions(closedAll);
    if (closed.length === 0) return { appended: 0, pendingMinutes: 0, failed: false };

    const existingRows = (existing ?? []) as {
      technician_id: string | null;
      role: string | null;
      hourly_rate_cents: number | null;
      work_date: string;
      start_time: string;
      end_time: string;
    }[];

    const segments = splitSessionsByDay(closed);
    const missing = findMissingSegments(segments, existingRows);

    if (missing.length > 0) {
      const rateByTech = new Map<string, number>();
      const roleByTech = new Map<string, string | null>();
      for (const e of existingRows) {
        if (!e.technician_id) continue;
        if (!rateByTech.has(e.technician_id) && (e.hourly_rate_cents ?? 0) > 0) {
          rateByTech.set(e.technician_id, e.hourly_rate_cents as number);
        }
        if (!roleByTech.has(e.technician_id)) roleByTech.set(e.technician_id, e.role);
      }
      const unknown = Array.from(
        new Set(missing.map((m) => m.technician_id).filter((id) => !rateByTech.has(id))),
      );
      if (unknown.length > 0) {
        const { data: techRows } = await sb
          .from("technicians")
          .select("id, role, hourly_rate_cents")
          .in("id", unknown);
        for (const t of (techRows ?? []) as any[]) {
          if (t.hourly_rate_cents != null && !rateByTech.has(t.id)) {
            rateByTech.set(t.id, t.hourly_rate_cents);
          }
          if (!roleByTech.has(t.id)) roleByTech.set(t.id, t.role ?? null);
        }
      }

      const inserts = missing.map((m) => {
        const rate = rateByTech.get(m.technician_id) ?? 0;
        return {
          service_order_id: orderId,
          technician_id: m.technician_id,
          role: roleByTech.get(m.technician_id) ?? null,
          work_date: m.work_date,
          start_time: m.start_time,
          end_time: m.end_time,
          duration_minutes: m.duration_minutes,
          hourly_rate_cents: rate,
          subtotal_cents: computeSubtotalCents(m.duration_minutes, rate),
          description: "Trabalho executado",
          created_by: userId,
          entry_source: "session_sync",
        };
      });
      const { error: insErr } = await sb
        .from("service_order_labor_entries")
        .insert(inserts);
      if (insErr) {
        return {
          appended: 0,
          pendingMinutes: missing.reduce((a, m) => a + m.duration_minutes, 0),
          failed: true,
          error: insErr.message,
        };
      }
    }

    await recomputeOrderFinancials(sb, orderId, null);

    // Verificação: depois de reconciliar, nada do histórico pode continuar fora.
    const { data: after } = await sb
      .from("service_order_labor_entries")
      .select("technician_id, work_date, start_time, end_time")
      .eq("service_order_id", orderId);
    const pendingMinutes = pendingLaborMinutes(closed, (after ?? []) as any[]);
    return { appended: missing.length, pendingMinutes, failed: pendingMinutes > 0 };
  } catch (e) {
    return {
      appended: 0,
      pendingMinutes: 0,
      failed: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}