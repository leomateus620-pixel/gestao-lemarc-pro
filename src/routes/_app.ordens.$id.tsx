import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { useRole } from "@/components/app/RoleContext";
import { getOrdem } from "@/lib/mock/ordens";
import { Building2, MapPin, User, Clock, Camera, FileText, Play, Send, CheckCircle2, Truck, Receipt, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/_app/ordens/$id")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Gestão Lemarc` }] }),
  loader: ({ params }) => {
    const o = getOrdem(params.id);
    if (!o) throw notFound();
    return { ordem: o };
  },
  component: OrdemDetalhe,
  notFoundComponent: () => (
    <AppShell title="OS não encontrada" back>
      <div className="mt-8 text-center text-sm text-muted-foreground">Esta ordem não existe.</div>
    </AppShell>
  ),
});

function OrdemDetalhe() {
  const { ordem } = Route.useLoaderData();
  const { role } = useRole();
  const [status, setStatus] = useState(ordem.status);

  const nextAction = {
    pending: { label: "Iniciar deslocamento", icon: Truck, next: "transit" as const },
    transit: { label: "Iniciar serviço", icon: Play, next: "running" as const },
    running: { label: "Finalizar e enviar para revisão", icon: Send, next: "review" as const },
    review: { label: "Aguardando aprovação do gestor", icon: CheckCircle2, next: "review" as const },
    done: { label: "Concluída", icon: CheckCircle2, next: "done" as const },
  }[status];

  const horas = Math.floor(ordem.tempoTrabalhadoMin / 60);
  const min = ordem.tempoTrabalhadoMin % 60;
  const valor = (ordem.tempoTrabalhadoMin / 60) * ordem.valorHora;

  return (
    <AppShell title={`OS #${ordem.numero}`} back>
      <GlassCard className="mt-2 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary/15 to-transparent p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary">{ordem.area}</div>
              <h1 className="mt-1 font-display text-xl font-black leading-tight text-foreground">{ordem.titulo}</h1>
            </div>
            <StatusBadge status={status} />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <Meta icon={Building2}>{ordem.cliente} · {ordem.unidade}</Meta>
            <Meta icon={User}>{ordem.colaborador}</Meta>
            <Meta icon={MapPin}>{ordem.distanciaKm} km de distância</Meta>
            <Meta icon={Clock}>Programado para {ordem.horario} · {ordem.data}</Meta>
          </div>
        </div>
      </GlassCard>

      <Section title="Descrição" icon={FileText}>
        <p className="text-sm leading-relaxed text-foreground">{ordem.descricao}</p>
      </Section>

      <Section title="Linha do tempo" icon={Clock}>
        <div className="space-y-3">
          {ordem.timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="relative flex flex-col items-center">
                <div className={`grid h-7 w-7 place-items-center rounded-full ${
                  t.concluida ? "bg-primary text-primary-foreground" : "border border-border bg-secondary text-muted-foreground"
                }`}>
                  {t.concluida ? <CheckCircle2 size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </div>
                {i < ordem.timeline.length - 1 && <div className={`mt-1 h-6 w-px ${t.concluida ? "bg-primary/60" : "bg-border"}`} />}
              </div>
              <div className="flex-1 pb-2">
                <div className={`text-sm font-semibold ${t.concluida ? "text-foreground" : "text-muted-foreground"}`}>{t.etapa}</div>
                <div className="text-[11px] text-muted-foreground">{t.hora}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Fotos do atendimento (${ordem.fotos})`} icon={Camera}>
        {ordem.fotos > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: Math.min(ordem.fotos, 6) }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-secondary to-navy-deep grid place-items-center text-muted-foreground/40">
                <ImageIcon size={20} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-6 text-center text-xs text-muted-foreground">
            Nenhuma foto registrada ainda
          </div>
        )}
        {role === "colaborador" && status === "running" && (
          <Button variant="secondary" className="mt-3 h-11 w-full gap-2 bg-secondary text-foreground hover:bg-secondary/80">
            <Camera size={16} /> Adicionar foto
          </Button>
        )}
      </Section>

      {role === "gestor" && (ordem.status === "review" || ordem.status === "done" || ordem.tempoTrabalhadoMin > 0) && (
        <Section title="Tempo trabalhado e cobrança" icon={Receipt}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tempo total</div>
              <div className="mt-1 font-display text-2xl font-black text-foreground">{horas}h {min.toString().padStart(2, "0")}m</div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Valor calculado</div>
              <div className="mt-1 font-display text-2xl font-black text-foreground">
                R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <Button className="mt-3 h-11 w-full gap-2 shadow-[var(--shadow-glow-orange)]">
            <Receipt size={16} /> Gerar relatório de cobrança
          </Button>
        </Section>
      )}

      {role === "colaborador" && status !== "done" && status !== "review" && (
        <div className="sticky bottom-24 z-20 mt-6">
          <Button
            onClick={() => setStatus(nextAction.next)}
            className="h-14 w-full gap-2 text-base font-bold uppercase tracking-wider shadow-[var(--shadow-glow-orange)]"
          >
            <nextAction.icon size={20} /> {nextAction.label}
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="shrink-0 text-primary" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Icon size={14} className="text-primary" />
        <h2 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      <GlassCard className="p-4">{children}</GlassCard>
    </section>
  );
}
