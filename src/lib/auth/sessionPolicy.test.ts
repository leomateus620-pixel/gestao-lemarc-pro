import { describe, expect, it } from "vitest";
import {
  classifyAuthError,
  getLastLoginAt,
  isGoogleSession,
  isSessionTooOld,
  MAX_SESSION_AGE_MS,
  shouldBlockGoogleLogin,
} from "./sessionPolicy";
import { AuthTimeoutError } from "./withTimeout";

function jwt(payload: object) {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.sig`;
}
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 12, 12);
const mem = (map: Record<string, string> = {}) => ({ getItem: (k: string) => map[k] ?? null });

describe("regra dos 30 dias", () => {
  const sessionAt = (ms: number, method = "password") => ({
    access_token: jwt({ amr: [{ method, timestamp: Math.floor(ms / 1000) }] }),
    user: { id: "u1" },
  });

  it("29d23h ainda vale", () => {
    expect(isSessionTooOld(sessionAt(NOW - 30 * DAY + 3600_000), NOW, mem())).toBe(false);
  });
  it("30 dias exatos pede login", () => {
    expect(isSessionTooOld(sessionAt(NOW - MAX_SESSION_AGE_MS), NOW, mem())).toBe(true);
  });
  it("Google (oauth) conta igual", () => {
    expect(isSessionTooOld(sessionAt(NOW - 31 * DAY, "oauth"), NOW, mem())).toBe(true);
  });
  it("usa o login mais recente quando há vários métodos", () => {
    const s = {
      access_token: jwt({
        amr: [
          { method: "password", timestamp: Math.floor((NOW - 40 * DAY) / 1000) },
          { method: "oauth", timestamp: Math.floor((NOW - 2 * DAY) / 1000) },
          { method: "token_refresh", timestamp: Math.floor(NOW / 1000) },
        ],
      }),
      user: { id: "u1" },
    };
    expect(getLastLoginAt(s, mem())).toBe(Math.floor((NOW - 2 * DAY) / 1000) * 1000);
    expect(isSessionTooOld(s, NOW, mem())).toBe(false);
  });
  it("sem amr usa o registro do aparelho", () => {
    const s = { access_token: jwt({}), user: { id: "u1" } };
    const old = mem({ "lemarc:auth-login-at:u1": String(NOW - 31 * DAY) });
    expect(isSessionTooOld(s, NOW, old)).toBe(true);
    expect(isSessionTooOld(s, NOW, mem({ "lemarc:auth-login-at:u1": String(NOW - DAY) }))).toBe(false);
  });
  it("sem nenhuma informação não desconecta", () => {
    expect(isSessionTooOld({ access_token: "lixo", user: { id: "u1" } }, NOW, mem())).toBe(false);
  });
});

describe("classifyAuthError", () => {
  it.each([
    [{ code: "refresh_token_not_found", status: 400 }],
    [{ code: "invalid_refresh_token" }],
    [{ code: "session_not_found", status: 403 }],
    [{ name: "AuthApiError", status: 401 }],
    [{ message: "Invalid Refresh Token: Refresh Token Not Found" }],
  ])("definitivo: %o", (err) => {
    expect(classifyAuthError(err)).toBe("definitive");
  });

  it.each([
    [new AuthTimeoutError("getSession", 15000)],
    [{ name: "AuthRetryableFetchError", status: 0 }],
    [new TypeError("Failed to fetch")],
    [{ name: "AuthApiError", status: 503 }],
    [{ status: 500 }],
    [null],
  ])("transitório (não limpa): %o", (err) => {
    expect(classifyAuthError(err)).toBe("transient");
  });
});

describe("isGoogleSession", () => {
  const t = (d: number) => Math.floor((NOW - d * DAY) / 1000);
  const withAmr = (amr: object[]) => ({
    access_token: jwt({ amr }),
    user: { id: "u1", app_metadata: { provider: "email", providers: ["email", "google"] } },
  });

  it("senha com Google vinculado não é Google", () => {
    expect(isGoogleSession(withAmr([{ method: "password", timestamp: t(0) }]), mem())).toBe(false);
  });
  it("oauth é Google", () => {
    expect(isGoogleSession(withAmr([{ method: "oauth", timestamp: t(0) }]), mem())).toBe(true);
  });
  it("password antigo + oauth recente é Google", () => {
    const s = withAmr([
      { method: "password", timestamp: t(5) },
      { method: "oauth", timestamp: t(0) },
    ]);
    expect(isGoogleSession(s, mem())).toBe(true);
  });
  it("oauth antigo + password recente não é Google", () => {
    const s = withAmr([
      { method: "oauth", timestamp: t(5) },
      { method: "password", timestamp: t(0) },
      { method: "token_refresh", timestamp: t(0) },
    ]);
    expect(isGoogleSession(s, mem())).toBe(false);
  });
  it("sem amr e sem aviso não bloqueia", () => {
    expect(isGoogleSession({ access_token: jwt({}) }, mem())).toBe(false);
  });
  it("sem amr com aviso do botão Google é Google", () => {
    expect(isGoogleSession({ access_token: jwt({}) }, mem({ "lemarc:auth-google-pending": "1" }))).toBe(true);
  });
});

describe("shouldBlockGoogleLogin", () => {
  it("admin via Google permitido", () => expect(shouldBlockGoogleLogin(true, true)).toBe(false));
  it("técnico via Google bloqueado", () => expect(shouldBlockGoogleLogin(true, false)).toBe(true));
  it("senha sempre permitida", () => {
    expect(shouldBlockGoogleLogin(false, false)).toBe(false);
    expect(shouldBlockGoogleLogin(false, true)).toBe(false);
  });
});
