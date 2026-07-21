/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mappers cover the additive schema. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePage, requireWireTrayAccess, unwrapRpc } from "./wireTrayShared";
import {
  mapInventoryRow,
  mapMovement,
  mapWireTrayLocation,
  mapWireTrayProduct,
} from "@/lib/wireTrays/mappers";

const inventoryListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  health: z.enum(["all", "healthy", "attention", "low", "empty"]).default("all"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const movementListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  type: z.string().trim().max(60).optional(),
  productId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const movementSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  type: z.enum(["stock_entry", "stock_exit", "transfer_out", "return", "loss", "adjustment"]),
  quantity: z.number().refine((value) => value !== 0, "A quantidade não pode ser zero."),
  reason: z.string().trim().min(3).max(500),
  destinationLocationId: z.string().uuid().nullable().optional(),
  evidenceDocumentId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

export const listWireTrayInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inventoryListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const { page, pageSize, from, to } = normalizePage(data.page, data.pageSize);
    const sb = context.supabase as any;
    let query = sb
      .from("wire_tray_inventory_catalog")
      .select("*", { count: "exact" })
      .eq("active", true);
    const safe = data.search.replace(/[,()%]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,material.ilike.%${safe}%`);
    if (data.health !== "all") query = query.eq("stock_health", data.health);
    const { data: rows, count, error } = await query.order("name").range(from, to);
    if (error) throw new Error(error.message);
    return {
      rows: (rows ?? []).map((row: any) =>
        mapInventoryRow({
          product: mapWireTrayProduct(row),
          location: row.default_location_record_id
            ? mapWireTrayLocation({
                id: row.default_location_record_id,
                code: row.default_location_code,
                name: row.default_location_name,
                description: row.default_location_description,
                active: row.default_location_active,
                updated_at: row.default_location_updated_at,
              })
            : null,
          physical: Number(row.physical_quantity ?? 0),
          reserved: Number(row.reserved_quantity ?? 0),
          inProduction: Number(row.in_production_quantity ?? 0),
          incomingForStock: Number(row.incoming_stock_quantity ?? 0),
          updatedAt: row.balance_updated_at ?? null,
        }),
      ),
      count: count ?? 0,
      page,
      pageSize,
    };
  });

export const listWireTrayMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => movementListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const { page, pageSize, from, to } = normalizePage(data.page, data.pageSize);
    let query = (context.supabase as any)
      .from("wire_tray_stock_movements")
      .select(
        `*, product:wire_tray_products(name, sku), location:wire_tray_stock_locations(name)`,
        { count: "exact" },
      );
    if (data.type) query = query.eq("movement_type", data.type);
    if (data.productId) query = query.eq("product_id", data.productId);
    if (data.search) {
      const safe = data.search.replace(/[,()%]/g, " ").trim();
      if (safe) query = query.ilike("reason", `%${safe}%`);
    }
    const {
      data: rows,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []).map(mapMovement), count: count ?? 0, page, pageSize };
  });

export const recordWireTrayMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => movementSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque"]);
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_record_stock_movement",
      {
        _product_id: data.productId,
        _location_id: data.locationId,
        _movement_type: data.type,
        _quantity: data.quantity,
        _reason: data.reason,
        _destination_location_id: data.destinationLocationId ?? null,
        _evidence_document_id: data.evidenceDocumentId ?? null,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return unwrapRpc<{
      movement_id: string;
      physical_quantity: number;
      available_quantity: number;
    }>(result);
  });

export const triggerWireTrayReplenishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "estoque"]);
    const { data: productionId, error } = await (context.supabase as any).rpc(
      "wire_tray_trigger_replenishment",
      { _product_id: data.productId },
    );
    if (error) throw new Error(error.message);
    return { productionId: productionId ?? null };
  });
