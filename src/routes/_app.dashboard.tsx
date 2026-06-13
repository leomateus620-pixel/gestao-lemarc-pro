import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { GlassCard } from "@/components/app/GlassCard";
import { OrderCard } from "@/components/app/OrderCard";
import { useRole } from "@/components/app/RoleContext";
import { ordens, ordensStats } from "@/lib/mock/serviceOrders";
import { ClipboardList, Activity, CheckCircle2, Clock, Plus, Play, MapPin, Building2, Receipt, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Gestão Lemarc" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { role, name } = useRole();
  return (
    <AppShell>
      {role === "gestor" ? <GestorView name={name} /> : <ColaboradorView name={name} />}
    </AppShell>
  );
}

function GestorView({ name }: { name: string }) {
  const recentes = ordens.slice(0, 4);
  return (
    <>
      <section className="mt-2">
        <p className="text-xs text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="font-display text-2xl font-black text-foreground">{name.split(" ")[0]} {name.split(" ")[1]}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">Painel do gestor · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard label="OS abertas" value={ordensStats.abertas} icon={ClipboardList} accent />
        <StatCard label="Em execução" value={ordensStats.emExecucao} icon={Activity} />
        <StatCard label="Aguard. revisão" value={ordensStats.aguardandoRevisao} icon={AlertTriangle} />
        <StatCard label="Horas no mês" value={ordensStats.horasMes} hint="+12% vs anterior" icon={Clock} />
        <StatCard label="Valor estimado" value={`R$ ${Math.round(ordensStats.valorEstimado/1000)}k`} icon={Receipt} accent />
      </section>

      <GlassCard className="mt-4 border-status-review/30 bg-status-review/10 p-4">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-status-review" size={20} /><div><div className="font-display text-sm font-black uppercase tracking-wider text-foreground">{ordensStats.aguardandoRevisao} OS pendentes de revisão</div><p className="mt-1 text-xs text-muted-foreground">Finalize a aprovação para liberar cobrança e relatório para o cliente.</p></div></div>
      </GlassCard>

      <Link to="/ordens/nova" className="mt-4 block">
        <GlassCard className="flex items-center gap-3 border-primary/40 bg-primary/10 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]">
            <Plus size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Nova ordem de serviço</div>
            <div className="text-xs text-muted-foreground">Cliente · Unidade · Colaborador</div>
          </div>
        </GlassCard>
      </Link>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Ordens recentes</h2>
          <Link to="/ordens" className="text-xs font-semibold text-primary">Ver todas</Link>
        </div>
        <div className="space-y-3">
          {recentes.map((o) => <OrderCard key={o.id} ordem={o} />)}
        </div>
      </section>
    </>
  );
}

function ColaboradorView({ name }: { name: string }) {
  const minhas = ordens.filter((o) => o.colaborador === "Carlos Henrique Silva");
  const proxima = minhas[0] ?? ordens[0];

  return (
    <>
      <section className="mt-2">
        <p className="text-xs text-muted-foreground">Bom dia,</p>
        <h1 className="font-display text-2xl font-black text-foreground">{name.split(" ")[0]}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{minhas.length} ordens para hoje</p>
      </section>

      <GlassCard className="mt-5 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Próxima OS</div>
          <h2 className="mt-1 font-display text-lg font-bold leading-tight text-foreground">{proxima.titulo}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 size={12} />{proxima.cliente}</span>
            <span className="flex items-center gap-1"><MapPin size={12} />{proxima.unidade}</span>
          </div>
          <div className="mt-3"><StatusBadge status={proxima.status} /></div>
        </div>
        <div className="p-4 pt-0">
          <Link to="/ordens/$id" params={{ id: proxima.id }}>
            <Button className="h-14 w-full gap-2 text-base font-bold uppercase tracking-wider shadow-[var(--shadow-glow-orange)]">
              <Play size={20} fill="currentColor" /> Iniciar ordem de serviço
            </Button>
          </Link>
        </div>
      </GlassCard>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Minhas ordens hoje</h2>
          <Link to="/ordens" className="text-xs font-semibold text-primary">Ver todas</Link>
        </div>
        <div className="space-y-3">
          {minhas.map((o) => <OrderCard key={o.id} ordem={o} />)}
        </div>
      </section>
    </>
  );
}
