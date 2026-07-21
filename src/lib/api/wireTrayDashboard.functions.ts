/* eslint-disable @typescript-eslint/no-explicit-any -- Runtime mappers cover the additive schema. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireWireTrayAccess } from "./wireTrayShared";
import {
  mapAudit,
  mapInventoryRow,
  mapProduction,
  mapWireTrayLocation,
  mapWireTrayProduct,
} from "@/lib/wireTrays/mappers";
import type {
  WireTrayDashboardData,
  WireTrayInventoryRow,
  WireTrayProductionSummary,
} from "@/types/wireTray";

export const getWireTrayDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WireTrayDashboardData> => {
    await requireWireTrayAccess(context);
    const sb = context.supabase as any;
    const [ordersResult, productionResult, inventoryResult, auditResult, discrepancyResult] =
      await Promise.all([
        sb
          .from("wire_tray_orders")
          .select("id, number, client_name_snapshot, status, priority, expected_delivery_date")
          .not("status", "in", '("completed","cancelled")')
          .limit(500),
        sb
          .from("wire_tray_production_orders")
          .select(
            `*, product:wire_tray_products(name, sku), location:wire_tray_stock_locations(name), order:wire_tray_orders(number)`,
            { count: "exact" },
          )
          .in("status", ["planned", "released", "in_progress", "paused", "awaiting_check"])
          .order("planned_completion_date", { ascending: true, nullsFirst: false })
          .limit(20),
        sb
          .from("wire_tray_inventory_catalog")
          .select("*", { count: "exact" })
          .eq("active", true)
          .in("stock_health", ["empty", "low", "attention"])
          .order("available_quantity", { ascending: true })
          .limit(8),
        sb
          .from("wire_tray_audit_events")
          .select("id, event_type, entity_type, entity_id, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(12),
        sb
          .from("wire_tray_separation_entries")
          .select("id, order_id, difference_quantity, resolves_entry_id, entry_type")
          .limit(200),
      ]);
    for (const result of [
      ordersResult,
      productionResult,
      inventoryResult,
      auditResult,
      discrepancyResult,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }
    const orders = ordersResult.data ?? [];
    const production: WireTrayProductionSummary[] = (productionResult.data ?? []).map(
      mapProduction,
    );
    const criticalInventory: WireTrayInventoryRow[] = (inventoryResult.data ?? []).map((row: any) =>
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
    );
    const now = new Date();
    const atRiskOrders = orders.filter((order: any) => {
      if (!order.expected_delivery_date) return false;
      const due = new Date(`${order.expected_delivery_date}T23:59:59`);
      return (
        due.getTime() < now.getTime() &&
        !["ready_for_billing", "billed", "ready_for_dispatch"].includes(order.status)
      );
    });
    const discrepancyEntries = (discrepancyResult.data ?? []).filter(
      (entry: any) => entry.entry_type === "check" && Number(entry.difference_quantity) > 0,
    );
    const unresolvedDiscrepancies = discrepancyEntries.filter(
      (entry: any) =>
        !(discrepancyResult.data ?? []).some(
          (candidate: any) =>
            candidate.entry_type === "resolution" && candidate.resolves_entry_id === entry.id,
        ),
    );
    const attention: WireTrayDashboardData["attention"] = [
      ...criticalInventory.slice(0, 4).map((row: any) => ({
        id: row.product.id,
        kind: "stock" as const,
        title: row.product.name,
        detail: `${row.available} disponível · mínimo ${row.product.minimumStock}`,
        route: `/leitos/estoque/${row.product.id}`,
        tone: row.available === 0 ? ("critical" as const) : ("warning" as const),
      })),
      ...atRiskOrders.slice(0, 3).map((order: any) => ({
        id: order.id,
        kind: "order" as const,
        title: `Pedido #${order.number} em risco`,
        detail: `${order.client_name_snapshot} · prazo ${order.expected_delivery_date}`,
        route: `/leitos/pedidos/${order.id}`,
        tone: "critical" as const,
      })),
      ...production
        .filter((row) => row.status === "paused")
        .slice(0, 3)
        .map((row) => ({
          id: row.id,
          kind: "production" as const,
          title: `Produção #${row.number} pausada`,
          detail: row.pauseReason ?? row.productName,
          route: `/leitos/producao/${row.id}`,
          tone: "warning" as const,
        })),
      ...unresolvedDiscrepancies.slice(0, 3).map((entry: any) => ({
        id: entry.id,
        kind: "discrepancy" as const,
        title: "Divergência de conferência",
        detail: `${Number(entry.difference_quantity)} unidade(s) aguardando resolução`,
        route: "/leitos/separacao",
        tone: "critical" as const,
      })),
    ].slice(0, 10);
    return {
      metrics: {
        activeOrders: orders.length,
        productionOrders: productionResult.count ?? production.length,
        awaitingSeparation: orders.filter((order: any) =>
          ["stock_reserved", "separating", "awaiting_check"].includes(order.status),
        ).length,
        readyForBilling: orders.filter((order: any) => order.status === "ready_for_billing").length,
        lowStock: inventoryResult.count ?? criticalInventory.length,
        atRisk: atRiskOrders.length + unresolvedDiscrepancies.length,
      },
      attention,
      production: production.filter((row) => row.status !== "planned").slice(0, 8),
      criticalInventory,
      recentActivity: (auditResult.data ?? []).map(mapAudit),
    };
  });
