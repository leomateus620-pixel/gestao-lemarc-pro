import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Plus } from "lucide-react";

export function EmptyOperations() {
  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.012] px-6 py-16 sm:py-20">
      {/* technical dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
        <div className="relative mb-6">
          <div
            className="absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: "color-mix(in oklab, var(--status-transit) 22%, transparent)" }}
            aria-hidden
          />
          <div
            className="grid size-20 place-items-center rounded-2xl border border-white/10 bg-[#0a0f1d] text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_36px_-20px_rgba(0,0,0,0.9)]"
          >
            <ClipboardCheck size={34} strokeWidth={1.4} />
          </div>
        </div>

        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Nenhuma OS cadastrada
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          O fluxo operacional está limpo por enquanto. Crie a primeira ordem de serviço para
          começar a acompanhar sua operação em tempo real.
        </p>

        <Link
          to="/ordens/nova"
          className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-[0_14px_30px_-12px_oklch(0.72_0.19_50/0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/95 active:translate-y-0 active:scale-[0.97]"
        >
          <Plus size={16} className="transition-transform group-hover:rotate-90" />
          <span className="text-sm tracking-wide">Cadastrar primeira OS</span>
        </Link>
      </div>
    </section>
  );
}