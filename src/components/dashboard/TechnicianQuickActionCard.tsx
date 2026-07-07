import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";

export function TechnicianQuickActionCard() {
  return (
    <Link
      to="/ordens/nova"
      aria-label="Criar nova OS"
      className="group relative flex min-h-[4.6rem] items-center gap-3 overflow-hidden rounded-[1.15rem] border border-primary/45 bg-[linear-gradient(180deg,oklch(1_0_0/0.24),transparent_42%),linear-gradient(135deg,oklch(0.84_0.18_62),oklch(0.69_0.2_47))] px-4 py-3 text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.36),inset_0_-1px_0_oklch(0_0_0/0.18),0_18px_38px_-24px_oklch(0.72_0.19_50/0.95)] transition duration-200 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,oklch(1_0_0/0.24),transparent_28%,transparent_72%,oklch(1_0_0/0.14))] opacity-75"
      />
      <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-primary-foreground/20 bg-primary-foreground/16 shadow-[inset_0_1px_0_oklch(1_0_0/0.24)] sm:size-12">
        <Plus className="size-5 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none" />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-display text-lg font-black uppercase leading-none tracking-normal sm:text-xl">
          NOVA OS
        </span>
        <span className="mt-1 block truncate text-[0.78rem] font-bold text-primary-foreground/78">
          Abrir novo atendimento
        </span>
      </span>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-primary-foreground/18 bg-primary-foreground/12 transition duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none">
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}
