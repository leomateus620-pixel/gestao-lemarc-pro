import type { ServiceOrderStatus } from "@/types/serviceOrder";
import { statusLabel } from "@/types/serviceOrder";
import { getTechnicianState, pauseReasonLabel, type TimeSession } from "./timeSessions";

/**
 * Status de EXIBIÇÃO da OS. Não altera `service_orders.status`, horas,
 * apuração ou relatórios — apenas o que a tela mostra.
 */
export type DisplayStatusKey = ServiceOrderStatus | "paused";

export type OrderTimeSummary = {
  key: "running" | "paused";
  pauseReason: string | null;
  pausedCount: number;
  runningCount: number;
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
    }
  }
  const paused = runningCount === 0 && pausedCount > 0;
  return {
    key: paused ? "paused" : "running",
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
