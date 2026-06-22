import type { ServiceOrder, ServiceOrderStatus } from "@/types/serviceOrder";

const TZ = "America/Sao_Paulo";

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function partsInTZ(date: Date) {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function ymdInTZ(date: Date) {
  const p = partsInTZ(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "hoje, 11:46" | "ontem, 16:10" | "22/06, 10:29" | "22/06/24, 10:29" */
export function formatServiceOrderDateTime(iso: string | null | undefined): string | null {
  const d = parse(iso);
  if (!d) return null;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dKey = ymdInTZ(d);
  const p = partsInTZ(d);
  const time = `${p.hour}:${p.minute}`;
  if (dKey === ymdInTZ(now)) return `hoje, ${time}`;
  if (dKey === ymdInTZ(yesterday)) return `ontem, ${time}`;
  if (p.year === partsInTZ(now).year) return `${p.day}/${p.month}, ${time}`;
  return `${p.day}/${p.month}/${p.year.slice(2)}, ${time}`;
}

/** "há 15min" | "há 2h" | "há 3d" | "agora" */
export function formatRelativeServiceOrderTime(iso: string | null | undefined): string | null {
  const d = parse(iso);
  if (!d) return null;
  const diffMin = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60_000));
  if (diffMin < 2) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

/** "45min" | "1h34min" | "2d 3h" */
export function formatServiceOrderDuration(
  openedAt: string | null | undefined,
  closedAt: string | null | undefined,
): string | null {
  const a = parse(openedAt);
  const b = parse(closedAt);
  if (!a || !b) return null;
  const totalMin = Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60_000));
  if (totalMin < 1) return "menos de 1min";
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}min`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH === 0 ? `${d}d` : `${d}d ${remH}h`;
}

const CLOSED: ReadonlySet<ServiceOrderStatus> = new Set([
  "finished",
  "approved",
  "cancelled",
]);

export function isClosedStatus(status: ServiceOrderStatus): boolean {
  return CLOSED.has(status);
}

export type ClosureKind = "concluida" | "aprovada" | "cancelada";

export function closureKind(order: Pick<ServiceOrder, "status">): ClosureKind | null {
  switch (order.status) {
    case "approved":
      return "aprovada";
    case "finished":
      return "concluida";
    case "cancelled":
      return "cancelada";
    default:
      return null;
  }
}

export function getOpenedAt(
  order: Pick<ServiceOrder, "opened_at" | "created_at">,
): string | null {
  return order.opened_at ?? order.created_at ?? null;
}

export function getClosedAt(
  order: Pick<ServiceOrder, "status" | "approved_at" | "finished_at" | "closed_at">,
): string | null {
  if (!isClosedStatus(order.status)) return null;
  return order.approved_at ?? order.finished_at ?? order.closed_at ?? null;
}

export function getDurationMinutes(
  order: Pick<
    ServiceOrder,
    "status" | "opened_at" | "created_at" | "approved_at" | "finished_at" | "closed_at"
  >,
): number | null {
  const opened = getOpenedAt(order);
  const closed = getClosedAt(order);
  if (!opened || !closed) return null;
  const a = parse(opened);
  const b = parse(closed);
  if (!a || !b) return null;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 60_000));
}