export type RecentServiceOrderLike = {
  id: string;
  number: number;
  opened_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const RECENT_DATE_FIELDS = ["opened_at", "created_at", "updated_at"] as const;

function validTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function recentOrderTimestamp(order: RecentServiceOrderLike) {
  for (const field of RECENT_DATE_FIELDS) {
    const timestamp = validTimestamp(order[field]);
    if (timestamp !== null) return timestamp;
  }
  return null;
}

export function getRecentServiceOrders<T extends RecentServiceOrderLike>(
  orders: readonly T[],
  limit = 4,
) {
  return orders
    .map((order, index) => ({
      order,
      index,
      timestamp: recentOrderTimestamp(order),
    }))
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null && a.timestamp !== b.timestamp) {
        return b.timestamp - a.timestamp;
      }
      if (a.timestamp !== null && b.timestamp === null) return -1;
      if (a.timestamp === null && b.timestamp !== null) return 1;
      if (a.order.number !== b.order.number) return b.order.number - a.order.number;
      const idCompare = a.order.id.localeCompare(b.order.id, "pt-BR");
      if (idCompare !== 0) return idCompare;
      return a.index - b.index;
    })
    .slice(0, Math.max(0, limit))
    .map((item) => item.order);
}
