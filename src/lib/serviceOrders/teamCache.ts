import type { QueryClient } from "@tanstack/react-query";

/** Chaves de cache afetadas por vínculo/início/pausa/encerramento de técnicos. */
export function orderTeamQueryKeys(orderId: string): unknown[][] {
  return [
    ["service-order", orderId],
    ["service-orders"],
    ["order-time-sessions", orderId],
    ["running-order-time-state"],
    ["dashboard-technician-time"],
    ["order-history-technicians", orderId],
    ["order-financials", orderId],
    ["order-labor-override", orderId],
    ["order-time-review", orderId],
    ["order-time-review-state", orderId],
    ["technicians"],
  ];
}

export function invalidateOrderTeamQueries(queryClient: QueryClient, orderId: string) {
  for (const queryKey of orderTeamQueryKeys(orderId)) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
