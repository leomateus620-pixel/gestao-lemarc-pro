import { Link } from "@tanstack/react-router";
import { Building2, Clock, MapPin } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { StatusBadge } from "./StatusBadge";
import type { Ordem } from "@/lib/mock/ordens";

export function OrderCard({ ordem }: { ordem: Ordem }) {
  return (
    <Link to="/ordens/$id" params={{ id: ordem.id }} className="block">
      <GlassCard className="p-4 transition-transform active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
              OS #{ordem.numero}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{ordem.area}</span>
            </div>
            <h3 className="mt-1 truncate font-display text-base font-bold text-foreground">{ordem.titulo}</h3>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 size={12} className="shrink-0" />
              <span className="truncate">{ordem.cliente} · {ordem.unidade}</span>
            </div>
          </div>
          {ordem.prioridade === "alta" && (
            <span className="shrink-0 rounded-md bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive">
              Urgente
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <StatusBadge status={ordem.status} />
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin size={11} />{ordem.distanciaKm} km</span>
            <span className="flex items-center gap-1"><Clock size={11} />{ordem.horario}</span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
