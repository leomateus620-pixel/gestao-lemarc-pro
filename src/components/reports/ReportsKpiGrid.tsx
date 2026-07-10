import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "warning" | "success" | "danger";
  alert?: boolean;
  wideOnMobile?: boolean;
  featured?: boolean;
  unavailable?: boolean;
};

const TONE: Record<
  NonNullable<Kpi["tone"]>,
  { text: string; icon: string; accent: string; glow: string }
> = {
  default: {
    text: "text-foreground",
    icon: "text-slate-100",
    accent: "oklch(0.86 0.012 250)",
    glow: "oklch(1 0 0 / 0.18)",
  },
  primary: {
    text: "text-primary",
    icon: "text-primary",
    accent: "oklch(0.72 0.19 50)",
    glow: "oklch(0.72 0.19 50 / 0.3)",
  },
  warning: {
    text: "text-status-review",
    icon: "text-status-review",
    accent: "oklch(0.78 0.16 90)",
    glow: "oklch(0.78 0.16 90 / 0.28)",
  },
  success: {
    text: "text-status-done",
    icon: "text-status-done",
    accent: "oklch(0.7 0.16 155)",
    glow: "oklch(0.7 0.16 155 / 0.26)",
  },
  danger: {
    text: "text-destructive",
    icon: "text-destructive",
    accent: "oklch(0.62 0.22 25)",
    glow: "oklch(0.62 0.22 25 / 0.28)",
  },
};

export function ReportsKpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-labelledby="report-kpi-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="lemarc-report-section-kicker">Indicadores do período</p>
          <h2 id="report-kpi-title" className="lemarc-report-section-title">
            Visão geral da operação
          </h2>
        </div>
        <span className="hidden text-[11px] font-bold text-slate-700 sm:block">
          Valores calculados com os dados filtrados
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:gap-3.5">
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
                "lemarc-report-card lemarc-report-card-hover lemarc-report-kpi min-w-0 p-3.5 sm:p-4",
                kpi.wideOnMobile && "min-[360px]:col-span-2 sm:col-span-1",
                kpi.featured && "lg:col-span-2 xl:col-span-1",
                kpi.alert && "ring-1 ring-status-review/45",
              )}
              aria-label={`${kpi.label}: ${kpi.value}`}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold leading-snug text-slate-200/90">
                    {kpi.label}
                  </div>
                  {kpi.alert && (
                    <span className="mt-1.5 inline-flex rounded-full border border-status-review/35 bg-status-review/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-status-review">
                      Requer atenção
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] shadow-inner",
                    theme.icon,
                  )}
                >
                  <Icon size={18} strokeWidth={2.3} aria-hidden="true" />
                </div>
              </div>

              <div
                className={cn(
                  "mt-3 min-w-0 font-display font-black tabular-nums tracking-[-0.035em]",
                  kpi.unavailable
                    ? "text-base leading-tight text-slate-300"
                    : "lemarc-report-kpi-value whitespace-nowrap leading-none",
                  !kpi.unavailable && theme.text,
                )}
              >
                {kpi.value}
              </div>

              {kpi.hint && (
                <p className="mt-2 text-[11px] font-semibold leading-[1.42] text-slate-300/84">
                  {kpi.hint}
                </p>
              )}

              <div
                className="mt-3 h-0.5 w-10 rounded-full bg-[var(--lemarc-report-accent)] opacity-75"
                aria-hidden="true"
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ReportsKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="lemarc-report-card h-36 animate-pulse rounded-2xl motion-reduce:animate-none"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
