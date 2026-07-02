/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types don't include the new time_sessions table yet. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TimeSession, JsonValue } from "@/lib/serviceOrders/timeSessions";

const SELECT = `
  id, service_order_id, technician_id, kind, started_at, ended_at,
  duration_minutes, pause_reason, pause_notes, end_reason, source,
  notes, metadata, created_by, created_at, updated_at
`;

function normalize(row: any): TimeSession {
  return {
    id: row.id,
    service_order_id: row.service_order_id,
    technician_id: row.technician_id ?? null,
    kind: row.kind,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    duration_minutes: row.duration_minutes ?? null,
    pause_reason: row.pause_reason ?? null,
    pause_notes: row.pause_notes ?? null,
    end_reason: row.end_reason ?? null,
    source: row.source ?? "mobile",
    notes: row.notes ?? null,
    metadata: (row.metadata ?? null) as JsonValue | null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const listTimeSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("service_order_time_sessions")
      .select(SELECT)
      .eq("service_order_id", data.orderId)
      .order("started_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(normalize);
  });

async function findOpenWork(sb: any, orderId: string, technicianId: string) {
  const { data, error } = await sb
    .from("service_order_time_sessions")
    .select(SELECT)
    .eq("service_order_id", orderId)
    .eq("technician_id", technicianId)
    .eq("kind", "work")
    .is("ended_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalize(data) : null;
}

export const startWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; technicianId: string }) => data)
  .handler(async ({ data, context }) => {
    if (!data.orderId || !data.technicianId) throw new Error("Dados inválidos.");
    const sb = context.supabase as any;
    const open = await findOpenWork(sb, data.orderId, data.technicianId);
    if (open) throw new Error("Já existe uma sessão de trabalho ativa para este técnico.");
    const { data: row, error } = await sb
      .from("service_order_time_sessions")
      .insert({
        service_order_id: data.orderId,
        technician_id: data.technicianId,
        kind: "work",
        started_at: new Date().toISOString(),
        source: "mobile",
        created_by: context.userId,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    // Mark OS as running if still pending/dispatched/transit.
    await sb
      .from("service_orders")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .in("status", ["pending", "dispatched", "transit"]);
    return normalize(row);
  });

export const pauseWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { orderId: string; technicianId: string; reason: string; notes?: string | null }) =>
      data,
  )
  .handler(async ({ data, context }) => {
    if (!data.reason) throw new Error("Selecione o motivo da pausa.");
    if (data.reason === "outro" && !data.notes?.trim()) {
      throw new Error("Informe uma observação para o motivo 'Outro'.");
    }
    const sb = context.supabase as any;
    const open = await findOpenWork(sb, data.orderId, data.technicianId);
    if (!open) throw new Error("Nenhuma sessão ativa para pausar.");
    const { data: row, error } = await sb
      .from("service_order_time_sessions")
      .update({
        ended_at: new Date().toISOString(),
        end_reason: "pause",
        pause_reason: data.reason,
        pause_notes: data.notes ?? null,
      })
      .eq("id", open.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return normalize(row);
  });

export const resumeWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; technicianId: string; notes?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    // Confirm the last session for this tech was a pause.
    const { data: last, error: lastErr } = await sb
      .from("service_order_time_sessions")
      .select(SELECT)
      .eq("service_order_id", data.orderId)
      .eq("technician_id", data.technicianId)
      .eq("kind", "work")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr) throw new Error(lastErr.message);
    if (!last || last.ended_at == null) throw new Error("Não há pausa ativa para retomar.");
    if (last.end_reason !== "pause") throw new Error("A última sessão não estava pausada.");
    const { data: row, error } = await sb
      .from("service_order_time_sessions")
      .insert({
        service_order_id: data.orderId,
        technician_id: data.technicianId,
        kind: "work",
        started_at: new Date().toISOString(),
        notes: data.notes ?? null,
        source: "mobile",
        created_by: context.userId,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return normalize(row);
  });

export const finishWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; technicianId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const q = sb
      .from("service_order_time_sessions")
      .update({ ended_at: new Date().toISOString(), end_reason: "finish" })
      .eq("service_order_id", data.orderId)
      .eq("kind", "work")
      .is("ended_at", null);
    if (data.technicianId) q.eq("technician_id", data.technicianId);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; started_at?: string; ended_at?: string | null; notes?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas gestores podem ajustar sessões.");
    const patch: Record<string, unknown> = { source: "admin_adjustment" };
    if (data.started_at) patch.started_at = data.started_at;
    if (data.ended_at !== undefined) patch.ended_at = data.ended_at;
    if (data.notes) patch.notes = data.notes;
    const { data: row, error } = await sb
      .from("service_order_time_sessions")
      .update(patch)
      .eq("id", data.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return normalize(row);
  });