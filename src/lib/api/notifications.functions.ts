/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types are updated by migrations and can lag in local checkouts. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  priorityLabel,
  serviceTypeLabel,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import type {
  AssignedOrderNotificationSummary,
  ServiceOrderAssignedNotification,
  ServiceOrderNotificationType,
} from "@/types/notifications";

const ASSIGNED_NOTIFICATION_TYPE: ServiceOrderNotificationType = "service_order_assigned";

const ORDER_NOTIFICATION_SELECT = `
  id, number, title, description, service_type, service_type_other, priority,
  location, scheduled_for, status,
  client:clients!service_orders_client_id_fkey(id, name, unit),
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name, sector)
`;

const NOTIFICATION_SELECT = `
  id, service_order_id, technician_id, user_id, type, title, message,
  read_at, dismissed_at, created_at, metadata,
  service_order:service_orders!service_order_notifications_service_order_id_fkey(
    ${ORDER_NOTIFICATION_SELECT}
  )
`;

type SupabaseClient = any;

type TechnicianNotificationTarget = {
  id: string;
  full_name: string;
  user_id: string | null;
};

type NotificationOrderRow = {
  id: string;
  number: number | null;
  title: string | null;
  description: string | null;
  service_type: ServiceType | null;
  service_type_other: string | null;
  priority: ServicePriority | null;
  location: string | null;
  scheduled_for: string | null;
  status?: string | null;
  client?: { name: string | null; unit: string | null } | null;
  client_unit?: { name: string | null; sector: string | null } | null;
};

type ExistingNotification = {
  id: string;
  technician_id: string;
  read_at: string | null;
  dismissed_at: string | null;
  metadata: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function orderSummaryFromRow(
  order: NotificationOrderRow | null | undefined,
  metadata: Record<string, unknown>,
): AssignedOrderNotificationSummary {
  const serviceType = (order?.service_type ??
    (typeof metadata.service_type === "string"
      ? metadata.service_type
      : null)) as ServiceType | null;
  const priority = (order?.priority ??
    (typeof metadata.priority === "string" ? metadata.priority : null)) as ServicePriority | null;

  return {
    id:
      order?.id ?? (typeof metadata.service_order_id === "string" ? metadata.service_order_id : ""),
    number:
      typeof order?.number === "number"
        ? order.number
        : typeof metadata.order_number === "number"
          ? metadata.order_number
          : null,
    title:
      order?.title ??
      (typeof metadata.order_title === "string" ? metadata.order_title : "OS sem título"),
    description:
      order?.description ??
      (typeof metadata.description === "string" ? metadata.description : null),
    clientName:
      order?.client?.name ??
      (typeof metadata.client_name === "string" ? metadata.client_name : "Cliente não informado"),
    unitName:
      order?.client_unit?.name ??
      order?.client?.unit ??
      (typeof metadata.unit_name === "string" ? metadata.unit_name : "Unidade não informada"),
    location:
      order?.location ??
      order?.client_unit?.sector ??
      (typeof metadata.location === "string" ? metadata.location : "Local não informado"),
    serviceType,
    serviceTypeOther:
      order?.service_type_other ??
      (typeof metadata.service_type_other === "string" ? metadata.service_type_other : null),
    priority,
    scheduledFor:
      order?.scheduled_for ??
      (typeof metadata.scheduled_for === "string" ? metadata.scheduled_for : null),
    technicianNames: stringArray(metadata.technician_names),
  };
}

function normalizeNotification(row: any): ServiceOrderAssignedNotification | null {
  const metadata = asRecord(row.metadata);
  const order = Array.isArray(row.service_order) ? row.service_order[0] : row.service_order;
  const summary = orderSummaryFromRow(order, metadata);
  if (!summary.id) return null;
  if (order?.status === "cancelled") return null;
  return {
    id: row.id,
    service_order_id: row.service_order_id,
    technician_id: row.technician_id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message ?? null,
    created_at: row.created_at,
    order: summary,
  };
}

function buildNotificationMetadata(
  order: NotificationOrderRow,
  technicianNames: string[],
): Record<string, Json> {
  return {
    service_order_id: order.id,
    order_number: order.number,
    order_title: order.title ?? "OS sem título",
    description: order.description,
    client_name: order.client?.name ?? "Cliente não informado",
    unit_name: order.client_unit?.name ?? order.client?.unit ?? "Unidade não informada",
    location: order.location ?? order.client_unit?.sector ?? "Local não informado",
    service_type: order.service_type,
    service_type_other: order.service_type_other,
    priority: order.priority,
    scheduled_for: order.scheduled_for,
    technician_names: technicianNames,
  };
}

function buildNotificationTitle(order: NotificationOrderRow) {
  return `Nova OS #${order.number ?? "—"} atribuída a você`;
}

function buildNotificationMessage(order: NotificationOrderRow) {
  const client = order.client?.name ?? "cliente não informado";
  const unit = order.client_unit?.name ?? order.client?.unit ?? "unidade não informada";
  const type =
    order.service_type === "outro" && order.service_type_other
      ? order.service_type_other
      : order.service_type
        ? serviceTypeLabel[order.service_type]
        : "serviço não informado";
  const priority = order.priority ? priorityLabel[order.priority].toLowerCase() : "sem prioridade";
  return `${client} · ${unit} · ${type} · prioridade ${priority}`;
}

async function fetchNotificationOrder(sb: SupabaseClient, orderId: string) {
  const { data, error } = await sb
    .from("service_orders")
    .select(ORDER_NOTIFICATION_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as NotificationOrderRow | null;
}

async function fetchTechnicianTargets(sb: SupabaseClient, technicianIds: string[]) {
  if (technicianIds.length === 0) return [];
  const { data, error } = await sb
    .from("technicians")
    .select("id, full_name, user_id")
    .in("id", technicianIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as TechnicianNotificationTarget[];
}

async function fetchExistingNotifications(
  sb: SupabaseClient,
  orderId: string,
  technicianIds: string[],
) {
  if (technicianIds.length === 0) return new Map<string, ExistingNotification>();
  const { data, error } = await sb
    .from("service_order_notifications")
    .select("id, technician_id, read_at, dismissed_at, metadata")
    .eq("service_order_id", orderId)
    .eq("type", ASSIGNED_NOTIFICATION_TYPE)
    .in("technician_id", technicianIds);
  if (error) throw new Error(error.message);
  return new Map(
    ((data ?? []) as ExistingNotification[]).map((notification) => [
      notification.technician_id,
      notification,
    ]),
  );
}

async function dismissRemovedTechnicianNotifications({
  sb,
  orderId,
  technicianIds,
}: {
  sb: SupabaseClient;
  orderId: string;
  technicianIds: string[];
}) {
  if (technicianIds.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await sb
    .from("service_order_notifications")
    .update({
      dismissed_at: now,
      metadata: {
        cancel_reason: "technician_removed",
        cancelled_at: now,
      },
    })
    .eq("service_order_id", orderId)
    .eq("type", ASSIGNED_NOTIFICATION_TYPE)
    .in("technician_id", technicianIds)
    .is("read_at", null)
    .is("dismissed_at", null);
  if (error) throw new Error(error.message);
}

export async function syncServiceOrderAssignmentNotifications({
  supabase,
  serviceOrderId,
  technicianIds,
  previousTechnicianIds = [],
  createdBy,
}: {
  supabase: SupabaseClient;
  serviceOrderId: string;
  technicianIds: string[];
  previousTechnicianIds?: string[];
  createdBy: string;
}) {
  const nextIds = Array.from(new Set(technicianIds.filter(Boolean)));
  const previousIds = Array.from(new Set(previousTechnicianIds.filter(Boolean)));
  const removedIds = previousIds.filter((id) => !nextIds.includes(id));
  await dismissRemovedTechnicianNotifications({
    sb: supabase,
    orderId: serviceOrderId,
    technicianIds: removedIds,
  });

  if (nextIds.length === 0) return;
  const order = await fetchNotificationOrder(supabase, serviceOrderId);
  if (!order || order.status === "cancelled") return;

  const targets = await fetchTechnicianTargets(supabase, nextIds);
  const technicianNames = targets.map((target) => target.full_name).filter(Boolean);
  const existing = await fetchExistingNotifications(supabase, serviceOrderId, nextIds);
  const metadata = buildNotificationMetadata(order, technicianNames);

  const insertRows: Database["public"]["Tables"]["service_order_notifications"]["Insert"][] = [];
  const reactivateRows: { id: string; metadata: Record<string, Json> }[] = [];

  for (const target of targets) {
    if (!target.user_id) continue;
    const current = existing.get(target.id);
    if (!current) {
      insertRows.push({
        service_order_id: serviceOrderId,
        technician_id: target.id,
        user_id: target.user_id,
        type: ASSIGNED_NOTIFICATION_TYPE,
        title: buildNotificationTitle(order),
        message: buildNotificationMessage(order),
        created_by: createdBy,
        metadata,
      });
      continue;
    }

    const currentMetadata = asRecord(current.metadata);
    if (currentMetadata.cancel_reason === "technician_removed") {
      reactivateRows.push({ id: current.id, metadata });
    }
  }

  if (insertRows.length > 0) {
    const { error } = await supabase.from("service_order_notifications").insert(insertRows);
    if (error && error.code !== "23505" && !/duplicate key/i.test(error.message)) {
      throw new Error(error.message);
    }
  }

  for (const row of reactivateRows) {
    const { error } = await supabase
      .from("service_order_notifications")
      .update({
        read_at: null,
        dismissed_at: null,
        title: buildNotificationTitle(order),
        message: buildNotificationMessage(order),
        metadata: row.metadata,
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }
}

export const listTechnicianAssignedOrderNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("service_order_notifications")
      .select(NOTIFICATION_SELECT)
      .eq("user_id", context.userId)
      .eq("type", ASSIGNED_NOTIFICATION_TYPE)
      .is("read_at", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map(normalizeNotification)
      .filter(Boolean) as ServiceOrderAssignedNotification[];
  });

export const markServiceOrderNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_order_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null)
      .is("dismissed_at", null)
      .select("service_order_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const dismissServiceOrderNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_order_notifications")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null)
      .is("dismissed_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
