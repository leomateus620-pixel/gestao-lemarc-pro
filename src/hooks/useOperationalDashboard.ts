import { useCallback, useMemo, useState } from "react";
import { computeMetrics } from "@/lib/serviceOrders/metrics";
import { defaultCustomRange, type Period, type PeriodRange } from "@/lib/serviceOrders/period";
import { useServiceOrdersQuery } from "./useServiceOrders";

function normalizeCustomRange(range?: PeriodRange): Required<PeriodRange> {
  const fallback = defaultCustomRange();
  const from = range?.from || range?.to || fallback.from;
  const to = range?.to || from;
  return { from, to };
}

export function useOperationalDashboard(initialPeriod: Period = "day") {
  const { data: orders } = useServiceOrdersQuery();
  const [period, setPeriodValue] = useState<Period>(initialPeriod);
  const [periodRange, setPeriodRange] = useState<PeriodRange | undefined>(
    initialPeriod === "custom" ? defaultCustomRange() : undefined,
  );
  const setPeriod = useCallback((next: Period, range?: PeriodRange) => {
    setPeriodValue(next);
    setPeriodRange(next === "custom" ? normalizeCustomRange(range) : undefined);
  }, []);
  const metrics = useMemo(
    () => computeMetrics(orders, period, periodRange),
    [orders, period, periodRange],
  );
  return { period, setPeriod, periodRange, setPeriodRange, metrics, orders };
}
