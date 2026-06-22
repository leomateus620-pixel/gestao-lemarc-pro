import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const LOGIN_LOGO_SRC = "/branding/lemarc-login-logo.png";

export const Route = createFileRoute("/login")({
  ssr: false,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        nav({ to: "/dashboard", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  async function handleGoogle() {
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Não foi possível iniciar o login com Google. Tente novamente.");
        setIsSubmitting(false);
        return;
      }
      if (result.redirected) return;
      nav({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      setError("Erro inesperado ao acessar o sistema.");
      setIsSubmitting(false);
    }
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
                <div className="space-y-5">
                  <p className="text-sm leading-6 text-white/72">
                    Acesso exclusivo para colaboradores Lemarc Industrial.
                    Entre com sua conta Google corporativa para abrir suas ordens
                    de serviço.
                  </p>

                  <Button
                    className="h-[3.25rem] w-full rounded-xl bg-white text-[15px] font-bold text-navy-deep shadow-lg hover:bg-white/95 disabled:opacity-70"
                    disabled={isSubmitting}
                    onClick={handleGoogle}
                    type="button"
                  >
                    {isSubmitting ? (
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

                  {error ? (
                    <div
                      className="flex items-start gap-2 rounded-xl border border-red-300/22 bg-red-500/10 px-3 py-2.5 text-sm font-medium leading-snug text-red-50"
                      role="alert"
                    >
                      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs leading-snug text-white/60">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-orange-glow" />
                    <span>
                      Sua sessão é criptografada e fica salva apenas neste
                      dispositivo. Os acessos ficam registrados na central
                      operacional Lemarc.
                    </span>
                  </div>
                </div>
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
