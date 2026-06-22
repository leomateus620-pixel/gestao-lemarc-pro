import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { cn } from "@/lib/utils";

export type MetricAccent = "orange" | "blue" | "steel" | "amber" | "green" | "red";

const accentConfig: Record<MetricAccent, { color: string; glow: string }> = {
  orange: { color: "var(--primary)", glow: "oklch(0.72 0.19 50 / 0.4)" },
  blue: { color: "var(--status-transit)", glow: "oklch(0.7 0.15 230 / 0.32)" },
  steel: { color: "var(--status-pending)", glow: "oklch(0.72 0.025 250 / 0.24)" },
  amber: { color: "var(--status-review)", glow: "oklch(0.78 0.16 90 / 0.32)" },
  green: { color: "var(--status-done)", glow: "oklch(0.7 0.16 155 / 0.26)" },
  red: { color: "var(--destructive)", glow: "oklch(0.62 0.22 25 / 0.36)" },
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
    maxRotate: 3.2,
    mobileMaxRotate: 0.9,
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
        "group/metric lemarc-kinetic-card relative flex h-full min-h-[148px] w-full flex-col overflow-hidden rounded-[1.4rem] border border-white/[0.09] bg-[linear-gradient(155deg,oklch(0.265_0.042_252/0.94),oklch(0.135_0.036_252/0.92))] p-4 text-left shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_16px_36px_-26px_oklch(0_0_0/0.85),0_6px_16px_-18px_var(--lemarc-card-glow)] backdrop-blur-xl outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5",
        onClick &&
          "hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_36%,white_8%)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.14),0_20px_44px_-24px_oklch(0_0_0/0.9),0_10px_22px_-16px_var(--lemarc-card-glow)]",
        !onClick && "cursor-default",
        emphasis &&
          "border-destructive/40",
      )}
      data-kinetic-active={physics.active}
      style={style}
      aria-label={`${title}: ${value}`}
      {...physics.handlers}
    >
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className={cn(
          "absolute bottom-5 left-0 top-5 w-[3px] rounded-r-full bg-gradient-to-b from-[var(--lemarc-card-accent)] via-[color-mix(in_oklab,var(--lemarc-card-accent)_70%,transparent)] to-transparent shadow-[0_0_18px_var(--lemarc-card-glow)]",
          emphasis && "animate-pulse",
        )}
      />

      {/* watermark icon */}
      <Icon
        aria-hidden="true"
        size={92}
        strokeWidth={1.4}
        className="pointer-events-none absolute -bottom-3 -right-3 text-[var(--lemarc-card-accent)] opacity-[0.07]"
      />

      <div className="relative pl-3 flex h-full flex-col">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <p className="font-display text-[2.4rem] font-black leading-[0.85] text-foreground tabular-nums sm:text-[2.6rem]">
            {value}
          </p>
          {isEmpty && (
            <span className="mb-1 text-[0.56rem] font-black uppercase tracking-[0.1em] text-muted-foreground/70">
              · sem registros
            </span>
          )}
          {badge && !isEmpty && (
            <span className="mb-1 inline-flex items-center gap-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--lemarc-card-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />
              {badge}
            </span>
          )}
        </div>

        <p className="mt-2.5 line-clamp-2 text-[0.76rem] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="truncate text-[0.62rem] font-black uppercase tracking-[0.14em] text-foreground/70">
            {footerLabel}
          </span>
          <ArrowUpRight
            size={14}
            className={cn(
              "shrink-0 text-[var(--lemarc-card-accent)] transition-transform duration-200",
              onClick && "group-hover/metric:-translate-y-0.5 group-hover/metric:translate-x-0.5",
            )}
          />
        </div>
      </div>
    </button>
  );
}
