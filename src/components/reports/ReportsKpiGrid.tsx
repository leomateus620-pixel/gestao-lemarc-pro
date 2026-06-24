import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success" | "danger";
  alert?: boolean;
};

const TONE: Record<
  NonNullable<Kpi["tone"]>,
  { text: string; icon: string; accent: string; glow: string; rail: string }
> = {
  default: {
    text: "text-foreground",
    icon: "text-slate-100",
    accent: "oklch(0.86 0.012 250)",
    glow: "oklch(1 0 0 / 0.22)",
    rail: "from-white/65 to-white/10",
  },
  primary: {
    text: "text-primary",
    icon: "text-primary",
    accent: "oklch(0.72 0.19 50)",
    glow: "oklch(0.72 0.19 50 / 0.38)",
    rail: "from-primary to-primary/20",
  },
  warning: {
    text: "text-status-review",
    icon: "text-status-review",
    accent: "oklch(0.78 0.16 90)",
    glow: "oklch(0.78 0.16 90 / 0.35)",
    rail: "from-status-review to-status-review/20",
  },
  success: {
    text: "text-status-done",
    icon: "text-status-done",
    accent: "oklch(0.7 0.16 155)",
    glow: "oklch(0.7 0.16 155 / 0.34)",
    rail: "from-status-done to-status-done/20",
  },
  danger: {
    text: "text-destructive",
    icon: "text-destructive",
    accent: "oklch(0.62 0.22 25)",
    glow: "oklch(0.62 0.22 25 / 0.34)",
    rail: "from-destructive to-destructive/20",
  },
};

export function ReportsKpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-3.5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const tone = kpi.tone ?? "default";
        const theme = TONE[tone];
        return (
          <article
            key={kpi.label}
            style={
              {
                "--lemarc-report-accent": theme.accent,
                "--lemarc-report-glow": theme.glow,
              } as CSSProperties
            }
            className={cn(
              "lemarc-report-card lemarc-report-card-hover min-h-[118px] p-3.5 sm:min-h-[128px] sm:p-4",
              kpi.alert && "ring-1 ring-status-review/45",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300/85">
                  {kpi.label}
                </div>
                {kpi.alert && (
                  <div className="mt-1 inline-flex rounded-full border border-status-review/35 bg-status-review/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-status-review">
                    Atenção
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] shadow-inner",
                  theme.icon,
                )}
              >
                <Icon size={17} strokeWidth={2.4} />
              </div>
            </div>
            <div
              className={cn(
                "mt-3 break-words font-display text-[1.62rem] font-black leading-none tabular-nums sm:text-[2rem]",
                theme.text,
              )}
            >
              {kpi.value}
            </div>
            {kpi.hint && (
              <div className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-slate-300/82">
                {kpi.hint}
              </div>
            )}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className={cn("h-full w-2/3 rounded-full bg-gradient-to-r", theme.rail)} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="lemarc-report-card h-[118px] animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
