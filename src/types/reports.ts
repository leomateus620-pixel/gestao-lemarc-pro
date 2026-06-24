import type {
  ServiceOrderStatus,
  ServicePriority,
  ServiceType,
} from "@/types/serviceOrder";

export type BillingStatus = "pending" | "ready" | "billed" | "cancelled";

export const billingStatusLabel: Record<BillingStatus, string> = {
  pending: "Pendente",
  ready: "Pronta para cobrança",
  billed: "Faturada",
  cancelled: "Cancelada",
};

export type PeriodKey =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "all"
  | "custom";

export type ReportFilters = {
  period: PeriodKey;
  from?: string | null;
  to?: string | null;
  clientId?: string | null;
  unitId?: string | null;
  technicianId?: string | null;
  status?: ServiceOrderStatus | null;
  priority?: ServicePriority | null;
  serviceType?: ServiceType | null;
  billingStatus?: BillingStatus | null;
  onlyWithRate?: boolean | null;
};

export type ReportOrderRow = {
  id: string;
  number: number;
  title: string;
  status: ServiceOrderStatus;
  priority: ServicePriority | null;
  service_type: ServiceType | null;
  service_type_other: string | null;
  client_id: string | null;
  client_name: string | null;
  client_unit_id: string | null;
  client_unit_name: string | null;
  technician_id: string | null;
  technician_name: string | null;
  opened_at: string;
  closed_at: string | null;
  worked_minutes: number | null;
  hour_rate: number | null;
  estimated_value: number;
  lead_time_minutes: number | null;
  billing_status: BillingStatus;
  billed_at: string | null;
  invoice_reference: string | null;
};

export type ReportOverview = {
  totalOrders: number;
  finishedOrders: number;
  runningOrders: number;
  pendingBilling: number;
  totalHours: number;
  estimatedValue: number;
  avgLeadTimeMinutes: number | null;
  completionRate: number;
  avgTicket: number;
  ordersMissingRate: number;
};

export type GroupBucket = { key: string; label: string; value: number };
export type TrendPoint = { month: string; label: string; orders: number; hours: number; value: number };

export type ReportSeries = {
  byStatus: GroupBucket[];
  byPriority: GroupBucket[];
  byServiceType: GroupBucket[];
  byClient: GroupBucket[];
  byTechnicianHours: GroupBucket[];
  byClientValue: GroupBucket[];
  avgLeadByTechnician: GroupBucket[];
  trend: TrendPoint[];
};

export type ClientReport = {
  client: { id: string; name: string; unit: string | null } | null;
  overview: ReportOverview;
  byUnit: GroupBucket[];
  byTechnician: GroupBucket[];
  byStatus: GroupBucket[];
  orders: ReportOrderRow[];
};