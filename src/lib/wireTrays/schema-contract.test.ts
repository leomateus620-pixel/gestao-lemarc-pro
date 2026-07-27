import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260727123000_wire_tray_schema_reconciliation.sql"),
  "utf8",
);
const generatedTypes = readFileSync(resolve(root, "src/integrations/supabase/types.ts"), "utf8");
const apiSource = [
  "moduleAccess.functions.ts",
  "wireTrayDashboard.functions.ts",
  "wireTrayDocuments.functions.ts",
  "wireTrayInventory.functions.ts",
  "wireTrayOperations.functions.ts",
  "wireTrayOrders.functions.ts",
  "wireTrayProduction.functions.ts",
  "wireTrayProducts.functions.ts",
]
  .map((name) => readFileSync(resolve(root, "src/lib/api", name), "utf8"))
  .join("\n");

const expectedTables = [
  "user_module_access",
  "wire_tray_stock_locations",
  "wire_tray_products",
  "wire_tray_stock_balances",
  "wire_tray_orders",
  "wire_tray_order_items",
  "wire_tray_order_financials",
  "wire_tray_order_item_financials",
  "wire_tray_reservations",
  "wire_tray_production_orders",
  "wire_tray_documents",
  "wire_tray_production_entries",
  "wire_tray_separation_entries",
  "wire_tray_stock_movements",
  "wire_tray_notifications",
  "wire_tray_audit_events",
  "wire_tray_operation_requests",
] as const;

const expectedViews = ["wire_tray_projected_inventory", "wire_tray_inventory_catalog"] as const;

describe("Leitos Aramados database contract", () => {
  it("reconciles every required relation and enables RLS on operational tables", () => {
    for (const table of expectedTables) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(generatedTypes).toMatch(new RegExp(`^      ${table}: \\{`, "m"));
    }
    for (const view of expectedViews) {
      expect(migration).toContain(`CREATE OR REPLACE VIEW public.${view}`);
      expect(migration).toContain(`ALTER VIEW public.${view} SET (security_invoker = true)`);
      expect(generatedTypes).toMatch(new RegExp(`^      ${view}: \\{`, "m"));
    }
  });

  it("keeps the reconciliation additive, transactional and reloads PostgREST", () => {
    expect(migration).toMatch(/^BEGIN;/m);
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("information_schema.columns");
    expect(migration).toContain("missing_columns");
    expect(migration).toMatch(/NOTIFY pgrst, 'reload schema'/);
    expect(migration).toMatch(/NOTIFY pgrst, 'reload config'/);
    expect(migration).toMatch(/COMMIT;\s*$/);
    expect(migration).not.toMatch(/DROP\s+(TABLE|SCHEMA|TYPE)\b/i);
    expect(migration).not.toMatch(/TRUNCATE\b/i);
    expect(migration).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  it("contains a generated type for every queried Leitos relation and RPC", () => {
    const relations = new Set(
      [...apiSource.matchAll(/\.from\(\s*["'](wire_tray_[a-z0-9_]+)["']/g)].map(
        (match) => match[1],
      ),
    );
    const rpcs = new Set(
      [...apiSource.matchAll(/\.rpc\(\s*["'](wire_tray_[a-z0-9_]+)["']/g)].map((match) => match[1]),
    );

    expect(relations.size).toBeGreaterThan(10);
    expect(rpcs.size).toBeGreaterThan(8);
    for (const relation of relations) {
      expect(generatedTypes, relation).toMatch(new RegExp(`^      ${relation}: \\{`, "m"));
    }
    for (const rpc of rpcs) {
      expect(generatedTypes, rpc).toMatch(new RegExp(`^      ${rpc}: \\{`, "m"));
      expect(migration, rpc).toContain(`FUNCTION public.${rpc}`);
    }
  });
});
