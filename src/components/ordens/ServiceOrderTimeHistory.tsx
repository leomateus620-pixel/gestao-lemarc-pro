import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeSession } from "@/lib/serviceOrders/timeSessions";
import {
  buildTimeline,
  formatDateHm,
  pauseReasonLabel,
} from "@/lib/serviceOrders/timeSessions";
import { formatHHmm } from "@/lib/serviceOrders/finance";
import type { AssignedTechnician } from "@/types/serviceOrder";

type Props = {
  sessions: TimeSession[];
  technicians: AssignedTechnician[];
  /** When set, an edit button appears next to sessions this user owns. */
  editableTechnicianId?: string | null;
  /** When true, the edit button is offered for every eligible session (admin). */
  allowAllEdits?: boolean;
  /** Called with the session to edit. */
  onEditSession?: (session: TimeSession) => void;
};

export function ServiceOrderTimeHistory({
  sessions,
  technicians,
  editableTechnicianId = null,
  allowAllEdits = false,
  onEditSession,
}: Props) {
  const items = buildTimeline(sessions);
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sem histórico de tempo registrado.</p>
    );
  }
  const nameFor = (id: string | null) =>
    (id && technicians.find((t) => t.id === id)?.full_name) || "Técnico";
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  return (
    <ol className="space-y-1.5">
      {items.map((item, idx) => {
        const kindLabel =
          item.kind === "start"
            ? "Serviço iniciado"
            : item.kind === "pause"
              ? `Pausado${item.reason ? ` — ${pauseReasonLabel(item.reason)}` : ""}`
              : item.kind === "resume"
                ? "Retomado"
                : "Serviço finalizado";
        const dur =
          item.kind === "pause" && item.durationMinutes
            ? ` · trabalhou ${formatHHmm(item.durationMinutes)}`
            : "";
        const backing = item.sessionId ? sessionById.get(item.sessionId) : undefined;
        const isMine = !!(editableTechnicianId && item.technicianId === editableTechnicianId);
        const canEdit =
          !!onEditSession &&
          !!backing &&
          backing.kind === "work" &&
          // Show one edit affordance per session (on the start/resume row).
          (item.kind === "start" || item.kind === "resume") &&
          (allowAllEdits || isMine);
        return (
          <li
            key={idx}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
          >
            <div className="min-w-0 truncate">
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatDateHm(item.at)}
              </span>
              <span className="ml-2 font-bold text-foreground">{kindLabel}</span>
              {item.notes && (
                <span className="ml-2 text-muted-foreground">· {item.notes}</span>
              )}
              <span className="ml-2 text-muted-foreground">{dur}</span>
              {item.wasAdjusted && (
                <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  Horário ajustado
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                {nameFor(item.technicianId)}
              </span>
              {canEdit && backing && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-1.5 text-[10px]"
                  onClick={() => onEditSession?.(backing)}
                  aria-label={`Editar horário de ${nameFor(item.technicianId)}`}
                >
                  <Pencil size={11} />
                  Editar
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}