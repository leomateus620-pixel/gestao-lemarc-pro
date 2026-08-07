/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types don't include the new time_sessions table yet. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TimeSession, JsonValue } from "@/lib/serviceOrders/timeSessions";
import type {
  DashboardLaborEntry,
  DashboardTechnicianTimeDataset,
} from "@/lib/serviceOrders/dashboardTechnicianTime";

const SELECT = `
  id, service_order_id, technician_id, kind, started_at, ended_at,
  duration_minutes, pause_reason, pause_notes, end_reason, source,
  notes, metadata, created_by, created_at, updated_at,
  adjusted_by, adjusted_at, adjustment_reason
`;

const DASHBOARD_LABOR_SELECT = `
  id, service_order_id, technician_id, duration_minutes,
  technician:technicians(id, full_name, role)
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
    adjusted_by: row.adjusted_by ?? null,
    adjusted_at: row.adjusted_at ?? null,
    adjustment_reason: row.adjustment_reason ?? null,
  };
}

function normalizeDashboardLabor(row: any): DashboardLaborEntry {
  const technician = Array.isArray(row.technician) ? row.technician[0] : row.technician;

  return {
    id: row.id,
    service_order_id: row.service_order_id,
    technician_id: row.technician_id ?? null,
    duration_minutes: row.duration_minutes ?? 0,
    technician: technician
      ? {
          id: technician.id,
          full_name: technician.full_name,
          role: technician.role ?? null,
        }
      : null,
  };
}

function missingTimeSessionStructure(error: any): boolean {
  const message = String(error?.message ?? error ?? "");
  return (
    message.includes("service_order_time_sessions") &&
    /does not exist|relation|schema cache|Could not find/i.test(message)
  );
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

export const listDashboardTechnicianTime = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderIds?: string[] }) => {
    const ids = Array.isArray(data?.orderIds) ? data.orderIds : [];
    return {
      orderIds: Array.from(
        new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)),
      ).slice(0, 12),
    };
  })
  .handler(async ({ data, context }): Promise<DashboardTechnicianTimeDataset> => {
    if (data.orderIds.length === 0) {
      return { sessions: [], laborEntries: [] };
    }

    const sb = context.supabase as any;
    const [sessions, laborEntries] = await Promise.all([
      sb
        .from("service_order_time_sessions")
        .select(SELECT)
        .in("service_order_id", data.orderIds)
        .order("started_at", { ascending: true }),
      sb
        .from("service_order_labor_entries")
        .select(DASHBOARD_LABOR_SELECT)
        .in("service_order_id", data.orderIds)
        .order("work_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);

    if (sessions.error && !missingTimeSessionStructure(sessions.error)) {
      throw new Error(sessions.error.message);
    }
    if (laborEntries.error) throw new Error(laborEntries.error.message);

    return {
      sessions: sessions.error ? [] : (sessions.data ?? []).map(normalize),
      laborEntries: (laborEntries.data ?? []).map(normalizeDashboardLabor),
    };
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
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const open = await findOpenWork(sb, data.orderId, data.technicianId);
    if (open) throw new Error("Já existe uma sessão de trabalho ativa para este técnico.");
    const writer = await getTimeSessionWriter();
    const { data: row, error } = await writer
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
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const open = await findOpenWork(sb, data.orderId, data.technicianId);
    if (!open) throw new Error("Nenhuma sessão ativa para pausar.");
    const writer = await getTimeSessionWriter();
    const { data: rows, error } = await writer
      .from("service_order_time_sessions")
      .update({
        ended_at: new Date().toISOString(),
        end_reason: "pause",
        pause_reason: data.reason,
        pause_notes: data.notes ?? null,
      })
      .eq("id", open.id)
      .select(SELECT);
    if (error) throw new Error(error.message);
    const row = (rows ?? [])[0];
    if (!row) {
      throw new Error(
        "Não foi possível registrar a pausa (nenhum registro atualizado). Tente novamente.",
      );
    }
    // Keep the order totals coherent right after the pause (best-effort),
    // including multi-day work where the labor rows already existed.
    try {
      const { reconcileLaborFromSessions } = await import(
        "@/lib/serviceOrders/laborSync.server"
      );
      await reconcileLaborFromSessions(sb, data.orderId, context.userId);
    } catch {
      /* non-blocking */
    }
    try {
      const { syncServiceOrderOpenTimeAlerts } = await import("@/lib/api/notifications.functions");
      await syncServiceOrderOpenTimeAlerts({
        supabase: sb,
        serviceOrderId: data.orderId,
        finishedTechnicianId: data.technicianId,
        actorUserId: context.userId,
      });
    } catch {
      /* non-blocking */
    }
    return normalize(row);
  });

export const resumeWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; technicianId: string; notes?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
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
    const writer = await getTimeSessionWriter();
    const { data: row, error } = await writer
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
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const writer = await getTimeSessionWriter();
    const q = writer
      .from("service_order_time_sessions")
      .update({ ended_at: new Date().toISOString(), end_reason: "finish" })
      .eq("service_order_id", data.orderId)
      .eq("kind", "work")
      .is("ended_at", null);
    if (data.technicianId) q.eq("technician_id", data.technicianId);
    const { data: closedRows, error } = await q.select("id");
    if (error) throw new Error(error.message);
    if ((closedRows ?? []).length === 0) {
      throw new Error("Nenhum tempo em aberto foi encontrado para encerrar.");
    }
    try {
      const { reconcileLaborFromSessions } = await import(
        "@/lib/serviceOrders/laborSync.server"
      );
      await reconcileLaborFromSessions(sb, data.orderId, context.userId);
    } catch {
      /* non-blocking */
    }
    let openTimeAlert = null as Awaited<
      ReturnType<typeof import("@/lib/api/notifications.functions").syncServiceOrderOpenTimeAlerts>
    >;
    try {
      const { syncServiceOrderOpenTimeAlerts } = await import("@/lib/api/notifications.functions");
      openTimeAlert = await syncServiceOrderOpenTimeAlerts({
        supabase: sb,
        serviceOrderId: data.orderId,
        finishedTechnicianId: data.technicianId ?? null,
        actorUserId: context.userId,
      });
    } catch {
      /* non-blocking */
    }
    return { ok: true, openTimeAlert };
  });

/**
 * Encerra o tempo de um colega ainda em aberto na mesma OS.
 * Só técnicos vinculados à OS (ou admins) podem executar; a escrita usa
 * credencial de serviço porque a RLS de sessões restringe cada técnico à própria linha.
 */
export const finishColleagueWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; technicianId: string }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: isAdmin }, { data: isOrderTech }] = await Promise.all([
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      sb.rpc("user_is_order_technician", { _order_id: data.orderId }),
    ]);
    if (!isAdmin && !isOrderTech) throw new Error("Sem permissão para encerrar este tempo.");

    const { data: assigned } = await sb
      .from("service_order_technicians")
      .select("id")
      .eq("service_order_id", data.orderId)
      .eq("technician_id", data.technicianId)
      .maybeSingle();
    if (!assigned) throw new Error("Técnico não vinculado a esta OS.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("service_order_time_sessions")
      .update({ ended_at: new Date().toISOString(), end_reason: "finish" })
      .eq("service_order_id", data.orderId)
      .eq("technician_id", data.technicianId)
      .eq("kind", "work")
      .is("ended_at", null);
    if (error) throw new Error(error.message);

    try {
      const { reconcileLaborFromSessions } = await import(
        "@/lib/serviceOrders/laborSync.server"
      );
      await reconcileLaborFromSessions(sb, data.orderId, context.userId);
    } catch {
      /* non-blocking */
    }
    try {
      const { syncServiceOrderOpenTimeAlerts } = await import("@/lib/api/notifications.functions");
      await syncServiceOrderOpenTimeAlerts({
        supabase: sb,
        serviceOrderId: data.orderId,
        finishedTechnicianId: data.technicianId,
        actorUserId: context.userId,
      });
    } catch {
      /* non-blocking */
    }
    return { ok: true };
  });

export type OrderLaborOverride = {
  adjustedAt: string | null;
  totalMinutes: number;
  minutesByTechnician: Record<string, number>;
};

/**
 * Horas oficiais apuradas pelo admin em "Apuração de horas".
 * `adjustedAt` só vem preenchido quando o admin editou/salvou a apuração;
 * nesse caso o Controle de tempo da OS passa a exibir esses totais.
 */
export const getOrderLaborOverride = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }): Promise<OrderLaborOverride> => {
    const sb = context.supabase as any;
    const empty: OrderLaborOverride = {
      adjustedAt: null,
      totalMinutes: 0,
      minutesByTechnician: {},
    };
    const { data: fin } = await sb
      .from("service_order_financials")
      .select("labor_entries_adjusted_at")
      .eq("service_order_id", data.orderId)
      .maybeSingle();
    if (!fin?.labor_entries_adjusted_at) return empty;

    const { data: rows, error } = await sb
      .from("service_order_labor_entries")
      .select("technician_id, duration_minutes")
      .eq("service_order_id", data.orderId);
    if (error) return empty;

    const minutesByTechnician: Record<string, number> = {};
    let totalMinutes = 0;
    for (const r of rows ?? []) {
      const minutes = Number(r.duration_minutes ?? 0);
      totalMinutes += minutes;
      if (r.technician_id) {
        minutesByTechnician[r.technician_id] =
          (minutesByTechnician[r.technician_id] ?? 0) + minutes;
      }
    }
    return { adjustedAt: fin.labor_entries_adjusted_at, totalMinutes, minutesByTechnician };
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

/**
 * Technician self-service edit of ONE of their own time sessions.
 * Validates ownership, OS assignment, allowed status, times and
 * overlap, then rematerializes labor entries + recomputes financials
 * so PDF/relatórios stay in sync with the single source of truth.
 */
export const updateOwnTimeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      sessionId: string;
      startedAt?: string;
      endedAt?: string | null;
      pauseReason?: string | null;
      pauseNotes?: string | null;
      reason: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const userId = context.userId;

    if (!data.sessionId) throw new Error("Sessão inválida.");
    if (!data.reason?.trim() || data.reason.trim().length < 3) {
      throw new Error("Informe um motivo para o ajuste (mín. 3 caracteres).");
    }

    const { data: isAdmin } = await sb.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    // Load the session (RLS lets the owner or admin see it).
    const { data: sessionRaw, error: sessErr } = await sb
      .from("service_order_time_sessions")
      .select(SELECT)
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sessErr) throw new Error(sessErr.message);
    if (!sessionRaw) throw new Error("Sessão não encontrada.");
    const session = normalize(sessionRaw);

    if (session.kind !== "work") {
      throw new Error("Apenas sessões de trabalho podem ser editadas por aqui.");
    }

    // Resolve caller technician id.
    let callerTechnicianId: string | null = null;
    if (!isAdmin) {
      const { data: techRow, error: techErr } = await sb
        .from("technicians")
        .select("id, active")
        .eq("user_id", userId)
        .eq("active", true)
        .maybeSingle();
      if (techErr) throw new Error(techErr.message);
      if (!techRow?.id) throw new Error("Perfil de técnico não encontrado ou inativo.");
      callerTechnicianId = techRow.id as string;
      if (session.technician_id !== callerTechnicianId) {
        throw new Error("Você só pode editar seus próprios horários.");
      }
    }

    // Load the order to gate by status and confirm assignment for non-admins.
    const { data: order, error: ordErr } = await sb
      .from("service_orders")
      .select("id, status, technician_id")
      .eq("id", session.service_order_id)
      .maybeSingle();
    if (ordErr) throw new Error(ordErr.message);
    if (!order) throw new Error("Ordem de serviço não encontrada.");

    const lockedStatuses = ["approved", "cancelled"];
    if (lockedStatuses.includes(order.status)) {
      throw new Error("Esta OS já foi encerrada e não pode ser editada.");
    }

    if (!isAdmin && callerTechnicianId) {
      const [{ data: assigned }, isPrimary] = await Promise.all([
        sb
          .from("service_order_technicians")
          .select("id")
          .eq("service_order_id", order.id)
          .eq("technician_id", callerTechnicianId)
          .maybeSingle(),
        Promise.resolve(order.technician_id === callerTechnicianId),
      ]);
      if (!assigned && !isPrimary) {
        throw new Error("Você não está mais atribuído a esta OS.");
      }
    }

    // Validate times.
    const nextStartedAtIso = data.startedAt ?? session.started_at;
    if (!nextStartedAtIso) throw new Error("Data/hora de início inválida.");
    const nextStart = new Date(nextStartedAtIso);
    if (Number.isNaN(nextStart.getTime())) throw new Error("Data/hora de início inválida.");

    // ended_at handling: preserve open state — a session that was open
    // cannot be closed via this flow (would falsely conclude the OS).
    let nextEndedAtIso: string | null = session.ended_at;
    if (data.endedAt !== undefined) {
      if (data.endedAt === null) {
        throw new Error("Não é possível reabrir uma sessão já finalizada.");
      }
      if (!session.ended_at) {
        throw new Error("Sessões em andamento não podem receber horário de fim.");
      }
      const parsed = new Date(data.endedAt);
      if (Number.isNaN(parsed.getTime())) throw new Error("Data/hora de fim inválida.");
      nextEndedAtIso = parsed.toISOString();
    }

    if (nextEndedAtIso) {
      const endMs = new Date(nextEndedAtIso).getTime();
      if (endMs <= nextStart.getTime()) {
        throw new Error("O horário de fim precisa ser maior que o de início.");
      }
      if (endMs - nextStart.getTime() > 24 * 60 * 60 * 1000) {
        throw new Error("Uma sessão não pode passar de 24 horas.");
      }
    }

    const nowMs = Date.now();
    if (nextStart.getTime() > nowMs + 60_000) {
      throw new Error("Data de início no futuro não é permitida.");
    }
    if (nextEndedAtIso && new Date(nextEndedAtIso).getTime() > nowMs + 60_000) {
      throw new Error("Data de fim no futuro não é permitida.");
    }

    // Overlap with other work sessions of the same technician on this OS.
    const { data: siblings, error: sibErr } = await sb
      .from("service_order_time_sessions")
      .select("id, started_at, ended_at, kind, technician_id")
      .eq("service_order_id", session.service_order_id)
      .eq("technician_id", session.technician_id)
      .eq("kind", "work")
      .neq("id", session.id);
    if (sibErr) throw new Error(sibErr.message);

    const startMs = nextStart.getTime();
    const endMs = nextEndedAtIso ? new Date(nextEndedAtIso).getTime() : Number.POSITIVE_INFINITY;
    for (const s of siblings ?? []) {
      const sStart = new Date(s.started_at).getTime();
      const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Number.POSITIVE_INFINITY;
      if (sStart < endMs && sEnd > startMs) {
        throw new Error("O horário informado se sobrepõe a outra sessão sua nesta OS.");
      }
    }

    // Pause fields: only meaningful when this session was closed with "pause".
    const patch: Record<string, unknown> = {
      started_at: nextStart.toISOString(),
      adjusted_by: userId,
      adjusted_at: new Date().toISOString(),
      adjustment_reason: data.reason.trim().slice(0, 500),
    };
    if (data.endedAt !== undefined && nextEndedAtIso) {
      patch.ended_at = nextEndedAtIso;
    }
    if (session.end_reason === "pause") {
      if (data.pauseReason !== undefined) patch.pause_reason = data.pauseReason;
      if (data.pauseNotes !== undefined) patch.pause_notes = data.pauseNotes;
    }

    // Append before/after snapshot to metadata.adjustments for audit trail.
    const prevMeta = (session.metadata && typeof session.metadata === "object" && !Array.isArray(session.metadata))
      ? (session.metadata as Record<string, unknown>)
      : {};
    const prevAdjustments = Array.isArray((prevMeta as any).adjustments)
      ? ((prevMeta as any).adjustments as unknown[])
      : [];
    const nextMeta = {
      ...prevMeta,
      adjustments: [
        ...prevAdjustments,
        {
          at: new Date().toISOString(),
          by_user_id: userId,
          by_admin: !!isAdmin,
          reason: data.reason.trim().slice(0, 500),
          before: {
            started_at: session.started_at,
            ended_at: session.ended_at,
            pause_reason: session.pause_reason,
            pause_notes: session.pause_notes,
          },
          after: {
            started_at: patch.started_at,
            ended_at: patch.ended_at ?? session.ended_at,
            pause_reason:
              (patch.pause_reason as string | null | undefined) ?? session.pause_reason,
            pause_notes:
              (patch.pause_notes as string | null | undefined) ?? session.pause_notes,
          },
        },
      ],
    };
    patch.metadata = nextMeta;

    const { data: updated, error: updErr } = await sb
      .from("service_order_time_sessions")
      .update(patch)
      .eq("id", session.id)
      .select(SELECT)
      .single();
    if (updErr) throw new Error(updErr.message);

    // Sync labor entries + recompute financials from sessions.
    const { syncLaborEntriesFromSessions } = await import(
      "@/lib/serviceOrders/laborSync.server"
    );
    const outcome = await syncLaborEntriesFromSessions(sb, session.service_order_id, userId);
    if (!outcome.synced) {
      throw new Error(
        "Esta OS está com apuração consolidada pelo administrador. Solicite o ajuste ao gestor.",
      );
    }

    return normalize(updated);
  });
