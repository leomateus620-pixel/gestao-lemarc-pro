import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTechnicianAssignedOrderNotifications } from "@/lib/api/notifications.functions";
import type { ServiceOrderAssignedNotification } from "@/types/notifications";

export const TECHNICIAN_NOTIFICATIONS_QUERY_KEY = ["technician-assigned-order-notifications"];

export function useTechnicianAssignedOrderNotificationsQuery() {
  const fetcher = useServerFn(listTechnicianAssignedOrderNotifications);
  return useQuery({
    queryKey: TECHNICIAN_NOTIFICATIONS_QUERY_KEY,
    queryFn: () => fetcher() as Promise<ServiceOrderAssignedNotification[]>,
    staleTime: 15_000,
  });
}
