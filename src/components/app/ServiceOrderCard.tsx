import { Link } from "@tanstack/react-router";
import { Building2, Clock, HardHat, MapPin } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { priorityLabel, serviceTypeLabel, statusLabel } from "@/types/serviceOrder";
import type { ServiceOrder } from "@/types/serviceOrder";
import { statusBucket } from "@/lib/serviceOrders/status";

const statusTone: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-200 border-slate-400/30",
  inProgress: "bg-[#ff7a18]/15 text-[#ff9a4d] border-[#ff7a18]/40",
  review: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  done: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-400/40",
};

const priorityTone: Record<string, string> = {
  baixa: "border-sky-400/40 text-sky-300",
  media: "border-amber-400/40 text-amber-300",
  alta: "border-orange-400/50 text-orange-300",
  urgente: "border-rose-500/60 text-rose-300",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServiceOrderCard({ order }: { order: ServiceOrder }) {
  const bucket = statusBucket[order.status];
  return (
    <Link to="/ordens/$id" params={{ id: order.id }} className="block">
      <GlassCard className="p-4 transition hover:border-primary/40 active:scale-[0.99]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              OS #{order.number} · {order.service_type ? serviceTypeLabel[order.service_type] : "Sem tipo"}
            </p>
            <h3 className="mt-1 truncate font-display text-base font-black text-foreground">
              {order.title}
            </h3>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${statusTone[bucket]}`}
          >
            {statusLabel[order.status]}
          </span>
        </div>
        <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={12} className="text-primary" />
            <span className="truncate">
              {order.client?.name ?? "Sem cliente"}
              {order.client?.unit ? ` · ${order.client.unit}` : ""}
            </span>
          </span>
          {order.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={12} className="text-primary" />
              <span className="truncate">{order.location}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <HardHat size={12} className="text-primary" />
            <span className="truncate">{order.technician?.full_name ?? "Sem técnico"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} className="text-primary" />
            <span>Aberta {formatDate(order.opened_at)}</span>
          </span>
        </div>
        {order.priority && (
          <span
            className={`mt-3 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${priorityTone[order.priority]}`}
          >
            Prioridade {priorityLabel[order.priority]}
          </span>
        )}
      </GlassCard>
    </Link>
  );
}