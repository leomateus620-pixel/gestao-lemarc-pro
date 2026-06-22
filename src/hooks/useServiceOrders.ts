import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listClients,
  listServiceOrders,
  listTechnicians,
} from "@/lib/api/serviceOrders.functions";

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
      queryFn: () => fetcher(),
      staleTime: 60_000,
    }),
  );
}