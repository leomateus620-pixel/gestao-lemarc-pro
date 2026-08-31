import { useEffect, useMemo, useRef, useState } from "react";
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
import { createManualTimeSession, updateOwnTimeSession } from "@/lib/api/timeSessions.functions";
import { PAUSE_REASONS, type TimeSession } from "@/lib/serviceOrders/timeSessions";
import type { AssignedTechnician } from "@/types/serviceOrder";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TimeSession | null;
  orderId: string;
  technicianName?: string | null;
  availableTechnicians?: AssignedTechnician[];
  onSaved?: () => void | Promise<unknown>;
};

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

function initialManualStart() {
  return isoToLocalInput(new Date(Date.now() - 60 * 60 * 1000).toISOString());
}

function initialManualEnd() {
  return isoToLocalInput(new Date().toISOString());
}

export function EditTimeSessionSheet({
  open,
  onOpenChange,
  session,
  orderId,
  technicianName,
  availableTechnicians = [],
  onSaved,
}: Props) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateOwnTimeSession);
  const createFn = useServerFn(createManualTimeSession);
  const isCreate = !session;
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [pauseReason, setPauseReason] = useState<string>("");
  const initializedDraftRef = useRef<string | null>(null);
  /** Motivo automático: mantém a auditoria sem pedir texto ao usuário. */
  const autoReason = session
    ? "Ajuste de horário feito na revisão de horas da OS"
    : "Horário adicionado na revisão de horas da OS";


  const isPaused = session?.end_reason === "pause";
  const isOpen = session ? !session.ended_at : false;

  const defaultTechnicianId = availableTechnicians[0]?.id ?? "";

  useEffect(() => {
    if (!open) {
      initializedDraftRef.current = null;
      return;
    }

    const draftKey = session ? `edit:${session.id}` : "create";
    if (initializedDraftRef.current === draftKey) return;
    initializedDraftRef.current = draftKey;

    if (session) {
      setStartInput(isoToLocalInput(session.started_at));
      setEndInput(isoToLocalInput(session.ended_at));
      setTechnicianId(session.technician_id ?? "");
      setPauseReason(session.pause_reason ?? "");
    } else {
      setStartInput(initialManualStart());
      setEndInput(initialManualEnd());
      setTechnicianId(defaultTechnicianId);
      setPauseReason("");
    }
    // O rascunho pertence a esta abertura. Refetches, listas novas e o cronômetro
    // O rascunho pertence a esta abertura. Refetches, listas novas e o cronômetro
    // não podem reinicializar valores que o usuário já digitou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, open]);

  useEffect(() => {
    if (!open || session) return;
    setTechnicianId((current) => (current ? current : defaultTechnicianId));
  }, [open, session, defaultTechnicianId]);

  const validationError = useMemo(() => {
    const startIso = localInputToIso(startInput);
    if (!startIso) return "Informe a data/hora de início.";
    if (isCreate && !technicianId) return "Selecione o técnico.";
    if (!isOpen) {
      const endIso = localInputToIso(endInput);
      if (!endIso) return "Informe a data/hora de fim.";
      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        return "O fim precisa ser maior que o início.";
      }
      if (new Date(endIso).getTime() - new Date(startIso).getTime() > 14 * 60 * 60 * 1000) {
        return "Um intervalo não pode passar de 14 horas.";
      }
      if (new Date(endIso).getTime() > Date.now() + 60_000)
        return "O fim não pode estar no futuro.";
    }
    if (new Date(startIso).getTime() > Date.now() + 60_000)
      return "O início não pode estar no futuro.";
    return null;
  }, [session, startInput, endInput, technicianId, isOpen, isCreate]);

  const mutation = useMutation({
    mutationFn: async () => {
      const startIso = localInputToIso(startInput);
      if (!startIso) throw new Error("Início inválido.");
      if (isCreate) {
        const endIso = localInputToIso(endInput);
        if (!endIso || !technicianId) throw new Error("Informe técnico, início e fim.");
        return createFn({
          data: {
            orderId,
            technicianId,
            startedAt: startIso,
            endedAt: endIso,
            reason: reason.trim(),
          },
        });
      }

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
      }
      return updateFn({ data: payload });
    },
    onSuccess: async () => {
      toast.success(
        isCreate
          ? "Horário adicionado. Totais e relatórios recalculados."
          : "Horário atualizado. Totais e relatórios recalculados.",
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["order-time-review", orderId] }),
        qc.invalidateQueries({ queryKey: ["order-time-review-state", orderId] }),
        qc.invalidateQueries({ queryKey: ["order-time-sessions", orderId] }),
        qc.invalidateQueries({ queryKey: ["order-financials", orderId] }),
        qc.invalidateQueries({ queryKey: ["service-order", orderId] }),
      ]);
      await onSaved?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar horário");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-10 sm:px-6">
          <DialogTitle>{isCreate ? "Adicionar horário" : "Editar horário"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Registre um intervalo que faltou no histórico."
              : technicianName
                ? `Ajuste o horário de ${technicianName}.`
                : "Ajuste o horário registrado."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {isCreate && (
            <div className="space-y-1">
              <Label>Técnico</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {availableTechnicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      {technician.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
          )}
        </div>


        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            disabled={
              !!validationError ||
              mutation.isPending ||
              (isCreate && availableTechnicians.length === 0)
            }
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : isCreate ? (
              "Adicionar horário"
            ) : (
              "Salvar ajuste"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
