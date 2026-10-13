import { isAuthTimeout } from "./withTimeout";

export type LoginErrorKind =
  | "invalid_credentials"
  | "offline"
  | "timeout"
  | "email_not_confirmed"
  | "banned"
  | "rate_limited"
  | "google_restricted"
  | "no_module_access"
  | "unknown";

export const LOGIN_ERROR_MESSAGES: Record<LoginErrorKind, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  offline: "Sem conexão com a internet. Verifique o sinal e tente de novo.",
  timeout: "A conexão demorou demais. Verifique a internet e tente de novo.",
  email_not_confirmed: "E-mail ainda não confirmado. Fale com o administrador.",
  banned: "Esta conta está bloqueada. Fale com o administrador.",
  rate_limited: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  google_restricted:
    "Acesso pelo Google é restrito a administradores. Técnicos devem entrar com e-mail e senha.",
  no_module_access: "Sua sessão está ativa, mas ainda não possui acesso ao módulo Leitos Aramados.",
  unknown: "Não foi possível entrar. Tente novamente.",
};

export const UPPERCASE_HINT = "Confira se a primeira letra não ficou maiúscula.";
export const EDGE_SPACE_HINT = "Sua senha tem espaço no início ou no fim.";
export const CAPS_LOCK_HINT = "Caps Lock está ativado.";

/** Classifica erro de signInWithPassword sem revelar se o e-mail existe. */
export function classifySignInError(error: unknown, online = true): LoginErrorKind {
  if (isAuthTimeout(error)) return online ? "timeout" : "offline";
  if (!online) return "offline";
  const e = (error ?? {}) as { code?: unknown; status?: unknown; message?: unknown; name?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const status = typeof e.status === "number" ? e.status : 0;
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";
  const name = typeof e.name === "string" ? e.name : "";

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) return "invalid_credentials";
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) return "email_not_confirmed";
  if (code === "user_banned" || message.includes("banned")) return "banned";
  if (status === 429 || code.startsWith("over_") || message.includes("rate limit")) return "rate_limited";
  if (name === "AuthRetryableFetchError" || status === 0 && /fetch|network|load failed/.test(message)) return "offline";
  if (error instanceof TypeError && /fetch|network|load failed/i.test(String(error.message))) return "offline";
  return "unknown";
}

/** Código curto para o diagnóstico (nunca inclui dados do usuário). */
export function diagnosticErrorCode(error: unknown, kind: LoginErrorKind): string {
  const e = (error ?? {}) as { code?: unknown; status?: unknown };
  const code = typeof e.code === "string" ? e.code.slice(0, 40) : "";
  const status = typeof e.status === "number" ? `:${e.status}` : "";
  return `${kind}${code ? `/${code}` : ""}${status}`.slice(0, 80);
}
