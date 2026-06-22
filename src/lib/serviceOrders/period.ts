import type { ServiceOrder } from "@/types/serviceOrder";

export type Period = "day" | "week" | "month" | "all";

export const periodLabel: Record<Period, string> = {
  day: "Hoje",
  week: "Semana",
  month: "Mês",
  all: "Tudo",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // make Monday the start
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function periodStart(period: Period, now = new Date()): Date | null {
  switch (period) {
    case "day":
      return startOfDay(now);
    case "week":
      return startOfWeek(now);
    case "month":
      return startOfMonth(now);
    case "all":
      return null;
  }
}

/** OS está no período se foi aberta OU movimentada dentro da janela. */
export function isInPeriod(o: ServiceOrder, period: Period, now = new Date()): boolean {
  const start = periodStart(period, now);
  if (!start) return true;
  const opened = new Date(o.opened_at).getTime();
  const updated = new Date(o.updated_at).getTime();
  return opened >= start.getTime() || updated >= start.getTime();
}

export function filterByPeriod(orders: ServiceOrder[], period: Period): ServiceOrder[] {
  if (period === "all") return orders;
  return orders.filter((o) => isInPeriod(o, period));
}