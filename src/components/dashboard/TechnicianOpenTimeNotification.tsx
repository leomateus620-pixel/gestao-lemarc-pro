import { AlertTriangle, ArrowRight, Clock, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatHm } from "@/lib/serviceOrders/timeSessions";
import type { OpenTimeAlertDetails } from "@/types/notifications";

type Props = {
  open: boolean;
  busy?: boolean;
  orderNumber: number | null;
  clientName?: string | null;
  details: OpenTimeAlertDetails | null;
  /** Quando ausente, o alerta é apenas informativo (sem botão de encerrar). */
  onFinishTime?: () => void;
  onOpenOrder?: () => void;
  onDismiss: () => void;
  onOpenChange: (open: boolean) => void;
};

export function TechnicianOpenTimeNotification({
  open,
  busy,
  orderNumber,
  clientName,
  details,
  onFinishTime,
  onOpenOrder,
  onDismiss,
  onOpenChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto flex max-h-[calc(100dvh-0.75rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[1.45rem] border-white/15 bg-[#081321] p-0 text-slate-50 shadow-[0_-24px_70px_-32px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.16)] duration-200 sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-h-[calc(100dvh-2rem)] sm:w-[94vw] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[1.45rem]">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_100%_0%,rgba(251,191,36,0.24),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] px-4 pb-4 pt-5 text-left sm:px-5">
          <div className="flex items-start gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-amber-400/35 bg-amber-400/15 text-amber-300">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-amber-300">
                Tempo ainda aberto
              </p>
              <DialogTitle className="mt-1 font-display text-xl font-black leading-tight tracking-normal text-white">
                OS #{orderNumber ?? "—"} com tempo em andamento
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium leading-5 text-slate-300">
                {details
                  ? `${details.finishedByName} encerrou o tempo, mas o tempo de ${details.openTechnicianName} continua rodando nesta OS.`
                  : "Há tempo em andamento nesta OS."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="rounded-[1.1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4">
            {clientName && (
              <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-slate-400">
                {clientName}
              </p>
            )}
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-white">
              <Clock size={14} className="text-amber-300" />
              {details?.openTechnicianName ?? "Técnico"}
              {details?.openSince ? ` · aberto desde ${formatHm(details.openSince)}` : ""}
            </p>
            <p className="mt-2 text-[0.8rem] font-medium leading-5 text-slate-300">
              Encerre o tempo para que as horas da OS sejam apuradas corretamente.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-white/10 bg-[#0b1726]/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-black uppercase tracking-[0.08em] text-slate-200 hover:bg-white/[0.08] hover:text-white"
            onClick={onDismiss}
            disabled={busy}
          >
            Entendi
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onOpenOrder && (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 rounded-xl px-4 font-black uppercase tracking-[0.08em]"
                onClick={onOpenOrder}
                disabled={busy}
              >
                Abrir OS
                <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
            {onFinishTime && (
              <Button
                type="button"
                className="min-h-11 rounded-xl bg-amber-500 px-5 font-black uppercase tracking-[0.08em] text-[#1a1205] hover:brightness-105"
                onClick={onFinishTime}
                disabled={busy}
              >
                <Square className="mr-2 size-4" />
                Encerrar tempo
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
