import { cn } from "@/lib/utils";

export type OrderStatus = "pending" | "transit" | "running" | "review" | "done";

const labels: Record<OrderStatus, string> = {
  pending: "Pendente",
  transit: "Em deslocamento",
  running: "Em execução",
  review: "Em revisão",
  done: "Concluída",
};

const styles: Record<OrderStatus, string> = {
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  transit: "bg-status-transit/15 text-status-transit border-status-transit/30",
  running: "bg-status-running/15 text-status-running border-status-running/40",
  review: "bg-status-review/15 text-status-review border-status-review/30",
  done: "bg-status-done/15 text-status-done border-status-done/30",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

export const statusLabels = labels;
