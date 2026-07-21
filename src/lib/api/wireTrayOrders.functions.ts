/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mappers cover the additive schema. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePage, requireWireTrayAccess, unwrapRpc } from "./wireTrayShared";
import { wireTrayOrderDraftSchema } from "@/lib/wireTrays/schemas";
import {
  mapOrderDetail,
  mapOrderSummary,
  mapWireTrayLocation,
  mapWireTrayProduct,
} from "@/lib/wireTrays/mappers";
import { orderShortage } from "@/lib/wireTrays/domain";

const orderListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.string().trim().max(60).optional(),
  priority: z.string().trim().max(20).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const ORDER_SELECT = `
  *,
  items:wire_tray_order_items(
    id, product_id, product_name_snapshot, product_sku_snapshot,
    category_snapshot, unit_snapshot, requested_quantity, reserved_quantity,
    production_required_quantity, produced_quantity, separated_quantity,
    checked_quantity, dispatched_quantity, notes, sort_order
  )
`;

const PRODUCTION_SELECT = `
  *, product:wire_tray_products(name, sku),
  location:wire_tray_stock_locations(name), order:wire_tray_orders(number)
`;

export const listWireTrayOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => orderListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context);
    const { page, pageSize, from, to } = normalizePage(data.page, data.pageSize);
    const sb = context.supabase as any;
    let query = sb.from("wire_tray_orders").select(ORDER_SELECT, { count: "exact" });
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.search) {
      const safe = data.search.replace(/[,()%]/g, " ").trim();
      if (safe) {
        const number = Number(safe.replace(/\D/g, ""));
        const filters = [
          `client_name_snapshot.ilike.%${safe}%`,
          `customer_order_reference.ilike.%${safe}%`,
          `quotation_reference.ilike.%${safe}%`,
        ];
        if (Number.isFinite(number) && number > 0) filters.push(`number.eq.${number}`);
        query = query.or(filters.join(","));
      }
    }
    const {
      data: rows,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    const orderIds = (rows ?? []).map((row: any) => row.id);
    let financialMap = new Map<string, number>();
    if (access.canViewFinancials && orderIds.length > 0) {
      const { data: financials, error: financialError } = await sb
        .from("wire_tray_order_financials")
        .select("order_id, total_cents")
        .in("order_id", orderIds);
      if (financialError) throw new Error(financialError.message);
      financialMap = new Map(
        (financials ?? []).map((row: any) => [row.order_id, Number(row.total_cents)]),
      );
    }
    return {
      rows: (rows ?? []).map((row: any) =>
        mapOrderSummary(
          row,
          access.canViewFinancials ? (financialMap.get(row.id) ?? null) : undefined,
        ),
      ),
      count: count ?? 0,
      page,
      pageSize,
    };
  });

export const getWireTrayOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context);
    const sb = context.supabase as any;
    const { data: order, error } = await sb
      .from("wire_tray_orders")
      .select(ORDER_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;
    const itemIds = (order.items ?? []).map((item: any) => item.id);
    const [reservationResult, productionResult, documentResult, auditResult] = await Promise.all([
      sb.from("wire_tray_reservations").select("*").eq("order_id", data.id).order("created_at"),
      sb
        .from("wire_tray_production_orders")
        .select(PRODUCTION_SELECT)
        .eq("order_id", data.id)
        .order("created_at"),
      sb
        .from("wire_tray_documents")
        .select("*")
        .eq("entity_type", "order")
        .eq("entity_id", data.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false }),
      sb
        .from("wire_tray_audit_events")
        .select("id, event_type, entity_type, entity_id, metadata, created_at")
        .eq("entity_id", data.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    for (const result of [reservationResult, productionResult, documentResult, auditResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    let itemFinancials: any[] = [];
    let orderFinancial: any | null = null;
    if (access.canViewFinancials) {
      const [itemFinancialResult, orderFinancialResult] = await Promise.all([
        itemIds.length
          ? sb.from("wire_tray_order_item_financials").select("*").in("order_item_id", itemIds)
          : Promise.resolve({ data: [], error: null }),
        sb.from("wire_tray_order_financials").select("*").eq("order_id", data.id).maybeSingle(),
      ]);
      if (itemFinancialResult.error) throw new Error(itemFinancialResult.error.message);
      if (orderFinancialResult.error) throw new Error(orderFinancialResult.error.message);
      itemFinancials = itemFinancialResult.data ?? [];
      orderFinancial = orderFinancialResult.data ?? null;
    }
    return mapOrderDetail({
      order,
      itemFinancials,
      orderFinancial,
      reservations: reservationResult.data ?? [],
      production: productionResult.data ?? [],
      documents: documentResult.data ?? [],
      audit: auditResult.data ?? [],
    });
  });

export const getWireTrayOrderFormOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const access = await requireWireTrayAccess(context, ["admin", "gestor", "comercial"]);
    const sb = context.supabase as any;
    const [
      clientsResult,
      unitsResult,
      productsResult,
      locationsResult,
      balancesResult,
      productionResult,
    ] = await Promise.all([
      sb
        .from("clients")
        .select("id, name, cnpj, active")
        .eq("active", true)
        .order("name")
        .limit(500),
      sb
        .from("client_units")
        .select("id, client_id, name, city, state, active")
        .eq("active", true)
        .order("name")
        .limit(1000),
      sb
        .from("wire_tray_products")
        .select(
          `
            id, sku, name, category, unit, active, short_description,
            width_mm, height_mm, length_mm, material, finish, technical_notes,
            default_location_id, minimum_stock, target_stock, minimum_production_batch,
            automatic_replenishment, replenishment_notes, created_at, updated_at
          `,
        )
        .eq("active", true)
        .order("name")
        .limit(500),
      sb
        .from("wire_tray_stock_locations")
        .select("id, code, name, description, active, updated_at"),
      sb
        .from("wire_tray_stock_balances")
        .select("product_id, physical_quantity, reserved_quantity"),
      sb
        .from("wire_tray_production_orders")
        .select("product_id, planned_quantity, produced_quantity, origin_type")
        .in("status", ["planned", "released", "in_progress", "paused", "awaiting_check"]),
    ]);
    for (const result of [
      clientsResult,
      unitsResult,
      productsResult,
      locationsResult,
      balancesResult,
      productionResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }
    const products = (productsResult.data ?? []).map(mapWireTrayProduct);
    return {
      access,
      clients: clientsResult.data ?? [],
      units: unitsResult.data ?? [],
      locations: (locationsResult.data ?? []).map(mapWireTrayLocation),
      products: products.map((product: any) => {
        const balances = (balancesResult.data ?? []).filter(
          (row: any) => row.product_id === product.id,
        );
        const physical = balances.reduce(
          (sum: number, row: any) => sum + Number(row.physical_quantity),
          0,
        );
        const reserved = balances.reduce(
          (sum: number, row: any) => sum + Number(row.reserved_quantity),
          0,
        );
        const available = Math.max(0, physical - reserved);
        const incoming = (productionResult.data ?? [])
          .filter(
            (row: any) =>
              row.product_id === product.id &&
              ["replenishment", "manual_stock"].includes(row.origin_type),
          )
          .reduce(
            (sum: number, row: any) =>
              sum + Number(row.planned_quantity) - Number(row.produced_quantity),
            0,
          );
        return { product, physical, reserved, available, incoming };
      }),
    };
  });

export const saveWireTrayOrderDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        draft: wireTrayOrderDraftSchema,
        idempotencyKey: z.string().min(8).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context, ["admin", "gestor", "comercial"]);
    if (!access.canViewFinancials && data.draft.items.some((item) => item.unitPriceCents != null)) {
      throw new Error("Seu perfil não permite registrar valores.");
    }
    const payload = {
      client_id: data.draft.clientId,
      client_unit_id: data.draft.clientUnitId ?? null,
      customer_order_reference: data.draft.customerOrderReference ?? null,
      quotation_reference: data.draft.quotationReference ?? null,
      priority: data.draft.priority,
      expected_delivery_date: data.draft.expectedDeliveryDate ?? null,
      operational_notes: data.draft.operationalNotes ?? null,
      items: data.draft.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        notes: item.notes ?? null,
        unit_price_cents: item.unitPriceCents ?? null,
        sort_order: item.sortOrder,
      })),
    };
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_save_order_draft",
      {
        _order_id: data.draft.id ?? null,
        _payload: payload,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return unwrapRpc<{ id: string; number: number; status: string }>(result);
  });

export const confirmWireTrayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), idempotencyKey: z.string().min(8).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "comercial"]);
    const { data: result, error } = await (context.supabase as any).rpc("wire_tray_confirm_order", {
      _order_id: data.id,
      _idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    return unwrapRpc<{ id: string; number: number; status: string }>(result);
  });

export const cancelWireTrayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "comercial"]);
    const { data: result, error } = await (context.supabase as any).rpc("wire_tray_cancel_order", {
      _order_id: data.id,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const previewWireTrayOrderInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().positive() })),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "comercial"]);
    const ids = Array.from(new Set(data.items.map((item) => item.productId)));
    if (ids.length === 0) return [];
    const sb = context.supabase as any;
    const [balanceResult, productionResult] = await Promise.all([
      sb
        .from("wire_tray_stock_balances")
        .select("product_id, physical_quantity, reserved_quantity")
        .in("product_id", ids),
      sb
        .from("wire_tray_production_orders")
        .select("product_id, planned_quantity, produced_quantity, origin_type")
        .in("product_id", ids)
        .in("status", ["planned", "released", "in_progress", "paused", "awaiting_check"]),
    ]);
    if (balanceResult.error) throw new Error(balanceResult.error.message);
    if (productionResult.error) throw new Error(productionResult.error.message);
    return data.items.map((item) => {
      const balances = (balanceResult.data ?? []).filter(
        (row: any) => row.product_id === item.productId,
      );
      const physical = balances.reduce(
        (sum: number, row: any) => sum + Number(row.physical_quantity),
        0,
      );
      const reserved = balances.reduce(
        (sum: number, row: any) => sum + Number(row.reserved_quantity),
        0,
      );
      const available = Math.max(0, physical - reserved);
      const incoming = (productionResult.data ?? [])
        .filter(
          (row: any) =>
            row.product_id === item.productId &&
            ["replenishment", "manual_stock"].includes(row.origin_type),
        )
        .reduce(
          (sum: number, row: any) =>
            sum + Number(row.planned_quantity) - Number(row.produced_quantity),
          0,
        );
      return {
        productId: item.productId,
        requested: item.quantity,
        physical,
        reserved,
        available,
        incoming,
        ...orderShortage(item.quantity, available),
        projected: available + incoming - item.quantity,
      };
    });
  });
