import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClients, listServiceOrders, listTechnicians } from "@/lib/api/serviceOrders.functions";
import {
  listServiceOrderFinancialSummaries,
  listTechnicianLaborHistory,
} from "@/lib/api/financials.functions";
import { listDashboardTechnicianTime } from "@/lib/api/timeSessions.functions";
import type { TechnicianLite } from "@/types/serviceOrder";

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
