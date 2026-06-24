import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeOrderRow } from "@/lib/reports/metrics";
import { resolvePeriodRange } from "@/lib/reports/filters";
import type {
  BillingStatus,
  ReportFilters,
  ReportOrderRow,
} from "@/types/reports";
import type {
  ServiceOrderStatus,
  ServicePriority,
  ServiceType,
} from "@/types/serviceOrder";

const ROW_SELECT = `
  id, number, title, description, status, priority, service_type, service_type_other,
  client_id, client_unit_id, technician_id,
  opened_at, closed_at, worked_minutes, hour_rate,
  billing_status, billed_at, invoice_reference,
  client:clients!service_orders_client_id_fkey(id, name, unit),
  technician:technicians!service_orders_technician_id_fkey(id, full_name),
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name)
`;

function normalize(row: any): ReportOrderRow {
  const { estimated_value, lead_time_minutes } = computeOrderRow(row);
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    status: row.status,
    priority: row.priority,
    service_type: row.service_type,
    service_type_other: row.service_type_other,
    client_id: row.client_id,
    client_name: row.client?.name ?? null,
    client_unit_id: row.client_unit_id,
    client_unit_name: row.client_unit?.name ?? null,
    technician_id: row.technician_id,
    technician_name: row.technician?.full_name ?? null,
    opened_at: row.opened_at,
    closed_at: row.closed_at,
    worked_minutes: row.worked_minutes,
    hour_rate: row.hour_rate,
    estimated_value,
    lead_time_minutes,
    billing_status: (row.billing_status ?? "pending") as BillingStatus,
    billed_at: row.billed_at ?? null,
    invoice_reference: row.invoice_reference ?? null,
    description: row.description ?? null,
  };
}

function applyFilters(query: any, filters: ReportFilters) {
  const range = resolvePeriodRange(filters);
  if (range.from) query = query.gte("opened_at", range.from.toISOString());
  if (range.to) query = query.lte("opened_at", range.to.toISOString());
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.unitId) query = query.eq("client_unit_id", filters.unitId);
  if (filters.technicianId) query = query.eq("technician_id", filters.technicianId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.serviceType) query = query.eq("service_type", filters.serviceType);
  if (filters.billingStatus) query = query.eq("billing_status", filters.billingStatus);
  if (filters.onlyWithRate) query = query.gt("hour_rate", 0);
  if (filters.onlyCompleted) query = query.in("status", ["finished", "approved"]);
  if (filters.onlyAwaitingBilling)
    query = query.in("billing_status", ["pending", "ready"]).in("status", ["finished", "review", "approved"]);
  if (filters.onlyWithObservations) query = query.not("description", "is", null);
  return query;
}

const filtersInput = (data: { filters: ReportFilters }) => data;

export const getReportOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(filtersInput)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("service_orders")
      .select(ROW_SELECT)
      .order("opened_at", { ascending: false });
    q = applyFilters(q, data.filters);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(normalize);
  });

export const getClientReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clientId: string; filters: ReportFilters }) => data)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("service_orders")
      .select(ROW_SELECT)
      .eq("client_id", data.clientId)
      .order("opened_at", { ascending: false });
    q = applyFilters(q, { ...data.filters, clientId: data.clientId });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const orders = (rows ?? []).map(normalize);
    const { data: client, error: cErr } = await context.supabase
      .from("clients")
      .select("id, name, unit")
      .eq("id", data.clientId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    return { client: client ?? null, orders };
  });

export const updateBillingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      billing_status: BillingStatus;
      invoice_reference?: string | null;
      billing_notes?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      billing_status: data.billing_status,
      billed_at: data.billing_status === "billed" ? new Date().toISOString() : null,
    };
    if (data.invoice_reference !== undefined) patch.invoice_reference = data.invoice_reference;
    if (data.billing_notes !== undefined) patch.billing_notes = data.billing_notes;
    const { error } = await (context.supabase.from("service_orders") as any)
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Light lookups for filter dropdowns
export const listReportLookups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [clients, units, technicians] = await Promise.all([
      context.supabase.from("clients").select("id, name").order("name"),
      context.supabase.from("client_units").select("id, name, client_id").order("name"),
      context.supabase.from("technicians").select("id, full_name").order("full_name"),
    ]);
    if (clients.error) throw new Error(clients.error.message);
    if (units.error) throw new Error(units.error.message);
    if (technicians.error) throw new Error(technicians.error.message);
    return {
      clients: clients.data ?? [],
      units: units.data ?? [],
      technicians: technicians.data ?? [],
    };
  });

// Re-exports for typing convenience in route searches
export type {
  ReportFilters,
  ReportOrderRow,
  ServiceOrderStatus,
  ServicePriority,
  ServiceType,
};