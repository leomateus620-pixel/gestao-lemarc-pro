import type { ServiceOrder, ServiceOrderStatus } from "@/types/serviceOrder";

export const technicianActionStatuses = new Set<ServiceOrderStatus>([
  "pending",
  "dispatched",
  "transit",
  "running",
]);

export function technicianOrderNeedsAction(order: Pick<ServiceOrder, "status">) {
  return technicianActionStatuses.has(order.status);
}
