import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Item = { id: string; name: string; state: "paused" | "finished" };

export function ResumeTeamDialog({
  open,
  onOpenChange,
  items,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: Item[];
  pending: boolean;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (open) setSelected(items.map((i) => i.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => (on ? Array.from(new Set([...s, id])) : s.filter((x) => x !== id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voltar a trabalhar com a equipe</DialogTitle>
          <DialogDescription>Desmarque quem não vai voltar agora.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Checkbox
                  checked={selected.includes(i.id)}
                  onCheckedChange={(v) => toggle(i.id, v === true)}
                />
                <span className="flex-1 text-sm font-semibold text-foreground">{i.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {i.state === "paused" ? "Em pausa" : "Encerrado"}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button
            className="min-h-11 w-full gap-2 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            disabled={pending || selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Voltar a trabalhar ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
