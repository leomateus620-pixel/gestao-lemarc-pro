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
  minutesBetween,
  splitSessionsByDay,
} from "@/lib/serviceOrders/laborDerivation";

type ClosedSession = {
  id: string;
  technician_id: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
};

type TechInfo = {
  id: string;
  full_name: string;
  role: string | null;
  hourly_rate_cents: number | null;
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
  const { data: fin } = await sb
    .from("service_order_financials")
    .select("labor_entries_adjusted_at")
    .eq("service_order_id", orderId)
    .maybeSingle();

  if (fin?.labor_entries_adjusted_at) {
    return { synced: false, reason: "locked_by_admin" };
  }

  const { data: sessionsRaw, error: sessErr } = await sb
    .from("service_order_time_sessions")
    .select("id, technician_id, kind, started_at, ended_at, duration_minutes")
    .eq("service_order_id", orderId)
    .eq("kind", "work")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true });
  if (sessErr) throw new Error(sessErr.message);

  const closed: ClosedSession[] = (sessionsRaw ?? [])
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
    }));

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
        created_by: syncedByUserId,
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