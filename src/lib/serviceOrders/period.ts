import type { ServiceOrder } from "@/types/serviceOrder";

export type Period = "day" | "week" | "month" | "custom" | "all";

export type PeriodRange = {
  from?: string;
  to?: string;
};

export const periodLabel: Record<Period, string> = {
  day: "Hoje",
  week: "Semana",
  month: "Mês",
  custom: "Personalizado",
  all: "Tudo",
};

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
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

function parseDateInput(value?: string, end = false): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return end ? endOfDay(parsed) : startOfDay(parsed);
}

export function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultCustomRange(now = new Date()): Required<PeriodRange> {
  const today = dateInputValue(now);
  return { from: today, to: today };
}

export function periodWindow(
  period: Period,
  range?: PeriodRange,
  now = new Date(),
): { start: Date | null; end: Date | null } {
  switch (period) {
    case "day":
      return { start: startOfDay(now), end: null };
    case "week":
      return { start: startOfWeek(now), end: null };
    case "month":
      return { start: startOfMonth(now), end: null };
    case "custom": {
      const start = parseDateInput(range?.from);
      const end = parseDateInput(range?.to, true);
      if (start && end && start.getTime() > end.getTime()) {
        return { start: startOfDay(end), end: endOfDay(start) };
      }
      return { start, end };
    }
    case "all":
      return { start: null, end: null };
  }
}

export function periodStart(period: Period, now = new Date()): Date | null {
  return periodWindow(period, undefined, now).start;
}

/** OS está no período se foi aberta OU movimentada dentro da janela. */
export function isInPeriod(
  o: ServiceOrder,
  period: Period,
  range?: PeriodRange,
  now = new Date(),
): boolean {
  const { start, end } = periodWindow(period, range, now);
  if (!start && !end) return true;

  const opened = new Date(o.opened_at).getTime();
  if (!Number.isFinite(opened)) return false;
  if (start && opened < start.getTime()) return false;
  if (end && opened > end.getTime()) return false;
  return true;
}

export function filterByPeriod(
  orders: ServiceOrder[],
  period: Period,
  range?: PeriodRange,
): ServiceOrder[] {
  if (period === "all") return orders;
  return orders.filter((o) => isInPeriod(o, period, range));
}

function formatShortDate(value?: string) {
  const parsed = parseDateInput(value);
  return parsed ? shortDateFormatter.format(parsed) : null;
}

export function periodContextLabel(period: Period, range?: PeriodRange): string {
  switch (period) {
    case "day":
      return "no período de hoje";
    case "week":
      return "na semana atual";
    case "month":
      return "no mês atual";
    case "custom": {
      const from = formatShortDate(range?.from);
      const to = formatShortDate(range?.to);
      if (from && to) return `de ${from} até ${to}`;
      if (from) return `a partir de ${from}`;
      if (to) return `até ${to}`;
      return "em período personalizado";
    }
    case "all":
      return "em todo o histórico";
  }
}
