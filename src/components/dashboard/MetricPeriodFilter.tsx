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
        "inline-flex rounded-full border border-white/10 bg-black/30 p-0.5 backdrop-blur-md",
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
              "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition",
              active
                ? "bg-primary text-primary-foreground shadow-[0_0_18px_var(--primary)]"
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