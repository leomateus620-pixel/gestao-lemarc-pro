import { useMemo, useState } from "react";
import { computeMetrics } from "@/lib/serviceOrders/metrics";
import type { Period } from "@/lib/serviceOrders/period";
import { useServiceOrdersQuery } from "./useServiceOrders";

export function useOperationalDashboard(initialPeriod: Period = "day") {
  const { data: orders } = useServiceOrdersQuery();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const metrics = useMemo(() => computeMetrics(orders, period), [orders, period]);
  return { period, setPeriod, metrics, orders };
}