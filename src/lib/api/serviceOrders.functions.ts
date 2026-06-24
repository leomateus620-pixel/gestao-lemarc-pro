import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type {
  ServiceOrder,
  ServiceOrderStatus,
  ServicePriority,
  ServiceType,
} from "@/types/serviceOrder";

const ORDER_SELECT = `
  id, number, title, description, client_id, technician_id,
  service_type, service_type_other, priority, status, location, scheduled_for, client_unit_id,
  opened_at, started_at, finished_at, approved_at, closed_at,
  hour_rate, worked_minutes, created_by, created_at, updated_at,
  client:clients!service_orders_client_id_fkey(id, name, unit),
  technician:technicians!service_orders_technician_id_fkey(id, full_name, role),
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name, sector, city, state)
`;

function normalize(row: any): ServiceOrder {
  return {
    ...row,
    client: row.client ?? null,
    technician: row.technician ?? null,
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
  service_type?: ServiceType | null;
  service_type_other?: string | null;
  priority?: ServicePriority | null;
  location?: string | null;
  scheduled_for?: string | null;
};

export const createServiceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateInput) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("service_orders")
      .insert({
        title: data.title,
        description: data.description ?? null,
        client_id: data.client_id ?? null,
        client_unit_id: data.client_unit_id ?? null,
        technician_id: data.technician_id ?? null,
        service_type: data.service_type ?? null,
        service_type_other: data.service_type_other ?? null,
        priority: data.priority ?? null,
        location: data.location ?? null,
        scheduled_for: data.scheduled_for ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select(ORDER_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return normalize(row);
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
    const { data, error } = await context.supabase
      .from("technicians")
      .select("id, full_name, role")
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { full_name: string; role?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("technicians")
      .insert({ full_name: data.full_name, role: data.role ?? null, created_by: context.userId })
      .select("id, full_name, role")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });