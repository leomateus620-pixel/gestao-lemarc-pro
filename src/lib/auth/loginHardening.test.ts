import { describe, expect, it } from "vitest";
import {
  generateStrongPassword,
  hasEdgeWhitespace,
  maskEmail,
  normalizeEmail,
  startsWithUppercase,
  summarizeUserAgent,
  validateNewPassword,
} from "./loginInput";
import { classifySignInError, diagnosticErrorCode } from "./loginErrors";
import { AuthTimeoutError } from "./withTimeout";
import { auditActionFor, checkCanManageAccess } from "./adminAccessGuard";
import { decideReload } from "@/lib/app/versionCheck";

describe("campos do login", () => {
  it("e-mail com espaço final e maiúsculas é normalizado", () => {
    expect(normalizeEmail("  LV480251@Gmail.com ")).toBe("lv480251@gmail.com");
  });
  it("senha com espaço no início/fim é detectada, não alterada", () => {
    expect(hasEdgeWhitespace("vini2026! ")).toBe(true);
    expect(hasEdgeWhitespace(" vini2026!")).toBe(true);
    expect(hasEdgeWhitespace("vini 2026!")).toBe(false);
  });
  it("detecta primeira letra maiúscula", () => {
    expect(startsWithUppercase("Vini2026!")).toBe(true);
    expect(startsWithUppercase("vini2026!")).toBe(false);
    expect(startsWithUppercase("2026!")).toBe(false);
  });
  it("mascara o e-mail sem revelar o completo", () => {
    expect(maskEmail("lv480251@gmail.com")).toBe("lv***@gmail.com");
    expect(maskEmail("a@x.com")).toBe("a***@x.com");
  });
  it("resume o navegador", () => {
    expect(summarizeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Version/17.0 Mobile Safari/604.1")).toBe("iOS Safari");
    expect(summarizeUserAgent("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36")).toBe("Android Chrome");
  });
});

describe("mensagens de erro do login", () => {
  it("cada caso tem sua classificação", () => {
    expect(classifySignInError({ code: "invalid_credentials", status: 400 })).toBe("invalid_credentials");
    expect(classifySignInError({ message: "Invalid login credentials" })).toBe("invalid_credentials");
    expect(classifySignInError({ code: "email_not_confirmed" })).toBe("email_not_confirmed");
    expect(classifySignInError({ code: "user_banned" })).toBe("banned");
    expect(classifySignInError({ status: 429, code: "over_request_rate_limit" })).toBe("rate_limited");
    expect(classifySignInError(new AuthTimeoutError("signIn", 15000))).toBe("timeout");
    expect(classifySignInError(new AuthTimeoutError("signIn", 15000), false)).toBe("offline");
    expect(classifySignInError({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" })).toBe("offline");
    expect(classifySignInError({ status: 500 })).toBe("unknown");
  });
  it("código do diagnóstico não carrega dados do usuário", () => {
    expect(diagnosticErrorCode({ code: "invalid_credentials", status: 400 }, "invalid_credentials")).toBe("invalid_credentials/invalid_credentials:400");
  });
});

describe("checagem de versão", () => {
  it("no /login recarrega na hora com versão nova", () => {
    expect(decideReload({ current: "a", remote: "b", onLogin: true, busy: true })).toBe("reload");
  });
  it("fora do login espera se houver algo em edição", () => {
    expect(decideReload({ current: "a", remote: "b", onLogin: false, busy: true })).toBe("defer");
    expect(decideReload({ current: "a", remote: "b", onLogin: false, busy: false })).toBe("reload");
  });
  it("mesma versão ou falha de rede não recarrega", () => {
    expect(decideReload({ current: "a", remote: "a", onLogin: true, busy: false })).toBe("none");
    expect(decideReload({ current: "a", remote: null, onLogin: true, busy: false })).toBe("none");
  });
});

describe("gestão de acesso pelo admin", () => {
  const base = { actorIsAdmin: true, actorUserId: "admin-1", targetUserId: "tec-1", targetIsAdmin: false };
  it("admin pode gerenciar técnico", () => {
    expect(checkCanManageAccess(base)).toBeNull();
  });
  it("não-admin é recusado", () => {
    expect(checkCanManageAccess({ ...base, actorIsAdmin: false })).not.toBeNull();
  });
  it("não pode em outro admin nem em si mesmo", () => {
    expect(checkCanManageAccess({ ...base, targetIsAdmin: true })).not.toBeNull();
    expect(checkCanManageAccess({ ...base, targetUserId: "admin-1" })).not.toBeNull();
  });
  it("colaborador sem login é recusado", () => {
    expect(checkCanManageAccess({ ...base, targetUserId: null })).not.toBeNull();
  });
  it("ação de auditoria", () => {
    expect(auditActionFor(true, true)).toBe("password_reset_and_sessions_revoked");
    expect(auditActionFor(true, false)).toBe("password_reset");
    expect(auditActionFor(false, true)).toBe("sessions_revoked");
    expect(auditActionFor(false, false)).toBeNull();
  });
  it("senha gerada é forte, começa minúscula e é válida", () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generateStrongPassword(12);
      expect(pwd).toHaveLength(12);
      expect(pwd[0]).toMatch(/[a-z]/);
      expect(pwd).toMatch(/[0-9]/);
      expect(pwd).toMatch(/[A-Z]/);
      expect(validateNewPassword(pwd)).toBeNull();
    }
  });
  it("valida senha nova", () => {
    expect(validateNewPassword("curta")).not.toBeNull();
    expect(validateNewPassword(" comespaco1")).not.toBeNull();
  });
});
