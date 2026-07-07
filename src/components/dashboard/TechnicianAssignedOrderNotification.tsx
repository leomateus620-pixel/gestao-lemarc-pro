import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Factory,
  HardHat,
  MapPin,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatServiceOrderDateTime } from "@/lib/serviceOrders/time";
import { priorityLabel, serviceTypeLabel } from "@/types/serviceOrder";
import type { ServiceOrderAssignedNotification } from "@/types/notifications";

type Props = {
  notification: ServiceOrderAssignedNotification | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOrder: () => void;
  onDismiss: () => void;
};

export function TechnicianAssignedOrderNotification({
  notification,
  open,
  busy,
  onOpenChange,
  onOpenOrder,
  onDismiss,
}: Props) {
  const order = notification?.order;
  const scheduled = formatServiceOrderDateTime(order?.scheduledFor ?? null);
  const serviceType =
    order?.serviceType === "outro" && order.serviceTypeOther
      ? order.serviceTypeOther
      : order?.serviceType
        ? serviceTypeLabel[order.serviceType]
        : "Tipo não informado";
  const priority = order?.priority ? priorityLabel[order.priority] : "Sem prioridade";
  const technicianNames = order?.technicianNames.length
    ? order.technicianNames.join(", ")
    : "Técnico responsável";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto flex max-h-[calc(100dvh-0.75rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[1.45rem] border-white/15 bg-[#081321] p-0 text-slate-50 shadow-[0_-24px_70px_-32px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] duration-200 data-[state=open]:slide-in-from-bottom-8 data-[state=closed]:slide-out-to-bottom-8 sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] sm:max-w-xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[1.45rem] sm:data-[state=open]:slide-in-from-bottom-0">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_100%_0%,rgba(255,127,24,0.24),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] px-4 pb-4 pt-5 text-left sm:px-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/75 to-transparent"
          />
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/18 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_14px_30px_-22px_rgba(255,127,24,0.9)]">
              <BellRing size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-primary">
                Atendimento em campo
              </p>
              <DialogTitle className="mt-1 font-display text-xl font-black leading-tight tracking-normal text-white sm:text-2xl">
                Nova OS atribuída a você
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium leading-5 text-slate-300">
                Uma nova ordem de serviço foi enviada para o seu atendimento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {order && (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="rounded-[1.1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025)),linear-gradient(145deg,#132235,#09111d)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="flex flex-wrap items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em]">
                <span className="font-mono text-primary">OS #{order.number ?? "—"}</span>
                <span className="text-slate-500">·</span>
                <span className="text-sky-200">{serviceType}</span>
                <span className="text-slate-500">·</span>
                <span
                  className={cn(order.priority === "urgente" ? "text-rose-200" : "text-amber-200")}
                >
                  {priority}
                </span>
              </div>

              <h3 className="mt-2 font-display text-lg font-black leading-tight text-white">
                {order.title || "OS sem título"}
              </h3>
              {order.description && (
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-300">
                  {order.description}
                </p>
              )}

              <div className="mt-3 grid gap-2 text-[0.82rem] font-semibold text-slate-200">
                <SummaryLine icon={Factory} label="Cliente" value={order.clientName} />
                <SummaryLine
                  icon={MapPin}
                  label="Unidade / local"
                  value={`${order.unitName} · ${order.location}`}
                />
                <SummaryLine icon={HardHat} label="Técnicos" value={technicianNames} />
                {scheduled && (
                  <SummaryLine icon={CalendarClock} label="Previsão" value={scheduled} />
                )}
                {!scheduled && (
                  <SummaryLine icon={Wrench} label="Previsão" value="Sem horário previsto" />
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 border-t border-white/10 bg-[#0b1726]/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-black uppercase tracking-[0.08em] text-slate-200 hover:bg-white/[0.08] hover:text-white"
            onClick={onDismiss}
            disabled={busy}
          >
            Ver depois
          </Button>
          <Button
            type="button"
            className="min-h-11 rounded-xl bg-primary px-5 font-black uppercase tracking-[0.08em] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_18px_34px_-24px_rgba(255,127,24,0.95)] hover:brightness-105"
            onClick={onOpenOrder}
            disabled={busy}
          >
            Abrir OS agora
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Factory;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="truncate text-slate-100">{value}</p>
      </div>
    </div>
  );
}
