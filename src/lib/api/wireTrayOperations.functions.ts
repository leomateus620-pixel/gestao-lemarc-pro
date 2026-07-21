/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mappers cover the additive schema. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireWireTrayAccess, unwrapRpc } from "./wireTrayShared";
import { mapOrderSummary } from "@/lib/wireTrays/mappers";
import type { WireTrayNotification } from "@/types/wireTray";

const separationSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  type: z.enum(["separation", "checking", "discrepancy", "resolution"]),
  quantity: z.number().min(0),
  differenceQuantity: z.number().min(0).default(0),
  reason: z.string().trim().max(1000).nullable().optional(),
  resolvesEntryId: z.string().uuid().nullable().optional(),
  evidenceDocumentId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

const SEPARATION_ORDER_SELECT = `
  *, items:wire_tray_order_items(
    id, product_id, product_name_snapshot, product_sku_snapshot, category_snapshot,
    unit_snapshot, requested_quantity, reserved_quantity, production_required_quantity,
    produced_quantity, separated_quantity, checked_quantity, dispatched_quantity, notes, sort_order
  )
`;

export const listWireTraySeparationQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque"]);
    const sb = context.supabase as any;
    const { data: orders, error } = await sb
      .from("wire_tray_orders")
      .select(SEPARATION_ORDER_SELECT)
      .in("status", ["stock_reserved", "separating", "awaiting_check"])
      .order("expected_delivery_date", { ascending: true, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const orderIds = (orders ?? []).map((order: any) => order.id);
    const [reservationsResult, entriesResult] = orderIds.length
      ? await Promise.all([
          sb
            .from("wire_tray_reservations")
            .select(
              "id, order_id, order_item_id, location_id, quantity, remaining_quantity, status, location:wire_tray_stock_locations(name, code)",
            )
            .in("order_id", orderIds)
            .in("status", ["active", "partially_consumed"]),
          sb
            .from("wire_tray_separation_entries")
            .select("*")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (reservationsResult.error) throw new Error(reservationsResult.error.message);
    if (entriesResult.error) throw new Error(entriesResult.error.message);
    return (orders ?? []).map((order: any) => ({
      order: mapOrderSummary(order),
      items: order.items ?? [],
      reservations: (reservationsResult.data ?? []).filter((row: any) => row.order_id === order.id),
      entries: (entriesResult.data ?? []).filter((row: any) => row.order_id === order.id),
    }));
  });

export const recordWireTraySeparation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => separationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque"]);
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_record_separation",
      {
        _order_id: data.orderId,
        _order_item_id: data.orderItemId,
        _entry_type: data.type,
        _quantity: data.quantity,
        _difference_quantity: data.differenceQuantity,
        _reason: data.reason ?? null,
        _resolves_entry_id: data.resolvesEntryId ?? null,
        _evidence_document_id: data.evidenceDocumentId ?? null,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return unwrapRpc<{
      entry_id: string;
      order_id: string;
      status: string;
      ready_for_billing: boolean;
    }>(result);
  });

export const listWireTrayBillingQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await requireWireTrayAccess(context, ["admin", "gestor", "faturamento"]);
    if (!access.canViewFinancials) throw new Error("Seu perfil não possui acesso financeiro.");
    const sb = context.supabase as any;
    const { data: orders, error } = await sb
      .from("wire_tray_orders")
      .select(SEPARATION_ORDER_SELECT)
      .in("status", ["ready_for_billing", "billed", "ready_for_dispatch"])
      .order("ready_for_billing_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    const orderIds = (orders ?? []).map((row: any) => row.id);
    const [financialResult, documentResult] = orderIds.length
      ? await Promise.all([
          sb.from("wire_tray_order_financials").select("*").in("order_id", orderIds),
          sb
            .from("wire_tray_documents")
            .select("*")
            .eq("entity_type", "order")
            .in("entity_id", orderIds)
            .eq("status", "ready"),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (financialResult.error) throw new Error(financialResult.error.message);
    if (documentResult.error) throw new Error(documentResult.error.message);
    const financialMap = new Map<
      string,
      { total_cents: number; invoice_reference: string | null; billing_notes: string | null }
    >((financialResult.data ?? []).map((row: any) => [row.order_id, row]));
    return (orders ?? []).map((order: any) => ({
      order: mapOrderSummary(order, Number(financialMap.get(order.id)?.total_cents ?? 0)),
      invoiceReference: financialMap.get(order.id)?.invoice_reference ?? null,
      billingNotes: financialMap.get(order.id)?.billing_notes ?? null,
      documents: (documentResult.data ?? []).filter((row: any) => row.entity_id === order.id),
    }));
  });

export const markWireTrayOrderBilled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        invoiceReference: z.string().trim().min(1).max(120),
        billingNotes: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context, ["admin", "gestor", "faturamento"]);
    if (!access.canViewFinancials) throw new Error("Seu perfil não possui acesso financeiro.");
    const { data: result, error } = await (context.supabase as any).rpc("wire_tray_mark_billed", {
      _order_id: data.orderId,
      _invoice_reference: data.invoiceReference,
      _billing_notes: data.billingNotes ?? null,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const releaseWireTrayOrderForDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context, ["admin", "gestor", "faturamento"]);
    if (!access.canViewFinancials) throw new Error("Seu perfil não possui acesso financeiro.");
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_release_for_dispatch",
      { _order_id: data.orderId },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const dispatchWireTrayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        transportNote: z.string().trim().min(3).max(1000),
        receiptDocumentId: z.string().uuid().nullable().optional(),
        idempotencyKey: z.string().min(8).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque", "faturamento"]);
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_dispatch_order",
      {
        _order_id: data.orderId,
        _transport_note: data.transportNote,
        _receipt_document_id: data.receiptDocumentId ?? null,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return result;
  });

export const listWireTrayNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireWireTrayAccess(context);
    const { data, error } = await (context.supabase as any)
      .from("wire_tray_notifications")
      .select("id, order_id, notification_type, title, message, route, created_at")
      .eq("user_id", context.userId)
      .is("read_at", null)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(
      (row): WireTrayNotification => ({
        id: row.id,
        orderId: row.order_id ?? null,
        type: row.notification_type,
        title: row.title,
        message: row.message ?? null,
        route: row.route ?? null,
        createdAt: row.created_at,
      }),
    );
  });

export const markWireTrayNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), dismiss: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const { data: updated, error } = await (context.supabase as any).rpc(
      "wire_tray_mark_notification_read",
      { _notification_id: data.id, _dismiss: data.dismiss },
    );
    if (error) throw new Error(error.message);
    return { updated: Boolean(updated) };
  });
