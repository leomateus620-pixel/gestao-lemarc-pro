import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ClientFull, ClientUnit, ClientUnitInput } from "@/types/client";
import type { Database } from "@/integrations/supabase/types";
import type { ServiceOrderStatus, ServicePriority } from "@/types/serviceOrder";
import { isValidCNPJ, onlyDigits } from "@/lib/cnpj";

const CLIENT_COLS =
  "id, name, cnpj, segment, address, city, state, phone, email, responsible_name, notes, active, unit, created_at, updated_at";

const UNIT_COLS =
  "id, client_id, name, is_primary, sector, city, state, address, responsible_name, phone, notes, active, cnpj, distance_km_from_base, default_displacement_rate_cents, default_displacement_type, billing_notes, created_at, updated_at";

const ALLOWED_DISPLACEMENT_TYPES = ["km", "fixed", "none"] as const;

function normalizeUnitFields(input: Partial<ClientUnitInput>) {
  const out: Record<string, unknown> = {};
  if (input.sector !== undefined) out.sector = input.sector ?? null;
  if (input.city !== undefined) out.city = input.city ?? null;
  if (input.state !== undefined) out.state = input.state ?? null;
  if (input.address !== undefined) out.address = input.address ?? null;
  if (input.responsible_name !== undefined) out.responsible_name = input.responsible_name ?? null;
  if (input.phone !== undefined) out.phone = input.phone ?? null;
  if (input.notes !== undefined) out.notes = input.notes ?? null;
  if (input.cnpj !== undefined) {
    const digits = input.cnpj ? onlyDigits(String(input.cnpj)) : null;
    if (digits && !isValidCNPJ(digits)) throw new Error("CNPJ da unidade inválido.");
    out.cnpj = digits || null;
  }
  if (input.distance_km_from_base !== undefined) {
    const v = input.distance_km_from_base;
    out.distance_km_from_base = v === null || v === undefined ? null : Number(v);
  }
  if (input.default_displacement_rate_cents !== undefined) {
    const v = input.default_displacement_rate_cents;
    out.default_displacement_rate_cents =
      v === null || v === undefined ? null : Math.max(0, Math.round(Number(v)));
  }
  if (input.default_displacement_type !== undefined) {
    const t = input.default_displacement_type;
    if (t && !ALLOWED_DISPLACEMENT_TYPES.includes(t)) {
      throw new Error("Tipo de deslocamento inválido.");
    }
    out.default_displacement_type = t ?? null;
  }
  if (input.billing_notes !== undefined) out.billing_notes = input.billing_notes ?? null;
  return out;
}

async function ensureUnitCnpjUnique(
  // The Supabase generated types are too narrow for our dynamic query chain here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: { supabase: any },
  clientId: string,
  cnpjDigits: string | null,
  excludeUnitId?: string,
) {
  if (!cnpjDigits) return;
  let q = context.supabase
    .from("client_units")
    .select("id")
    .eq("client_id", clientId)
    .eq("cnpj", cnpjDigits);
  if (excludeUnitId) q = q.neq("id", excludeUnitId);
  const { data: dup } = await q.maybeSingle();
  if (dup) throw new Error("Já existe uma unidade desta empresa com este CNPJ.");
}

export const listClientsFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select(CLIENT_COLS)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientFull[];
  });

export const listAllUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("client_units")
      .select(UNIT_COLS)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientUnit[];
  });

export const getClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const [{ data: client, error: e1 }, { data: units, error: e2 }] = await Promise.all([
      context.supabase.from("clients").select(CLIENT_COLS).eq("id", data.id).maybeSingle(),
      context.supabase
        .from("client_units")
        .select(UNIT_COLS)
        .eq("client_id", data.id)
        .order("is_primary", { ascending: false })
        .order("name"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!client) return null;
    return { client: client as ClientFull, units: (units ?? []) as ClientUnit[] };
  });

const PAGE_ORDER_COLS = `
  id, number, title, status, priority, client_id, client_unit_id,
  opened_at, scheduled_for, started_at, finished_at,
  client_unit:client_units!service_orders_client_unit_id_fkey(id, name)
`;

export const getClientPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const [{ data: client, error: e1 }, { data: units, error: e2 }, { data: orders, error: e3 }] =
      await Promise.all([
        context.supabase.from("clients").select(CLIENT_COLS).eq("id", data.id).maybeSingle(),
        context.supabase
          .from("client_units")
          .select(UNIT_COLS)
          .eq("client_id", data.id)
          .order("is_primary", { ascending: false })
          .order("name"),
        context.supabase
          .from("service_orders")
          .select(PAGE_ORDER_COLS)
          .eq("client_id", data.id)
          .order("opened_at", { ascending: false }),
      ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);
    if (!client) return null;

    const list = (orders ?? []) as Array<{
      id: string;
      number: number;
      title: string;
      status: ServiceOrderStatus;
      priority: ServicePriority | null;
      client_id: string | null;
      client_unit_id: string | null;
      opened_at: string | null;
      scheduled_for: string | null;
      started_at: string | null;
      finished_at: string | null;
      client_unit: { id: string; name: string } | null;
    }>;

    const counts = {
      total: list.length,
      open: 0,
      running: 0,
      pending: 0,
      done: 0,
      cancelled: 0,
    };
    for (const o of list) {
      const s = o.status;
      if (s === "running") counts.running++;
      if (s === "pending") counts.pending++;
      if (s === "finished" || s === "approved") counts.done++;
      if (s === "cancelled") counts.cancelled++;
      if (s !== "finished" && s !== "approved" && s !== "cancelled") counts.open++;
    }

    return {
      client: client as ClientFull,
      units: (units ?? []) as ClientUnit[],
      orders: list,
      counts,
    };
  });

type CreateCompanyInput = {
  name: string;
  cnpj?: string | null;
  segment?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  responsible_name?: string | null;
  notes?: string | null;
  units?: ClientUnitInput[];
};

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateCompanyInput) => data)
  .handler(async ({ data, context }) => {
    const cnpjDigits = data.cnpj ? onlyDigits(data.cnpj) : null;
    if (cnpjDigits && !isValidCNPJ(cnpjDigits)) {
      throw new Error("CNPJ inválido.");
    }
    if (cnpjDigits) {
      const { data: existing } = await context.supabase
        .from("clients")
        .select("id")
        .eq("cnpj", cnpjDigits)
        .maybeSingle();
      if (existing) throw new Error("Já existe um cliente com este CNPJ.");
    }

    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({
        name: data.name,
        cnpj: cnpjDigits,
        segment: data.segment ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        responsible_name: data.responsible_name ?? null,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select(CLIENT_COLS)
      .single();
    if (error) throw new Error(error.message);

    const units = data.units ?? [];
    if (units.length > 0) {
      const primaryIdx = units.findIndex((u) => u.is_primary);
      const effectivePrimary = primaryIdx >= 0 ? primaryIdx : 0;
      const payload = units.map((u, i) => ({
        client_id: row.id,
        name: u.name,
        is_primary: i === effectivePrimary,
        created_by: context.userId,
        ...normalizeUnitFields(u),
      }));
      // CNPJ duplicate check inside the same payload
      const seen = new Set<string>();
      for (const p of payload) {
        const c = (p as { cnpj?: string | null }).cnpj;
        if (c) {
          if (seen.has(c))
            throw new Error(
              "Duas unidades desta empresa têm o mesmo CNPJ. Ajuste antes de salvar.",
            );
          seen.add(c);
        }
      }
      const { error: uErr } = await context.supabase.from("client_units").insert(payload);
      if (uErr) throw new Error(uErr.message);
    }

    return row as ClientFull;
  });

type UpdateCompanyInput = {
  id: string;
  patch: Partial<Omit<CreateCompanyInput, "units">> & { active?: boolean };
};

export const updateCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdateCompanyInput) => data)
  .handler(async ({ data, context }) => {
    const patch: Database["public"]["Tables"]["clients"]["Update"] = { ...data.patch };
    if (patch.cnpj !== undefined) {
      const digits = patch.cnpj ? onlyDigits(String(patch.cnpj)) : null;
      if (digits && !isValidCNPJ(digits)) throw new Error("CNPJ inválido.");
      if (digits) {
        const { data: dup } = await context.supabase
          .from("clients")
          .select("id")
          .eq("cnpj", digits)
          .neq("id", data.id)
          .maybeSingle();
        if (dup) throw new Error("Já existe outro cliente com este CNPJ.");
      }
      patch.cnpj = digits;
    }
    const { data: row, error } = await context.supabase
      .from("clients")
      .update(patch)
      .eq("id", data.id)
      .select(CLIENT_COLS)
      .single();
    if (error) throw new Error(error.message);
    return row as ClientFull;
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createClientUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ClientUnitInput & { client_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { client_id, ...rest } = data;
    const normalized = normalizeUnitFields(rest);
    await ensureUnitCnpjUnique(
      context,
      client_id,
      (normalized.cnpj as string | null | undefined) ?? null,
    );
    const { data: row, error } = await context.supabase
      .from("client_units")
      .insert({
        client_id,
        name: rest.name,
        is_primary: rest.is_primary ?? false,
        created_by: context.userId,
        ...normalized,
      })
      .select(UNIT_COLS)
      .single();
    if (error) throw new Error(error.message);
    return row as ClientUnit;
  });

export const updateClientUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { id: string; patch: Partial<ClientUnitInput> & { active?: boolean } }) => data,
  )
  .handler(async ({ data, context }) => {
    const { active, name, is_primary, ...rest } = data.patch;
    const normalized = normalizeUnitFields(rest);
    if (name !== undefined) (normalized as Record<string, unknown>).name = name;
    if (is_primary !== undefined) (normalized as Record<string, unknown>).is_primary = is_primary;
    if (active !== undefined) (normalized as Record<string, unknown>).active = active;
    if ((normalized as { cnpj?: string | null }).cnpj !== undefined) {
      const { data: current } = await context.supabase
        .from("client_units")
        .select("client_id")
        .eq("id", data.id)
        .maybeSingle();
      const clientId = (current as { client_id?: string } | null)?.client_id;
      if (clientId)
        await ensureUnitCnpjUnique(
          context,
          clientId,
          ((normalized as { cnpj?: string | null }).cnpj as string | null) ?? null,
          data.id,
        );
    }
    const { data: row, error } = await context.supabase
      .from("client_units")
      .update(normalized as Database["public"]["Tables"]["client_units"]["Update"])
      .eq("id", data.id)
      .select(UNIT_COLS)
      .single();
    if (error) throw new Error(error.message);
    return row as ClientUnit;
  });

export const deleteClientUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("client_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
