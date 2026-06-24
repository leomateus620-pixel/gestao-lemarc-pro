import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/app/GlassCard";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success" | "danger";
  alert?: boolean;
};

const TONE: Record<NonNullable<Kpi["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  warning: "text-status-review",
  success: "text-status-done",
  danger: "text-destructive",
};

export function ReportsKpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const tone = kpi.tone ?? "default";
        return (
          <GlassCard
            key={kpi.label}
            className={cn(
              "relative overflow-hidden p-3.5 sm:p-4",
              kpi.alert && "ring-1 ring-status-review/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                {kpi.label}
              </div>
              <Icon size={16} className={cn(TONE[tone], "shrink-0 opacity-80")} />
            </div>
            <div
              className={cn(
                "mt-2 font-display text-2xl font-black leading-none tabular-nums sm:text-[28px]",
                TONE[tone],
              )}
            >
              {kpi.value}
            </div>
            {kpi.hint && (
              <div className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                {kpi.hint}
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

export function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card h-[104px] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}