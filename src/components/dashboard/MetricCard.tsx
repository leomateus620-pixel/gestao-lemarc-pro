import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricAccent = "orange" | "blue" | "steel" | "amber" | "green" | "red";

const accentRing: Record<MetricAccent, string> = {
  orange: "from-[#ff7a18]/60 to-transparent",
  blue: "from-sky-400/60 to-transparent",
  steel: "from-slate-400/40 to-transparent",
  amber: "from-amber-400/60 to-transparent",
  green: "from-emerald-400/60 to-transparent",
  red: "from-rose-500/70 to-transparent",
};

const accentIcon: Record<MetricAccent, string> = {
  orange: "bg-[#ff7a18]/15 text-[#ff9a4d] border-[#ff7a18]/40",
  blue: "bg-sky-500/15 text-sky-300 border-sky-400/40",
  steel: "bg-slate-500/15 text-slate-200 border-slate-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/40",
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  red: "bg-rose-500/20 text-rose-300 border-rose-400/50",
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e1b2e] via-[#0a1424] to-[#070e1a] p-4 text-left transition lemarc-pressable",
        "shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]",
        emphasis && "border-rose-400/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25),0_18px_40px_-22px_rgba(244,63,94,0.6)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br opacity-70 blur-2xl",
          accentRing[accent],
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 font-display text-4xl font-black leading-none text-foreground">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border",
            accentIcon[accent],
          )}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-snug text-muted-foreground">{subtitle}</p>
      {badge && (
        <span
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em]",
            accentIcon[accent],
          )}
        >
          {badge}
        </span>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/80">
          {footerLabel}
        </span>
        <ArrowUpRight
          size={14}
          className="text-primary opacity-70 transition group-hover:opacity-100"
        />
      </div>
    </button>
  );
}