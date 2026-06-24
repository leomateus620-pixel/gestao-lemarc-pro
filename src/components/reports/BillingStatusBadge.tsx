import type { BillingStatus } from "@/types/reports";
import { billingStatusLabel } from "@/types/reports";
import { cn } from "@/lib/utils";

const STYLES: Record<BillingStatus, string> = {
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  ready: "bg-status-review/15 text-status-review border-status-review/30",
  billed: "bg-status-done/15 text-status-done border-status-done/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function BillingStatusBadge({ status, className }: { status: BillingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
        STYLES[status],
        className,
      )}
    >
      {billingStatusLabel[status]}
    </span>
  );
}