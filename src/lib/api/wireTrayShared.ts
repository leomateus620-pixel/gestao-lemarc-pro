import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WireTrayModuleAccess, WireTrayModuleRole } from "@/types/wireTray";

export type WireTrayServerContext = {
  supabase: SupabaseClient<Database>;
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
  if (error) throwWireTrayDataError(error, "Não foi possível validar o acesso ao módulo.");
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

export type WireTrayDomainErrorCode =
  | "SCHEMA"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "CONNECTION"
  | "OPERATION";

export function domainError(code: WireTrayDomainErrorCode, message: string) {
  return new Error(`WIRE_TRAY_${code}:${message}`);
}

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function throwWireTrayDataError(
  error: unknown,
  fallback = "Não foi possível concluir a operação.",
): never {
  const candidate = (error ?? {}) as SupabaseErrorLike;
  const code = candidate.code ?? "";
  const technicalMessage = candidate.message ?? (error instanceof Error ? error.message : "");
  const normalized = `${code} ${technicalMessage}`.toLowerCase();

  if (import.meta.env.DEV) {
    console.error("[Leitos Aramados] Falha na camada de dados", {
      code: candidate.code ?? undefined,
      message: technicalMessage || undefined,
      details: candidate.details ?? undefined,
      hint: candidate.hint ?? undefined,
    });
  }

  if (
    /pgrst205|42p01|schema cache|relation .* does not exist|could not find the table/.test(
      normalized,
    )
  ) {
    throw domainError(
      "SCHEMA",
      "A estrutura deste módulo ainda não está disponível no banco de dados.",
    );
  }
  if (/42501|permission denied|row-level security|not authorized|jwt|forbidden/.test(normalized)) {
    throw domainError("FORBIDDEN", "Seu perfil não possui permissão para visualizar esta área.");
  }
  if (/23505|duplicate key/.test(normalized)) {
    throw domainError("CONFLICT", "Já existe um registro com estes dados.");
  }
  if (/23503|23514|22p02|validation|invalid input/.test(normalized)) {
    throw domainError("VALIDATION", "Os dados informados não são válidos para esta operação.");
  }
  if (/failed to fetch|network|econn|timeout|timed out|connection|offline/.test(normalized)) {
    throw domainError(
      "CONNECTION",
      "Não foi possível consultar os dados. Verifique a conexão e tente novamente.",
    );
  }
  throw domainError("OPERATION", fallback);
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
