import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/app/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, HardHat, Wrench } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Gestão Lemarc" },
      { name: "description", content: "Acesse o sistema de ordens de serviço da Lemarc Industrial." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  return (
    <div className="blueprint-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <div className="flex justify-center"><Logo size="lg" /></div>

        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
            <ShieldCheck size={12} /> Lemarc Industrial
          </div>
          <h1 className="mt-4 font-display text-2xl font-black leading-tight text-foreground">
            Ordens de serviço<br />direto do campo.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mecânica · Elétrica · Automação · Montagem
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); nav({ to: "/dashboard" }); }}
          className="glass mt-8 space-y-4 rounded-2xl p-5"
        >
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">E-mail ou matrícula</label>
            <Input
              defaultValue="ricardo@lemarc.com.br"
              className="mt-1.5 h-12 border-border bg-secondary/60 text-foreground"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Senha</label>
            <Input
              type="password"
              defaultValue="••••••••"
              className="mt-1.5 h-12 border-border bg-secondary/60 text-foreground"
            />
          </div>

          <Button type="submit" className="h-12 w-full text-base font-bold uppercase tracking-wider shadow-[var(--shadow-glow-orange)]">
            Entrar
          </Button>

          <button type="button" className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
            Esqueci minha senha
          </button>
        </form>

        <div className="mt-auto flex items-center justify-center gap-6 pt-8 text-muted-foreground/70">
          <HardHat size={16} />
          <Wrench size={16} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em]">v1.0 · Demo</span>
        </div>
      </div>
    </div>
  );
}
