import type { ServiceOrderStatus } from "@/types/serviceOrder";
import { statusLabel } from "@/types/serviceOrder";
import { getTechnicianState, pauseReasonLabel, type TimeSession } from "./timeSessions";

/**
 * Status de EXIBIÇÃO da OS. Não altera `service_orders.status`, horas,
 * apuração ou relatórios — apenas o que a tela mostra.
 */
export type DisplayStatusKey = ServiceOrderStatus | "paused" | "tech_finished";

export const TECH_FINISHED_LABEL = "Finalizada pelo técnico";

export type OrderTimeSummary = {
  key: "running" | "paused" | "tech_finished";
  pauseReason: string | null;
  pausedCount: number;
  runningCount: number;
  finishedCount?: number;
};

export type OrderDisplayStatus = {
  key: DisplayStatusKey;
  label: string;
  pauseReason: string | null;
  pausedCount: number;
  runningCount: number;
};

type SessionLike = Pick<
  TimeSession,
  "id" | "service_order_id" | "technician_id" | "kind" | "started_at" | "ended_at" | "end_reason" | "pause_reason"
> &
  Partial<TimeSession>;

/** Resumo do estado de tempo de uma OS a partir das sessões de trabalho. */
export function summarizeOrderTime(sessions: SessionLike[]): OrderTimeSummary {
  const work = sessions.filter((s) => s.kind === "work" && s.technician_id);
  const techIds = Array.from(new Set(work.map((s) => s.technician_id as string)));
  let runningCount = 0;
  let pausedCount = 0;
  let finishedCount = 0;
  let latestPause: { at: string; reason: string | null } | null = null;
  const reasons = new Set<string>();
  for (const id of techIds) {
    const st = getTechnicianState(work as TimeSession[], id);
    if (st.state === "running") runningCount++;
    else if (st.state === "paused") {
      pausedCount++;
      reasons.add(st.lastPauseReason ?? "");
      if (!latestPause || (st.lastPauseAt ?? "") > latestPause.at) {
        latestPause = { at: st.lastPauseAt ?? "", reason: st.lastPauseReason };
      }
    } else finishedCount++;
  }
  // Precedência: em andamento > pausada > finalizada pelo técnico.
  // Vinculado sem sessão não impede (não aparece aqui). Sem sessões → running.
  const paused = runningCount === 0 && pausedCount > 0;
  const techFinished = runningCount === 0 && pausedCount === 0 && finishedCount > 0;
  return {
    key: paused ? "paused" : techFinished ? "tech_finished" : "running",
    finishedCount,
    pauseReason: paused && reasons.size === 1 ? (latestPause?.reason ?? null) : null,
    pausedCount,
    runningCount,
  };
}

export function displayFromSummary(
  status: ServiceOrderStatus,
  summary: OrderTimeSummary | null | undefined,
): OrderDisplayStatus {
  if (status !== "running" || !summary) {
    return { key: status, label: statusLabel[status], pauseReason: null, pausedCount: 0, runningCount: 0 };
  }
  if (summary.key === "paused") {
    const reason = summary.pauseReason ? pauseReasonLabel(summary.pauseReason) : null;
    return {
      key: "paused",
      label: reason ? `Pausada · ${reason}` : "Pausada",
      pauseReason: summary.pauseReason,
      pausedCount: summary.pausedCount,
      runningCount: 0,
    };
  }
  if (summary.key === "tech_finished") {
    return {
      key: "tech_finished",
      label: TECH_FINISHED_LABEL,
      pauseReason: null,
      pausedCount: 0,
      runningCount: 0,
    };
  }
  return {
    key: "running",
    label: statusLabel.running,
    pauseReason: null,
    pausedCount: summary.pausedCount,
    runningCount: summary.runningCount,
  };
}

/** Função única: status exibido da OS a partir do status gravado + sessões. */
export function getOrderDisplayStatus(
  order: { status: ServiceOrderStatus },
  sessions: SessionLike[] | null | undefined,
): OrderDisplayStatus {
  if (order.status !== "running") return displayFromSummary(order.status, null);
  return displayFromSummary(order.status, summarizeOrderTime(sessions ?? []));
}

export function pausedSubLabel(d: OrderDisplayStatus): string | null {
  if (d.key !== "running" || d.pausedCount <= 0) return null;
  return d.pausedCount === 1 ? "1 pausado" : `${d.pausedCount} pausados`;
}

/** Tons âmbar (mesmos do ServiceOrderTimeControl) para o badge "Pausada". */
export const PAUSED_BADGE_TONE = "border-amber-400/50 bg-amber-500/15 text-amber-200";

/** Tom ciano para o badge "Finalizada pelo técnico". */
export const TECH_FINISHED_BADGE_TONE = "border-sky-400/50 bg-sky-500/15 text-sky-200";

/** Tom do selo derivado (Pausada / Finalizada pelo técnico) ou null. */
export function derivedBadgeTone(d: OrderDisplayStatus | null | undefined): string | null {
  if (d?.key === "paused") return PAUSED_BADGE_TONE;
  if (d?.key === "tech_finished") return TECH_FINISHED_BADGE_TONE;
  return null;
}

/** Quantas OS (status running) têm todos os técnicos com tempo encerrado. */
export function countTechFinishedOrders(
  orders: Array<{ id: string; status: ServiceOrderStatus }>,
  summaries: Record<string, OrderTimeSummary> | null | undefined,
): number {
  if (!summaries) return 0;
  return orders.filter((o) => o.status === "running" && summaries[o.id]?.key === "tech_finished").length;
}

/** Quantas OS (status running) estão totalmente pausadas, pelo resumo leve. */
export function countPausedOrders(
  orders: Array<{ id: string; status: ServiceOrderStatus }>,
  summaries: Record<string, OrderTimeSummary> | null | undefined,
): number {
  if (!summaries) return 0;
  return orders.filter((o) => o.status === "running" && summaries[o.id]?.key === "paused").length;
}

/** Detalhe de "Em campo": "X em execução · Y pausadas · Z finalizadas pelo técnico". */
export function inFieldDetail(total: number, paused: number, techFinished: number): string | undefined {
  if (paused <= 0 && techFinished <= 0) return undefined;
  const parts = [`${total - paused - techFinished} em execução`];
  if (paused > 0) parts.push(`${paused} ${paused === 1 ? "pausada" : "pausadas"}`);
  if (techFinished > 0)
    parts.push(`${techFinished} ${techFinished === 1 ? "finalizada pelo técnico" : "finalizadas pelo técnico"}`);
  return parts.join(" · ");
}
