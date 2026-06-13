import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { colaboradores, type Colaborador } from "@/lib/mock/colaboradores";
import { Plus, HardHat } from "lucide-react";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — Gestão Lemarc" }] }),
  component: Colaboradores,
});

const statusStyles: Record<Colaborador["status"], string> = {
  "Disponível": "bg-status-done/15 text-status-done border-status-done/30",
  "Em campo": "bg-status-running/15 text-status-running border-status-running/40",
  "Em deslocamento": "bg-status-transit/15 text-status-transit border-status-transit/30",
  "Folga": "bg-secondary text-muted-foreground border-border",
};

function Colaboradores() {
  return (
    <AppShell
      title="Equipe técnica"
      action={
        <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]">
          <Plus size={18} />
        </button>
      }
    >
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Mini label="Total" value={colaboradores.length} />
        <Mini label="Em campo" value={colaboradores.filter((c) => c.status === "Em campo").length} />
        <Mini label="Disponíveis" value={colaboradores.filter((c) => c.status === "Disponível").length} />
      </div>

      <div className="mt-4 space-y-3">
        {colaboradores.map((c) => (
          <GlassCard key={c.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 font-display text-sm font-black text-primary">
                  {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                  <HardHat size={10} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-sm font-bold text-foreground">{c.nome}</div>
                <div className="text-xs text-muted-foreground">{c.funcao} · {c.matricula}</div>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[c.status]}`}>
                {c.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">OS hoje: <span className="font-bold text-foreground">{c.osHoje}</span></span>
              <span className="text-muted-foreground">Horas no mês: <span className="font-bold text-foreground">{c.horasMes}h</span></span>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-3 text-center">
      <div className="font-display text-2xl font-black text-foreground">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </GlassCard>
  );
}
