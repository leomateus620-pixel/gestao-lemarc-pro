import type { BillingStatus } from "@/types/reports";
import { billingStatusLabel } from "@/types/reports";
import { cn } from "@/lib/utils";

const STYLES: Record<BillingStatus, string> = {
  pending: "bg-status-pending/15 text-slate-200 border-status-pending/35",
  ready: "bg-status-review/15 text-status-review border-status-review/45",
  billed: "bg-status-done/15 text-status-done border-status-done/45",
  cancelled: "bg-destructive/15 text-destructive border-destructive/45",
};

export function BillingStatusBadge({
  status,
  className,
}: {
  status: BillingStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[0.08em] shadow-inner",
        STYLES[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
      {billingStatusLabel[status]}
    </span>
  );
}
