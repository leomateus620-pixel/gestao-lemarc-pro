import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Clock3, Factory, HardHat, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { technicianOrderNeedsAction } from "@/components/dashboard/technicianOrderUtils";
import {
  formatRelativeServiceOrderTime,
  formatServiceOrderDateTime,
  getOpenedAt,
} from "@/lib/serviceOrders/time";
import { formatTechnicianList, getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
} from "@/types/serviceOrder";

const statusTone: Record<ServiceOrderStatus, { border: string; text: string; dot: string }> = {
  pending: {
    border: "border-primary/40 bg-primary/10",
    text: "text-primary",
    dot: "bg-primary",
  },
  dispatched: {
    border: "border-primary/40 bg-primary/10",
    text: "text-primary",
    dot: "bg-primary",
  },
  transit: {
    border: "border-sky-300/35 bg-sky-400/10",
    text: "text-sky-200",
    dot: "bg-sky-300",
  },
  running: {
    border: "border-sky-300/35 bg-sky-400/10",
    text: "text-sky-200",
    dot: "bg-sky-300",
  },
  finished: {
    border: "border-amber-300/35 bg-amber-400/10",
    text: "text-amber-200",
    dot: "bg-amber-300",
  },
  review: {
    border: "border-amber-300/35 bg-amber-400/10",
    text: "text-amber-200",
    dot: "bg-amber-300",
  },
  approved: {
    border: "border-emerald-300/35 bg-emerald-400/10",
    text: "text-emerald-200",
    dot: "bg-emerald-300",
  },
  cancelled: {
    border: "border-rose-300/35 bg-rose-400/10",
    text: "text-rose-200",
    dot: "bg-rose-300",
  },
};

export function TechnicianOrderCard({ order }: { order: ServiceOrder }) {
  const tone = statusTone[order.status];
  const technicians = getOrderTechnicians(order);
  const technicianLabel = technicians.length ? formatTechnicianList(technicians, 2) : "Técnico";
  const unitName = order.client_unit?.name ?? order.client?.unit ?? "Unidade não informada";
  const localName = order.location ?? order.client_unit?.sector ?? "Local não informado";
  const serviceType = serviceTypeName(order);
  const time = timeStateLabel(order);
  const scheduled = formatServiceOrderDateTime(order.scheduled_for);
  const needsAction = technicianOrderNeedsAction(order);

  return (
    <Link
      to="/ordens/$id"
      params={{ id: order.id }}
      aria-label={`Abrir OS ${order.number}`}
      className={cn(
        "group block overflow-hidden rounded-[1.1rem] border bg-[linear-gradient(180deg,oklch(1_0_0/0.07),transparent_36%),linear-gradient(145deg,oklch(0.235_0.04_252/0.985),oklch(0.115_0.032_252/0.99))] p-3 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.14),inset_0_-1px_0_oklch(0_0_0/0.32),0_18px_42px_-32px_oklch(0_0_0/0.9)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_24px_48px_-34px_oklch(0_0_0/0.94)] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        needsAction ? "border-primary/30" : "border-white/12",
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.66rem] font-black uppercase tracking-[0.12em]">
            <span className="font-mono text-primary">OS #{order.number}</span>
            <span className="text-slate-500">·</span>
            <span className={cn("inline-flex items-center gap-1.5", tone.text)}>
              <span className={cn("size-1.5 rounded-full", tone.dot)} />
              {statusLabel[order.status]}
            </span>
            {order.priority && (
              <>
                <span className="text-slate-500">·</span>
                <span className="text-amber-200">{priorityLabel[order.priority]}</span>
              </>
            )}
          </div>

          <h3 className="mt-2 line-clamp-1 font-display text-[1.02rem] font-black leading-tight tracking-normal text-white sm:text-[1.08rem]">
            {order.title || "OS sem título"}
          </h3>

          <div className="mt-2 grid gap-1.5 text-[0.8rem] font-semibold leading-5 text-slate-200 sm:grid-cols-2 sm:gap-x-4">
            <Info
              icon={Factory}
              value={`${order.client?.name ?? "Cliente não vinculado"} · ${unitName}`}
            />
            <Info icon={MapPin} value={`Local: ${localName}`} />
            <Info icon={HardHat} value={`Técnico: ${technicianLabel}`} />
            <Info icon={CalendarClock} value={serviceType} />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5 lg:min-w-[12.5rem] lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
          <div className="flex min-w-0 flex-col items-start gap-1 lg:items-end">
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[0.66rem] font-black uppercase tracking-[0.08em]",
                tone.border,
                tone.text,
              )}
            >
              <Clock3 className="size-3 shrink-0" />
              <span className="truncate">{time}</span>
            </span>
            {scheduled &&
              !["finished", "review", "approved", "cancelled"].includes(order.status) && (
                <span className="hidden max-w-full truncate text-[0.68rem] font-bold text-slate-400 sm:inline">
                  Prevista {scheduled}
                </span>
              )}
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-primary px-3 text-[0.68rem] font-black uppercase tracking-[0.08em] text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.28),0_12px_24px_-18px_oklch(0.72_0.19_50/0.9)] transition duration-200 group-hover:brightness-105 motion-reduce:transition-none">
            Abrir OS
            <ArrowRight className="size-3.5 shrink-0" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Info({ icon: Icon, value }: { icon: typeof Factory; value: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-primary/90" />
      <span className="truncate">{value}</span>
    </span>
  );
}

function serviceTypeName(order: ServiceOrder) {
  if (order.service_type === "outro" && order.service_type_other) return order.service_type_other;
  return order.service_type ? serviceTypeLabel[order.service_type] : "Tipo não informado";
}

function timeStateLabel(order: ServiceOrder) {
  if (order.status === "running") return "Em execução";
  if (order.status === "transit") return "Em deslocamento";
  if (order.status === "finished" || order.status === "review") {
    return "Finalizada e enviada para revisão";
  }
  if (order.status === "approved") return "Finalizada";
  if (order.status === "cancelled") return "Cancelada";
  if (order.status === "dispatched") return "Despachada";

  const opened = formatServiceOrderDateTime(getOpenedAt(order));
  const relative = formatRelativeServiceOrderTime(getOpenedAt(order));
  if (opened) return `Aberta ${opened}`;
  return relative ?? "Aguardando atendimento";
}
