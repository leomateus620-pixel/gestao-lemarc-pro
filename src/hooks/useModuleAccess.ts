import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyModuleAccess } from "@/lib/api/moduleAccess.functions";

export const MODULE_ACCESS_QUERY_KEY = ["module-access", "me"] as const;

export function useModuleAccessQuery(enabled = true) {
  const fetcher = useServerFn(getMyModuleAccess);
  return useQuery(
    queryOptions({
      queryKey: MODULE_ACCESS_QUERY_KEY,
      queryFn: () => fetcher(),
      staleTime: 60_000,
      enabled,
      retry: 1,
    }),
  );
}
