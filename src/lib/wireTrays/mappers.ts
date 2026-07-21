/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mapping isolates generated database types. */
import { orderProgress } from "./domain";
import { asNullableNumber, asNumber } from "@/lib/api/wireTrayShared";
import type {
  WireTrayAuditEvent,
  WireTrayDocument,
  WireTrayInventoryRow,
  WireTrayLocation,
  WireTrayMovement,
  WireTrayOrderDetail,
  WireTrayOrderItem,
  WireTrayOrderSummary,
  WireTrayProduct,
  WireTrayProductionEntry,
  WireTrayProductionSummary,
  WireTrayReservation,
} from "@/types/wireTray";

export function mapWireTrayProduct(row: any): WireTrayProduct {
  return {
    id: row.id,
    sku: row.sku ?? null,
    name: row.name,
    category: row.category,
    unit: row.unit,
    active: Boolean(row.active),
    shortDescription: row.short_description ?? null,
    widthMm: asNullableNumber(row.width_mm),
    heightMm: asNullableNumber(row.height_mm),
    lengthMm: asNullableNumber(row.length_mm),
    material: row.material ?? null,
    finish: row.finish ?? null,
    technicalNotes: row.technical_notes ?? null,
    defaultLocationId: row.default_location_id ?? null,
    minimumStock: asNumber(row.minimum_stock),
    targetStock: asNullableNumber(row.target_stock),
    minimumProductionBatch: asNumber(row.minimum_production_batch),
    automaticReplenishment: Boolean(row.automatic_replenishment),
    replenishmentNotes: row.replenishment_notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapWireTrayLocation(row: any): WireTrayLocation {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  };
}

export function mapOrderItem(row: any, financial?: any): WireTrayOrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name_snapshot,
    productSku: row.product_sku_snapshot ?? null,
    category: row.category_snapshot,
    unit: row.unit_snapshot,
    requested: asNumber(row.requested_quantity),
    reserved: asNumber(row.reserved_quantity),
    productionRequired: asNumber(row.production_required_quantity),
    produced: asNumber(row.produced_quantity),
    separated: asNumber(row.separated_quantity),
    checked: asNumber(row.checked_quantity),
    dispatched: asNumber(row.dispatched_quantity),
    notes: row.notes ?? null,
    ...(financial
      ? {
          unitPriceCents: asNumber(financial.unit_price_cents),
          totalCents: asNumber(financial.total_cents),
        }
      : {}),
  };
}

export function mapOrderSummary(row: any, totalCents?: number | null): WireTrayOrderSummary {
  const items = (row.items ?? []).map((item: any) => mapOrderItem(item));
  return {
    id: row.id,
    number: asNumber(row.number),
    clientId: row.client_id,
    clientName: row.client_name_snapshot,
    clientUnitName: row.client_unit_name_snapshot ?? null,
    customerOrderReference: row.customer_order_reference ?? null,
    quotationReference: row.quotation_reference ?? null,
    priority: row.priority,
    expectedDeliveryDate: row.expected_delivery_date ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: items.length,
    progress: orderProgress(items),
    ...(totalCents !== undefined ? { totalCents } : {}),
  };
}

export function mapReservation(row: any): WireTrayReservation {
  return {
    id: row.id,
    orderItemId: row.order_item_id,
    productId: row.product_id,
    locationId: row.location_id,
    quantity: asNumber(row.quantity),
    consumed: asNumber(row.consumed_quantity),
    released: asNumber(row.released_quantity),
    remaining: asNumber(row.remaining_quantity),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapProduction(row: any): WireTrayProductionSummary {
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  const location = Array.isArray(row.location) ? row.location[0] : row.location;
  const order = Array.isArray(row.order) ? row.order[0] : row.order;
  const planned = asNumber(row.planned_quantity);
  const produced = asNumber(row.produced_quantity);
  return {
    id: row.id,
    number: asNumber(row.number),
    origin: row.origin_type,
    orderId: row.order_id ?? null,
    orderNumber: order?.number == null ? null : asNumber(order.number),
    productId: row.product_id,
    productName: product?.name ?? "Produto indisponível",
    productSku: product?.sku ?? null,
    locationId: row.destination_location_id,
    locationName: location?.name ?? "Local não informado",
    planned,
    produced,
    scrap: asNumber(row.scrap_quantity),
    remaining: Math.max(0, planned - produced),
    responsibleUserId: row.responsible_user_id ?? null,
    priority: row.priority,
    plannedCompletionDate: row.planned_completion_date ?? null,
    status: row.status,
    pauseReason: row.pause_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductionEntry(row: any): WireTrayProductionEntry {
  return {
    id: row.id,
    type: row.entry_type,
    quantity: asNumber(row.quantity),
    notes: row.notes ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function mapDocument(row: any): WireTrayDocument {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    type: row.document_type,
    visibility: row.visibility,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: asNumber(row.file_size),
    caption: row.caption ?? null,
    createdAt: row.created_at,
  };
}

export function mapAudit(row: any): WireTrayAuditEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function mapOrderDetail({
  order,
  itemFinancials,
  orderFinancial,
  reservations,
  production,
  documents,
  audit,
}: {
  order: any;
  itemFinancials: any[];
  orderFinancial: any | null;
  reservations: any[];
  production: any[];
  documents: any[];
  audit: any[];
}): WireTrayOrderDetail {
  const finances = new Map(itemFinancials.map((row) => [row.order_item_id, row]));
  const summary = mapOrderSummary(
    order,
    orderFinancial ? asNumber(orderFinancial.total_cents) : undefined,
  );
  return {
    ...summary,
    operationalNotes: order.operational_notes ?? null,
    confirmedAt: order.confirmed_at ?? null,
    readyForBillingAt: order.ready_for_billing_at ?? null,
    billedAt: order.billed_at ?? null,
    dispatchedAt: order.dispatched_at ?? null,
    completedAt: order.completed_at ?? null,
    cancellationReason: order.cancellation_reason ?? null,
    items: (order.items ?? []).map((row: any) => mapOrderItem(row, finances.get(row.id))),
    reservations: reservations.map(mapReservation),
    production: production.map(mapProduction),
    documents: documents.map(mapDocument),
    audit: audit.map(mapAudit),
    ...(orderFinancial
      ? {
          invoiceReference: orderFinancial.invoice_reference ?? null,
          billingNotes: orderFinancial.billing_notes ?? null,
        }
      : {}),
  };
}

export function mapInventoryRow({
  product,
  location,
  physical,
  reserved,
  inProduction,
  incomingForStock,
  updatedAt,
}: {
  product: WireTrayProduct;
  location: WireTrayLocation | null;
  physical: number;
  reserved: number;
  inProduction: number;
  incomingForStock?: number;
  updatedAt: string | null;
}): WireTrayInventoryRow {
  const available = Math.max(0, physical - reserved);
  return {
    product,
    location,
    physical,
    reserved,
    available,
    inProduction,
    projected: available + (incomingForStock ?? inProduction),
    updatedAt,
  };
}

export function mapMovement(row: any): WireTrayMovement {
  const product = Array.isArray(row.product) ? row.product[0] : row.product;
  const location = Array.isArray(row.location) ? row.location[0] : row.location;
  return {
    id: row.id,
    type: row.movement_type,
    productId: row.product_id,
    productName: product?.name ?? "Produto indisponível",
    productSku: product?.sku ?? null,
    locationId: row.location_id,
    locationName: location?.name ?? "Local não informado",
    quantity: asNumber(row.quantity),
    physicalDelta: asNumber(row.physical_delta),
    reservedDelta: asNumber(row.reserved_delta),
    previousPhysical: asNumber(row.previous_physical),
    newPhysical: asNumber(row.new_physical),
    previousReserved: asNumber(row.previous_reserved),
    newReserved: asNumber(row.new_reserved),
    reason: row.reason,
    orderId: row.order_id ?? null,
    createdAt: row.created_at,
  };
}
