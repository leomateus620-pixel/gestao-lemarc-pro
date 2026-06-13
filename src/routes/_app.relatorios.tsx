import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { StatCard } from "@/components/app/StatCard";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Clock, DollarSign, FileDown, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Gestão Lemarc" }] }),
  component: Relatorios,
});

const dataHoras = [
  { nome: "Carlos", horas: 168 },
  { nome: "Diego", horas: 152 },
  { nome: "Felipe", horas: 174 },
  { nome: "Marcos", horas: 192 },
  { nome: "Anderson", horas: 144 },
  { nome: "Lucas", horas: 161 },
];

const dataArea = [
  { area: "Mecânica", os: 18 },
  { area: "Elétrica", os: 14 },
  { area: "Automação", os: 9 },
  { area: "Montagem", os: 11 },
  { area: "Manutenção", os: 22 },
  { area: "Instalação", os: 7 },
];

function Relatorios() {
  return (
    <AppShell title="Relatórios">
      <div className="mt-2 grid grid-cols-2 gap-3">
        <StatCard label="OS no mês" value={81} icon={Wrench} accent />
        <StatCard label="Horas totais" value="1.284" icon={Clock} />
        <StatCard label="Faturado" value="R$ 218k" hint="+18% vs mês anterior" icon={DollarSign} />
        <StatCard label="SLA atendido" value="94%" icon={TrendingUp} />
      </div>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Horas por colaborador</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mês atual</span>
        </div>
        <GlassCard className="p-3 pr-4 pt-5">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataHoras}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="nome" stroke="oklch(0.72 0.025 250)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.025 250)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                  contentStyle={{ background: "oklch(0.22 0.045 252)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 10, fontSize: 12 }}
                />
                <Bar dataKey="horas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">OS por área técnica</h2>
        </div>
        <GlassCard className="space-y-3 p-4">
          {dataArea.map((d) => {
            const max = Math.max(...dataArea.map((x) => x.os));
            const pct = (d.os / max) * 100;
            return (
              <div key={d.area}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{d.area}</span>
                  <span className="text-muted-foreground">{d.os} OS</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-glow" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </GlassCard>
      </section>

      <Button className="mt-5 h-12 w-full gap-2 shadow-[var(--shadow-glow-orange)]">
        <FileDown size={18} /> Exportar relatório consolidado
      </Button>
    </AppShell>
  );
}
