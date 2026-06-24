const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const BRL_PRECISE = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMBER = new Intl.NumberFormat("pt-BR");

const DATE = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatCurrency(value: number, precise = false) {
  return (precise ? BRL_PRECISE : BRL).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number) {
  return NUMBER.format(Math.round(value));
}

export function formatHours(minutes: number | null | undefined) {
  const m = Math.max(0, Math.round(minutes ?? 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}min`;
  return `${h}h${r.toString().padStart(2, "0")}`;
}

export function formatHoursDecimal(minutes: number | null | undefined) {
  const v = (minutes ?? 0) / 60;
  return NUMBER.format(Math.round(v * 10) / 10);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE.format(d);
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_TIME.format(d);
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}