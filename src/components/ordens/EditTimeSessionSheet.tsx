import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOwnTimeSession } from "@/lib/api/timeSessions.functions";
import { PAUSE_REASONS, type TimeSession } from "@/lib/serviceOrders/timeSessions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TimeSession | null;
  orderId: string;
  technicianName?: string | null;
};

/**
 * Convert an ISO string into `<input type="datetime-local">`-friendly value
 * respecting the user's local timezone (input has no TZ semantics).
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function EditTimeSessionSheet({
  open,
  onOpenChange,
  session,
  orderId,
  technicianName,
}: Props) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateOwnTimeSession);

  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [pauseReason, setPauseReason] = useState<string>("");
  const [pauseNotes, setPauseNotes] = useState<string>("");
  const [reason, setReason] = useState("");

  const isPaused = session?.end_reason === "pause";
  const isOpen = session ? !session.ended_at : false;

  useEffect(() => {
    if (!session) return;
    setStartInput(isoToLocalInput(session.started_at));
    setEndInput(isoToLocalInput(session.ended_at));
    setPauseReason(session.pause_reason ?? "");
    setPauseNotes(session.pause_notes ?? "");
    setReason("");
  }, [session?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const validationError = useMemo(() => {
    if (!session) return null;
    const startIso = localInputToIso(startInput);
    if (!startIso) return "Informe a data/hora de início.";
    if (!isOpen) {
      const endIso = localInputToIso(endInput);
      if (!endIso) return "Informe a data/hora de fim.";
      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        return "O fim precisa ser maior que o início.";
      }
    }
    if (isPaused && pauseReason === "outro" && !pauseNotes.trim()) {
      return "Descreva o motivo em 'Outro'.";
    }
    if (reason.trim().length < 3) return "Descreva o motivo do ajuste (mín. 3 caracteres).";
    return null;
  }, [session, startInput, endInput, pauseReason, pauseNotes, reason, isOpen, isPaused]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão indisponível.");
      const startIso = localInputToIso(startInput);
      if (!startIso) throw new Error("Início inválido.");
      const payload: Parameters<typeof updateFn>[0]["data"] = {
        sessionId: session.id,
        startedAt: startIso,
        reason: reason.trim(),
      };
      if (!isOpen) {
        const endIso = localInputToIso(endInput);
        if (!endIso) throw new Error("Fim inválido.");
        payload.endedAt = endIso;
      }
      if (isPaused) {
        payload.pauseReason = pauseReason || null;
        payload.pauseNotes = pauseNotes.trim() || null;
      }
      return updateFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Horário atualizado. Totais e relatórios recalculados.");
      qc.invalidateQueries({ queryKey: ["order-time-sessions", orderId] });
      qc.invalidateQueries({ queryKey: ["order-financials", orderId] });
      qc.invalidateQueries({ queryKey: ["service-order", orderId] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar horário");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar horário</DialogTitle>
          <DialogDescription>
            {technicianName ? `Ajustar horário de ${technicianName}.` : "Ajustar horário registrado."}
            {" "}As alterações recalculam a apuração de horas, os totais e o PDF automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="edit-session-start">Início</Label>
            <Input
              id="edit-session-start"
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
            />
          </div>

          {isOpen ? (
            <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
              Esta sessão está em andamento. Você pode corrigir apenas o horário de início. Pause a
              OS para fechar o intervalo.
            </p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="edit-session-end">Fim</Label>
              <Input
                id="edit-session-end"
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
              />
            </div>
          )}

          {isPaused && (
            <>
              <div className="space-y-1">
                <Label>Motivo da pausa</Label>
                <Select value={pauseReason} onValueChange={setPauseReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAUSE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-session-pause-notes">
                  Observações da pausa {pauseReason === "outro" && <span className="text-rose-300">*</span>}
                </Label>
                <Textarea
                  id="edit-session-pause-notes"
                  rows={2}
                  value={pauseNotes}
                  onChange={(e) => setPauseNotes(e.target.value)}
                  placeholder={pauseReason === "outro" ? "Descreva o motivo" : "Opcional"}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label htmlFor="edit-session-reason">Motivo do ajuste *</Label>
            <Textarea
              id="edit-session-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: esqueci de pausar após o almoço"
            />
            <p className="text-[10px] text-muted-foreground">
              O ajuste fica registrado no histórico de auditoria da OS.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            disabled={!!validationError || mutation.isPending || !session}
            onClick={() => {
              if (validationError) {
                toast.error(validationError);
                return;
              }
              mutation.mutate();
            }}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              "Salvar ajuste"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}