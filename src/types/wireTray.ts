export type WireTrayModuleRole =
  | "admin"
  | "gestor"
  | "comercial"
  | "producao"
  | "estoque"
  | "faturamento"
  | "consulta";

export type WireTrayCategory =
  | "straight_tray"
  | "curve"
  | "branch"
  | "reduction"
  | "splice"
  | "support"
  | "cover"
  | "accessory"
  | "other";

export type WireTrayUnit = "piece" | "meter" | "kilogram" | "set";

export type WireTrayOrderStatus =
  | "draft"
  | "confirmed"
  | "stock_reserved"
  | "production_pending"
  | "in_production"
  | "separating"
  | "awaiting_check"
  | "ready_for_billing"
  | "billed"
  | "ready_for_dispatch"
  | "dispatched"
  | "completed"
  | "cancelled";

export type WireTrayProductionStatus =
  | "planned"
  | "released"
  | "in_progress"
  | "paused"
  | "awaiting_check"
  | "completed"
  | "cancelled";

export type WireTrayProductionOrigin = "customer_order" | "replenishment" | "manual_stock";
export type WireTrayProductionEntryType =
  | "start"
  | "progress"
  | "pause"
  | "resume"
  | "scrap"
  | "complete"
  | "cancel";

export type WireTrayMovementType =
  | "stock_entry"
  | "stock_exit"
  | "transfer_out"
  | "transfer_in"
  | "return"
  | "loss"
  | "adjustment"
  | "reservation"
  | "reservation_release"
  | "reservation_consumption"
  | "production_entry"
  | "dispatch";

export type WireTrayDocumentType =
  | "quotation"
  | "customer_order"
  | "technical_drawing"
  | "production_instruction"
  | "invoice"
  | "dispatch_receipt"
  | "photo"
  | "other";
export type WireTrayDocumentVisibility = "operational" | "commercial" | "financial" | "admin_only";

export type ServicePriority = "baixa" | "media" | "alta" | "urgente";

export interface WireTrayModuleAccess {
  id: string;
  userId: string;
  role: WireTrayModuleRole;
  active: boolean;
  financialAccess: boolean;
  canViewFinancials: boolean;
}

export interface WireTrayLocation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  updatedAt: string;
}

export interface WireTrayProduct {
  id: string;
  sku: string | null;
  name: string;
  category: WireTrayCategory;
  unit: WireTrayUnit;
  active: boolean;
  shortDescription: string | null;
  widthMm: number | null;
  heightMm: number | null;
  lengthMm: number | null;
  material: string | null;
  finish: string | null;
  technicalNotes: string | null;
  defaultLocationId: string | null;
  minimumStock: number;
  targetStock: number | null;
  minimumProductionBatch: number;
  automaticReplenishment: boolean;
  replenishmentNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WireTrayInventoryRow {
  product: WireTrayProduct;
  location: WireTrayLocation | null;
  physical: number;
  reserved: number;
  available: number;
  inProduction: number;
  projected: number;
  updatedAt: string | null;
}

export interface WireTrayOrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  category: WireTrayCategory;
  unit: WireTrayUnit;
  requested: number;
  reserved: number;
  productionRequired: number;
  produced: number;
  separated: number;
  checked: number;
  dispatched: number;
  notes: string | null;
  unitPriceCents?: number | null;
  totalCents?: number | null;
}

export interface WireTrayOrderSummary {
  id: string;
  number: number;
  clientId: string;
  clientName: string;
  clientUnitName: string | null;
  customerOrderReference: string | null;
  quotationReference: string | null;
  priority: ServicePriority;
  expectedDeliveryDate: string | null;
  status: WireTrayOrderStatus;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  progress: number;
  totalCents?: number | null;
}

export interface WireTrayReservation {
  id: string;
  orderItemId: string;
  productId: string;
  locationId: string;
  quantity: number;
  consumed: number;
  released: number;
  remaining: number;
  status: "active" | "partially_consumed" | "consumed" | "released" | "cancelled";
  createdAt: string;
}

export interface WireTrayProductionSummary {
  id: string;
  number: number;
  origin: WireTrayProductionOrigin;
  orderId: string | null;
  orderNumber: number | null;
  productId: string;
  productName: string;
  productSku: string | null;
  locationId: string;
  locationName: string;
  planned: number;
  produced: number;
  scrap: number;
  remaining: number;
  responsibleUserId: string | null;
  priority: ServicePriority;
  plannedCompletionDate: string | null;
  status: WireTrayProductionStatus;
  pauseReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WireTrayProductionEntry {
  id: string;
  type: WireTrayProductionEntryType;
  quantity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface WireTrayDocument {
  id: string;
  entityType: "product" | "order" | "production_order" | "movement" | "dispatch";
  entityId: string;
  type: WireTrayDocumentType;
  visibility: WireTrayDocumentVisibility;
  fileName: string;
  mimeType: string;
  fileSize: number;
  caption: string | null;
  createdAt: string;
}

export interface WireTrayAuditEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Json;
  createdAt: string;
}

export interface WireTrayOrderDetail extends WireTrayOrderSummary {
  operationalNotes: string | null;
  confirmedAt: string | null;
  readyForBillingAt: string | null;
  billedAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  items: WireTrayOrderItem[];
  reservations: WireTrayReservation[];
  production: WireTrayProductionSummary[];
  documents: WireTrayDocument[];
  audit: WireTrayAuditEvent[];
  invoiceReference?: string | null;
  billingNotes?: string | null;
}

export interface WireTrayMovement {
  id: string;
  type: WireTrayMovementType;
  productId: string;
  productName: string;
  productSku: string | null;
  locationId: string;
  locationName: string;
  quantity: number;
  physicalDelta: number;
  reservedDelta: number;
  previousPhysical: number;
  newPhysical: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
}

export interface WireTrayNotification {
  id: string;
  orderId: string | null;
  type: string;
  title: string;
  message: string | null;
  route: string | null;
  createdAt: string;
}

export interface WireTrayAccessUser {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: WireTrayModuleRole | null;
  active: boolean;
  financialAccess: boolean;
  updatedAt: string | null;
}

export interface WireTrayDashboardData {
  metrics: {
    activeOrders: number;
    productionOrders: number;
    awaitingSeparation: number;
    readyForBilling: number;
    lowStock: number;
    atRisk: number;
  };
  attention: Array<{
    id: string;
    kind: "stock" | "order" | "production" | "discrepancy";
    title: string;
    detail: string;
    route: string;
    tone: "warning" | "critical" | "neutral";
  }>;
  production: WireTrayProductionSummary[];
  criticalInventory: WireTrayInventoryRow[];
  recentActivity: WireTrayAuditEvent[];
}

export interface WireTrayStockBalance {
  id?: string;
  balance_id?: string;
  product_id: string;
  location_id: string;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  in_production_quantity?: number;
  projected_quantity?: number;
  updated_at: string;
}

export interface WireTrayProductDetailData {
  product: WireTrayProduct;
  inventory: WireTrayInventoryRow;
  balances: WireTrayStockBalance[];
  openOrders: WireTrayOrderSummary[];
  production: WireTrayProductionSummary[];
  movements: WireTrayMovement[];
  documents: WireTrayDocument[];
  audit: WireTrayAuditEvent[];
}

export interface WireTrayProductionDetailData {
  production: WireTrayProductionSummary;
  entries: WireTrayProductionEntry[];
  documents: WireTrayDocument[];
  audit: WireTrayAuditEvent[];
}

export interface WireTrayOrderFormOptions {
  access: WireTrayModuleAccess;
  clients: Array<{ id: string; name: string; cnpj: string | null; active: boolean }>;
  units: Array<{
    id: string;
    client_id: string;
    name: string;
    city: string | null;
    state: string | null;
    active: boolean;
  }>;
  locations: WireTrayLocation[];
  products: Array<{
    product: WireTrayProduct;
    physical: number;
    reserved: number;
    available: number;
    incoming: number;
  }>;
}

export interface WireTrayProductionFormOptions {
  products: Array<{
    id: string;
    sku: string | null;
    name: string;
    defaultLocationId: string | null;
  }>;
  locations: Array<{ id: string; code: string; name: string }>;
  shortages: Array<{
    id: string;
    product_id: string;
    product_name_snapshot: string;
    requested_quantity: number;
    reserved_quantity: number;
    production_required_quantity: number;
    produced_quantity: number;
    order:
      | { id: string; number: number; client_name_snapshot: string; status: WireTrayOrderStatus }
      | Array<{
          id: string;
          number: number;
          client_name_snapshot: string;
          status: WireTrayOrderStatus;
        }>;
  }>;
}

export interface PaginatedResult<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
}

export const wireTrayRoleLabel: Record<WireTrayModuleRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  comercial: "Comercial",
  producao: "Produção",
  estoque: "Estoque",
  faturamento: "Faturamento",
  consulta: "Consulta",
};

export const wireTrayCategoryLabel: Record<WireTrayCategory, string> = {
  straight_tray: "Leito reto",
  curve: "Curva",
  branch: "Derivação",
  reduction: "Redução",
  splice: "Emenda",
  support: "Suporte",
  cover: "Tampa",
  accessory: "Acessório",
  other: "Outro",
};

export const wireTrayUnitLabel: Record<WireTrayUnit, string> = {
  piece: "un",
  meter: "m",
  kilogram: "kg",
  set: "cj",
};

export const wireTrayOrderStatusLabel: Record<WireTrayOrderStatus, string> = {
  draft: "Rascunho",
  confirmed: "Confirmado",
  stock_reserved: "Estoque reservado",
  production_pending: "Produção pendente",
  in_production: "Em produção",
  separating: "Em separação",
  awaiting_check: "Aguardando conferência",
  ready_for_billing: "Pronto para faturar",
  billed: "Faturado",
  ready_for_dispatch: "Pronto para expedir",
  dispatched: "Expedido",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const wireTrayProductionStatusLabel: Record<WireTrayProductionStatus, string> = {
  planned: "Planejada",
  released: "Liberada",
  in_progress: "Em andamento",
  paused: "Pausada",
  awaiting_check: "Aguardando conferência",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const wireTrayProductionOriginLabel: Record<WireTrayProductionOrigin, string> = {
  customer_order: "Pedido de cliente",
  replenishment: "Reposição automática",
  manual_stock: "Estoque Lemarc",
};

export const wireTrayMovementLabel: Record<WireTrayMovementType, string> = {
  stock_entry: "Entrada",
  stock_exit: "Saída",
  transfer_out: "Transferência — saída",
  transfer_in: "Transferência — entrada",
  return: "Retorno",
  loss: "Perda ou avaria",
  adjustment: "Ajuste de inventário",
  reservation: "Reserva",
  reservation_release: "Liberação de reserva",
  reservation_consumption: "Consumo de reserva",
  production_entry: "Entrada de produção",
  dispatch: "Expedição",
};
import type { Json } from "@/integrations/supabase/types";
