import type { Period } from "@/lib/serviceOrders/period";
import { cn } from "@/lib/utils";

const items: { key: Period; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

export function MetricPeriodFilter({
  value,
  onChange,
  className,
}: {
  value: Period;
  onChange: (p: Period) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md",
        className,
      )}
    >
      {items.map((it) => {
        const active = value === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
              active
                ? "bg-white/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}