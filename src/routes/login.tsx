import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Boxes,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { hasEdgeWhitespace, normalizeEmail, startsWithUppercase } from "@/lib/auth/loginInput";
import {
  CAPS_LOCK_HINT,
  EDGE_SPACE_HINT,
  LOGIN_ERROR_MESSAGES,
  UPPERCASE_HINT,
  classifySignInError,
  diagnosticErrorCode,
} from "@/lib/auth/loginErrors";
import { reportLoginFailure } from "@/lib/auth/loginDiagnostics";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getMyModuleAccess } from "@/lib/api/moduleAccess.functions";
import {
  moduleFromPath,
  readPreferredModule,
  safeInternalDestination,
  storePreferredModule,
  type LemarcModule,
} from "@/lib/modules";

import { isAdminAccessOpen } from "@/lib/auth/loginPresentation";

import { clearSessionAndReload, useSlowWait } from "@/components/app/SessionWaitScreen";
import {
  classifyAuthError,
  clearGooglePending,
  consumeSignOutReason,
  isGoogleSession,
  markGooglePending,
  shouldBlockGoogleLogin,
  hasLoginRecord,
  isSessionTooOld,
  markLogin,
  requestPersistentStorage,
  SIGNOUT_MESSAGES,
} from "@/lib/auth/sessionPolicy";
import {
  AUTH_TIMEOUT_MESSAGE,
  clearLocalAuthSession,
  createOnceGuard,
  isAuthTimeout,
  logAuthIssue,
  withTimeout,
} from "@/lib/auth/withTimeout";

const SIGN_IN_TIMEOUT_MS = 15_000;
const ACCESS_TIMEOUT_MS = 15_000;
const SESSION_TIMEOUT_MS = 15_000;
const INITIAL_SESSION_TIMEOUT_MS = 8_000;

const LOGIN_LOGO_SRC = "/branding/lemarc-login-logo.png";

const GOOGLE_RESTRICTED_MESSAGE =
  "Acesso pelo Google é restrito a administradores. Técnicos devem entrar com e-mail e senha.";

async function ensureGoogleAdminOrSignOut(session: {
  access_token?: string;
  user: { id: string };
}): Promise<boolean> {
  // Decide pelo método desta entrada (amr), não pelas identidades vinculadas.
  const isGoogle = isGoogleSession(session);
  clearGooglePending();
  if (!isGoogle) return true;
  const user = session.user;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (shouldBlockGoogleLogin(isGoogle, !error && Boolean(data))) {
    await supabase.auth.signOut({ scope: "local" });
    return false;
  }
  return true;
}

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: zodValidator(
    z.object({
      admin: z.preprocess((value) => value === 1 ? "1" : value, z.string().optional().catch(undefined)),
      module: z.enum(["os", "wire_trays"]).optional(),
      redirect: z
        .string()
        .max(600)
        .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Destino inválido.")
        .optional(),
    }),
  ),
  head: () => ({
    meta: [
      { title: "Entrar — Gestão Lemarc Industrial" },
      { property: "og:title", content: "Entrar — Gestão Lemarc Industrial" },
      { property: "og:description", content: "Acesse suas operações na Gestão Lemarc Industrial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Acesse suas operações na Gestão Lemarc Industrial.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const fetchAccess = useServerFn(getMyModuleAccess);
  const initialModule = search.module ?? moduleFromPath(search.redirect) ?? readPreferredModule() ?? "os";
  const [selectedModule, setSelectedModule] = useState<LemarcModule | null>(initialModule);
  const selectedModuleRef = useRef<LemarcModule | null>(initialModule);
  const [adminOpen, setAdminOpen] = useState(isAdminAccessOpen(search.admin));
  const [fieldError, setFieldError] = useState<"email" | "password" | "module" | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [passwordHint, setPasswordHint] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sessionCheck, setSessionCheck] = useState(0);
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);

  useEffect(() => {
    setAdminOpen(isAdminAccessOpen(search.admin));
  }, [search.admin]);

  useEffect(() => {
    selectedModuleRef.current = selectedModule;
  }, [selectedModule]);

  const slowWait = useSlowWait(isSubmitting);
  const finishGuard = useRef(createOnceGuard());

  const resetLoading = useCallback(() => {
    finishGuard.current.reset();
    setIsSubmitting(false);
    setGoogleLoading(false);
    setEmailLoading(false);
  }, []);

  const finishAuthentication = useCallback(
    async (session: Parameters<typeof ensureGoogleAdminOrSignOut>[0]) => {
      const user = session.user;
      // Evita rodar duas vezes (getSession + SIGNED_IN).
      if (!finishGuard.current.tryAcquire(user.id)) return;
      setIsSubmitting(true);
      const ok = await ensureGoogleAdminOrSignOut(session).catch((error) => {
        logAuthIssue("googleAdminCheck", { error });
        return true;
      });
      if (!ok) {
        reportLoginFailure({ stage: "google", errorCode: "google_restricted" });
        setError(GOOGLE_RESTRICTED_MESSAGE);
        setSessionActive(false);
        resetLoading();
        return;
      }
      setSessionActive(true);
      const module = selectedModuleRef.current;
      if (!module) {
        setError("Selecione o módulo que deseja acessar.");
        resetLoading();
        return;
      }
      const startedAt = Date.now();
      try {
        const access = await withTimeout(fetchAccess(), ACCESS_TIMEOUT_MS, "moduleAccess");
        if (module === "wire_trays" && !access.wireTrays) {
          reportLoginFailure({ stage: "moduleAccess", errorCode: "no_module_access", durationMs: Date.now() - startedAt });
          setError(LOGIN_ERROR_MESSAGES.no_module_access);
          resetLoading();
          return;
        }
        storePreferredModule(module);
        if (!hasLoginRecord(user.id)) markLogin(user.id);
        await requestPersistentStorage();
        window.location.assign(safeInternalDestination(search.redirect, module));
      } catch (cause) {
        logAuthIssue("moduleAccess", { error: cause, durationMs: Date.now() - startedAt });
        reportLoginFailure({ stage: "moduleAccess", errorCode: isAuthTimeout(cause) ? "timeout" : "module_access_error", durationMs: Date.now() - startedAt });
        setError(
          isAuthTimeout(cause)
            ? AUTH_TIMEOUT_MESSAGE
            : "Não foi possível validar os módulos autorizados. Tente novamente.",
        );
        resetLoading();
      }
    },
    [fetchAccess, search.redirect, resetLoading],
  );

  useEffect(() => {
    const reason = consumeSignOutReason();
    if (reason) setError(SIGNOUT_MESSAGES[reason]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    setSessionCheckFailed(false);
    const expire = async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (cause) {
        logAuthIssue("expiredSignOut", { error: cause });
      }
      if (!cancelled) {
        setSessionActive(false);
        setError(SIGNOUT_MESSAGES.expired_30d);
      }
    };
    withTimeout(supabase.auth.getSession(), INITIAL_SESSION_TIMEOUT_MS, "initialSession")
      .then(async ({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (cancelled || !data.session) return;
        if (isSessionTooOld(data.session)) {
          await expire();
          return;
        }
        void finishAuthentication(data.session);
      })
      .catch(async (cause) => {
        logAuthIssue("initialSession", { error: cause, durationMs: Date.now() - startedAt });
        if (classifyAuthError(cause) === "definitive") {
          // Servidor recusou a sessão: limpa só neste aparelho.
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            clearLocalAuthSession();
          }
          if (!cancelled) {
            setSessionActive(false);
            setError(SIGNOUT_MESSAGES.server_rejected);
          }
          return;
        }
        // Tempo esgotado/rede: NÃO apaga a sessão salva.
        if (!cancelled) setSessionCheckFailed(true);
      });
    // Callback síncrono; trabalho adiado para não segurar o lock do cliente.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTimeout(() => {
          if (cancelled) return;
          if (isSessionTooOld(session)) {
            void expire();
            return;
          }
          void finishAuthentication(session);
        }, 0);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [finishAuthentication, sessionCheck]);

  async function handleGoogle() {
    if (isSubmitting) return;
    setError("");
    if (!selectedModule) {
      setError("Selecione o módulo antes de continuar.");
      return;
    }
    setIsSubmitting(true);
    setGoogleLoading(true);
    markGooglePending();
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.href,
      });
      if (result.error) {
        setError("Não foi possível iniciar o login com Google. Tente novamente.");
        setIsSubmitting(false);
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      // Sessão foi definida no fluxo popup. Validação de admin acontece via
      // onAuthStateChange (SIGNED_IN) — não navegar direto aqui.
    } catch (err) {
      logAuthIssue("google", { error: err });
      setError("Erro inesperado ao acessar o sistema.");
      setIsSubmitting(false);
      setGoogleLoading(false);
    }
  }

  async function handleEmailPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setFieldError(null);
    setPasswordHint(null);

    if (!selectedModule) {
      setFieldError("module");
      document.getElementById("operation-os")?.focus();
      setError("Selecione o módulo antes de informar suas credenciais.");
      return;
    }

    const trimmedEmail = normalizeEmail(email);
    if (!trimmedEmail || !password) {
      const field = !trimmedEmail ? "email" : "password";
      setFieldError(field);
      document.getElementById(`login-${field}`)?.focus();
      setError("Informe e-mail e senha.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldError("email");
      document.getElementById("login-email")?.focus();
      setError("Digite um e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    setEmailLoading(true);
    const startedAt = Date.now();
    try {
      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email: trimmedEmail, password }),
        SIGN_IN_TIMEOUT_MS,
        "signIn",
      );
      if (signInError) {
        const kind = classifySignInError(signInError, navigator.onLine);
        if (kind !== "invalid_credentials") {
          logAuthIssue("signIn", { error: signInError, durationMs: Date.now() - startedAt });
        }
        reportLoginFailure({ stage: "signIn", errorCode: diagnosticErrorCode(signInError, kind), durationMs: Date.now() - startedAt, email: trimmedEmail });
        setError(LOGIN_ERROR_MESSAGES[kind]);
        if (kind === "invalid_credentials") {
          setPasswordHint(
            hasEdgeWhitespace(password) ? EDGE_SPACE_HINT : startsWithUppercase(password) ? UPPERCASE_HINT : null,
          );
        }
        resetLoading();
        return;
      }
      if (signInData.user) markLogin(signInData.user.id);
      clearGooglePending();
      // onAuthStateChange valida a autorização e resolve o destino do módulo.
    } catch (err) {
      logAuthIssue("signIn", { error: err, durationMs: Date.now() - startedAt });
      const kind = classifySignInError(err, navigator.onLine);
      reportLoginFailure({ stage: "signIn", errorCode: diagnosticErrorCode(err, kind), durationMs: Date.now() - startedAt, email: trimmedEmail });
      setError(
        kind === "timeout" ? AUTH_TIMEOUT_MESSAGE : kind === "unknown" ? "Erro inesperado ao acessar o sistema." : LOGIN_ERROR_MESSAGES[kind],
      );
      resetLoading();
    }
  }

  async function handleContinueSession() {
    setError("");
    if (!selectedModule) {
      setError("Selecione o módulo que deseja acessar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        "continueSession",
      );
      if (!data.session) {
        setSessionActive(false);
        resetLoading();
        return;
      }
      finishGuard.current.reset();
      await finishAuthentication(data.session);
    } catch (err) {
      logAuthIssue("continueSession", { error: err });
      // Tempo esgotado/rede: mantém a sessão salva; só a pessoa decide limpar.
      setError(AUTH_TIMEOUT_MESSAGE);
      resetLoading();
    }
  }

  async function handleSwitchAccount() {
    finishGuard.current.reset();
    try {
      await withTimeout(supabase.auth.signOut({ scope: "local" }), SESSION_TIMEOUT_MS, "signOut");
    } catch (err) {
      logAuthIssue("signOut", { error: err });
      clearLocalAuthSession();
    }
    setSessionActive(false);
    setError("");
  }

  function selectModule(module: LemarcModule) {
    setSelectedModule(module);
    storePreferredModule(module);
    setError("");
    setFieldError(null);
  }

  function updateCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") setCapsLock(event.getModifierState("CapsLock"));
  }

  const passwordNotices = [
    capsLock ? CAPS_LOCK_HINT : null,
    hasEdgeWhitespace(password) ? EDGE_SPACE_HINT : null,
    passwordHint && passwordHint !== EDGE_SPACE_HINT ? passwordHint : null,
  ].filter((notice): notice is string => Boolean(notice));

  const errorMessage = error ? (
    <div id="login-error" className="login-clean-error flex items-start gap-2 text-sm" role="alert">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  return (
    <main className="login-clean min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="login-clean-content mx-auto w-full max-w-[420px]">
        <header className="mb-7 text-center">
          <div className="login-clean-brand mx-auto mb-6 flex h-[76px] max-w-[280px] items-center justify-center">
            <img src={LOGIN_LOGO_SRC} alt="Gestão Lemarc Industrial" width="280" height="76" decoding="async" className="max-h-full w-full object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold">Entrar</h1>
        </header>

        <div className="mb-6">
          <p id="operation-label" className="mb-2 text-sm font-semibold">Operação</p>
          <div className="login-clean-segments grid grid-cols-2 gap-1 p-1" role="radiogroup" aria-labelledby="operation-label" aria-describedby={fieldError === "module" ? "login-error" : undefined}>
            <Button id="operation-os" type="button" variant="ghost" role="radio" aria-checked={selectedModule === "os"} disabled={isSubmitting} onClick={() => selectModule("os")} className="login-clean-segment h-auto min-h-12 min-w-0 gap-2 whitespace-normal px-2 py-2 text-sm leading-5" data-selected={selectedModule === "os"}>
              <Wrench aria-hidden="true" className="size-4 shrink-0" /><span>Ordens de Serviço</span>
            </Button>
            <Button type="button" variant="ghost" role="radio" aria-checked={selectedModule === "wire_trays"} disabled={isSubmitting} onClick={() => selectModule("wire_trays")} className="login-clean-segment h-auto min-h-12 min-w-0 gap-2 whitespace-normal px-2 py-2 text-sm leading-5" data-selected={selectedModule === "wire_trays"}>
              <Boxes aria-hidden="true" className="size-4 shrink-0" /><span>Leitos Aramados</span>
            </Button>
          </div>
          {fieldError === "module" ? <div className="mt-2">{errorMessage}</div> : null}
        </div>

        {sessionActive ? (
          <div className="space-y-4">
            <p className="login-clean-muted text-sm leading-6">Sua sessão está ativa. Confirme o módulo para continuar com as permissões atuais.</p>
            <Button type="button" disabled={isSubmitting || !selectedModule} onClick={handleContinueSession} className="login-clean-primary h-[52px] w-full text-base font-bold">
              {isSubmitting ? <><Loader2 aria-hidden="true" className="animate-spin" />Validando acesso...</> : "Continuar"}
            </Button>
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={handleSwitchAccount} className="login-clean-secondary min-h-12 w-full whitespace-normal">
              <LogOut aria-hidden="true" className="size-4" /> Entrar com outra conta
            </Button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleEmailPassword} noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-semibold">E-mail</Label>
              <Input id="login-email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required value={email} onChange={(event) => { setEmail(event.target.value); if (fieldError === "email") { setFieldError(null); setError(""); } }} disabled={isSubmitting} placeholder="Seu e-mail" aria-invalid={fieldError === "email"} aria-describedby={fieldError === "email" ? "login-error" : undefined} className="login-clean-input h-[52px] text-base" />
              {fieldError === "email" ? errorMessage : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-semibold">Senha</Label>
              <div className="relative">
                <Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} required value={password} onChange={(event) => { setPassword(event.target.value); setPasswordHint(null); if (fieldError === "password") { setFieldError(null); setError(""); } }} onKeyDown={updateCapsLock} onKeyUp={updateCapsLock} onBlur={() => setCapsLock(false)} disabled={isSubmitting} placeholder="Sua senha" aria-invalid={fieldError === "password"} aria-describedby={[fieldError === "password" ? "login-error" : "", passwordNotices.length ? "login-password-hints" : ""].filter(Boolean).join(" ") || undefined} className="login-clean-input h-[52px] pr-14 text-base" />
                <Button type="button" variant="ghost" size="icon" disabled={isSubmitting} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="login-clean-secondary absolute right-0.5 top-0.5 size-12">
                  {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                </Button>
              </div>
              {passwordNotices.length ? (
                <ul id="login-password-hints" className="login-clean-muted space-y-1 text-sm" aria-live="polite">
                  {passwordNotices.map((notice) => <li key={notice} className="flex items-start gap-2"><AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{notice}</li>)}
                </ul>
              ) : null}
              {fieldError === "password" ? errorMessage : null}
            </div>
            <Button type="submit" disabled={isSubmitting || !selectedModule} className="login-clean-primary h-[52px] w-full text-base font-bold">
              {emailLoading ? <><Loader2 aria-hidden="true" className="animate-spin" />Entrando...</> : isSubmitting && !googleLoading ? <><Loader2 aria-hidden="true" className="animate-spin" />Validando acesso...</> : "Entrar"}
            </Button>
          </form>
        )}

        {error && !fieldError ? <div className="mt-4">{errorMessage}</div> : null}
        {sessionCheckFailed ? (
          <div className="login-clean-notice mt-4 space-y-3 p-3 text-sm leading-6" role="status">
            <p>Não foi possível confirmar sua sessão agora. Você continua conectado neste aparelho — verifique a internet e tente de novo.</p>
            <Button type="button" variant="outline" onClick={() => setSessionCheck((value) => value + 1)} className="login-clean-secondary min-h-12 w-full">Tentar de novo</Button>
          </div>
        ) : null}
        {slowWait || sessionCheckFailed ? (
          <div className="login-clean-notice mt-4 space-y-3 p-3 text-sm leading-6" role="status">
            <p>Está demorando mais que o normal.</p>
            <Button type="button" variant="outline" onClick={clearSessionAndReload} className="login-clean-secondary min-h-12 w-full whitespace-normal">Limpar sessão e tentar de novo</Button>
          </div>
        ) : null}

        {!sessionActive ? (
          <div className="mt-5">
            <Button type="button" variant="ghost" disabled={isSubmitting} aria-expanded={adminOpen} aria-controls="login-admin-access" onClick={() => setAdminOpen((open) => !open)} className="login-clean-secondary min-h-12 w-full text-sm">
              {adminOpen ? "Voltar ao acesso padrão" : "Acesso administrador"}
            </Button>
            {adminOpen ? (
              <div id="login-admin-access" className="login-clean-admin mt-3 space-y-3 border-t pt-4">
                <p className="login-clean-muted text-center text-sm">Acesso pelo Google exclusivo de administradores.</p>
                <Button type="button" variant="outline" disabled={isSubmitting || !selectedModule} onClick={handleGoogle} className="login-clean-secondary min-h-[52px] w-full">
                  {googleLoading ? <><Loader2 aria-hidden="true" className="animate-spin" />Conectando...</> : <><GoogleIcon />Entrar com Google</>}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.4-1.07 2.59-2.27 3.39v2.81h3.67c2.15-1.98 3.62-4.9 3.62-8.44z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.67-2.81c-1.02.69-2.33 1.1-4.26 1.1-3.27 0-6.04-2.21-7.03-5.19H1.18v3.26C3.15 21.32 7.27 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M4.97 14.19c-.25-.74-.39-1.53-.39-2.34 0-.82.14-1.61.39-2.34V6.25H1.18A11.97 11.97 0 0 0 0 11.85c0 1.94.46 3.77 1.18 5.6l3.79-3.26z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.25-3.25C17.95 1.4 15.24.25 12 .25 7.27.25 3.15 2.93 1.18 6.85l3.79 3.26C5.96 7.13 8.73 4.75 12 4.75z"
      />
    </svg>
  );
}
