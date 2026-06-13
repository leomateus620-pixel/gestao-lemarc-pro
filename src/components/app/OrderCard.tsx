import { Link } from "@tanstack/react-router";
import { Bot, Building2, Clock, Cog, HardHat, MapPin, Wrench, Zap } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import type { Ordem, ServiceType } from "@/lib/mock/serviceOrders";

const icons: Record<ServiceType, typeof Wrench> = {
  "Manutenção Mecânica": Cog,
  "Manutenção Elétrica": Zap,
  "Automação Industrial": Bot,
  "Montagem Industrial": HardHat,
  Instalação: Wrench,
  "Visita Técnica": Wrench,
  Emergência: Zap,
};

export function OrderCard({ ordem }: { ordem: Ordem }) {
  const Icon = icons[ordem.area];
  const elapsed = ordem.tempoTrabalhadoMin ? `${Math.floor(ordem.tempoTrabalhadoMin / 60)}h${String(ordem.tempoTrabalhadoMin % 60).padStart(2, "0")}` : "—";
  return (
    <Link to="/ordens/$id" params={{ id: ordem.id }} className="block">
      <GlassCard className="p-4 transition-transform active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25"><Icon size={21} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary"><span>OS #{ordem.numero}</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{ordem.area}</span></div>
            <h3 className="mt-1 line-clamp-2 font-display text-base font-bold leading-tight text-foreground">{ordem.titulo}</h3>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Building2 size={12} className="shrink-0 text-primary" /><span className="truncate">{ordem.cliente} · {ordem.unidade}</span></div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><HardHat size={12} className="shrink-0 text-primary" /><span className="truncate">{ordem.colaborador}</span></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3"><StatusBadge status={ordem.status} /><PriorityBadge prioridade={ordem.prioridade} /></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><MapPin size={11} />{ordem.distanciaKm} km</span><span className="flex items-center gap-1"><Clock size={11} />{ordem.horario}</span><span className="text-right font-bold text-foreground">{elapsed}</span></div>
      </GlassCard>
    </Link>
  );
}
