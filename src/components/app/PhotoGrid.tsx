import { Image as ImageIcon } from "lucide-react";
export function PhotoGrid({ count }: { count: number }) {
  if (!count) return <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center text-xs text-muted-foreground">Nenhuma foto registrada ainda</div>;
  return <div className="grid grid-cols-3 gap-2">{Array.from({ length: Math.min(count, 6) }).map((_, i) => <div key={i} className="blueprint-pattern grid aspect-square place-items-center rounded-xl border border-border text-muted-foreground/50"><ImageIcon size={20} /></div>)}</div>;
}
