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
  adjusted_by, adjusted_at, adjustment_reason,
  technician_reviewed_at, technician_reviewed_by, technician_review_note
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
    technician_reviewed_at: row.technician_reviewed_at ?? null,
    technician_reviewed_by: row.technician_reviewed_by ?? null,
    technician_review_note: row.technician_review_note ?? null,
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

/**
 * Resultado de uma operação em lote (equipe) de controle de tempo.
 * `skipped` = técnico já estava no estado desejado (ex.: já em execução).
 */
export type TimeBatchResult = {
  succeeded: string[];
  skipped: Array<{ technicianId: string; message: string }>;
  failed: Array<{ technicianId: string; message: string }>;
  /** Preenchido quando a apuração de horas não pôde ser materializada. */
  laborPending?: LaborPending | null;
};

type BatchInput = {
  orderId: string;
  /** Compatibilidade: um único técnico. */
  technicianId?: string | null;
  /** Escopo em equipe. */
  technicianIds?: string[];
};

function emptyBatch(): TimeBatchResult {
  return { succeeded: [], skipped: [], failed: [] };
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export type LaborPending = { minutes: number; message: string };

/**
 * Materializa a apuração com credencial de serviço. Não engole falhas: faz
 * uma retentativa e, se ainda falhar, devolve a pendência ao cliente para
 * aviso explícito (a operação de tempo em si já foi persistida).
 */
async function reconcileLaborSafe(
  sb: any,
  writer: any,
  orderId: string,
  userId: string,
): Promise<LaborPending | null> {
  const { reconcileLaborFromSessions } = await import("@/lib/serviceOrders/laborSync.server");
  let outcome = await reconcileLaborFromSessions(sb, orderId, userId, writer);
  if (outcome.failed) {
    outcome = await reconcileLaborFromSessions(sb, orderId, userId, writer);
  }
  if (!outcome.failed) return null;
  console.error("[labor-reconcile] pendência não incorporada", {
    orderId,
    pendingMinutes: outcome.pendingMinutes,
    error: outcome.error,
  });
  return {
    minutes: outcome.pendingMinutes ?? 0,
    message:
      outcome.error ??
      `Não foi possível atualizar a apuração de horas (${outcome.pendingMinutes ?? 0} min pendentes).`,
  };
}

/** Técnicos vinculados à OS (inclui o principal da própria OS). */
async function listOrderTechnicianIds(sb: any, orderId: string): Promise<string[]> {
  const [{ data: links }, { data: order }] = await Promise.all([
    sb.from("service_order_technicians").select("technician_id").eq("service_order_id", orderId),
    sb.from("service_orders").select("technician_id").eq("id", orderId).maybeSingle(),
  ]);
  const ids = new Set<string>();
  for (const l of links ?? []) if (l?.technician_id) ids.add(l.technician_id as string);
  if (order?.technician_id) ids.add(order.technician_id as string);
  return Array.from(ids);
}

/**
 * Normaliza o escopo pedido pelo cliente e valida que todos os técnicos
 * pertencem à OS. Sem escopo explícito, aplica a toda a equipe.
 */
async function resolveScope(sb: any, data: BatchInput): Promise<string[]> {
  const assigned = await listOrderTechnicianIds(sb, data.orderId);
  const requested = [
    ...(Array.isArray(data.technicianIds) ? data.technicianIds : []),
    ...(data.technicianId ? [data.technicianId] : []),
  ].filter((id): id is string => typeof id === "string" && id.length > 0);
  const unique = Array.from(new Set(requested));
  if (unique.length === 0) return assigned;
  const invalid = unique.filter((id) => !assigned.includes(id));
  if (invalid.length > 0) throw new Error("Técnico não vinculado a esta OS.");
  return unique;
}

export const startWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BatchInput) => data)
  .handler(async ({ data, context }): Promise<TimeBatchResult> => {
    if (!data.orderId) throw new Error("Dados inválidos.");
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const scope = await resolveScope(sb, data);
    if (scope.length === 0) throw new Error("Vincule ao menos um técnico à OS.");
    const writer = await getTimeSessionWriter();
    const result = emptyBatch();

    for (const technicianId of scope) {
      try {
        const open = await findOpenWork(sb, data.orderId, technicianId);
        if (open) {
          result.skipped.push({ technicianId, message: "Já estava com tempo em andamento." });
          continue;
        }
        const { error } = await writer
          .from("service_order_time_sessions")
          .insert({
            service_order_id: data.orderId,
            technician_id: technicianId,
            kind: "work",
            started_at: new Date().toISOString(),
            source: "mobile",
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        result.succeeded.push(technicianId);
      } catch (e) {
        result.failed.push({ technicianId, message: errMessage(e) });
      }
    }

    if (result.succeeded.length > 0) {
      // Mark OS as running if still pending/dispatched/transit.
      await sb
        .from("service_orders")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", data.orderId)
        .in("status", ["pending", "dispatched", "transit"]);
    }
    if (result.succeeded.length === 0 && result.skipped.length === 0) {
      throw new Error(result.failed[0]?.message ?? "Não foi possível iniciar o serviço.");
    }
    return result;
  });

export const pauseWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BatchInput & { reason: string; notes?: string | null }) => data)
  .handler(async ({ data, context }): Promise<TimeBatchResult> => {
    if (!data.reason) throw new Error("Selecione o motivo da pausa.");
    if (data.reason === "outro" && !data.notes?.trim()) {
      throw new Error("Informe uma observação para o motivo 'Outro'.");
    }
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const scope = await resolveScope(sb, data);
    const writer = await getTimeSessionWriter();
    const result = emptyBatch();

    for (const technicianId of scope) {
      try {
        const open = await findOpenWork(sb, data.orderId, technicianId);
        if (!open) {
          result.skipped.push({ technicianId, message: "Não havia tempo em andamento." });
          continue;
        }
        const { data: rows, error } = await writer
          .from("service_order_time_sessions")
          .update({
            ended_at: new Date().toISOString(),
            end_reason: "pause",
            pause_reason: data.reason,
            pause_notes: data.notes ?? null,
          })
          .eq("id", open.id)
          .select("id");
        if (error) throw new Error(error.message);
        if (!(rows ?? [])[0]) throw new Error("Nenhum registro foi atualizado. Tente novamente.");
        result.succeeded.push(technicianId);
      } catch (e) {
        result.failed.push({ technicianId, message: errMessage(e) });
      }
    }

    if (result.succeeded.length === 0 && result.skipped.length === 0) {
      throw new Error(result.failed[0]?.message ?? "Nenhuma sessão ativa para pausar.");
    }
    if (result.succeeded.length > 0) {
      result.laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
    }
    if (result.failed.length > 0) {
      throw new Error(result.failed[0]?.message ?? "Não foi possível pausar todos os tempos.");
    }
    try {
      const { syncServiceOrderOpenTimeAlerts } = await import("@/lib/api/notifications.functions");
      await syncServiceOrderOpenTimeAlerts({
        supabase: sb,
        serviceOrderId: data.orderId,
        finishedTechnicianId: result.succeeded[0] ?? null,
        actorUserId: context.userId,
      });
    } catch {
      /* non-blocking */
    }
    return result;
  });

export const resumeWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BatchInput & { notes?: string | null }) => data)
  .handler(async ({ data, context }): Promise<TimeBatchResult> => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const scope = await resolveScope(sb, data);
    const writer = await getTimeSessionWriter();
    const result = emptyBatch();

    for (const technicianId of scope) {
      try {
        // Confirm the last session for this tech was a pause.
        const { data: last, error: lastErr } = await sb
          .from("service_order_time_sessions")
          .select(SELECT)
          .eq("service_order_id", data.orderId)
          .eq("technician_id", technicianId)
          .eq("kind", "work")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastErr) throw new Error(lastErr.message);
        if (!last || last.ended_at == null || last.end_reason !== "pause") {
          result.skipped.push({ technicianId, message: "Não estava pausado." });
          continue;
        }
        const { error } = await writer
          .from("service_order_time_sessions")
          .insert({
            service_order_id: data.orderId,
            technician_id: technicianId,
            kind: "work",
            started_at: new Date().toISOString(),
            notes: data.notes ?? null,
            source: "mobile",
            created_by: context.userId,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        result.succeeded.push(technicianId);
      } catch (e) {
        result.failed.push({ technicianId, message: errMessage(e) });
      }
    }

    if (result.succeeded.length === 0 && result.skipped.length === 0) {
      throw new Error(result.failed[0]?.message ?? "Não há pausa ativa para retomar.");
    }
    if (result.succeeded.length > 0) {
      result.laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
    }
    if (result.failed.length > 0) {
      throw new Error(result.failed[0]?.message ?? "Não foi possível retomar todos os tempos.");
    }
    return result;
  });

export const finishWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BatchInput) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);
    const scope = await resolveScope(sb, data);
    const writer = await getTimeSessionWriter();
    const result = emptyBatch();
    for (const technicianId of scope) {
      try {
        const { data: closedRows, error } = await writer
          .from("service_order_time_sessions")
          .update({ ended_at: new Date().toISOString(), end_reason: "finish" })
          .eq("service_order_id", data.orderId)
          .eq("technician_id", technicianId)
          .eq("kind", "work")
          .is("ended_at", null)
          .select("id");
        if (error) throw new Error(error.message);
        if ((closedRows ?? []).length === 0) {
          result.skipped.push({ technicianId, message: "Não havia tempo em aberto." });
          continue;
        }
        result.succeeded.push(technicianId);
      } catch (e) {
        result.failed.push({ technicianId, message: errMessage(e) });
      }
    }
    if (result.succeeded.length === 0 && result.skipped.length === 0) {
      throw new Error(
        result.failed[0]?.message ?? "Nenhum tempo em aberto foi encontrado para encerrar.",
      );
    }
    if (result.succeeded.length > 0) {
      result.laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
    }
    if (result.failed.length > 0) {
      throw new Error(result.failed[0]?.message ?? "Não foi possível encerrar todos os tempos.");
    }
    let openTimeAlert = null as Awaited<
      ReturnType<typeof import("@/lib/api/notifications.functions").syncServiceOrderOpenTimeAlerts>
    >;
    try {
      const { syncServiceOrderOpenTimeAlerts } = await import("@/lib/api/notifications.functions");
      openTimeAlert = await syncServiceOrderOpenTimeAlerts({
        supabase: sb,
        serviceOrderId: data.orderId,
        finishedTechnicianId: result.succeeded[0] ?? null,
        actorUserId: context.userId,
      });
    } catch {
      /* non-blocking */
    }
    return { ok: true, openTimeAlert, ...result };
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

    const writer = await (await import("@/lib/serviceOrders/timeSessionWrite.server"))
      .getTimeSessionWriter();
    const { error } = await writer
      .from("service_order_time_sessions")
      .update({ ended_at: new Date().toISOString(), end_reason: "finish" })
      .eq("service_order_id", data.orderId)
      .eq("technician_id", data.technicianId)
      .eq("kind", "work")
      .is("ended_at", null);
    if (error) throw new Error(error.message);

    const laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
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
    return { ok: true, laborPending };
  });

export type OrderTimeReview = {
  sessions: TimeSession[];
  currentTechnicianId: string | null;
  isAdmin: boolean;
  canEditAll: boolean;
  reviewCompletedAt: string | null;
  pendingCount: number;
  reviewRequired: boolean;
  /** Técnicos para quem o usuário atual pode lançar um horário manual. */
  eligibleTechnicianIds: string[];
};


/**
 * Returns the whole team history of the order plus the caller's review scope.
 * Authorized for admins and for technicians assigned to the order.
 */
export const getOrderTimeReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => data)
  .handler(async ({ data, context }): Promise<OrderTimeReview> => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess } = await import("@/lib/serviceOrders/timeSessionWrite.server");
    await assertOrderTimeAccess(sb, context.userId, data.orderId);

    const [{ data: isAdminRaw }, { data: technician }, { data: order }] = await Promise.all([
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      sb
        .from("technicians")
        .select("id")
        .eq("user_id", context.userId)
        .eq("active", true)
        .maybeSingle(),
      sb
        .from("service_orders")
        .select("time_review_completed_at")
        .eq("id", data.orderId)
        .maybeSingle(),
    ]);
    const isAdmin = Boolean(isAdminRaw);

    const { data: rows, error } = await sb
      .from("service_order_time_sessions")
      .select(SELECT)
      .eq("service_order_id", data.orderId)
      .eq("kind", "work")
      .order("started_at", { ascending: true });
    if (error) throw new Error(error.message);

    const sessions: TimeSession[] = (rows ?? []).map(normalize);
    const pendingCount = sessions.filter(
      (session: TimeSession) => !session.technician_reviewed_at || !session.ended_at,
    ).length;

    const currentTechnicianId = (technician?.id as string | undefined) ?? null;
    const orderTechnicianIds = await listOrderTechnicianIds(sb, data.orderId);
    const eligibleTechnicianIds = isAdmin
      ? orderTechnicianIds
      : orderTechnicianIds.filter((id) => id === currentTechnicianId);

    return {
      sessions,
      currentTechnicianId,
      isAdmin,
      canEditAll: isAdmin,
      reviewCompletedAt: (order?.time_review_completed_at as string | null) ?? null,
      pendingCount,
      reviewRequired: sessions.length > 0 && pendingCount > 0,
      eligibleTechnicianIds,
    };
  });

/** Limite de segurança por lançamento manual, alinhado à derivação de horas. */
const MAX_MANUAL_SESSION_MINUTES = 14 * 60;

/**
 * Lançamento manual de um intervalo de trabalho na OS ("+ Adicionar horário").
 * Admin pode lançar para qualquer técnico da OS; técnico apenas para si.
 * Após gravar, a apuração de horas é reconciliada para PDF/relatórios seguirem.
 */
export const createManualTimeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      orderId: string;
      technicianId: string;
      startedAt: string;
      endedAt: string;
      reason: string;
    }) => {
      if (!data?.orderId) throw new Error("OS inválida.");
      if (!data?.technicianId) throw new Error("Selecione o técnico.");
      if (!data?.startedAt || !data?.endedAt) throw new Error("Informe início e fim.");
      if (!data.reason?.trim() || data.reason.trim().length < 3) {
        throw new Error("Informe um motivo para o lançamento (mín. 3 caracteres).");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);

    const [{ data: isAdminRaw }, { data: order }] = await Promise.all([
      sb.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      sb.from("service_orders").select("id, status").eq("id", data.orderId).maybeSingle(),
    ]);
    const isAdmin = Boolean(isAdminRaw);
    if (!order) throw new Error("Ordem de serviço não encontrada.");
    if (["review", "approved", "cancelled"].includes(order.status)) {
      throw new Error("Esta OS já foi revisada e não aceita novos horários.");
    }

    const { data: financial } = await sb
      .from("service_order_financials")
      .select("finalized_at")
      .eq("service_order_id", data.orderId)
      .maybeSingle();
    if (financial?.finalized_at) {
      throw new Error("Esta OS já teve a apuração finalizada pelo administrador.");
    }

    const assigned = await listOrderTechnicianIds(sb, data.orderId);
    if (!assigned.includes(data.technicianId)) {
      throw new Error("Técnico não vinculado a esta OS.");
    }
    if (!isAdmin) {
      const { data: techRow } = await sb
        .from("technicians")
        .select("id")
        .eq("user_id", context.userId)
        .eq("active", true)
        .maybeSingle();
      if (!techRow?.id) throw new Error("Perfil de técnico não encontrado ou inativo.");
      if (techRow.id !== data.technicianId) {
        throw new Error("Você só pode lançar horários para você mesmo.");
      }
    }

    const start = new Date(data.startedAt);
    const end = new Date(data.endedAt);
    if (Number.isNaN(start.getTime())) throw new Error("Data/hora de início inválida.");
    if (Number.isNaN(end.getTime())) throw new Error("Data/hora de fim inválida.");
    if (end.getTime() <= start.getTime()) {
      throw new Error("O horário de fim precisa ser maior que o de início.");
    }
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes > MAX_MANUAL_SESSION_MINUTES) {
      throw new Error("Um intervalo não pode passar de 14 horas.");
    }
    const nowMs = Date.now();
    if (start.getTime() > nowMs + 60_000 || end.getTime() > nowMs + 60_000) {
      throw new Error("Não é possível lançar horários no futuro.");
    }

    const { data: siblings, error: sibErr } = await sb
      .from("service_order_time_sessions")
      .select("id, started_at, ended_at")
      .eq("service_order_id", data.orderId)
      .eq("technician_id", data.technicianId)
      .eq("kind", "work");
    if (sibErr) throw new Error(sibErr.message);
    for (const s of siblings ?? []) {
      const sStart = new Date(s.started_at).getTime();
      const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Number.POSITIVE_INFINITY;
      if (sStart < end.getTime() && sEnd > start.getTime()) {
        throw new Error("O horário informado se sobrepõe a outro intervalo deste técnico.");
      }
    }

    const writer = await getTimeSessionWriter();
    const reason = data.reason.trim().slice(0, 500);
    const { data: inserted, error: insErr } = await writer
      .from("service_order_time_sessions")
      .insert({
        service_order_id: data.orderId,
        technician_id: data.technicianId,
        kind: "work",
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        end_reason: "finish",
        source: isAdmin ? "admin_adjustment" : "desktop",
        created_by: context.userId,
        adjusted_by: context.userId,
        adjusted_at: new Date().toISOString(),
        adjustment_reason: reason,
        metadata: {
          manual_entry: {
            at: new Date().toISOString(),
            by_user_id: context.userId,
            by_admin: isAdmin,
            reason,
          },
        },
      })
      .select(SELECT)
      .single();
    if (insErr) throw new Error(insErr.message);

    const laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
    if (laborPending) throw new Error(laborPending.message);

    return normalize(inserted);
  });


/**
 * Confirms the recorded time history of the order before signature.
 * Open work intervals are closed at this exact confirmation moment, then the
 * same reconciliation path updates the admin review, totals and reports.
 */
export const saveOrderTimeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; note?: string | null }) => {
    if (!data?.orderId) throw new Error("OS inválida.");
    if (data.note && data.note.length > 500) throw new Error("Observação muito longa.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { assertOrderTimeAccess, getTimeSessionWriter } = await import(
      "@/lib/serviceOrders/timeSessionWrite.server"
    );
    await assertOrderTimeAccess(sb, context.userId, data.orderId);

    const { data: sessions, error: sessionsError } = await sb
      .from("service_order_time_sessions")
      .select("id, started_at, ended_at")
      .eq("service_order_id", data.orderId)
      .eq("kind", "work");
    if (sessionsError) throw new Error(sessionsError.message);

    const reviewedAt = new Date().toISOString();
    const writer = await getTimeSessionWriter();

    const rows = (sessions ?? []) as { id: string; started_at: string; ended_at: string | null }[];
    if (rows.length === 0) {
      // OS sem apontamento: nada a revisar, o fluxo segue para a assinatura.
      await writer
        .from("service_orders")
        .update({ time_review_completed_at: reviewedAt, time_review_completed_by: context.userId })
        .eq("id", data.orderId);
      return { ok: true, skipped: true, reviewedAt, closedSessions: 0, laborPending: null };
    }

    const openIds = rows.filter((session) => !session.ended_at).map((session) => session.id);
    if (openIds.length > 0) {
      const { error: closeError } = await writer
        .from("service_order_time_sessions")
        .update({
          ended_at: reviewedAt,
          end_reason: "finish",
          adjusted_by: context.userId,
          adjusted_at: reviewedAt,
          adjustment_reason: "Intervalo encerrado na revisão de horas antes da assinatura",
        })
        .in("id", openIds);
      if (closeError) throw new Error(closeError.message);
    }

    const { error: reviewError } = await writer
      .from("service_order_time_sessions")
      .update({
        technician_reviewed_at: reviewedAt,
        technician_reviewed_by: context.userId,
        technician_review_note: data.note?.trim() || null,
      })
      .eq("service_order_id", data.orderId)
      .eq("kind", "work");
    if (reviewError) throw new Error(reviewError.message);

    const laborPending = await reconcileLaborSafe(sb, writer, data.orderId, context.userId);
    if (laborPending) {
      throw new Error(laborPending.message);
    }

    const { error: orderError } = await writer
      .from("service_orders")
      .update({ time_review_completed_at: reviewedAt, time_review_completed_by: context.userId })
      .eq("id", data.orderId);
    if (orderError) throw new Error(orderError.message);

    return { ok: true, skipped: false, reviewedAt, closedSessions: openIds.length, laborPending: null };
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
    const adjustedAt = (fin?.labor_entries_adjusted_at ?? null) as string | null;

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
    return { adjustedAt, totalMinutes, minutesByTechnician };
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

    const lockedStatuses = ["review", "approved", "cancelled"];
    if (lockedStatuses.includes(order.status)) {
      throw new Error("Esta OS já foi revisada e não pode ser editada.");
    }

    const { data: financial } = await sb
      .from("service_order_financials")
      .select("finalized_at")
      .eq("service_order_id", order.id)
      .maybeSingle();
    if (financial?.finalized_at) {
      throw new Error("Esta OS já teve a apuração finalizada pelo administrador.");
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
    const writer = await (await import("@/lib/serviceOrders/timeSessionWrite.server"))
      .getTimeSessionWriter();
    const outcome = await syncLaborEntriesFromSessions(
      sb,
      session.service_order_id,
      userId,
      writer,
    );
    if (!outcome.synced) {
      throw new Error(
        "Esta OS está com apuração consolidada pelo administrador. Solicite o ajuste ao gestor.",
      );
    }

    return normalize(updated);
  });
