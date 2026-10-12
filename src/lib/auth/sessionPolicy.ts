import { isAuthTimeout } from "./withTimeout";

export const MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_AT_PREFIX = "lemarc:auth-login-at:";
const SIGNOUT_REASON_KEY = "lemarc:auth-signout-reason";

export type AuthErrorKind = "definitive" | "transient";
export type SignOutReason = "expired_30d" | "server_rejected";

export const SIGNOUT_MESSAGES: Record<SignOutReason, string> = {
  expired_30d: "Por segurança, entre novamente.",
  server_rejected: "Sua sessão expirou. Entre novamente.",
};

const DEFINITIVE_CODES = new Set([
  "refresh_token_not_found",
  "invalid_refresh_token",
  "refresh_token_already_used",
  "session_not_found",
  "session_expired",
  "bad_jwt",
  "user_not_found",
  "user_banned",
]);

/**
 * Só é "definitive" quando o servidor de login recusou a sessão de verdade.
 * Tempo esgotado, falta de rede, 5xx e erros reenviáveis são "transient" —
 * nesses casos a sessão local NUNCA é apagada.
 */
export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!error) return "transient";
  if (isAuthTimeout(error)) return "transient";
  const e = error as { name?: string; code?: string; status?: number; message?: string };
  if (e.name === "AuthRetryableFetchError") return "transient";
  if (e.name === "TypeError") return "transient"; // fetch falhou (offline)
  if (e.code && DEFINITIVE_CODES.has(e.code)) return "definitive";
  const status = typeof e.status === "number" ? e.status : 0;
  if (status === 400 || status === 401 || status === 403) return "definitive";
  const msg = (e.message ?? "").toLowerCase();
  if (/invalid refresh token|refresh token not found|session.*not found/.test(msg)) {
    return "definitive";
  }
  return "transient";
}

const LOGIN_METHODS = new Set(["password", "oauth", "sso/saml", "otp", "magiclink", "email/signup"]);

function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Horário (ms) do último login com senha/Google: amr do token ou registro local. */
export function getLastLoginAt(
  session: { access_token?: string; user?: { id?: string } } | null | undefined,
  storage: Pick<Storage, "getItem"> | null = safeLocalStorage(),
): number | null {
  if (!session) return null;
  const payload = decodeJwtPayload(session.access_token);
  const amr = Array.isArray(payload?.amr) ? (payload!.amr as Array<{ method?: string; timestamp?: number }>) : [];
  let latest = 0;
  for (const entry of amr) {
    if (entry?.method && LOGIN_METHODS.has(entry.method) && typeof entry.timestamp === "number") {
      latest = Math.max(latest, entry.timestamp * 1000);
    }
  }
  if (latest > 0) return latest;
  const userId = session.user?.id;
  if (!userId || !storage) return null;
  const raw = storage.getItem(LOGIN_AT_PREFIX + userId);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isSessionTooOld(
  session: Parameters<typeof getLastLoginAt>[0],
  now = Date.now(),
  storage: Pick<Storage, "getItem"> | null = safeLocalStorage(),
): boolean {
  const at = getLastLoginAt(session, storage);
  if (at === null) return false; // sem informação: não desconecta
  return now - at >= MAX_SESSION_AGE_MS;
}

export function markLogin(userId: string, now = Date.now()) {
  try {
    safeLocalStorage()?.setItem(LOGIN_AT_PREFIX + userId, String(now));
  } catch {
    /* ignora */
  }
}

export function setSignOutReason(reason: SignOutReason) {
  try {
    sessionStorage.setItem(SIGNOUT_REASON_KEY, reason);
  } catch {
    /* ignora */
  }
}

export function consumeSignOutReason(): SignOutReason | null {
  try {
    const value = sessionStorage.getItem(SIGNOUT_REASON_KEY);
    sessionStorage.removeItem(SIGNOUT_REASON_KEY);
    return value === "expired_30d" || value === "server_rejected" ? value : null;
  } catch {
    return null;
  }
}

export async function requestPersistentStorage() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
    if (await navigator.storage.persisted?.()) return;
    await navigator.storage.persist();
  } catch {
    /* sem suporte */
  }
}

/** Liga a renovação automática só com o app visível. Retorna função de limpeza. */
export function startVisibilityAutoRefresh(
  auth: { startAutoRefresh: () => Promise<void>; stopAutoRefresh: () => Promise<void> },
  onVisible?: () => void,
) {
  if (typeof document === "undefined") return () => {};
  const apply = () => {
    if (document.visibilityState === "visible") {
      void auth.startAutoRefresh();
      onVisible?.();
    } else {
      void auth.stopAutoRefresh();
    }
  };
  document.addEventListener("visibilitychange", apply);
  if (document.visibilityState === "visible") void auth.startAutoRefresh();
  return () => document.removeEventListener("visibilitychange", apply);
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function hasLocalAuthSession(): boolean {
  const ls = safeLocalStorage();
  if (!ls) return false;
  for (let i = 0; i < ls.length; i++) {
    const key = ls.key(i);
    if (key && /^sb-.+-auth-token$/.test(key)) return true;
  }
  return false;
}
