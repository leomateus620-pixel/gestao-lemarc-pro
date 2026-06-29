/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase generated types lag behind incremental migrations in this app. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  ServiceOrder,
  ServiceOrderStatus,
  ServicePriority,
  ServiceType,
  TechnicianLite,
} from "@/types/serviceOrder";

const ORDER_SELECT = `
  id, number, title, description, client_id, technician_id,
  service_type, service_type_other, priority, status, location, requester_name, scheduled_for, client_unit_id,
  opened_at, started_at, finished_at, approved_at, closed_at,
  hour_rate, worked_minutes, created_by, created_at, updated_at,
  client:clients!service_orders_client_id_fkey(id, name, unit),
  technician:technicians!service_orders_technician_id_fkey(id, full_name, role, hourly_rate_cents),
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name, sector, city, state),
  assigned_technicians:service_order_technicians(
    is_primary, role,
    technician:technicians(id, full_name, role, hourly_rate_cents)
  )
`;

const TECHNICIAN_FULL_SELECT =
  "id, full_name, role, phone, email, cpf, specialty, active, kind, default_availability, hourly_rate_cents, hourly_rate_50_cents, hourly_rate_100_cents, pricing_notes, internal_notes, user_id, created_by, created_at, updated_at";
const TECHNICIAN_LEGACY_SELECT =
  "id, full_name, role, phone, hourly_rate_cents, user_id, created_by, created_at, updated_at";

export type TechnicianInput = {
  full_name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  specialty?: string | null;
  active?: boolean | null;
  kind?: string | null;
  default_availability?: string | null;
  hourly_rate_cents?: number | null;
  hourly_rate_50_cents?: number | null;
  hourly_rate_100_cents?: number | null;
  pricing_notes?: string | null;
  internal_notes?: string | null;
  user_id?: string | null;
};

export type TechnicianUpdateInput = TechnicianInput & { id: string };

function normalizeTechnician(row: any): TechnicianLite {
  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    cpf: row.cpf ?? null,
    specialty: row.specialty ?? null,
    active: row.active ?? true,
    kind: row.kind ?? null,
    default_availability: row.default_availability ?? null,
    hourly_rate_cents: row.hourly_rate_cents ?? null,
    hourly_rate_50_cents: row.hourly_rate_50_cents ?? null,
    hourly_rate_100_cents: row.hourly_rate_100_cents ?? null,
    pricing_notes: row.pricing_notes ?? null,
    internal_notes: row.internal_notes ?? null,
    user_id: row.user_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function legacyTechnicianPayload(data: TechnicianInput) {
  return {
    full_name: data.full_name,
    role: data.role ?? null,
    phone: data.phone ?? null,
    hourly_rate_cents: data.hourly_rate_cents ?? null,
    user_id: data.user_id ?? null,
  };
}

function fullTechnicianPayload(data: TechnicianInput) {
  return {
    ...legacyTechnicianPayload(data),
    email: data.email ?? null,
    cpf: data.cpf ?? null,
    specialty: data.specialty ?? null,
    active: data.active ?? true,
    kind: data.kind ?? null,
    default_availability: data.default_availability ?? null,
    hourly_rate_50_cents: data.hourly_rate_50_cents ?? null,
    hourly_rate_100_cents: data.hourly_rate_100_cents ?? null,
    pricing_notes: data.pricing_notes ?? null,
    internal_notes: data.internal_notes ?? null,
  };
}

function normalize(row: any): ServiceOrder {
  const assigned = Array.isArray(row?.assigned_technicians) ? row.assigned_technicians : [];
  const technicians = assigned
    .filter((a: any) => a?.technician)
    .map((a: any) => ({
      id: a.technician.id,
      full_name: a.technician.full_name,
      role: a.technician.role ?? null,
      hourly_rate_cents: a.technician.hourly_rate_cents ?? null,
      assignment_role: a.role ?? null,
      is_primary: Boolean(a.is_primary),
    }))
    .sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary));
  return {
    ...row,
    client: row.client ?? null,
    technician: row.technician ?? null,
    technicians,
    client_unit: row.client_unit ?? null,
  } as ServiceOrder;
}

export const listServiceOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("service_orders")
      .select(ORDER_SELECT)
      .order("opened_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(normalize);
  });

export const getServiceOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_orders")
      .select(ORDER_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return normalize(row);
  });

type CreateInput = {
  title: string;
  description?: string | null;
  client_id?: string | null;
  client_unit_id?: string | null;
  technician_id?: string | null;
  technician_ids?: string[] | null;
  service_type?: ServiceType | null;
  service_type_other?: string | null;
  priority?: ServicePriority | null;
  location?: string | null;
  requester_name?: string | null;
  scheduled_for?: string | null;
};

export const createServiceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateInput) => data)
  .handler(async ({ data, context }) => {
    const ids = (data.technician_ids ?? []).filter(Boolean);
    const uniqueIds = Array.from(new Set(ids));
    const primaryId = uniqueIds[0] ?? data.technician_id ?? null;
    const { data: row, error } = await context.supabase
      .from("service_orders")
      .insert({
        title: data.title,
        description: data.description ?? null,
        client_id: data.client_id ?? null,
        client_unit_id: data.client_unit_id ?? null,
        technician_id: primaryId,
        service_type: data.service_type ?? null,
        service_type_other: data.service_type_other ?? null,
        priority: data.priority ?? null,
        location: data.location ?? null,
        requester_name: data.requester_name ?? null,
        scheduled_for: data.scheduled_for ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select(ORDER_SELECT)
      .single();
    if (error) throw new Error(error.message);
    if (uniqueIds.length > 0) {
      const links = uniqueIds.map((technician_id, idx) => ({
        service_order_id: row.id,
        technician_id,
        assigned_by: context.userId,
        is_primary: idx === 0,
      }));
      const { error: linkErr } = await (
        context.supabase.from("service_order_technicians") as any
      ).insert(links);
      if (linkErr) {
        // Rollback the order to keep the relation consistent.
        await context.supabase.from("service_orders").delete().eq("id", row.id);
        throw new Error(`Falha ao vincular técnicos: ${linkErr.message}`);
      }
      // Re-fetch so the response carries the new assignments.
      const { data: full, error: refetchErr } = await context.supabase
        .from("service_orders")
        .select(ORDER_SELECT)
        .eq("id", row.id)
        .single();
      if (refetchErr) throw new Error(refetchErr.message);
      return normalize(full);
    }
    return normalize(row);
  });

export const setServiceOrderTechnicians = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; technician_ids: string[] }) => data)
  .handler(async ({ data, context }) => {
    const ids = Array.from(new Set((data.technician_ids ?? []).filter(Boolean)));
    const primaryId = ids[0] ?? null;

    // Replace existing links with the new set.
    const { error: delErr } = await context.supabase
      .from("service_order_technicians")
      .delete()
      .eq("service_order_id", data.id);
    if (delErr) throw new Error(delErr.message);

    if (ids.length > 0) {
      const links = ids.map((technician_id, idx) => ({
        service_order_id: data.id,
        technician_id,
        assigned_by: context.userId,
        is_primary: idx === 0,
      }));
      const { error: insErr } = await (
        context.supabase.from("service_order_technicians") as any
      ).insert(links);
      if (insErr) throw new Error(insErr.message);
    }

    // Keep legacy single-technician column in sync with the new primary.
    const { error: updErr } = await (context.supabase.from("service_orders") as any)
      .update({ technician_id: primaryId })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    const { data: full, error: refetchErr } = await context.supabase
      .from("service_orders")
      .select(ORDER_SELECT)
      .eq("id", data.id)
      .single();
    if (refetchErr) throw new Error(refetchErr.message);
    return normalize(full);
  });

export const updateServiceOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: ServiceOrderStatus }) => data)
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["service_orders"]["Update"] = {
      status: data.status,
    };
    if (data.status === "running") patch.started_at = now;
    if (data.status === "finished") {
      patch.finished_at = now;
      patch.closed_at = now;
    }
    if (data.status === "approved") {
      patch.approved_at = now;
      patch.closed_at = now;
    }
    if (data.status === "cancelled") {
      patch.closed_at = now;
    }
    // Reabertura: limpa timestamps de fechamento para não exibir tempo total falso.
    if (
      data.status === "pending" ||
      data.status === "dispatched" ||
      data.status === "transit" ||
      data.status === "running" ||
      data.status === "review"
    ) {
      patch.closed_at = null;
      if (data.status !== "review") {
        patch.finished_at = null;
        patch.approved_at = null;
      }
    }
    const { data: row, error } = await context.supabase
      .from("service_orders")
      .update(patch)
      .eq("id", data.id)
      .select(ORDER_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return normalize(row);
  });

// ---------- Clients ----------

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id, name, unit")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; unit?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({ name: data.name, unit: data.unit ?? null, created_by: context.userId })
      .select("id, name, unit")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Technicians ----------

export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const full = await sb.from("technicians").select(TECHNICIAN_FULL_SELECT).order("full_name");
    if (!full.error) return (full.data ?? []).map(normalizeTechnician);

    const legacy = await sb.from("technicians").select(TECHNICIAN_LEGACY_SELECT).order("full_name");
    if (legacy.error) throw new Error(legacy.error.message);
    return (legacy.data ?? []).map(normalizeTechnician);
  });

export const createTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: TechnicianInput) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const payload = {
      ...fullTechnicianPayload(data),
      created_by: context.userId,
    };
    const full = await sb
      .from("technicians")
      .insert(payload)
      .select(TECHNICIAN_FULL_SELECT)
      .single();
    if (!full.error) return normalizeTechnician(full.data);

    const legacy = await sb
      .from("technicians")
      .insert({ ...legacyTechnicianPayload(data), created_by: context.userId })
      .select(TECHNICIAN_LEGACY_SELECT)
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    return normalizeTechnician(legacy.data);
  });

export const updateTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: TechnicianUpdateInput) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const before = await sb
      .from("technicians")
      .select(TECHNICIAN_FULL_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    const priorRate = before.error ? null : (before.data?.hourly_rate_cents ?? null);

    const { id, ...values } = data;
    const full = await sb
      .from("technicians")
      .update(fullTechnicianPayload(values))
      .eq("id", id)
      .select(TECHNICIAN_FULL_SELECT)
      .single();

    if (!full.error) {
      if (priorRate !== data.hourly_rate_cents) {
        await sb.from("technician_rate_history").insert({
          technician_id: id,
          hourly_rate_cents: data.hourly_rate_cents ?? null,
          hourly_rate_50_cents: data.hourly_rate_50_cents ?? null,
          hourly_rate_100_cents: data.hourly_rate_100_cents ?? null,
          starts_at: new Date().toISOString(),
          notes: data.pricing_notes ?? null,
          created_by: context.userId,
        });
      }
      return normalizeTechnician(full.data);
    }

    const legacy = await sb
      .from("technicians")
      .update(legacyTechnicianPayload(values))
      .eq("id", id)
      .select(TECHNICIAN_LEGACY_SELECT)
      .single();
    if (legacy.error) throw new Error(legacy.error.message);
    return normalizeTechnician(legacy.data);
  });
