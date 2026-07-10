import {
  DATA_UNAVAILABLE_LABEL,
  formatCurrency,
  formatDate,
  formatHours,
} from "@/lib/reports/formatters";
import type { ReportOrderRow } from "@/types/reports";
import { statusLabel, type ServiceOrderStatus } from "@/types/serviceOrder";
import { LEMARC_COLORS } from "@/lib/reports/lemarcBrand";

export const PENDING_LABELS = {
  awaitingValue: "Aguardando apuração",
  awaitingClose: "Aguardando fechamento",
  awaitingFinalization: "Aguardando finalização da OS",
  openOrder: "Em aberto",
  noRate: "Valor/hora pendente",
  notFinalized: "Não finalizado",
  noTechnician: "Sem técnico",
  noClient: "Sem cliente",
} as const;

const OPEN_STATUSES = new Set<ServiceOrderStatus>([
  "pending",
  "dispatched",
  "transit",
  "running",
  "review",
]);

export function isOpenOrder(row: ReportOrderRow): boolean {
  if (row.closed_at) return false;
  return OPEN_STATUSES.has(row.status);
}

export function formatFechamento(row: ReportOrderRow): string {
  if (row.closed_at) return formatDate(row.closed_at);
  return PENDING_LABELS.openOrder;
}

export function formatTempo(row: ReportOrderRow): string {
  if (row.worked_minutes_effective > 0) return formatHours(row.worked_minutes_effective);
  if (isOpenOrder(row)) return PENDING_LABELS.awaitingClose;
  return "Tempo não informado";
}

export function formatValor(row: ReportOrderRow): string {
  if (row.estimated_value > 0) return formatCurrency(row.estimated_value);
  if ((row.hour_rate ?? 0) <= 0) return PENDING_LABELS.noRate;
  if (isOpenOrder(row)) return PENDING_LABELS.awaitingValue;
  return DATA_UNAVAILABLE_LABEL;
}

export function formatHorasAgregado(hours: number, hasOpen: boolean): string {
  if (hours > 0) return `${hours.toFixed(1).replace(".", ",")}h`;
  if (hasOpen) return PENDING_LABELS.awaitingClose;
  return "0h registradas";
}

export function formatValorAgregado(value: number, hasOpen: boolean): string {
  if (value > 0) return formatCurrency(value);
  if (hasOpen) return PENDING_LABELS.awaitingValue;
  return formatCurrency(0);
}

export function statusBadgeColor(status: ServiceOrderStatus): [number, number, number] {
  switch (status) {
    case "finished":
    case "approved":
      return LEMARC_COLORS.green;
    case "running":
    case "transit":
    case "dispatched":
      return LEMARC_COLORS.navy;
    case "pending":
      return LEMARC_COLORS.amber;
    case "review":
      return LEMARC_COLORS.purple;
    case "cancelled":
      return LEMARC_COLORS.red;
    default:
      return LEMARC_COLORS.slate;
  }
}

export function shortStatusLabel(status: ServiceOrderStatus): string {
  return statusLabel[status];
}

/** Strip only control characters; keep PT-BR diacritics (Helvetica supports latin-1). */
export function sanitizePdfText(value: string | number | null | undefined): string {
  return (
    String(value ?? "")
      // eslint-disable-next-line no-control-regex -- o PDF deve remover bytes de controle inválidos.
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
      .replace(/\u00a0/g, " ")
  );
}
