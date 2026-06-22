import type { ServiceOrder } from "@/types/serviceOrder";
import { filterByPeriod, type Period, type PeriodRange } from "./period";
import {
  isAlert,
  isAwaitingReview,
  isCancelled,
  isDone,
  isInProgress,
  isIncomplete,
  isPending,
} from "./status";

export type DashboardMetrics = {
  period: Period;
  periodRange?: PeriodRange;
  total: number;
  pending: number;
  inProgress: number;
  awaitingReview: number;
  done: number;
  alerts: number;
  incomplete: number;
  activeClients: number;
  techniciansInField: number;
  pendingOrders: ServiceOrder[];
  inProgressOrders: ServiceOrder[];
  awaitingReviewOrders: ServiceOrder[];
  doneOrders: ServiceOrder[];
  alertOrders: ServiceOrder[];
  incompleteOrders: ServiceOrder[];
  periodOrders: ServiceOrder[];
};

export function computeMetrics(
  allOrders: ServiceOrder[],
  period: Period,
  periodRange?: PeriodRange,
): DashboardMetrics {
  const orders = filterByPeriod(allOrders, period, periodRange).filter((o) => !isCancelled(o));

  const pendingOrders = orders.filter(isPending);
  const inProgressOrders = orders.filter(isInProgress);
  const awaitingReviewOrders = orders.filter(isAwaitingReview);
  const doneOrders = orders.filter(isDone);
  const alertOrders = orders.filter((o) => isAlert(o));
  const incompleteOrders = orders.filter(isIncomplete);

  const activeClients = new Set(
    orders
      .filter((o) => !isDone(o))
      .map((o) => o.client_id)
      .filter(Boolean) as string[],
  ).size;

  const techniciansInField = new Set(
    inProgressOrders.map((o) => o.technician_id).filter(Boolean) as string[],
  ).size;

  return {
    period,
    periodRange,
    total: orders.length,
    pending: pendingOrders.length,
    inProgress: inProgressOrders.length,
    awaitingReview: awaitingReviewOrders.length,
    done: doneOrders.length,
    alerts: alertOrders.length,
    incomplete: incompleteOrders.length,
    activeClients,
    techniciansInField,
    pendingOrders,
    inProgressOrders,
    awaitingReviewOrders,
    doneOrders,
    alertOrders,
    incompleteOrders,
    periodOrders: orders,
  };
}
