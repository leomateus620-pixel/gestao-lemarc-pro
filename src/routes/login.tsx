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
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";

import { ServiceOrderProgressCard } from "@/components/login/ServiceOrderProgressCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
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

const LOGIN_LOGO_SRC = "/branding/lemarc-login-logo.png";

const GOOGLE_RESTRICTED_MESSAGE =
  "Acesso pelo Google é restrito a administradores. Técnicos devem entrar com e-mail e senha.";

async function ensureGoogleAdminOrSignOut(user: {
  id: string;
  app_metadata?: { provider?: string; providers?: string[] } | null;
}): Promise<boolean> {
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers ?? [];
  const isGoogle = provider === "google" || providers.includes("google");
  if (!isGoogle) return true;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    await supabase.auth.signOut();
    return false;
  }
  return true;
}

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: zodValidator(
    z.object({
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
      { title: "Entrar - Gestao Lemarc" },
      {
        name: "description",
        content: "Acesse o sistema de ordens de servico da Lemarc Industrial.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const fetchAccess = useServerFn(getMyModuleAccess);
  const initialModule = search.module ?? moduleFromPath(search.redirect) ?? readPreferredModule();
  const [selectedModule, setSelectedModule] = useState<LemarcModule | null>(initialModule);
  const selectedModuleRef = useRef<LemarcModule | null>(initialModule);
  const [sessionActive, setSessionActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    selectedModuleRef.current = selectedModule;
  }, [selectedModule]);

  const finishAuthentication = useCallback(
    async (user: Parameters<typeof ensureGoogleAdminOrSignOut>[0]) => {
      const ok = await ensureGoogleAdminOrSignOut(user);
      if (!ok) {
        setError(GOOGLE_RESTRICTED_MESSAGE);
        setSessionActive(false);
        setIsSubmitting(false);
        setGoogleLoading(false);
        setEmailLoading(false);
        return;
      }
      setSessionActive(true);
      const module = selectedModuleRef.current;
      if (!module) {
        setError("Selecione o módulo que deseja acessar.");
        setIsSubmitting(false);
        setGoogleLoading(false);
        setEmailLoading(false);
        return;
      }
      try {
        const access = await fetchAccess();
        if (module === "wire_trays" && !access.wireTrays) {
          setError("Sua sessão está ativa, mas ainda não possui acesso ao módulo Leitos Aramados.");
          setIsSubmitting(false);
          setGoogleLoading(false);
          setEmailLoading(false);
          return;
        }
        storePreferredModule(module);
        window.location.assign(safeInternalDestination(search.redirect, module));
      } catch (cause) {
        console.error(cause);
        setError("Não foi possível validar os módulos autorizados. Tente novamente.");
        setIsSubmitting(false);
        setGoogleLoading(false);
        setEmailLoading(false);
      }
    },
    [fetchAccess, search.redirect],
  );

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      if (!cancelled) await finishAuthentication(data.session.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        void (async () => {
          if (!cancelled) await finishAuthentication(session.user);
        })();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [finishAuthentication]);

  async function handleGoogle() {
    if (isSubmitting) return;
    setError("");
    if (!selectedModule) {
      setError("Selecione o módulo antes de continuar.");
      return;
    }
    setIsSubmitting(true);
    setGoogleLoading(true);
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
      console.error(err);
      setError("Erro inesperado ao acessar o sistema.");
      setIsSubmitting(false);
      setGoogleLoading(false);
    }
  }

  async function handleEmailPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (!selectedModule) {
      setError("Selecione o módulo antes de informar suas credenciais.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Informe e-mail e senha.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Digite um e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    setEmailLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        const msg = signInError.message?.toLowerCase() ?? "";
        if (msg.includes("invalid login credentials")) {
          setError("E-mail ou senha inválidos.");
        } else if (msg.includes("email not confirmed")) {
          setError("E-mail ainda não confirmado. Fale com o administrador.");
        } else {
          setError("Não foi possível entrar. Tente novamente.");
        }
        setIsSubmitting(false);
        setEmailLoading(false);
        return;
      }
      // onAuthStateChange valida a autorização e resolve o destino do módulo.
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao acessar o sistema.");
      setIsSubmitting(false);
      setEmailLoading(false);
    }
  }

  async function handleContinueSession() {
    setError("");
    if (!selectedModule) {
      setError("Selecione o módulo que deseja acessar.");
      return;
    }
    setIsSubmitting(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setSessionActive(false);
      setIsSubmitting(false);
      return;
    }
    await finishAuthentication(data.session.user);
  }

  async function handleSwitchAccount() {
    await supabase.auth.signOut();
    setSessionActive(false);
    setError("");
  }

  return (
    <div className="lemarc-login-bg min-h-dvh">
      <LoginBackground />

      <main className="lemarc-login-main relative z-10 flex min-h-dvh items-center justify-center px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
        <div className="mx-auto grid w-full max-w-[1216px] items-center gap-6 md:gap-8 lg:min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[minmax(0,1.16fr)_minmax(390px,0.84fr)] lg:gap-12 xl:gap-16">
          <section className="lemarc-login-enter flex min-w-0 flex-col items-center lg:items-start">
            <LoginLogo />

            <div className="mt-3 hidden max-w-[560px] items-center gap-3 text-sm font-medium leading-6 text-white/58 lg:flex">
              <span className="h-px w-10 shrink-0 bg-gradient-to-r from-orange-glow to-orange-glow/20" />
              <span>Operação industrial conectada, do chamado à expedição.</span>
            </div>

            <ServiceOrderProgressCard className="mt-4 w-full max-w-[660px] sm:mt-5 lg:mt-7" />
          </section>

          <section className="lemarc-login-enter lemarc-login-enter-delay-1 mx-auto w-full max-w-[452px] lg:mx-0 lg:justify-self-end">
            <LoginIntro />

            <GlassLoginCard>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/58">
                    Escolha a operação
                  </p>
                  <div
                    className="mt-2 grid grid-cols-2 gap-2"
                    role="radiogroup"
                    aria-label="Módulo de acesso"
                  >
                    <ModuleCard
                      selected={selectedModule === "os"}
                      icon={<Wrench size={18} />}
                      title="Ordens de Serviço"
                      description="Campo e assistência"
                      onClick={() => {
                        setSelectedModule("os");
                        setError("");
                      }}
                    />
                    <ModuleCard
                      selected={selectedModule === "wire_trays"}
                      icon={<Boxes size={18} />}
                      title="Leitos Aramados"
                      description="Pedidos e fábrica"
                      onClick={() => {
                        setSelectedModule("wire_trays");
                        setError("");
                      }}
                    />
                  </div>
                </div>

                {sessionActive ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-3 text-sm leading-6 text-emerald-50">
                      Sua sessão está ativa. Confirme o módulo para continuar com as permissões
                      atuais.
                    </div>
                    <Button
                      type="button"
                      disabled={isSubmitting || !selectedModule}
                      onClick={handleContinueSession}
                      className="h-12 w-full rounded-xl bg-orange-glow text-[15px] font-bold text-navy-deep hover:brightness-110"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" /> Validando acesso...
                        </>
                      ) : (
                        "Continuar"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSwitchAccount}
                      className="h-10 w-full gap-2 text-white/70 hover:bg-white/8 hover:text-white"
                    >
                      <LogOut size={15} /> Entrar com outra conta
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-6 text-white/72">
                      Técnicos acessam com e-mail e senha. Contas corporativas Google também são
                      aceitas.
                    </p>

                    <form className="space-y-3" onSubmit={handleEmailPassword} noValidate>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="login-email"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-white/62"
                        >
                          E-mail
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          inputMode="email"
                          autoComplete="username"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="tecnico@lemarc.com.br"
                          className="h-11 rounded-xl border-white/10 bg-white/[0.045] text-white placeholder:text-white/32 focus-visible:border-orange-glow/60 focus-visible:ring-orange-glow/30"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="login-password"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-white/62"
                        >
                          Senha
                        </Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Sua senha"
                            className="h-11 rounded-xl border-white/10 bg-white/[0.045] pr-11 text-white placeholder:text-white/32 focus-visible:border-orange-glow/60 focus-visible:ring-orange-glow/30"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            disabled={isSubmitting}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/58 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting || !selectedModule}
                        className="h-[3rem] w-full rounded-xl bg-orange-glow text-[15px] font-bold text-navy-deep transition hover:brightness-110 disabled:opacity-70"
                      >
                        {emailLoading ? (
                          <>
                            <Loader2 aria-hidden="true" className="animate-spin" />
                            Entrando...
                          </>
                        ) : (
                          "Entrar"
                        )}
                      </Button>
                    </form>

                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/40">
                        ou
                      </span>
                      <span className="h-px flex-1 bg-white/10" />
                    </div>

                    <Button
                      className="lemarc-login-google h-[3.25rem] w-full rounded-xl bg-white text-[15px] font-bold text-navy-deep disabled:opacity-70"
                      disabled={isSubmitting || !selectedModule}
                      onClick={handleGoogle}
                      type="button"
                    >
                      {googleLoading ? (
                        <>
                          <Loader2 aria-hidden="true" className="animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <GoogleIcon />
                          Entrar com Google
                        </>
                      )}
                    </Button>
                  </>
                )}

                {error ? (
                  <div
                    className="flex items-start gap-2 rounded-xl border border-red-300/22 bg-red-500/10 px-3 py-2.5 text-sm font-medium leading-snug text-red-50"
                    role="alert"
                  >
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-xs leading-relaxed text-white/58">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-orange-glow"
                  />
                  <span>
                    Ambiente protegido. Sua sessão é criptografada e os acessos ficam registrados na
                    central operacional Lemarc.
                  </span>
                </div>
              </div>
            </GlassLoginCard>
          </section>
        </div>
      </main>
    </div>
  );
}

function ModuleCard({
  selected,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`min-w-0 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-orange-glow/70 bg-orange-glow/12 shadow-[inset_0_0_0_1px_oklch(0.78_0.18_55/0.18)]"
          : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`grid size-8 place-items-center rounded-lg ${selected ? "bg-orange-glow text-navy-deep" : "bg-white/8 text-white/70"}`}
      >
        {icon}
      </span>
      <span className="mt-2 block truncate text-xs font-bold text-white">{title}</span>
      <span className="mt-0.5 block truncate text-[10px] text-white/50">{description}</span>
    </button>
  );
}

function LoginBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lemarc-login-rail left-[7%] top-[18%] h-[58dvh] rotate-[18deg]" />
      <div className="lemarc-login-rail right-[11%] top-[25%] h-[48dvh] -rotate-[14deg] opacity-45" />
      <div className="lemarc-login-orbit left-[8%] top-[18%] size-[22rem] sm:size-[32rem]" />
      <div className="lemarc-login-orbit -right-[16rem] bottom-[-18rem] size-[42rem] opacity-45" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-glow/80 to-transparent shadow-[0_0_24px_oklch(0.72_0.19_50_/_0.65)]" />
      <div className="absolute inset-x-10 bottom-8 hidden h-px bg-gradient-to-r from-transparent via-white/18 to-transparent lg:block" />
    </div>
  );
}

function LoginLogo() {
  return (
    <div className="flex w-full justify-center px-2 lg:justify-start lg:px-0">
      <img
        alt="Gestao Lemarc Industrial OS Digital"
        className="lemarc-login-logo h-auto max-h-[68px] w-[min(88vw,350px)] object-contain sm:max-h-[96px] sm:w-[min(74vw,460px)] lg:max-h-[108px] lg:w-[min(40vw,500px)] xl:w-[520px]"
        decoding="async"
        src={LOGIN_LOGO_SRC}
      />
    </div>
  );
}

function LoginIntro() {
  return (
    <header className="mb-4 text-center sm:mb-5 lg:text-left">
      <div className="mb-3 flex items-center justify-center gap-2 lg:justify-start">
        <span className="size-1.5 rounded-full bg-orange-glow shadow-[0_0_12px_oklch(0.78_0.18_55/0.9)]" />
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/48">
          Central operacional
        </span>
      </div>
      <h1 className="font-display text-[1.85rem] font-black leading-[1.08] text-white sm:text-4xl lg:text-[2.8rem]">
        Acesse sua operação
      </h1>
      <p className="mx-auto mt-2 max-w-[28rem] text-sm font-medium leading-6 text-white/62 sm:mt-3 sm:text-base lg:mx-0">
        Gestão industrial clara, segura e pronta para o ritmo da equipe.
      </p>
    </header>
  );
}

function GlassLoginCard({ children }: { children: ReactNode }) {
  const physics = usePhysicsCard<HTMLDivElement>({
    lift: -4,
    maxRotate: 4,
    mobileMaxRotate: 1,
    perspective: 1400,
  });

  return (
    <section
      className="lemarc-login-card lemarc-kinetic-card w-full p-5 sm:p-6 lg:p-7"
      data-kinetic-active={physics.active ? "true" : "false"}
      ref={physics.ref}
      style={physics.style}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" />
      <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-orange-glow">
            Login operacional
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-black text-white">Bem-vindo</h2>
        </div>
        <div
          aria-hidden="true"
          className="mt-1 flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-emerald-200/80"
        >
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_oklch(0.78_0.15_155/0.8)]" />
          Seguro
        </div>
      </div>
      {children}
    </section>
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
