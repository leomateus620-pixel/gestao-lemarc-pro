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
};

export function ServiceOrderTimeHistory({ sessions, technicians }: Props) {
  const items = buildTimeline(sessions);
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sem histórico de tempo registrado.</p>
    );
  }
  const nameFor = (id: string | null) =>
    (id && technicians.find((t) => t.id === id)?.full_name) || "Técnico";
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
            </div>
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary">
              {nameFor(item.technicianId)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}