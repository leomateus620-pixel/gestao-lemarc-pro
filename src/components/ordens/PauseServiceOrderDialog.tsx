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
  /** Técnicos com tempo em andamento (candidatos à pausa). */
  technicians: Array<{ id: string; name: string }>;
  defaultSelectedIds: string[];
  onConfirm: (data: { technicianIds: string[]; reason: string; notes: string | null }) => void;
  pending?: boolean;
};

export function PauseServiceOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  technicians,
  defaultSelectedIds,
  onConfirm,
  pending,
}: Props) {
  const [reason, setReason] = useState<string>("almoco");
  const [notes, setNotes] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setReason("almoco");
      setNotes("");
      setSelected(defaultSelectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const requiresNotes = reason === "outro";
  const canConfirm = reason && selected.length > 0 && (!requiresNotes || notes.trim().length > 0);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pausar OS #{orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-wider">
              Quem será pausado
            </Label>
            {technicians.length > 1 && (
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  onClick={() => setSelected(technicians.map((t) => t.id))}
                >
                  Toda a equipe
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  onClick={() => setSelected([])}
                >
                  Limpar
                </button>
              </div>
            )}
            <div className="mt-2 space-y-1">
              {technicians.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                    selected.includes(t.id)
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-current"
                    checked={selected.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                  <span className="truncate font-semibold">{t.name}</span>
                </label>
              ))}
              {technicians.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum técnico em andamento.</p>
              )}
            </div>
          </div>
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
            onClick={() =>
              onConfirm({ technicianIds: selected, reason, notes: notes.trim() || null })
            }
            disabled={!canConfirm || pending}
          >
            {pending ? "Pausando…" : "Confirmar pausa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}