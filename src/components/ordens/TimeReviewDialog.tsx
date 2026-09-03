import { memo, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, Loader2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createManualTimeSession,
  getOrderTimeReview,
  saveOrderTimeReview,
} from "@/lib/api/timeSessions.functions";
import { formatHHmm } from "@/lib/serviceOrders/finance";
import { formatDateHm, type TimeSession } from "@/lib/serviceOrders/timeSessions";
import type { AssignedTechnician } from "@/types/serviceOrder";
import { EditTimeSessionSheet } from "./EditTimeSessionSheet";

type Props = {
  orderId: string;
  orderNumber: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicians: AssignedTechnician[];
  onReviewed: () => void;
};

function sessionDurationMinutes(session: TimeSession, nowMs = Date.now()) {
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : nowMs;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60000);
}

function sessionDurationSeconds(session: TimeSession, nowMs = Date.now()) {
  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : nowMs;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

const LiveTotal = memo(function LiveTotal({ sessions }: { sessions: TimeSession[] }) {
  const hasOpenSession = sessions.some((session) => !session.ended_at);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!hasOpenSession) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [hasOpenSession]);

  const totalMinutes = sessions.reduce(
    (total, session) => total + sessionDurationMinutes(session),
    0,
  );
  const totalSeconds = sessions.reduce(
    (total, session) => total + sessionDurationSeconds(session),
    0,
  );
  return <>{hasOpenSession ? formatClock(totalSeconds) : formatHHmm(totalMinutes)}</>;
});

const LiveSessionDuration = memo(function LiveSessionDuration({
  session,
}: {
  session: TimeSession;
}) {
  const isRunning = !session.ended_at;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  return (
    <>
      {isRunning
        ? formatClock(sessionDurationSeconds(session))
        : formatHHmm(sessionDurationMinutes(session))}
    </>
  );
});

export function TimeReviewDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  technicians: assignedTechnicians,
  onReviewed,
}: Props) {
  const qc = useQueryClient();
  const getReviewFn = useServerFn(getOrderTimeReview);
  const saveReviewFn = useServerFn(saveOrderTimeReview);
  const createSessionFn = useServerFn(createManualTimeSession);
  const historyTechsFn = useServerFn(listOrderHistoryTechnicians);
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [addingSession, setAddingSession] = useState(false);

  const reviewQuery = useQuery({
    queryKey: ["order-time-review", orderId],
    queryFn: () => getReviewFn({ data: { orderId } }),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  // Técnicos que já registraram tempo nesta OS mas saíram da equipe continuam
  // aparecendo na revisão, com nome próprio.
  const { data: historyTechnicians } = useQuery({
    queryKey: ["order-history-technicians", orderId],
    queryFn: () => historyTechsFn({ data: { orderId } }),
    enabled: open,
    staleTime: 0,
  });

  const technicians = useMemo(
    () => mergeHistoryTechnicians(assignedTechnicians, historyTechnicians),
    [assignedTechnicians, historyTechnicians],
  );

  useEffect(() => {
    if (open) {
      setEditingSession(null);
      setAddingSession(false);
      void reviewQuery.refetch();
    }
  }, [open]);

  const sessions: TimeSession[] = reviewQuery.data?.sessions ?? [];
  const hasOpenSession = sessions.some((session) => !session.ended_at);

  const invalidateReview = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["order-time-review", orderId] }),
      qc.invalidateQueries({ queryKey: ["order-time-review-state", orderId] }),
      qc.invalidateQueries({ queryKey: ["order-time-sessions", orderId] }),
      qc.invalidateQueries({ queryKey: ["order-labor-override", orderId] }),
      qc.invalidateQueries({ queryKey: ["order-financials", orderId] }),
      qc.invalidateQueries({ queryKey: ["service-order", orderId] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () => saveReviewFn({ data: { orderId, note: null } }),
    onSuccess: async (result) => {
      const pending = (result as { laborPending?: { minutes: number } | null } | null)
        ?.laborPending;
      if (pending) {
        toast.warning(
          `Horários revisados. ${pending.minutes} min ainda não entraram na apuração — avise o administrador.`,
        );
      } else {
        toast.success("Horários revisados e apuração atualizada.");
      }
      // Fecha a revisão primeiro e só então avança, para o próximo diálogo
      // (assinatura) abrir sem conflito de foco/overlay.
      onOpenChange(false);
      void invalidateReview();
      window.setTimeout(() => onReviewed(), 180);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível revisar os horários."),
  });


  const technicianName = (id: string | null) =>
    technicians.find((technician) => technician.id === id)?.full_name ?? "Técnico";
  const canConfirm = !reviewQuery.isPending && !reviewQuery.isError;
  const eligibleIdsKey = (reviewQuery.data?.eligibleTechnicianIds ?? []).join(",");
  const eligibleTechnicians = useMemo(
    () => technicians.filter((technician) => eligibleIdsKey.split(",").includes(technician.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eligibleIdsKey, technicians.map((t) => t.id).join(",")],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-10 sm:px-6">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  OS #{orderNumber}
                </p>
                <DialogTitle className="mt-1">Revise os horários antes da assinatura</DialogTitle>
                <DialogDescription className="mt-1">
                  Confira os intervalos registrados pela equipe.
                </DialogDescription>
              </div>
              <ShieldCheck className="mt-1 shrink-0 text-primary" size={20} />
            </div>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {reviewQuery.isPending ? (
              <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando horários…
              </div>
            ) : reviewQuery.isError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {reviewQuery.error instanceof Error
                  ? reviewQuery.error.message
                  : "Não foi possível carregar os horários."}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Intervalos
                    </p>
                    <p className="mt-1 text-lg font-black tabular-nums text-foreground">
                      {sessions.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-black tabular-nums text-foreground">
                      <LiveTotal sessions={sessions} />
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3 sm:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Equipe
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-foreground">
                      {technicians.map((technician) => technician.full_name).join(", ") || "—"}
                    </p>
                  </div>
                </div>

                {hasOpenSession && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    O intervalo em andamento continua correndo após a revisão. Ele só será encerrado
                    quando a OS for finalizada.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Intervalos registrados
                  </p>
                  {eligibleTechnicians.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => setAddingSession(true)}
                    >
                      <Plus size={15} /> Adicionar horário
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {sessions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      Nenhum intervalo registrado ainda.
                    </p>
                  ) : (
                    sessions.map((session) => {
                      const isRunning = !session.ended_at;
                      return (
                        <div
                          key={session.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {technicianName(session.technician_id)}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <span>{formatDateHm(session.started_at)}</span>
                              <span>até</span>
                              <span>
                                {isRunning ? "em andamento" : formatDateHm(session.ended_at)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${isRunning ? "text-amber-200" : "text-foreground"}`}
                              >
                                <Clock3 size={12} />
                                <LiveSessionDuration session={session} />
                              </span>
                              {isRunning && (
                                <span
                                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300"
                                  aria-label="Cronômetro em andamento"
                                />
                              )}
                            </p>
                          </div>
                          {reviewQuery.data?.canEditAll ||
                          (reviewQuery.data?.currentTechnicianId &&
                            session.technician_id === reviewQuery.data.currentTechnicianId) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="shrink-0 gap-1.5"
                              onClick={() => setEditingSession(session)}
                            >
                              <Pencil size={13} /> Editar
                            </Button>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                              Somente leitura
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!canConfirm || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {saveMutation.isPending ? "Confirmando…" : "Confirmar horários e continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTimeSessionSheet
        open={!!editingSession || addingSession}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingSession(null);
            setAddingSession(false);
          }
        }}
        session={editingSession}
        orderId={orderId}
        technicianName={editingSession ? technicianName(editingSession.technician_id) : null}
        availableTechnicians={eligibleTechnicians}
        onSaved={async () => {
          await invalidateReview();
          await reviewQuery.refetch();
        }}
      />
    </>
  );
}
