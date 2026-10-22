import { useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Square, Users } from "lucide-react";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { formatHHmm } from "@/lib/serviceOrders/finance";
import { formatDateHm, formatHm } from "@/lib/serviceOrders/timeSessions";
import {
  teamRowActions,
  teamStateLabel,
  type TeamRowAction,
  type TeamTechState,
} from "@/lib/serviceOrders/teamActions";
import type { AssignedTechnician, ServiceOrder } from "@/types/serviceOrder";
import { AddOrderTechniciansDialog } from "./AddOrderTechniciansDialog";

type Row = {
  tech: AssignedTechnician;
  state: TeamTechState;
  minutes: number;
  currentStartedAt: string | null;
};

const STATE_CLS: Record<TeamTechState, string> = {
  running: "border-status-done/40 bg-status-done/12 text-status-done",
  paused: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  finished: "border-primary/40 bg-primary/10 text-primary",
  idle: "border-border bg-secondary/40 text-muted-foreground",
};

const COLLEAGUE_CONFIRM: Record<TeamRowAction, string> = {
  start: "Iniciar para",
  restart: "Voltar a trabalhar para",
  resume: "Retomar para",
  pause: "Pausar",
  finish: "Encerrar horas de",
};

export function OrderTeamCard({
  order,
  rows,
  isAdmin,
  isOrderTechnician = false,
  myTechId,
  busyKey,
  onAction,
}: {
  order: ServiceOrder;
  rows: Row[];
  isAdmin: boolean;
  /** Usuário é técnico vinculado a esta OS (age em toda a equipe). */
  isOrderTechnician?: boolean;
  myTechId: string | null;
  /** `${action}:${techId}` em andamento (bloqueia duplo clique). */
  busyKey: string | null;
  onAction: (action: TeamRowAction, row: Row) => void;
}) {
  const [confirmFinish, setConfirmFinish] = useState<string | null>(null);
  /** Técnico agindo sobre um colega: `${action}:${techId}` aguardando confirmação. */
  const [confirmColleague, setConfirmColleague] = useState<string | null>(null);

  return (
    <GlassCard className="lemarc-os-team-card mt-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <p className="text-xs font-semibold text-primary">Equipe técnica da OS</p>
        </div>
        {isAdmin && (
          <AddOrderTechniciansDialog
            orderId={order.id}
            orderStatus={order.status}
            assignedTechnicianIds={rows.map((r) => r.tech.id)}
          />
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhum técnico vinculado.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const own = row.tech.id === myTechId;
            const actions = teamRowActions({
              state: row.state,
              orderStatus: order.status,
              isAdmin,
              isOwnRow: own,
              isOrderTechnician,
            });
            const busy = busyKey?.endsWith(`:${row.tech.id}`) ?? false;
            const colleague = !isAdmin && !own;
            const firstName = row.tech.full_name.split(" ")[0];
            return (
              <li
                key={row.tech.id}
                className={`rounded-xl border p-3 ${own ? "border-primary/40 bg-primary/5" : "border-white/12 bg-white/[0.03]"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">
                      {row.tech.full_name}
                      {own && (
                        <span className="ml-1 text-[11px] font-semibold text-primary">(você)</span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.tech.assignment_role || row.tech.role || "Técnico"}
                      {" · "}
                      <span className="tabular-nums">{formatHHmm(row.minutes)}</span>
                      {row.state === "running" && row.currentStartedAt && (
                        <> · desde {formatHm(row.currentStartedAt)}</>
                      )}
                    </div>
                    {isAdmin && row.tech.assigned_at && (
                      <div className="text-[10px] text-muted-foreground">
                        Vinculado em {formatDateHm(row.tech.assigned_at)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATE_CLS[row.state]}`}
                  >
                    {teamStateLabel(row.state)}
                  </span>
                </div>

                {actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {actions.map((action) => {
                      if (colleague && confirmColleague === `${action}:${row.tech.id}`) {
                        return (
                          <div key={action} className="flex w-full gap-2">
                            <Button
                              size="sm"
                              variant={action === "finish" ? "destructive" : "default"}
                              className="min-h-10 flex-1"
                              disabled={busy}
                              onClick={() => {
                                setConfirmColleague(null);
                                onAction(action, row);
                              }}
                            >
                              {COLLEAGUE_CONFIRM[action]} {firstName}?
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-10"
                              onClick={() => setConfirmColleague(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        );
                      }
                      if (!colleague && action === "finish" && confirmFinish === row.tech.id) {
                        return (
                          <Button
                            key={action}
                            size="sm"
                            variant="destructive"
                            className="min-h-10 flex-1 gap-2"
                            disabled={busy}
                            onClick={() => {
                              setConfirmFinish(null);
                              onAction("finish", row);
                            }}
                          >
                            <Square size={14} /> Confirmar encerramento
                          </Button>
                        );
                      }
                      if (colleague && confirmColleague?.endsWith(`:${row.tech.id}`)) return null;
                      const label =
                        action === "start"
                          ? own
                            ? "Iniciar minhas horas"
                            : "Iniciar"
                          : action === "pause"
                            ? own
                              ? "Pausar minhas horas"
                              : "Pausar"
                            : action === "resume"
                              ? "Retomar"
                              : action === "restart"
                                ? own || colleague
                                  ? "Voltar a trabalhar"
                                  : "Reabrir tempo"
                                : own
                                  ? "Encerrar minhas horas"
                                  : "Encerrar";
                      const Icon =
                        action === "pause"
                          ? Pause
                          : action === "finish"
                            ? Square
                            : action === "restart"
                              ? RotateCcw
                              : Play;
                      return (
                        <Button
                          key={action}
                          size="sm"
                          variant={
                            action === "finish"
                              ? "outline"
                              : action === "pause"
                                ? "secondary"
                                : "default"
                          }
                          className="min-h-10 flex-1 gap-2"
                          disabled={busy}
                          onClick={() =>
                            colleague
                              ? setConfirmColleague(`${action}:${row.tech.id}`)
                              : action === "finish"
                                ? setConfirmFinish(row.tech.id)
                                : onAction(action, row)
                          }
                        >
                          {busy && busyKey === `${action}:${row.tech.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Icon size={14} />
                          )}
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Encerrar as horas de um técnico não finaliza a OS.
      </p>
    </GlassCard>
  );
}
