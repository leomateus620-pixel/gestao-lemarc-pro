import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { cn } from "@/lib/utils";

const LOGIN_LOGO_SRC = "/branding/lemarc-login-logo.png";

export const Route = createFileRoute("/login")({
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
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmail, setShowEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimer.current) {
        window.clearTimeout(submitTimer.current);
      }
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (!email.trim() || !password) {
      setError("Informe e-mail e senha para acessar o sistema.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    submitTimer.current = window.setTimeout(() => {
      nav({ to: "/dashboard" });
    }, 520);
  }

  return (
    <div className="lemarc-login-bg min-h-dvh">
      <LoginBackground />

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
          <LoginLogo />

          <div className="mt-6 grid w-full items-center gap-6 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12">
            <LoginIntro />

            <div className="mx-auto w-full max-w-[440px] lg:mx-0">
              <GlassLoginCard>
                <form className="space-y-5" noValidate onSubmit={handleSubmit}>
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72"
                      htmlFor="login-email"
                    >
                      E-mail
                    </label>
                    <div className="relative mt-2">
                      <Mail
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/48"
                      />
                      <Input
                        aria-describedby={error ? "login-error" : undefined}
                        aria-invalid={Boolean(error)}
                        aria-required="true"
                        autoCapitalize="none"
                        autoComplete="username"
                        className={cn(
                          "lemarc-login-input h-[3.25rem] rounded-xl border-white/12 bg-white/[0.065] pl-11 pr-12 text-[15px] font-medium text-white shadow-none placeholder:text-white/36 hover:border-white/22 focus-visible:border-orange-glow/70 focus-visible:ring-2 focus-visible:ring-orange-glow/55",
                          error && "border-red-300/45 focus-visible:ring-red-300/35",
                        )}
                        disabled={isSubmitting}
                        id="login-email"
                        inputMode="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="seuemail@empresa.com"
                        spellCheck={false}
                        type={showEmail ? "email" : "password"}
                        value={email}
                      />
                      <button
                        aria-label={showEmail ? "Ocultar e-mail" : "Mostrar e-mail"}
                        className="absolute right-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-white/58 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-glow/60 disabled:pointer-events-none disabled:opacity-45"
                        disabled={isSubmitting}
                        onClick={() => setShowEmail((current) => !current)}
                        type="button"
                      >
                        {showEmail ? (
                          <EyeOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Eye aria-hidden="true" className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-white/72"
                      htmlFor="login-password"
                    >
                      Senha
                    </label>
                    <div className="relative mt-2">
                      <LockKeyhole
                        aria-hidden="true"
                        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/48"
                      />
                      <Input
                        aria-describedby={error ? "login-error" : undefined}
                        aria-invalid={Boolean(error)}
                        aria-required="true"
                        autoComplete="current-password"
                        className={cn(
                          "lemarc-login-input h-[3.25rem] rounded-xl border-white/12 bg-white/[0.065] pl-11 pr-12 text-[15px] font-medium text-white shadow-none placeholder:text-white/36 hover:border-white/22 focus-visible:border-orange-glow/70 focus-visible:ring-2 focus-visible:ring-orange-glow/55",
                          error && "border-red-300/45 focus-visible:ring-red-300/35",
                        )}
                        disabled={isSubmitting}
                        id="login-password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Digite sua senha"
                        type={showPassword ? "text" : "password"}
                        value={password}
                      />
                      <button
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute right-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-white/58 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-glow/60 disabled:pointer-events-none disabled:opacity-45"
                        disabled={isSubmitting}
                        onClick={() => setShowPassword((current) => !current)}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Eye aria-hidden="true" className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div
                      className="flex items-start gap-2 rounded-xl border border-red-300/22 bg-red-500/10 px-3 py-2.5 text-sm font-medium leading-snug text-red-50"
                      id="login-error"
                      role="alert"
                    >
                      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <Button
                    className="lemarc-login-cta h-[3.25rem] w-full rounded-xl text-[15px] font-extrabold uppercase tracking-[0.08em] text-navy-deep disabled:opacity-70"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 aria-hidden="true" className="animate-spin" />
                        Acessando
                      </>
                    ) : (
                      <>
                        Entrar no sistema
                        <ArrowRight aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </GlassLoginCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoginBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lemarc-login-rail left-[7%] top-[18%] h-[58dvh] rotate-[18deg]" />
      <div className="lemarc-login-rail right-[11%] top-[25%] h-[48dvh] -rotate-[14deg] opacity-45" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-glow/80 to-transparent shadow-[0_0_24px_oklch(0.72_0.19_50_/_0.65)]" />
      <div className="absolute inset-x-10 bottom-8 hidden h-px bg-gradient-to-r from-transparent via-white/18 to-transparent lg:block" />
    </div>
  );
}

function LoginLogo() {
  return (
    <div className="flex w-full justify-center px-2">
      <img
        alt="Gestao Lemarc Industrial OS Digital"
        className="lemarc-login-logo h-auto max-h-[76px] w-[min(92vw,390px)] object-contain sm:max-h-[118px] sm:w-[min(82vw,610px)] lg:max-h-[148px] lg:w-[min(58vw,760px)]"
        decoding="async"
        src={LOGIN_LOGO_SRC}
      />
    </div>
  );
}

function LoginIntro() {
  return (
    <section className="mx-auto max-w-lg text-center lg:mx-0 lg:text-left">
      <div className="mx-auto mb-4 h-px w-28 bg-gradient-to-r from-transparent via-orange-glow to-transparent lg:mx-0" />
      <h1 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
        Acesse sua operação
      </h1>
      <p className="mt-3 text-sm font-medium leading-6 text-white/68 sm:text-base">
        Gestão industrial e ordens de serviço em um só lugar.
      </p>
    </section>
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
      className="lemarc-login-card lemarc-kinetic-card w-full p-5 sm:p-6"
      data-kinetic-active={physics.active ? "true" : "false"}
      ref={physics.ref}
      style={physics.style}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-glow">
          Login operacional
        </p>
        <h2 className="mt-2 font-display text-2xl font-black text-white">Bem-vindo</h2>
      </div>
      {children}
    </section>
  );
}
