/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mappers cover the additive schema. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePage, requireWireTrayAccess, unwrapRpc } from "./wireTrayShared";
import { mapAudit, mapDocument, mapProduction, mapProductionEntry } from "@/lib/wireTrays/mappers";

const listSchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.string().trim().max(40).optional(),
  origin: z.string().trim().max(40).optional(),
  priority: z.string().trim().max(20).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

const createSchema = z.object({
  productId: z.string().uuid(),
  destinationLocationId: z.string().uuid(),
  plannedQuantity: z.number().positive(),
  orderItemId: z.string().uuid().nullable().optional(),
  responsibleUserId: z.string().uuid().nullable().optional(),
  priority: z.enum(["baixa", "media", "alta", "urgente"]),
  plannedCompletionDate: z.string().date().nullable().optional(),
  technicalInstructions: z.string().trim().max(3000).nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

const entrySchema = z.object({
  productionOrderId: z.string().uuid(),
  type: z.enum(["start", "progress", "pause", "resume", "scrap", "complete", "cancel"]),
  quantity: z.number().min(0).default(0),
  notes: z.string().trim().max(2000).nullable().optional(),
  evidenceDocumentId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(8).max(200),
});

const PRODUCTION_SELECT = `
  *, product:wire_tray_products(name, sku),
  location:wire_tray_stock_locations(name), order:wire_tray_orders(number)
`;

export const listWireTrayProduction = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const { page, pageSize, from, to } = normalizePage(data.page, data.pageSize);
    let query = (context.supabase as any)
      .from("wire_tray_production_orders")
      .select(PRODUCTION_SELECT, { count: "exact" });
    if (data.status) query = query.eq("status", data.status);
    if (data.origin) query = query.eq("origin_type", data.origin);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.search) {
      const number = Number(data.search.replace(/\D/g, ""));
      if (Number.isFinite(number) && number > 0) query = query.eq("number", number);
    }
    const {
      data: rows,
      count,
      error,
    } = await query
      .order("planned_completion_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []).map(mapProduction), count: count ?? 0, page, pageSize };
  });

export const getWireTrayProductionDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const sb = context.supabase as any;
    const { data: production, error } = await sb
      .from("wire_tray_production_orders")
      .select(PRODUCTION_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!production) return null;
    const [entriesResult, documentsResult, auditResult] = await Promise.all([
      sb
        .from("wire_tray_production_entries")
        .select("*")
        .eq("production_order_id", data.id)
        .order("created_at"),
      sb
        .from("wire_tray_documents")
        .select("*")
        .eq("entity_type", "production_order")
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
    for (const result of [entriesResult, documentsResult, auditResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    return {
      production: mapProduction(production),
      entries: (entriesResult.data ?? []).map(mapProductionEntry),
      documents: (documentsResult.data ?? []).map(mapDocument),
      audit: (auditResult.data ?? []).map(mapAudit),
    };
  });

export const createWireTrayProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "producao"]);
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_create_production_order",
      {
        _product_id: data.productId,
        _destination_location_id: data.destinationLocationId,
        _planned_quantity: data.plannedQuantity,
        _order_item_id: data.orderItemId ?? null,
        _responsible_user_id: data.responsibleUserId ?? context.userId,
        _priority: data.priority,
        _planned_completion_date: data.plannedCompletionDate ?? null,
        _technical_instructions: data.technicalInstructions ?? null,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return unwrapRpc<{ id: string; number: number; status: string }>(result);
  });

export const recordWireTrayProductionEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => entrySchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "producao"]);
    const { data: result, error } = await (context.supabase as any).rpc(
      "wire_tray_record_production_entry",
      {
        _production_order_id: data.productionOrderId,
        _entry_type: data.type,
        _quantity: data.quantity,
        _notes: data.notes ?? null,
        _evidence_document_id: data.evidenceDocumentId ?? null,
        _idempotency_key: data.idempotencyKey,
      },
    );
    if (error) throw new Error(error.message);
    return unwrapRpc<{
      entry_id: string;
      id: string;
      status: string;
      produced_quantity: number;
      planned_quantity: number;
    }>(result);
  });

export const listWireTrayProductionFormOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireWireTrayAccess(context, ["admin", "gestor", "producao"]);
    const sb = context.supabase as any;
    const [productsResult, locationsResult, shortageResult] = await Promise.all([
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
        .select("id, code, name, description, active, updated_at")
        .eq("active", true)
        .order("name"),
      sb
        .from("wire_tray_order_items")
        .select(
          `
          id, product_id, product_name_snapshot, requested_quantity, reserved_quantity,
          production_required_quantity, produced_quantity,
          order:wire_tray_orders!inner(id, number, client_name_snapshot, status)
        `,
        )
        .gt("production_required_quantity", 0)
        .limit(200),
    ]);
    for (const result of [productsResult, locationsResult, shortageResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    return {
      products: (productsResult.data ?? []).map((row: any) => ({
        id: row.id,
        sku: row.sku ?? null,
        name: row.name,
        defaultLocationId: row.default_location_id ?? null,
      })),
      locations: locationsResult.data ?? [],
      shortages: (shortageResult.data ?? []).filter((row: any) => {
        const order = Array.isArray(row.order) ? row.order[0] : row.order;
        return order && !["cancelled", "completed", "dispatched"].includes(order.status);
      }),
    };
  });
