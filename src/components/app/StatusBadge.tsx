import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "transit" | "running" | "finished" | "review" | "approved";

const labels: Record<OrderStatus, string> = {
  pending: "Pendente",
  transit: "Em deslocamento",
  running: "Em execução",
  finished: "Finalizada pelo técnico",
  review: "Aguardando revisão",
  approved: "Aprovada para cobrança",
};

const styles: Record<OrderStatus, string> = {
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  transit: "bg-status-transit/15 text-status-transit border-status-transit/30",
  running: "bg-status-running/15 text-status-running border-status-running/40",
  finished: "bg-status-review/15 text-status-review border-status-review/30",
  review: "bg-status-review/15 text-status-review border-status-review/30",
  approved: "bg-status-done/15 text-status-done border-status-done/30",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", styles[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
      {labels[status]}
    </span>
  );
}

export const statusLabels = labels;
