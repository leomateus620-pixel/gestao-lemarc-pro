import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getClientReport,
  getReportOrders,
  listReportLookups,
  updateBillingStatus,
} from "@/lib/api/reports.functions";
import type { ReportFilters } from "@/types/reports";

function filtersKey(f: ReportFilters) {
  return [
    f.period,
    f.from ?? "",
    f.to ?? "",
    f.clientId ?? "",
    f.unitId ?? "",
    f.technicianId ?? "",
    f.status ?? "",
    f.priority ?? "",
    f.serviceType ?? "",
    f.billingStatus ?? "",
    f.onlyWithRate ? "1" : "0",
    f.onlyCompleted ? "1" : "0",
    f.onlyAwaitingBilling ? "1" : "0",
    f.onlyWithObservations ? "1" : "0",
  ];
}

export function useReportOrdersQuery(filters: ReportFilters) {
  const fetcher = useServerFn(getReportOrders);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["report-orders", ...filtersKey(filters)],
      queryFn: () => fetcher({ data: { filters } }),
      staleTime: 20_000,
    }),
  );
}

export function useClientReportQuery(clientId: string, filters: ReportFilters) {
  const fetcher = useServerFn(getClientReport);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["client-report", clientId, ...filtersKey(filters)],
      queryFn: () => fetcher({ data: { clientId, filters } }),
      staleTime: 20_000,
    }),
  );
}

export function useReportLookupsQuery() {
  const fetcher = useServerFn(listReportLookups);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["report-lookups"],
      queryFn: () => fetcher(),
      staleTime: 5 * 60_000,
    }),
  );
}

export function useUpdateBillingStatus() {
  const fn = useServerFn(updateBillingStatus);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-orders"] });
      qc.invalidateQueries({ queryKey: ["client-report"] });
      qc.invalidateQueries({ queryKey: ["service-orders"] });
    },
  });
}