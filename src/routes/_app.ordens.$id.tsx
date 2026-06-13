import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { StatusBadge, type OrderStatus } from "@/components/app/StatusBadge";
import { PriorityBadge } from "@/components/app/PriorityBadge";
import { Timeline } from "@/components/app/Timeline";
import { PhotoGrid } from "@/components/app/PhotoGrid";
import { BigActionButton } from "@/components/app/BigActionButton";
import { SectionHeader } from "@/components/app/SectionHeader";
import { useRole } from "@/components/app/RoleContext";
import { getOrdem, type Ordem } from "@/lib/mock/serviceOrders";
import { Building2, Camera, CheckCircle2, Clock, FileText, HardHat, MapPin, Package, Pause, Play, Receipt, Send, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/ordens/$id")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Gestão Lemarc` }] }),
  loader: ({ params }) => { const o = getOrdem(params.id); if (!o) throw notFound(); return { ordem: o }; },
  component: OrdemDetalhe,
  notFoundComponent: () => <AppShell title="OS não encontrada" back><div className="mt-8 text-center text-sm text-muted-foreground">Esta ordem não existe.</div></AppShell>,
});

const flow: Record<OrderStatus, { label: string; next: OrderStatus; icon: typeof Truck }> = {
  pending: { label: "Iniciar deslocamento", next: "transit", icon: Truck },
  transit: { label: "Iniciar serviço", next: "running", icon: Play },
  running: { label: "Pausar / finalizar serviço", next: "finished", icon: Pause },
  finished: { label: "Enviar para revisão", next: "review", icon: Send },
  review: { label: "Aprovar para cobrança", next: "approved", icon: Receipt },
  approved: { label: "Aprovada para cobrança", next: "approved", icon: CheckCircle2 },
};
const order: OrderStatus[] = ["pending", "transit", "running", "finished", "review", "approved"];
const labels = ["OS criada pelo gestor", "Deslocamento iniciado", "Serviço iniciado no local", "Serviço finalizado pelo técnico", "Enviado para revisão", "Aprovada para cobrança"];

function OrdemDetalhe() {
  const { ordem } = Route.useLoaderData() as { ordem: Ordem };
  const { role } = useRole();
  const [status, setStatus] = useState<OrderStatus>(ordem.status);
  const [events, setEvents] = useState(ordem.timeline);
  const action = flow[status];
  const valor = (ordem.tempoTrabalhadoMin / 60) * ordem.valorHora;

  const timeline = useMemo(() => {
    const idx = order.indexOf(status);
    return labels.map((etapa, i) => events[i] ?? { etapa, hora: i <= idx ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—", concluida: i <= idx });
  }, [status, events]);

  function advance() {
    if (status === "approved") return;
    const next = action.next;
    const idx = order.indexOf(next);
    setStatus(next);
    setEvents((old) => labels.map((etapa, i) => old[i] && old[i].concluida ? old[i] : { etapa, hora: i <= idx ? new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—", concluida: i <= idx }));
  }

  return <AppShell title={`OS #${ordem.numero}`} back>
    <GlassCard className="industrial-gradient mt-2 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{ordem.area}</p><h1 className="mt-1 font-display text-xl font-black leading-tight text-foreground">OS #{ordem.numero} · {ordem.titulo}</h1></div><StatusBadge status={status} /></div>
      <div className="mt-3 flex flex-wrap gap-2"><PriorityBadge prioridade={ordem.prioridade} /><span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{ordem.data} · {ordem.horario}</span></div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground"><Meta icon={Building2}>{ordem.cliente} · {ordem.unidade}</Meta><Meta icon={MapPin}>{ordem.local} · {ordem.distanciaKm} km</Meta><Meta icon={User}>{ordem.colaborador}</Meta></div>
    </GlassCard>

    <Section title="Resumo do serviço" icon={FileText}><p className="text-sm leading-relaxed text-foreground">{ordem.descricao}</p></Section>
    <Section title="Dados do cliente" icon={Building2}><div className="grid gap-2 text-sm"><Row k="Cliente" v={ordem.cliente} /><Row k="Unidade" v={ordem.unidade} /><Row k="Área" v={ordem.local} /></div></Section>
    <Section title="Colaborador / equipe" icon={HardHat}><div className="text-sm font-bold text-foreground">{ordem.colaborador}</div><div className="mt-2 flex flex-wrap gap-2">{ordem.equipe.map((e) => <span key={e} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{e}</span>)}</div></Section>
    <Section title="Linha do tempo operacional" icon={Clock}><Timeline items={timeline} /></Section>
    <Section title={`Fotos mockadas (${ordem.fotos})`} icon={Camera}><PhotoGrid count={ordem.fotos} />{role === "colaborador" && status === "running" && <Button variant="secondary" className="mt-3 h-11 w-full bg-secondary text-foreground"><Camera size={16} />Adicionar foto</Button>}</Section>
    <Section title="Materiais utilizados" icon={Package}><div className="space-y-2">{ordem.materiais.map((m) => <div key={m} className="rounded-xl bg-secondary/50 px-3 py-2 text-sm text-foreground">{m}</div>)}</div></Section>
    <Section title="Cobrança estimada" icon={Receipt}><div className="grid grid-cols-2 gap-3"><Mini label="Tempo trabalhado" value={`${Math.floor(ordem.tempoTrabalhadoMin/60)}h ${String(ordem.tempoTrabalhadoMin%60).padStart(2,"0")}m`} /><Mini label="Valor estimado" value={valor.toLocaleString("pt-BR", { style:"currency", currency:"BRL" })} /></div>{role === "gestor" && <Button className="mt-3 h-12 w-full gap-2 shadow-[var(--shadow-glow-orange)]"><Receipt size={17} />Gerar relatório de cobrança</Button>}</Section>
    <div className="sticky bottom-24 z-20 mt-6"><BigActionButton onClick={advance} icon={action.icon} disabled={status === "approved" || (role === "colaborador" && status === "review")}>{role === "gestor" && status === "review" ? "Aprovar para cobrança" : action.label}</BigActionButton></div>
  </AppShell>;
}
function Meta({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) { return <div className="flex items-center gap-2"><Icon size={13} className="shrink-0 text-primary" /><span className="truncate">{children}</span></div>; }
function Section({ title, icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) { return <section className="mt-5"><SectionHeader title={title} icon={icon} /><GlassCard className="p-4">{children}</GlassCard></section>; }
function Row({ k, v }: { k:string; v:string }) { return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="text-right font-bold text-foreground">{v}</span></div>; }
function Mini({ label, value }: { label:string; value:string }) { return <div className="rounded-xl bg-secondary/50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-display text-lg font-black text-foreground">{value}</p></div>; }
