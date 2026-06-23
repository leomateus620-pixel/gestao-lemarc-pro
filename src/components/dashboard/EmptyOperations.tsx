import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Plus } from "lucide-react";

export function EmptyOperations() {
  return (
    <section className="lemarc-wizard-card relative mt-5 px-6 py-14 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, oklch(1 0 0 / 0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="grid size-[4.5rem] place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_16px_34px_-24px_oklch(0.72_0.19_50/0.55)]">
          <ClipboardCheck size={32} strokeWidth={1.6} />
        </div>

        <h3 className="mt-5 font-display text-xl font-black tracking-tight text-foreground">
          Nenhuma OS cadastrada
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          A operação está limpa no período selecionado. Crie a primeira ordem de serviço para
          acompanhar fila, campo, revisão e fechamento em tempo real.
        </p>

        <Link
          to="/ordens/nova"
          className="lemarc-orange-glow mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-xs font-black uppercase tracking-[0.14em] text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/95 active:translate-y-0 active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Cadastrar primeira OS
        </Link>
      </div>
    </section>
  );
}
