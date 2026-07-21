/* eslint-disable @typescript-eslint/no-explicit-any -- The migration and generated types land together in deployment. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireWireTrayAccess } from "./wireTrayShared";
import type {
  WireTrayAccessUser,
  WireTrayModuleAccess,
  WireTrayModuleRole,
} from "@/types/wireTray";

const setAccessSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "gestor", "comercial", "producao", "estoque", "faturamento", "consulta"]),
  active: z.boolean(),
  financialAccess: z.boolean().default(false),
});

export const getMyModuleAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("user_module_access")
      .select("id, user_id, module_role, active, financial_access")
      .eq("user_id", context.userId)
      .eq("module_key", "wire_trays")
      .maybeSingle();
    if (error) throw new Error("Não foi possível validar os módulos autorizados.");
    let wireTrays: WireTrayModuleAccess | null = null;
    if (data?.active && data.module_role) {
      const role = data.module_role as WireTrayModuleRole;
      wireTrays = {
        id: data.id,
        userId: data.user_id,
        role,
        active: true,
        financialAccess: Boolean(data.financial_access),
        canViewFinancials:
          role === "admin" ||
          role === "comercial" ||
          role === "faturamento" ||
          (role === "gestor" && Boolean(data.financial_access)),
      };
    }
    return { os: true, wireTrays };
  });

export const listWireTrayAccessUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireWireTrayAccess(context, ["admin"]);
    const { data, error } = await (context.supabase as any).rpc("wire_tray_list_access_users");
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(
      (row): WireTrayAccessUser => ({
        userId: row.user_id,
        email: row.email ?? null,
        fullName: row.full_name ?? null,
        role: row.module_role ?? null,
        active: Boolean(row.active),
        financialAccess: Boolean(row.financial_access),
        updatedAt: row.updated_at ?? null,
      }),
    );
  });

export const setWireTrayAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setAccessSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, ["admin"]);
    const { data: row, error } = await (context.supabase as any).rpc(
      "wire_tray_set_module_access",
      {
        _user_id: data.userId,
        _module_role: data.role,
        _active: data.active,
        _financial_access: data.financialAccess,
      },
    );
    if (error) throw new Error(error.message);
    return row;
  });
