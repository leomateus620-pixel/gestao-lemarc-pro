import { Link } from "@tanstack/react-router";
import { ClipboardPlus } from "lucide-react";

export function EmptyOperations() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
      <ClipboardPlus className="mx-auto text-primary" size={28} />
      <p className="mt-2 font-display text-sm font-black uppercase tracking-[0.16em] text-foreground">
        Nenhuma OS cadastrada ainda
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Crie a primeira ordem de serviço para começar a ver métricas reais aqui.
      </p>
      <Link
        to="/ordens/nova"
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-display text-xs font-black uppercase tracking-[0.16em] text-primary-foreground shadow-[0_0_24px_var(--primary)]"
      >
        <ClipboardPlus size={14} />
        Nova OS
      </Link>
    </div>
  );
}