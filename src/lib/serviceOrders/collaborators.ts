import type { TechnicianLaborHistoryRow } from "@/lib/api/financials.functions";
import { getOrderTechnicians, getServiceOrderWorkedMinutes } from "@/lib/serviceOrders/technicians";
import { isCancelled, isDone } from "@/lib/serviceOrders/status";
import {
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
  type ServiceType,
  type TechnicianLite,
} from "@/types/serviceOrder";

export type CollaboratorOperationalStatus =
  | "Disponível"
  | "Alocado"
  | "Em deslocamento"
  | "Em campo"
  | "Inativo";

export type CollaboratorHistoryItem = {
  id: string;
  orderId: string;
  orderNumber: number | null;
  title: string;
  clientName: string;
  unitName: string | null;
  date: string;
  serviceLabel: string;
  statusLabel: string;
  minutes: number;
  valueCents: number | null;
  description: string | null;
  source: "Apontamento" | "OS vinculada";
};

export type CollaboratorSummary = {
  id: string;
  name: string;
  role: string | null;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  active: boolean;
  kind: string | null;
  defaultAvailability: string | null;
  userId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  internalNotes: string | null;
  pricingNotes: string | null;
  internalCode: string;
  hourlyRateCents: number | null;
  hourlyRate50Cents: number | null;
  hourlyRate100Cents: number | null;
  status: CollaboratorOperationalStatus;
  ordersOpen: number;
  ordersToday: number;
  hoursMonthMinutes: number;
  hoursMonthRealMinutes: number;
  hoursMonthEstimatedMinutes: number;
  servicesMonth: number;
  valueMonthCents: number | null;
  valueMonthCentsReal: number;
  valueMonthCentsEstimated: number;
  history: CollaboratorHistoryItem[];
  hasLaborEntries: boolean;
  hasEstimatedFallback: boolean;
};

export type CollaboratorDashboard = {
  collaborators: CollaboratorSummary[];
  kpis: {
    total: number;
    active: number;
    inactive: number;
    inField: number;
    available: number;
    inTransit: number;
    hoursMonthMinutes: number;
    hoursMonthRealMinutes: number;
    hoursMonthEstimatedMinutes: number;
    completedMonth: number;
    valueMonthCents: number | null;
    valueMonthCentsReal: number;
    valueMonthCentsEstimated: number;
  };
};

const COMPLETED_STATUSES = new Set<ServiceOrderStatus>(["finished", "approved"]);
const ACTIVE_ALLOCATION_STATUSES = new Set<ServiceOrderStatus>(["pending", "dispatched", "review"]);

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateLike(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function isSameDay(value: string | null | undefined, now: Date) {
  const parsed = parseDateLike(value);
  return parsed ? dateKey(parsed) === dateKey(now) : false;
}

function isSameMonth(value: string | null | undefined, now: Date) {
  const parsed = parseDateLike(value);
  return parsed
    ? parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth()
    : false;
}

function latestOperationalDate(order: ServiceOrder) {
  return (
    order.finished_at ??
    order.closed_at ??
    order.started_at ??
    order.scheduled_for ??
    order.updated_at
  );
}

export function orderHasTechnician(order: ServiceOrder, technicianId: string) {
  return getOrderTechnicians(order).some((technician) => technician.id === technicianId);
}

export function collaboratorOrdersFor(orders: ServiceOrder[], technicianId: string) {
  return orders.filter((order) => orderHasTechnician(order, technicianId));
}

export function collaboratorLaborFor(
  laborHistory: TechnicianLaborHistoryRow[],
  technicianId: string,
) {
  return laborHistory.filter((entry) => entry.technician_id === technicianId);
}

function serviceLabel(type: ServiceType | string | null, other?: string | null) {
  if (type === "outro" && other?.trim()) return other.trim();
  if (!type) return "Serviço operacional";
  return serviceTypeLabel[type as ServiceType] ?? "Serviço operacional";
}

function computeOrderValueCents(order: ServiceOrder, minutes: number) {
  if (!order.hour_rate || order.hour_rate <= 0 || minutes <= 0) return null;
  return Math.round((minutes / 60) * order.hour_rate * 100);
}

function deriveStatus(orders: ServiceOrder[]): CollaboratorOperationalStatus {
  const active = orders.filter((order) => !isCancelled(order) && !isDone(order));
  if (active.some((order) => order.status === "transit")) return "Em deslocamento";
  if (active.some((order) => order.status === "running")) return "Em campo";
  if (active.some((order) => ACTIVE_ALLOCATION_STATUSES.has(order.status))) return "Alocado";
  return "Disponível";
}

function buildLaborHistoryItem(row: TechnicianLaborHistoryRow): CollaboratorHistoryItem {
  const order = row.service_order;
  return {
    id: row.id,
    orderId: row.service_order_id,
    orderNumber: order?.number ?? null,
    title: order?.title ?? "OS sem título",
    clientName: order?.client?.name ?? "Cliente não informado",
    unitName: order?.client_unit?.name ?? order?.client?.unit ?? null,
    date: row.work_date,
    serviceLabel: serviceLabel(order?.service_type ?? null, order?.service_type_other ?? null),
    statusLabel: order?.status
      ? (statusLabel[order.status as ServiceOrderStatus] ?? order.status)
      : "Sem status",
    minutes: row.duration_minutes,
    valueCents: row.subtotal_cents > 0 ? row.subtotal_cents : null,
    description: row.description,
    source: "Apontamento",
  };
}

function buildFallbackHistoryItem(order: ServiceOrder): CollaboratorHistoryItem {
  const worked = getServiceOrderWorkedMinutes(order);
  return {
    id: `order-${order.id}`,
    orderId: order.id,
    orderNumber: order.number,
    title: order.title,
    clientName: order.client?.name ?? "Cliente não informado",
    unitName: order.client_unit?.name ?? order.client?.unit ?? null,
    date: latestOperationalDate(order),
    serviceLabel: serviceLabel(order.service_type, order.service_type_other),
    statusLabel: statusLabel[order.status],
    minutes: worked.minutes,
    valueCents: computeOrderValueCents(order, worked.minutes),
    description: order.description,
    source: "OS vinculada",
  };
}

function sortHistoryDesc(a: CollaboratorHistoryItem, b: CollaboratorHistoryItem) {
  return (parseDateLike(b.date)?.getTime() ?? 0) - (parseDateLike(a.date)?.getTime() ?? 0);
}

export function formatMinutesShort(minutes: number) {
  if (minutes <= 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining}min`;
  return remaining ? `${hours}h${String(remaining).padStart(2, "0")}` : `${hours}h`;
}

export function buildCollaboratorOperationalDashboard({
  technicians,
  orders,
  laborHistory,
  now = new Date(),
}: {
  technicians: TechnicianLite[];
  orders: ServiceOrder[];
  laborHistory: TechnicianLaborHistoryRow[];
  now?: Date;
}): CollaboratorDashboard {
  const collaborators = technicians.map((technician) => {
    const active = technician.active !== false;
    const assignedOrders = orders.filter((order) => orderHasTechnician(order, technician.id));
    const laborEntries = laborHistory.filter((entry) => entry.technician_id === technician.id);
    const orderIdsWithEntries = new Set(laborEntries.map((entry) => entry.service_order_id));
    const fallbackOrders = assignedOrders.filter((order) => !orderIdsWithEntries.has(order.id));

    const monthEntries = laborEntries.filter((entry) => isSameMonth(entry.work_date, now));
    const monthFallbackOrders = fallbackOrders.filter(
      (order) =>
        COMPLETED_STATUSES.has(order.status) &&
        isSameMonth(order.finished_at ?? order.closed_at ?? order.updated_at, now),
    );

    const fallbackMonthMinutes = monthFallbackOrders.reduce(
      (total, order) => total + getServiceOrderWorkedMinutes(order).minutes,
      0,
    );
    const fallbackMonthValue = monthFallbackOrders.reduce((total, order) => {
      const minutes = getServiceOrderWorkedMinutes(order).minutes;
      return total + (computeOrderValueCents(order, minutes) ?? 0);
    }, 0);
    const monthValueFromEntries = monthEntries.reduce(
      (total, entry) => total + Math.max(0, entry.subtotal_cents),
      0,
    );
    const servicesMonth = new Set([
      ...monthEntries.map((entry) => entry.service_order_id),
      ...monthFallbackOrders.map((order) => order.id),
    ]).size;

    const laborHistoryItems = laborEntries.map(buildLaborHistoryItem);
    const fallbackHistoryItems = fallbackOrders.map(buildFallbackHistoryItem);

    const ordersOpen = assignedOrders.filter(
      (order) => !isCancelled(order) && !isDone(order),
    ).length;
    const ordersToday = assignedOrders.filter(
      (order) =>
        !isCancelled(order) &&
        (isSameDay(order.scheduled_for, now) ||
          isSameDay(order.opened_at, now) ||
          isSameDay(order.updated_at, now)),
    ).length;
    const hoursMonthMinutes =
      monthEntries.reduce((total, entry) => total + Math.max(0, entry.duration_minutes), 0) +
      fallbackMonthMinutes;
    const valueMonthCents = monthValueFromEntries + fallbackMonthValue;

    return {
      id: technician.id,
      name: technician.full_name,
      role: technician.role,
      specialty: technician.specialty ?? null,
      phone: technician.phone ?? null,
      email: technician.email ?? null,
      cpf: technician.cpf ?? null,
      active,
      kind: technician.kind ?? null,
      defaultAvailability: technician.default_availability ?? null,
      userId: technician.user_id ?? null,
      createdAt: technician.created_at ?? null,
      updatedAt: technician.updated_at ?? null,
      internalNotes: technician.internal_notes ?? null,
      pricingNotes: technician.pricing_notes ?? null,
      internalCode: `COL-${technician.id.slice(0, 6).toUpperCase()}`,
      hourlyRateCents: technician.hourly_rate_cents ?? null,
      hourlyRate50Cents: technician.hourly_rate_50_cents ?? null,
      hourlyRate100Cents: technician.hourly_rate_100_cents ?? null,
      status: active ? deriveStatus(assignedOrders) : "Inativo",
      ordersOpen,
      ordersToday,
      hoursMonthMinutes,
      servicesMonth,
      valueMonthCents: valueMonthCents > 0 ? valueMonthCents : null,
      history: [...laborHistoryItems, ...fallbackHistoryItems].sort(sortHistoryDesc).slice(0, 4),
      hasLaborEntries: laborEntries.length > 0,
      hasEstimatedFallback:
        fallbackMonthOrdersHaveValue(monthFallbackOrders) || fallbackHistoryItems.length > 0,
    };
  });

  const kpiValue = collaborators.reduce((total, collaborator) => {
    return total + (collaborator.valueMonthCents ?? 0);
  }, 0);

  return {
    collaborators,
    kpis: {
      total: collaborators.length,
      active: collaborators.filter((collaborator) => collaborator.active).length,
      inactive: collaborators.filter((collaborator) => !collaborator.active).length,
      inField: collaborators.filter((collaborator) => collaborator.status === "Em campo").length,
      available: collaborators.filter((collaborator) => collaborator.status === "Disponível")
        .length,
      inTransit: collaborators.filter((collaborator) => collaborator.status === "Em deslocamento")
        .length,
      hoursMonthMinutes: collaborators.reduce(
        (total, collaborator) => total + collaborator.hoursMonthMinutes,
        0,
      ),
      completedMonth: collaborators.reduce(
        (total, collaborator) => total + collaborator.servicesMonth,
        0,
      ),
      valueMonthCents: kpiValue > 0 ? kpiValue : null,
    },
  };
}

function fallbackMonthOrdersHaveValue(orders: ServiceOrder[]) {
  return orders.some((order) => {
    const minutes = getServiceOrderWorkedMinutes(order).minutes;
    return computeOrderValueCents(order, minutes) !== null;
  });
}
