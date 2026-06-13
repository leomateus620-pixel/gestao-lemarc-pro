import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { clientes } from "@/lib/mock/clientes";
import { Phone, MapPin, Plus, Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Lemarc" }] }),
  component: Clientes,
});

function Clientes() {
  return (
    <AppShell
      title="Clientes"
      action={
        <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]">
          <Plus size={18} />
        </button>
      }
    >
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Stat label="Clientes ativos" value={clientes.length} />
        <Stat label="OS ativas" value={clientes.reduce((s, c) => s + c.osAtivas, 0)} />
      </div>

      <div className="mt-4 space-y-3">
        {clientes.map((c) => (
          <GlassCard key={c.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-sm font-black text-primary">
                {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-bold text-foreground">{c.nome}</div>
                <div className="text-xs text-muted-foreground">{c.segmento}</div>
              </div>
              {c.osAtivas > 0 && (
                <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {c.osAtivas} OS
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Building2 size={12} className="text-primary" />{c.unidades.length} unidade(s) · {c.unidades.join(", ")}</div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-primary" />{c.cidade}</div>
              <div className="flex items-center gap-2"><Phone size={12} className="text-primary" />{c.contato} · {c.telefone}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-black text-foreground">{value}</div>
    </GlassCard>
  );
}
