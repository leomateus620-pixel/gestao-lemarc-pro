import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { cn } from "@/lib/utils";

export type MetricAccent = "orange" | "blue" | "steel" | "amber" | "green" | "red";

const accentConfig: Record<MetricAccent, { color: string; glow: string; icon: string }> = {
  orange: {
    color: "var(--primary)",
    glow: "oklch(0.72 0.19 50 / 0.42)",
    icon: "border-primary/35 bg-primary/[0.12]",
  },
  blue: {
    color: "var(--status-transit)",
    glow: "oklch(0.7 0.15 230 / 0.34)",
    icon: "border-status-transit/35 bg-status-transit/[0.12]",
  },
  steel: {
    color: "var(--status-pending)",
    glow: "oklch(0.72 0.025 250 / 0.26)",
    icon: "border-white/10 bg-white/[0.06]",
  },
  amber: {
    color: "var(--status-review)",
    glow: "oklch(0.78 0.16 90 / 0.34)",
    icon: "border-status-review/35 bg-status-review/[0.12]",
  },
  green: {
    color: "var(--status-done)",
    glow: "oklch(0.7 0.16 155 / 0.28)",
    icon: "border-status-done/35 bg-status-done/[0.12]",
  },
  red: {
    color: "var(--destructive)",
    glow: "oklch(0.62 0.22 25 / 0.38)",
    icon: "border-destructive/40 bg-destructive/[0.14]",
  },
};

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
}) {
  const cfg = accentConfig[accent];
  const physics = usePhysicsCard<HTMLButtonElement>({
    maxRotate: 4,
    mobileMaxRotate: 1.2,
    lift: -2,
    disabled: !onClick,
  });
  const numericValue = typeof value === "number" ? value : Number(value);
  const isEmpty = Number.isFinite(numericValue) && numericValue === 0;
  const style = {
    ...physics.style,
    "--lemarc-card-accent": cfg.color,
    "--lemarc-card-glow": cfg.glow,
  } as CSSProperties;

  return (
    <button
      ref={physics.ref}
      type="button"
      onClick={onClick}
      className={cn(
        "group/metric lemarc-kinetic-card relative flex h-full min-h-[172px] w-full flex-col overflow-hidden rounded-[1.55rem] border border-white/[0.11] bg-[linear-gradient(145deg,oklch(0.285_0.043_252/0.92),oklch(0.145_0.038_252/0.88))] p-4 text-left shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_18px_40px_-24px_oklch(0_0_0/0.86),0_8px_20px_-17px_var(--lemarc-card-glow)] backdrop-blur-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        onClick && "hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_42%,white_10%)]",
        !onClick && "cursor-default",
        emphasis &&
          "border-destructive/45 shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_22px_46px_-24px_oklch(0.62_0.22_25/0.58)]",
      )}
      data-kinetic-active={physics.active}
      style={style}
      aria-label={`${title}: ${value}`}
      {...physics.handlers}
    >
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lemarc-card-accent)] to-transparent opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-full bg-[var(--lemarc-card-accent)] shadow-[0_0_20px_var(--lemarc-card-glow)]"
      />

      <div className="relative pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {title}
            </p>
            <div className="mt-3 flex items-end gap-2">
              <p className="font-display text-[2.6rem] font-black leading-[0.85] text-foreground tabular-nums">
                {value}
              </p>
              {isEmpty && (
                <span className="mb-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
                  Sem registros
                </span>
              )}
            </div>
          </div>

          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.14)]",
              cfg.icon,
            )}
          >
            <Icon size={19} strokeWidth={2.35} />
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-[0.78rem] font-medium leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        {badge && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--lemarc-card-accent)_38%,transparent)] bg-[color-mix(in_oklab,var(--lemarc-card-accent)_12%,transparent)] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--lemarc-card-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />
            {badge}
          </span>
        )}
      </div>

      <div className="relative mt-auto flex items-center justify-between gap-2 border-t border-white/[0.08] px-2 pt-3">
        <span className="truncate text-[0.64rem] font-black uppercase tracking-[0.14em] text-foreground/80">
          {footerLabel}
        </span>
        <ArrowUpRight
          size={15}
          className={cn(
            "shrink-0 text-[var(--lemarc-card-accent)] transition-transform duration-200",
            onClick && "group-hover/metric:-translate-y-0.5 group-hover/metric:translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}
