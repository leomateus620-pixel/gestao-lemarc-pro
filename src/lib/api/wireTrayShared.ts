/* eslint-disable @typescript-eslint/no-explicit-any -- New tables are introduced by the migrations in this change. */
import type { WireTrayModuleAccess, WireTrayModuleRole } from "@/types/wireTray";

export type WireTrayServerContext = {
  supabase: any;
  userId: string;
};

export const WIRE_TRAY_OPERATIONAL_ROLES: WireTrayModuleRole[] = [
  "admin",
  "gestor",
  "comercial",
  "producao",
  "estoque",
  "faturamento",
  "consulta",
];

export async function requireWireTrayAccess(
  context: WireTrayServerContext,
  allowedRoles: readonly WireTrayModuleRole[] = WIRE_TRAY_OPERATIONAL_ROLES,
): Promise<WireTrayModuleAccess> {
  const { data, error } = await context.supabase
    .from("user_module_access")
    .select("id, user_id, module_role, active, financial_access")
    .eq("user_id", context.userId)
    .eq("module_key", "wire_trays")
    .maybeSingle();
  if (error) throw domainError("CONNECTION", "Não foi possível validar o acesso ao módulo.");
  if (!data?.active || !data.module_role) {
    throw domainError("FORBIDDEN", "Seu usuário não possui acesso ativo a Leitos Aramados.");
  }
  const role = data.module_role as WireTrayModuleRole;
  if (!allowedRoles.includes(role)) {
    throw domainError("FORBIDDEN", "Seu perfil não permite executar esta operação.");
  }
  const canViewFinancials =
    role === "admin" ||
    role === "comercial" ||
    role === "faturamento" ||
    (role === "gestor" && Boolean(data.financial_access));
  return {
    id: data.id,
    userId: data.user_id,
    role,
    active: true,
    financialAccess: Boolean(data.financial_access),
    canViewFinancials,
  };
}

export function domainError(
  code: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "CONNECTION",
  message: string,
) {
  return new Error(`WIRE_TRAY_${code}:${message}`);
}

export function asNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  return 0;
}

export function asNullableNumber(value: unknown) {
  return value === null || value === undefined || value === "" ? null : asNumber(value);
}

export function normalizePage(page: number | undefined, pageSize: number | undefined) {
  const safePage = Math.max(1, Math.trunc(page ?? 1));
  const safePageSize = Math.min(100, Math.max(10, Math.trunc(pageSize ?? 25)));
  return {
    page: safePage,
    pageSize: safePageSize,
    from: (safePage - 1) * safePageSize,
    to: safePage * safePageSize - 1,
  };
}

export function unwrapRpc<T>(data: unknown): T {
  return data as T;
}
