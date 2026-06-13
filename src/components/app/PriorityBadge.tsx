import { cn } from "@/lib/utils";
export type Priority = "baixa" | "media" | "alta";
const styles: Record<Priority, string> = {
  baixa: "border-status-done/30 bg-status-done/10 text-status-done",
  media: "border-status-review/30 bg-status-review/10 text-status-review",
  alta: "border-destructive/40 bg-destructive/15 text-destructive",
};
export function PriorityBadge({ prioridade, className }: { prioridade: Priority; className?: string }) {
  return <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", styles[prioridade], className)}>{prioridade === "alta" ? "Urgente" : prioridade}</span>;
}
