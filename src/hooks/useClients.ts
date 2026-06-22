import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getClientDetail,
  getClientPage,
  listAllUnits,
  listClientsFull,
} from "@/lib/api/clients.functions";

export function useClientsFullQuery() {
  const fetcher = useServerFn(listClientsFull);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["clients", "full"],
      queryFn: () => fetcher(),
      staleTime: 30_000,
    }),
  );
}

export function useAllUnitsQuery() {
  const fetcher = useServerFn(listAllUnits);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["client-units", "all"],
      queryFn: () => fetcher(),
      staleTime: 30_000,
    }),
  );
}

export function useClientDetailQuery(id: string) {
  const fetcher = useServerFn(getClientDetail);
  return useSuspenseQuery(
    queryOptions({
      queryKey: ["client", id],
      queryFn: () => fetcher({ data: { id } }),
      staleTime: 30_000,
    }),
  );
}

export function clientPageQueryOptions(
  id: string,
  fetcher: (args: { data: { id: string } }) => Promise<
    Awaited<ReturnType<typeof getClientPage>>
  >,
) {
  return queryOptions({
    queryKey: ["client-page", id],
    queryFn: () => fetcher({ data: { id } }),
    staleTime: 30_000,
  });
}

export function useClientPageQuery(id: string) {
  const fetcher = useServerFn(getClientPage);
  return useSuspenseQuery(clientPageQueryOptions(id, fetcher));
}