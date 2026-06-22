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
    maxRotate: hasSummary ? 5 : 3.2,
    mobileMaxRotate: hasSummary ? 1.25 : 0.9,
    lift: hasSummary ? -4 : -2,
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
    "group/card relative block h-full w-full overflow-hidden rounded-[1.45rem] border border-white/[0.10] bg-[linear-gradient(145deg,oklch(0.31_0.045_252/0.94),oklch(0.18_0.04_252/0.90))] text-left shadow-[inset_0_1px_0_oklch(1_0_0/0.13),0_20px_44px_-28px_oklch(0_0_0/0.88),0_8px_18px_-18px_var(--lemarc-card-glow)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    onClick &&
      "lemarc-kinetic-card hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_38%,white_8%)]",
    !onClick && "cursor-default",
    emphasis &&
      "border-rose-300/35 shadow-[0_0_0_1px_rgba(251,113,133,0.20),0_26px_58px_-28px_rgba(244,63,94,0.62)]",
    className,
  );

  const content = (
    <>
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lemarc-card-accent)] to-transparent opacity-70"
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute bottom-5 left-0 top-5 w-[5px] rounded-r-full bg-[var(--lemarc-card-accent)] shadow-[0_0_22px_var(--lemarc-card-glow)]",
          emphasis && "animate-pulse",
        )}
      />
      <Icon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-5 -right-4 size-28 opacity-[0.055] transition duration-300 group-hover/card:opacity-[0.10]",
          config.icon,
        )}
        strokeWidth={1.4}
      />

      <div
        className={cn(
          "relative flex flex-col p-4 sm:p-5",
          hasSummary ? "min-h-[250px] sm:min-h-[268px]" : "min-h-[164px] sm:min-h-[176px]",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            {periodLabel && (
              <p className="mt-1 truncate text-[10px] font-bold text-muted-foreground/75">
                {periodLabel}
              </p>
            )}
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--lemarc-card-accent)_34%,white_10%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--lemarc-card-accent)_24%,transparent),oklch(1_0_0/0.045))] text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_12px_26px_-18px_var(--lemarc-card-glow)] transition-transform duration-300 group-hover/card:[transform:translateZ(22px)_scale(1.04)]">
            <Icon size={19} strokeWidth={2.4} />
          </span>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <p className="font-display text-[3.15rem] font-black leading-[0.86] tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {resolvedBadge && (
            <span
              className={cn(
                "mb-1 inline-flex min-w-0 max-w-[9rem] rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]",
                config.badge,
              )}
            >
              <span className="truncate">{resolvedBadge}</span>
            </span>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        {hasSummary && (
          <div className="mt-4 space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.055] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className="flex min-h-8 items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#102033]/70 px-2.5 py-1.5"
              >
                <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {item.label}
                </span>
                <span className="shrink-0 font-display text-sm font-black text-foreground tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="-mx-4 -mb-4 mt-auto flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[linear-gradient(90deg,color-mix(in_oklab,var(--lemarc-card-accent)_12%,transparent),transparent_48%),oklch(1_0_0/0.045)] px-4 py-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] sm:-mx-5 sm:-mb-5 sm:px-5">
          <span className="truncate font-display text-[10px] font-black uppercase tracking-[0.16em] text-foreground/90">
            {footerLabel}
          </span>
          <ArrowUpRight
            size={15}
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
