import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAUSE_REASONS } from "@/lib/serviceOrders/timeSessions";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderNumber: number | string;
  technicianName?: string | null;
  onConfirm: (data: { reason: string; notes: string | null }) => void;
  pending?: boolean;
};

export function PauseServiceOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  technicianName,
  onConfirm,
  pending,
}: Props) {
  const [reason, setReason] = useState<string>("almoco");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) {
      setReason("almoco");
      setNotes("");
    }
  }, [open]);

  const requiresNotes = reason === "outro";
  const canConfirm = reason && (!requiresNotes || notes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pausar OS #{orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {technicianName && (
            <p className="text-xs text-muted-foreground">
              Pausando serviço de <span className="font-bold text-foreground">{technicianName}</span>
            </p>
          )}
          <div>
            <Label className="text-[10px] font-black uppercase tracking-wider">
              Motivo da pausa
            </Label>
            <select
              className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {PAUSE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[10px] font-black uppercase tracking-wider">
              Observação {requiresNotes && <span className="text-rose-400">(obrigatória)</span>}
            </Label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="Ex.: retorno previsto às 13h30"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ reason, notes: notes.trim() || null })}
            disabled={!canConfirm || pending}
          >
            {pending ? "Pausando…" : "Confirmar pausa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}