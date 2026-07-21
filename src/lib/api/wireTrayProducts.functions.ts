/* eslint-disable @typescript-eslint/no-explicit-any -- New database objects are isolated by runtime mappers. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePage, requireWireTrayAccess } from "./wireTrayShared";
import { wireTrayProductInputSchema } from "@/lib/wireTrays/schemas";
import {
  mapAudit,
  mapDocument,
  mapInventoryRow,
  mapMovement,
  mapOrderSummary,
  mapProduction,
  mapWireTrayLocation,
  mapWireTrayProduct,
} from "@/lib/wireTrays/mappers";
import type { WireTrayLocation } from "@/types/wireTray";

const productListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  category: z.string().trim().max(50).optional(),
  active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const locationSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().default(true),
});

const PRODUCT_SELECT = `
  id, sku, name, category, unit, active, short_description,
  width_mm, height_mm, length_mm, material, finish, technical_notes,
  default_location_id, minimum_stock, target_stock, minimum_production_batch,
  automatic_replenishment, replenishment_notes, created_at, updated_at
`;

export const listWireTrayProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const { page, pageSize, from, to } = normalizePage(data.page, data.pageSize);
    let query = (context.supabase as any)
      .from("wire_tray_products")
      .select(PRODUCT_SELECT, { count: "exact" });
    if (data.search) {
      const safe = data.search.replace(/[,()%]/g, " ").trim();
      if (safe)
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,material.ilike.%${safe}%`);
    }
    if (data.category) query = query.eq("category", data.category);
    if (data.active !== undefined) query = query.eq("active", data.active);
    const { data: rows, count, error } = await query.order("name").range(from, to);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []).map(mapWireTrayProduct), count: count ?? 0, page, pageSize };
  });

export const listWireTrayProductOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ search: z.string().trim().max(100).default("") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    let query = (context.supabase as any)
      .from("wire_tray_products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .order("name")
      .limit(100);
    const safe = data.search.replace(/[,()%]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapWireTrayProduct);
  });

export const getWireTrayProductDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const sb = context.supabase as any;
    const { data: productRow, error } = await sb
      .from("wire_tray_products")
      .select(PRODUCT_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!productRow) return null;
    const [
      locationsResult,
      balancesResult,
      productionResult,
      itemsResult,
      movementsResult,
      documentsResult,
      auditResult,
    ] = await Promise.all([
      sb
        .from("wire_tray_stock_locations")
        .select("id, code, name, description, active, updated_at")
        .order("name"),
      sb.from("wire_tray_projected_inventory").select("*").eq("product_id", data.id),
      sb
        .from("wire_tray_production_orders")
        .select(
          `*, product:wire_tray_products(name, sku), location:wire_tray_stock_locations(name), order:wire_tray_orders(number)`,
        )
        .eq("product_id", data.id)
        .in("status", ["planned", "released", "in_progress", "paused", "awaiting_check"])
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("wire_tray_order_items")
        .select(`*, order:wire_tray_orders!inner(*)`)
        .eq("product_id", data.id)
        .order("created_at", { ascending: false })
        .limit(20),
      sb
        .from("wire_tray_stock_movements")
        .select(
          `*, product:wire_tray_products(name, sku), location:wire_tray_stock_locations(name)`,
        )
        .eq("product_id", data.id)
        .order("created_at", { ascending: false })
        .limit(30),
      sb
        .from("wire_tray_documents")
        .select("*")
        .eq("entity_type", "product")
        .eq("entity_id", data.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false }),
      sb
        .from("wire_tray_audit_events")
        .select("id, event_type, entity_type, entity_id, metadata, created_at")
        .eq("entity_id", data.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    for (const result of [
      locationsResult,
      balancesResult,
      productionResult,
      itemsResult,
      movementsResult,
      documentsResult,
      auditResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }
    const product = mapWireTrayProduct(productRow);
    const locations = (locationsResult.data ?? []).map(mapWireTrayLocation);
    const locationMap = new Map<string, WireTrayLocation>(
      locations.map((location: WireTrayLocation) => [location.id, location]),
    );
    const balances = balancesResult.data ?? [];
    const physical = balances.reduce(
      (sum: number, row: any) => sum + Number(row.physical_quantity ?? 0),
      0,
    );
    const reserved = balances.reduce(
      (sum: number, row: any) => sum + Number(row.reserved_quantity ?? 0),
      0,
    );
    const inProduction = (productionResult.data ?? []).reduce(
      (sum: number, row: any) =>
        sum + Number(row.planned_quantity ?? 0) - Number(row.produced_quantity ?? 0),
      0,
    );
    const incomingForStock = (productionResult.data ?? [])
      .filter((row: any) => ["replenishment", "manual_stock"].includes(row.origin_type))
      .reduce(
        (sum: number, row: any) =>
          sum + Number(row.planned_quantity ?? 0) - Number(row.produced_quantity ?? 0),
        0,
      );
    const inventory = mapInventoryRow({
      product,
      location: product.defaultLocationId
        ? (locationMap.get(product.defaultLocationId) ?? null)
        : null,
      physical,
      reserved,
      inProduction,
      incomingForStock,
      updatedAt: balances[0]?.updated_at ?? null,
    });
    const openOrders = (itemsResult.data ?? [])
      .filter((row: any) => {
        const order = Array.isArray(row.order) ? row.order[0] : row.order;
        return order && !["completed", "cancelled"].includes(order.status);
      })
      .map((row: any) => {
        const order = Array.isArray(row.order) ? row.order[0] : row.order;
        return mapOrderSummary({ ...order, items: [row] });
      });
    return {
      product,
      inventory,
      balances,
      openOrders,
      production: (productionResult.data ?? []).map(mapProduction),
      movements: (movementsResult.data ?? []).map(mapMovement),
      documents: (documentsResult.data ?? []).map(mapDocument),
      audit: (auditResult.data ?? []).map(mapAudit),
    };
  });

export const saveWireTrayProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => wireTrayProductInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor"]);
    const payload = {
      sku: data.sku?.trim() ? data.sku.trim().toUpperCase() : null,
      name: data.name.trim(),
      category: data.category,
      unit: data.unit,
      active: data.active,
      short_description: data.shortDescription?.trim() || null,
      width_mm: data.widthMm,
      height_mm: data.heightMm,
      length_mm: data.lengthMm,
      material: data.material?.trim() || null,
      finish: data.finish?.trim() || null,
      technical_notes: data.technicalNotes?.trim() || null,
      default_location_id: data.defaultLocationId || null,
      minimum_stock: data.minimumStock,
      target_stock: data.targetStock,
      minimum_production_batch: data.minimumProductionBatch,
      automatic_replenishment: data.automaticReplenishment,
      replenishment_notes: data.replenishmentNotes?.trim() || null,
    };
    const sb = context.supabase as any;
    const query = data.id
      ? sb.from("wire_tray_products").update(payload).eq("id", data.id)
      : sb.from("wire_tray_products").insert({ ...payload, created_by: context.userId });
    const { data: row, error } = await query.select(PRODUCT_SELECT).single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um produto com este SKU.");
      throw new Error(error.message);
    }
    return mapWireTrayProduct(row);
  });

export const listWireTrayLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireWireTrayAccess(context);
    const { data, error } = await (context.supabase as any)
      .from("wire_tray_stock_locations")
      .select("id, code, name, description, active, updated_at")
      .order("active", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapWireTrayLocation);
  });

export const saveWireTrayLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => locationSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque"]);
    const payload = {
      code: data.code.toUpperCase(),
      name: data.name,
      description: data.description?.trim() || null,
      active: data.active,
    };
    const sb = context.supabase as any;
    const query = data.id
      ? sb.from("wire_tray_stock_locations").update(payload).eq("id", data.id)
      : sb.from("wire_tray_stock_locations").insert({ ...payload, created_by: context.userId });
    const { data: row, error } = await query
      .select("id, code, name, description, active, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um local com este código.");
      throw new Error(error.message);
    }
    return mapWireTrayLocation(row);
  });
