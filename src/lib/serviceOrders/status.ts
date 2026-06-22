import type { ServiceOrder, ServiceOrderStatus } from "@/types/serviceOrder";

export type StatusBucket = "pending" | "inProgress" | "review" | "done" | "cancelled";

export const statusBucket: Record<ServiceOrderStatus, StatusBucket> = {
  pending: "pending",
  dispatched: "pending",
  transit: "inProgress",
  running: "inProgress",
  finished: "review",
  review: "review",
  approved: "done",
  cancelled: "cancelled",
};

export const isPending = (o: ServiceOrder) => statusBucket[o.status] === "pending";
export const isInProgress = (o: ServiceOrder) => statusBucket[o.status] === "inProgress";
export const isAwaitingReview = (o: ServiceOrder) => statusBucket[o.status] === "review";
export const isDone = (o: ServiceOrder) => statusBucket[o.status] === "done";
export const isCancelled = (o: ServiceOrder) => statusBucket[o.status] === "cancelled";

/** OS com pelo menos uma das condições de risco operacional. */
export function isAlert(o: ServiceOrder, now = new Date()): boolean {
  if (isCancelled(o) || isDone(o)) return false;
  if (o.priority === "urgente") return true;
  if (o.scheduled_for) {
    const due = new Date(o.scheduled_for).getTime();
    if (due < now.getTime() && !o.finished_at) return true;
  }
  return false;
}

/** Lista de campos faltando para que a OS seja considerada "completa". */
export function missingFields(o: ServiceOrder): string[] {
  const missing: string[] = [];
  if (!o.client_id) missing.push("cliente");
  if (!o.technician_id) missing.push("técnico");
  if (!o.description || o.description.trim().length < 5) missing.push("descrição");
  if (!o.service_type) missing.push("tipo de serviço");
  if (!o.priority) missing.push("prioridade");
  if (!o.scheduled_for) missing.push("previsão");
  if (isAwaitingReview(o) && !o.approved_at && !o.closed_at) missing.push("fechamento");
  return missing;
}

export const isIncomplete = (o: ServiceOrder) => !isCancelled(o) && missingFields(o).length > 0;