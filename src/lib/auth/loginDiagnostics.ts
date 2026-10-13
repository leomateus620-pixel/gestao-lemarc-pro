import { supabase } from "@/integrations/supabase/client";
import { currentBuildId } from "@/lib/app/versionCheck";
import { maskEmail, summarizeUserAgent } from "./loginInput";

export type LoginFailureReport = {
  stage: string;
  errorCode: string;
  durationMs?: number;
  email?: string;
};

/** Monta o registro sem senha, token ou e-mail completo. */
export function buildLoginFailureRow(report: LoginFailureReport, env: { online: boolean; userAgent: string }) {
  return {
    stage: report.stage.slice(0, 40),
    error_code: report.errorCode.slice(0, 80),
    duration_ms: report.durationMs == null ? null : Math.max(0, Math.round(report.durationMs)),
    online: env.online,
    app_version: currentBuildId().slice(0, 40),
    user_agent: summarizeUserAgent(env.userAgent).slice(0, 80),
    email_masked: report.email ? maskEmail(report.email) : null,
  };
}

/** Registra só FALHAS de login. Nunca lança nem atrasa o login. */
export function reportLoginFailure(report: LoginFailureReport): void {
  try {
    const row = buildLoginFailureRow(report, {
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    });
    void supabase
      .from("login_diagnostics")
      .insert(row)
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    /* diagnóstico nunca interfere no login */
  }
}
