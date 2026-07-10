import type { ServiceOrderStatus, ServicePriority, ServiceType } from "@/types/serviceOrder";

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
  | "last30"
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
  onlyCompleted?: boolean | null;
  onlyAwaitingBilling?: boolean | null;
  onlyWithObservations?: boolean | null;
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
  client_cnpj: string | null;
  client_unit_id: string | null;
  client_unit_name: string | null;
  client_unit_cnpj: string | null;
  client_unit_city: string | null;
  client_unit_state: string | null;
  technician_id: string | null;
  technician_name: string | null;
  /**
   * Many-to-many technicians assigned to the order. Empty when the OS has
   * no assignments — consumers should fall back to `technician_id` /
   * `technician_name` (legacy single technician) when this is empty.
   */
  technicians: ReportTechnician[];
  opened_at: string;
  started_at: string | null;
  finished_at: string | null;
  closed_at: string | null;
  worked_minutes: number | null;
  worked_minutes_effective: number;
  worked_minutes_source: "reported" | "derived" | "none";
  hour_rate: number | null;
  estimated_value: number;
  lead_time_minutes: number | null;
  billing_status: BillingStatus;
  billed_at: string | null;
  invoice_reference: string | null;
  description: string | null;
};

export type ReportTechnician = {
  id: string;
  name: string;
  role: string | null;
  is_primary: boolean;
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

export type ReportDataQuality = {
  withoutUnit: number;
  withoutTechnician: number;
  withoutWorkedMinutes: number;
  withoutHourlyRate: number;
  pendingBilling: number;
  derivedWorkedMinutes: number;
};

export type GroupBucket = { key: string; label: string; value: number };
export type TrendPoint = {
  month: string;
  label: string;
  orders: number;
  completed: number;
  hours: number;
  value: number;
};

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

// ===== Managerial Report =====

export type ManagerialSummary = {
  totalOrders: number;
  finished: number;
  running: number;
  pending: number;
  review: number;
  awaitingBilling: number;
  totalHours: number;
  avgLeadMinutes: number | null;
  estimatedValue: number;
  completionRate: number;
  clientsInvolved: number;
  techniciansInvolved: number;
};

export type StatusBreakdown = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

export type ClientAggregate = {
  id: string | null;
  name: string;
  orders: number;
  finished: number;
  pending: number;
  hours: number;
  estimatedValue: number;
};

export type TechnicianAggregate = {
  id: string | null;
  name: string;
  orders: number;
  finished: number;
  hours: number;
  avgLeadMinutes: number | null;
  estimatedValue: number;
};

export type ServiceTypeAggregate = {
  key: string;
  label: string;
  count: number;
};

export type IncompleteCounters = {
  withoutTechnician: number;
  withoutHourRate: number;
  withoutWorkedMinutes: number;
  withoutClosedAt: number;
};

export type ManagerialReport = {
  summary: ManagerialSummary;
  byStatus: StatusBreakdown[];
  topClients: ClientAggregate[];
  topTechnicians: TechnicianAggregate[];
  byServiceType: ServiceTypeAggregate[];
  observations: ReportOrderRow[];
  incomplete: IncompleteCounters;
  orders: ReportOrderRow[];
};
