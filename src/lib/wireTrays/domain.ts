import type { WireTrayModuleRole, WireTrayOrderItem, WireTrayOrderStatus } from "@/types/wireTray";

export function availableStock(physical: number, reserved: number) {
  return Math.max(0, physical - reserved);
}

export function projectedStock(physical: number, reserved: number, incomingForStock: number) {
  return availableStock(physical, reserved) + Math.max(0, incomingForStock);
}

export function orderShortage(requested: number, available: number) {
  const safeRequested = Math.max(0, requested);
  const reserveNow = Math.min(safeRequested, Math.max(0, available));
  return { reserveNow, productionRequired: safeRequested - reserveNow };
}

export function replenishmentQuantity({
  projected,
  minimum,
  target,
  minimumBatch,
}: {
  projected: number;
  minimum: number;
  target: number | null;
  minimumBatch: number;
}) {
  if (projected > minimum) return 0;
  return Math.max(minimumBatch, target === null ? minimumBatch : target - projected);
}

export function orderProgress(
  items: Pick<WireTrayOrderItem, "requested" | "dispatched" | "checked">[],
) {
  const requested = items.reduce((sum, item) => sum + Math.max(0, item.requested), 0);
  if (requested === 0) return 0;
  const progressed = items.reduce((sum, item) => {
    const operational = item.dispatched > 0 ? item.dispatched : item.checked * 0.8;
    return sum + Math.min(item.requested, Math.max(0, operational));
  }, 0);
  return Math.min(100, Math.round((progressed / requested) * 100));
}

const orderTransitions: Record<WireTrayOrderStatus, readonly WireTrayOrderStatus[]> = {
  draft: ["confirmed", "stock_reserved", "production_pending", "cancelled"],
  confirmed: ["stock_reserved", "production_pending", "cancelled"],
  stock_reserved: ["separating", "production_pending", "cancelled"],
  production_pending: ["in_production", "stock_reserved", "cancelled"],
  in_production: ["stock_reserved", "production_pending", "cancelled"],
  separating: ["awaiting_check", "production_pending", "cancelled"],
  awaiting_check: ["ready_for_billing", "separating", "cancelled"],
  ready_for_billing: ["billed", "cancelled"],
  billed: ["ready_for_dispatch"],
  ready_for_dispatch: ["dispatched", "completed"],
  dispatched: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(from: WireTrayOrderStatus, to: WireTrayOrderStatus) {
  return orderTransitions[from].includes(to);
}

export type WireTrayPermission =
  | "manage_access"
  | "manage_products"
  | "create_orders"
  | "operate_production"
  | "adjust_inventory"
  | "separate"
  | "bill"
  | "view_financials"
  | "read";

const rolePermissions: Record<WireTrayModuleRole, readonly WireTrayPermission[]> = {
  admin: [
    "manage_access",
    "manage_products",
    "create_orders",
    "operate_production",
    "adjust_inventory",
    "separate",
    "bill",
    "view_financials",
    "read",
  ],
  gestor: [
    "manage_products",
    "create_orders",
    "operate_production",
    "adjust_inventory",
    "separate",
    "bill",
    "read",
  ],
  comercial: ["create_orders", "view_financials", "read"],
  producao: ["operate_production", "read"],
  estoque: ["adjust_inventory", "separate", "read"],
  faturamento: ["bill", "view_financials", "read"],
  consulta: ["read"],
};

export function hasWireTrayPermission(
  role: WireTrayModuleRole,
  permission: WireTrayPermission,
  financialAccess = false,
) {
  if ((permission === "view_financials" || permission === "bill") && role === "gestor") {
    return financialAccess;
  }
  return rolePermissions[role].includes(permission);
}
