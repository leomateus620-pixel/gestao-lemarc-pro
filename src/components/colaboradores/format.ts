import { formatHHmm } from "@/lib/serviceOrders/finance";

export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dateShort = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

export function formatCurrency(valueCents: number | null | undefined) {
  if (valueCents == null) return "A definir";
  return currency.format(valueCents / 100);
}

export function formatMoneyOrZero(valueCents: number | null | undefined) {
  return currency.format((valueCents ?? 0) / 100);
}

export function formatMinutes(value: number | null | undefined) {
  return formatHHmm(value ?? 0);
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Sem data";
  return dateShort.format(parsed).replace(".", "");
}

export function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return letters || "LM";
}

export function centsToInput(value: number | null | undefined) {
  if (value == null) return "";
  return (value / 100).toFixed(2).replace(".", ",");
}

export function parseCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function monthRange(now = new Date()) {
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

export function weekRange(now = new Date()) {
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const from = new Date(now);
  from.setDate(now.getDate() + diffToMonday);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function todayRange(now = new Date()) {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function inDateRange(
  value: string | null | undefined,
  from?: Date | null,
  to?: Date | null,
) {
  if (!value) return false;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  if (from && parsed < from) return false;
  if (to && parsed > to) return false;
  return true;
}

export function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TITLE_CASE_LOWER = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "di",
  "del",
  "la",
  "le",
  "von",
  "van",
]);

export function toTitleCase(value: string | null | undefined) {
  if (!value) return "";
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && TITLE_CASE_LOWER.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    })
    .join(" ");
}

export function formatPhone(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpf(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
