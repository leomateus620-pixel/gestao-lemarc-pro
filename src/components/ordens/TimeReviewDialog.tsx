import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock3, Loader2, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getOrderTimeReview, saveOrderTimeReview } from "@/lib/api/timeSessions.functions";
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

function sessionDuration(session: TimeSession) {
  if (typeof session.duration_minutes === "number" && session.duration_minutes > 0) {
    return session.duration_minutes;
  }
  if (!session.ended_at) return 0;
  const start = new Date(session.started_at).getTime();
  const end = new Date(session.ended_at).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start
    ? Math.round((end - start) / 60000)
    : 0;
}

export function TimeReviewDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  technicians,
  onReviewed,
}: Props) {
  const qc = useQueryClient();
  const getReviewFn = useServerFn(getOrderTimeReview);
  const saveReviewFn = useServerFn(saveOrderTimeReview);
  const [note, setNote] = useState("");
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);

  const reviewQuery = useQuery({
    queryKey: ["order-time-review", orderId],
    queryFn: () => getReviewFn({ data: { orderId } }),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (open) {
      setNote("");
      setEditingSession(null);
      void reviewQuery.refetch();
    }
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: () => saveReviewFn({ data: { orderId, note: note.trim() || null } }),
    onSuccess: () => {
      toast.success("Horários revisados e apuração atualizada.");
      qc.invalidateQueries({ queryKey: ["order-time-review", orderId] });
      qc.invalidateQueries({ queryKey: ["order-time-sessions", orderId] });
      qc.invalidateQueries({ queryKey: ["order-financials", orderId] });
      qc.invalidateQueries({ queryKey: ["service-order", orderId] });
      onOpenChange(false);
      onReviewed();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível revisar os horários."),
  });

  const data = reviewQuery.data;
  const sessions: TimeSession[] = data?.sessions ?? [];
  const technicianName = (id: string | null) =>
    technicians.find((technician) => technician.id === id)?.full_name ?? "Técnico";
  const totalMinutes = sessions.reduce((total, session) => total + sessionDuration(session), 0);
  const hasOpenSession = sessions.some((session) => !session.ended_at);
  const canConfirm = !reviewQuery.isPending && !reviewQuery.isError && sessions.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  OS #{orderNumber} · conferência obrigatória
                </p>
                <DialogTitle className="mt-1">Revise seus horários antes da assinatura</DialogTitle>
              </div>
              <ShieldCheck className="mt-1 shrink-0 text-primary" size={20} />
            </div>
          </DialogHeader>

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
                    {formatHHmm(totalMinutes)}
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
                  O intervalo em andamento será encerrado agora, no momento da confirmação.
                </p>
              )}

              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {technicianName(session.technician_id)}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{formatDateHm(session.started_at)}</span>
                        <span>até</span>
                        <span>{session.ended_at ? formatDateHm(session.ended_at) : "em andamento"}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <Clock3 size={12} /> {formatHHmm(sessionDuration(session))}
                        </span>
                      </p>
                    </div>
                    {session.technician_id === data?.currentTechnicianId ? (
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
                ))}
              </div>

              <div className="space-y-1">
                <label htmlFor="technician-time-review-note" className="text-xs font-semibold text-foreground">
                  Observação (opcional)
                </label>
                <textarea
                  id="technician-time-review-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Ex.: confirmei a pausa para almoço."
                  className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!canConfirm || saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saveMutation.isPending ? "Confirmando…" : "Confirmar horários e continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTimeSessionSheet
        open={!!editingSession}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditingSession(null);
        }}
        session={editingSession}
        orderId={orderId}
        technicianName={editingSession ? technicianName(editingSession.technician_id) : null}
      />
    </>
  );
}
