/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types lag behind incremental migrations in this app. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeOrderRow } from "@/lib/reports/metrics";
import { resolvePeriodRange } from "@/lib/reports/filters";
import { maskCNPJ } from "@/lib/cnpj";
import type { BillingStatus, ReportFilters, ReportOrderRow } from "@/types/reports";
import type { ServiceOrderStatus, ServicePriority, ServiceType } from "@/types/serviceOrder";

const ROW_SELECT = `
  id, number, title, description, status, priority, service_type, service_type_other,
  client_id, client_unit_id, technician_id,
  opened_at, started_at, finished_at, closed_at, worked_minutes, hour_rate,
  billing_status, billed_at, invoice_reference,
  client:clients!service_orders_client_id_fkey(id, name, unit, cnpj),
  technician:technicians!service_orders_technician_id_fkey(id, full_name),
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name, cnpj, city, state),
  assigned_technicians:service_order_technicians(
    is_primary,
    technician:technicians(id, full_name, role)
  )
`;

function normalize(row: any): ReportOrderRow {
  const { estimated_value, lead_time_minutes, worked_minutes_effective, worked_minutes_source } =
    computeOrderRow(row);
  const assigned = Array.isArray(row?.assigned_technicians) ? row.assigned_technicians : [];
  const technicians = assigned
    .filter((a: any) => a?.technician)
    .map((a: any) => ({
      id: a.technician.id as string,
      name: a.technician.full_name as string,
      role: (a.technician.role ?? null) as string | null,
      is_primary: Boolean(a.is_primary),
    }))
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary));
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
    client_cnpj: row.client?.cnpj ? maskCNPJ(row.client.cnpj) : null,
    client_unit_id: row.client_unit_id,
    client_unit_name: row.client_unit?.name ?? null,
    client_unit_cnpj: row.client_unit?.cnpj ? maskCNPJ(row.client_unit.cnpj) : null,
    client_unit_city: row.client_unit?.city ?? null,
    client_unit_state: row.client_unit?.state ?? null,
    technician_id: row.technician_id,
    technician_name: row.technician?.full_name ?? null,
    technicians,
    opened_at: row.opened_at,
    started_at: row.started_at ?? null,
    finished_at: row.finished_at ?? null,
    closed_at: row.closed_at,
    worked_minutes: row.worked_minutes,
    worked_minutes_effective,
    worked_minutes_source,
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
  // Technician filter is applied client-side after fetching, using the
  // M2M assignments + legacy technician_id fallback, so historical OS
  // that only have the legacy column are still considered.
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.serviceType) query = query.eq("service_type", filters.serviceType);
  if (filters.billingStatus) query = query.eq("billing_status", filters.billingStatus);
  if (filters.onlyWithRate) query = query.gt("hour_rate", 0);
  if (filters.onlyCompleted) query = query.in("status", ["finished", "approved"]);
  if (filters.onlyAwaitingBilling)
    query = query
      .in("billing_status", ["pending", "ready"])
      .in("status", ["finished", "review", "approved"]);
  if (filters.onlyWithObservations) query = query.not("description", "is", null);
  return query;
}

function filterByTechnician(
  rows: ReportOrderRow[],
  technicianId: string | null | undefined,
): ReportOrderRow[] {
  if (!technicianId) return rows;
  return rows.filter((r) => {
    if (r.technicians.some((t) => t.id === technicianId)) return true;
    return r.technician_id === technicianId;
  });
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
    const normalized = (rows ?? []).map(normalize);
    return filterByTechnician(normalized, data.filters.technicianId);
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
    const orders = filterByTechnician((rows ?? []).map(normalize), data.filters.technicianId);
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

export type TechnicianReportRow = {
  order_id: string;
  number: number;
  title: string;
  status: ServiceOrderStatus;
  first_work_date: string;
  last_work_date: string;
  minutes: number;
  value_cents: number;
};

export type TechnicianReport = {
  technician: { id: string; full_name: string } | null;
  rows: TechnicianReportRow[];
  total_orders: number;
  total_minutes: number;
  total_value_cents: number;
};

// Per-technician report: sums the technician's own labor entries per OS.
export const getTechnicianReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { technicianId: string; filters: ReportFilters }) => data)
  .handler(async ({ data, context }): Promise<TechnicianReport> => {
    const { technicianId, filters } = data;
    const range = resolvePeriodRange(filters);

    let q = context.supabase
      .from("service_order_labor_entries")
      .select(
        `service_order_id, work_date, duration_minutes, subtotal_cents,
         order:service_orders!service_order_labor_entries_service_order_id_fkey(
           id, number, title, status, client_id, client_unit_id, service_type, billing_status, hour_rate, description
         )`,
      )
      .eq("technician_id", technicianId)
      .order("work_date", { ascending: false });

    if (range.from) q = q.gte("work_date", range.from.toISOString().slice(0, 10));
    if (range.to) q = q.lte("work_date", range.to.toISOString().slice(0, 10));

    const { data: entries, error } = await q;
    if (error) throw new Error(error.message);

    const byOrder = new Map<string, TechnicianReportRow>();
    for (const entry of (entries ?? []) as any[]) {
      const order = entry?.order;
      if (!order) continue;
      // Apply the same OS-level filters used in the general report.
      if (filters.clientId && order.client_id !== filters.clientId) continue;
      if (filters.unitId && order.client_unit_id !== filters.unitId) continue;
      if (filters.status && order.status !== filters.status) continue;
      if (filters.serviceType && order.service_type !== filters.serviceType) continue;
      if (filters.billingStatus && (order.billing_status ?? "pending") !== filters.billingStatus)
        continue;
      if (filters.onlyWithRate && !(Number(order.hour_rate) > 0)) continue;
      if (filters.onlyCompleted && !["finished", "approved"].includes(order.status)) continue;
      if (
        filters.onlyAwaitingBilling &&
        !(
          ["pending", "ready"].includes(order.billing_status ?? "pending") &&
          ["finished", "review", "approved"].includes(order.status)
        )
      )
        continue;
      if (filters.onlyWithObservations && !order.description) continue;

      const existing = byOrder.get(order.id);
      const minutes = Number(entry.duration_minutes) || 0;
      const cents = Number(entry.subtotal_cents) || 0;
      const workDate = String(entry.work_date);
      if (existing) {
        existing.minutes += minutes;
        existing.value_cents += cents;
        if (workDate < existing.first_work_date) existing.first_work_date = workDate;
        if (workDate > existing.last_work_date) existing.last_work_date = workDate;
      } else {
        byOrder.set(order.id, {
          order_id: order.id,
          number: order.number,
          title: order.title,
          status: order.status as ServiceOrderStatus,
          first_work_date: workDate,
          last_work_date: workDate,
          minutes,
          value_cents: cents,
        });
      }
    }

    const rows = [...byOrder.values()].sort((a, b) =>
      b.last_work_date.localeCompare(a.last_work_date),
    );

    const { data: technician, error: tErr } = await context.supabase
      .from("technicians")
      .select("id, full_name")
      .eq("id", technicianId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);

    return {
      technician: technician ?? null,
      rows,
      total_orders: rows.length,
      total_minutes: rows.reduce((sum, row) => sum + row.minutes, 0),
      total_value_cents: rows.reduce((sum, row) => sum + row.value_cents, 0),
    };
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
export type { ReportFilters, ReportOrderRow, ServiceOrderStatus, ServicePriority, ServiceType };
