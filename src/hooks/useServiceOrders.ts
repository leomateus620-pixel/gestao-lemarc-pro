import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClients, listServiceOrders, listTechnicians } from "@/lib/api/serviceOrders.functions";
import {
  listServiceOrderFinancialSummaries,
  listTechnicianLaborHistory,
} from "@/lib/api/financials.functions";
import {
  listDashboardTechnicianTime,
  listRunningOrderTimeState,
} from "@/lib/api/timeSessions.functions";
import { displayFromSummary } from "@/lib/serviceOrders/displayStatus";
import type { ServiceOrderStatus, TechnicianLite } from "@/types/serviceOrder";

export function useServiceOrdersQuery() {
  const fetcher = useServerFn(listServiceOrders);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["service-orders"],
      queryFn: () => fetcher(),
      staleTime: 30_000,
    }),
  );
}

export function useClientsQuery() {
  const fetcher = useServerFn(listClients);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["clients"],
      queryFn: () => fetcher(),
      staleTime: 60_000,
    }),
  );
}

export function useTechniciansQuery() {
  const fetcher = useServerFn(listTechnicians);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["technicians"],
      queryFn: () => fetcher() as Promise<TechnicianLite[]>,
      staleTime: 60_000,
    }),
  );
}

export function useTechnicianLaborHistoryQuery() {
  const fetcher = useServerFn(listTechnicianLaborHistory);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["technician-labor-history"],
      queryFn: () => fetcher(),
      staleTime: 30_000,
    }),
  );
}

export function useServiceOrderFinancialSummariesQuery() {
  const fetcher = useServerFn(listServiceOrderFinancialSummaries);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["service-order-financial-summaries"],
      queryFn: () => fetcher(),
      staleTime: 30_000,
    }),
  );
}

export function useDashboardTechnicianTimeQuery(orderIds: string[]) {
  const fetcher = useServerFn(listDashboardTechnicianTime);
  const normalizedOrderIds = Array.from(new Set(orderIds.filter(Boolean))).sort();

  return useSuspenseQuery(
    queryOptions({
      queryKey: ["dashboard-technician-time", normalizedOrderIds],
      queryFn: () =>
        normalizedOrderIds.length === 0
          ? Promise.resolve({ sessions: [], laborEntries: [] })
          : fetcher({ data: { orderIds: normalizedOrderIds } }),
      staleTime: 15_000,
    }),
  );
}

export const RUNNING_ORDER_TIME_STATE_KEY = ["running-order-time-state"] as const;

/**
 * Estado leve "Em execução x Pausada" das OS running. Não-suspense: se ainda
 * não carregou, os componentes mostram o status gravado (como antes).
 */
export function useRunningOrderTimeStateQuery() {
  const fetcher = useServerFn(listRunningOrderTimeState);
  return useQuery({
    queryKey: RUNNING_ORDER_TIME_STATE_KEY,
    queryFn: () => fetcher(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Status exibido de uma OS usando o resumo leve (fallback: status gravado). */
export function useOrderDisplayStatus(order: { id: string; status: ServiceOrderStatus }) {
  const { data } = useRunningOrderTimeStateQuery();
  return displayFromSummary(order.status, data?.[order.id]);
}
