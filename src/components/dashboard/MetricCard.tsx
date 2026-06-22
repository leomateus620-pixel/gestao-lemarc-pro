import type { CSSProperties, ReactNode, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { cn } from "@/lib/utils";

export type MetricAccent = "orange" | "blue" | "steel" | "amber" | "green" | "red";

export type MetricSummaryItem = {
  label: string;
  value: ReactNode;
};

const accentConfig: Record<
  MetricAccent,
  {
    color: string;
    glow: string;
    badge: string;
    icon: string;
  }
> = {
  orange: {
    color: "var(--primary)",
    glow: "oklch(0.72 0.19 50 / 0.54)",
    badge: "border-primary/35 bg-primary/12 text-primary",
    icon: "text-primary",
  },
  blue: {
    color: "var(--status-transit)",
    glow: "oklch(0.7 0.15 230 / 0.42)",
    badge: "border-sky-400/35 bg-sky-400/12 text-sky-300",
    icon: "text-sky-300",
  },
  steel: {
    color: "var(--status-pending)",
    glow: "oklch(0.72 0.025 250 / 0.34)",
    badge: "border-slate-300/25 bg-slate-300/10 text-slate-200",
    icon: "text-slate-200",
  },
  amber: {
    color: "var(--status-review)",
    glow: "oklch(0.78 0.16 90 / 0.42)",
    badge: "border-amber-300/35 bg-amber-300/12 text-amber-200",
    icon: "text-amber-200",
  },
  green: {
    color: "var(--status-done)",
    glow: "oklch(0.7 0.16 155 / 0.36)",
    badge: "border-emerald-300/35 bg-emerald-300/12 text-emerald-200",
    icon: "text-emerald-200",
  },
  red: {
    color: "var(--destructive)",
    glow: "oklch(0.62 0.22 25 / 0.46)",
    badge: "border-rose-300/40 bg-rose-400/13 text-rose-200",
    icon: "text-rose-200",
  },
};

function isZero(value: string | number) {
  return Number(value) === 0;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  footerLabel,
  accent = "blue",
  badge,
  onClick,
  emphasis = false,
  summaryItems = [],
  periodLabel,
  className,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  footerLabel: string;
  accent?: MetricAccent;
  badge?: string;
  onClick?: () => void;
  emphasis?: boolean;
  summaryItems?: MetricSummaryItem[];
  periodLabel?: string;
  className?: string;
}) {
  const hasSummary = summaryItems.length > 0;
  const physics = usePhysicsCard<HTMLButtonElement | HTMLElement>({
    maxRotate: hasSummary ? 3.4 : 2.4,
    mobileMaxRotate: hasSummary ? 0.9 : 0.6,
    lift: hasSummary ? -3 : -1.5,
    perspective: 1350,
    disabled: !onClick,
  });
  const config = accentConfig[accent];
  const resolvedBadge = badge ?? (isZero(value) ? "Sem registros" : undefined);
  const style = {
    ...physics.style,
    "--lemarc-card-accent": config.color,
    "--lemarc-card-glow": config.glow,
  } as CSSProperties;
  const classes = cn(
    "group/card relative block h-full w-full overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[linear-gradient(150deg,oklch(0.28_0.04_252/0.92),oklch(0.17_0.035_252/0.92))] text-left shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_16px_36px_-26px_oklch(0_0_0/0.85)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    onClick &&
      "lemarc-kinetic-card hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_28%,white_6%)]",
    !onClick && "cursor-default",
    emphasis &&
      "border-rose-300/25 shadow-[0_0_0_1px_rgba(251,113,133,0.16),0_22px_48px_-28px_rgba(244,63,94,0.45)]",
    className,
  );

  const content = (
    <>
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className={cn(
          "absolute bottom-6 left-0 top-6 w-[3px] rounded-r-full bg-[var(--lemarc-card-accent)] opacity-90 shadow-[0_0_14px_var(--lemarc-card-glow)]",
          emphasis && "animate-pulse",
        )}
      />
      <Icon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-6 -right-6 size-24 opacity-[0.035] transition duration-300 group-hover/card:opacity-[0.06]",
          config.icon,
        )}
        strokeWidth={1.4}
      />

      <div
        className={cn(
          "relative flex flex-col p-4 sm:p-5",
          hasSummary ? "min-h-[244px] sm:min-h-[252px]" : "min-h-[160px] sm:min-h-[172px]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            {periodLabel && (
              <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground/65">
                {periodLabel}
              </p>
            )}
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--lemarc-card-accent)_22%,white_6%)] bg-[color-mix(in_oklab,var(--lemarc-card-accent)_14%,transparent)] text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.12)] transition-transform duration-300 group-hover/card:[transform:translateZ(18px)_scale(1.03)]">
            <Icon size={17} strokeWidth={2.3} />
          </span>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <p className="font-display text-[2.9rem] font-black leading-[0.86] tracking-tight text-foreground tabular-nums sm:text-[3.05rem]">
            {value}
          </p>
          {resolvedBadge && (
            <span
              className={cn(
                "mb-1.5 inline-flex max-w-[10rem] rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]",
                config.badge,
              )}
            >
              <span className="truncate">{resolvedBadge}</span>
            </span>
          )}
        </div>

        <p className="mt-2.5 line-clamp-2 text-[11.5px] font-medium leading-relaxed text-muted-foreground/85">
          {subtitle}
        </p>

        {hasSummary && (
          <div className="mt-3.5 divide-y divide-white/[0.045] rounded-xl border border-white/[0.05] bg-white/[0.022] px-3 py-1">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="flex min-h-7 items-center justify-between gap-3 py-1.5"
              >
                <span className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  {item.label}
                </span>
                <span className="shrink-0 font-display text-[13px] font-bold text-foreground/95 tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="-mx-4 -mb-4 mt-auto flex items-center justify-between gap-3 border-t border-white/[0.05] bg-white/[0.018] px-4 py-2.5 sm:-mx-5 sm:-mb-5 sm:px-5">
          <span className="truncate font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover/card:text-foreground">
            {footerLabel}
          </span>
          <ArrowUpRight
            size={14}
            className={cn(
              "shrink-0 text-[var(--lemarc-card-accent)] transition-transform duration-200",
              onClick && "group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5",
            )}
          />
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        ref={physics.ref as RefObject<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={classes}
        style={style}
        data-kinetic-active={physics.active}
        aria-label={`${title}: ${value}. ${footerLabel}`}
        {...physics.handlers}
      >
        {content}
      </button>
    );
  }

  return (
    <article
      ref={physics.ref as RefObject<HTMLElement>}
      className={classes}
      style={style}
      aria-label={`${title}: ${value}`}
    >
      {content}
    </article>
  );
}
