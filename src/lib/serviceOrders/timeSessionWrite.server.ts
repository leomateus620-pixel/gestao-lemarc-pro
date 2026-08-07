/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types don't include the time_sessions columns yet. */
/**
 * Server-only helpers for writing technician time sessions.
 *
 * Why this exists: the RLS policy on `service_order_time_sessions` only allows
 * an UPDATE when the caller is an admin OR owns the technician record
 * (`technicians.user_id = auth.uid()`). Technician records without a linked
 * login therefore could never be paused/finished — the update matched zero
 * rows and Supabase reported success, so hours stayed "open" forever and never
 * reached the labor entries / Apuração de horas.
 *
 * The fix: authorize the caller here (admin or a technician assigned to the
 * order) and then perform the write with the service credential, so any
 * technician of the order can be closed correctly, while outsiders stay blocked.
 */

export async function assertOrderTimeAccess(
  sb: any,
  userId: string,
  orderId: string,
): Promise<void> {
  if (!orderId) throw new Error("Ordem de serviço inválida.");
  const [{ data: isAdmin }, { data: isOrderTech }] = await Promise.all([
    sb.rpc("has_role", { _user_id: userId, _role: "admin" }),
    sb.rpc("user_is_order_technician", { _order_id: orderId }),
  ]);
  if (!isAdmin && !isOrderTech) {
    throw new Error("Sem permissão para registrar tempo nesta OS.");
  }
}

/** Service-credential client used for time-session writes after authorization. */
export async function getTimeSessionWriter(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/**
 * Close every still-open work session of an order. Used when the order is
 * finalized so no recorded time is left out of the hours calculation.
 * Returns the technician ids that were closed automatically.
 */
export async function closeOpenWorkSessions(
  orderId: string,
  endedAtIso: string,
  actorUserId: string | null,
): Promise<string[]> {
  const writer = await getTimeSessionWriter();
  const { data: open, error } = await writer
    .from("service_order_time_sessions")
    .select("id, technician_id, started_at")
    .eq("service_order_id", orderId)
    .eq("kind", "work")
    .is("ended_at", null);
  if (error) throw new Error(error.message);
  const rows = (open ?? []) as { id: string; technician_id: string | null; started_at: string }[];
  if (rows.length === 0) return [];

  const closed: string[] = [];
  for (const row of rows) {
    // Never produce a negative interval when the order was closed earlier.
    const endIso =
      new Date(endedAtIso).getTime() > new Date(row.started_at).getTime()
        ? endedAtIso
        : new Date(new Date(row.started_at).getTime() + 60_000).toISOString();
    const { error: upErr } = await writer
      .from("service_order_time_sessions")
      .update({
        ended_at: endIso,
        end_reason: "finish",
        adjusted_by: actorUserId,
        adjusted_at: new Date().toISOString(),
        adjustment_reason: "Encerrado automaticamente na finalização da OS",
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    if (row.technician_id) closed.push(row.technician_id);
  }
  return Array.from(new Set(closed));
}