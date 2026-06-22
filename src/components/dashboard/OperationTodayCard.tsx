import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, CheckCircle2, Activity, FileCheck2, Plus } from "lucide-react";
import type { DashboardMetrics } from "@/lib/serviceOrders/metrics";
import type { Period, PeriodRange } from "@/lib/serviceOrders/period";
import { periodContextLabel, periodLabel } from "@/lib/serviceOrders/period";

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function OperationTodayCard({
  greetingName,
  metrics,
  period,
  periodRange,
}: {
  greetingName: string;
  metrics: DashboardMetrics;
  period: Period;
  periodRange?: PeriodRange;
}) {
  const pendingTotal = metrics.pending + metrics.inProgress + metrics.awaitingReview;
  const contextLabel = periodContextLabel(period, periodRange);
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1d] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
    >
      {/* technical dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      {/* directional cursor glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(255,122,24,0.10), transparent 55%)",
        }}
        aria-hidden
      />
      {/* corner ambient halos */}
      <div
        className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[#ff7a18]/[0.06] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 size-72 rounded-full bg-cyan-500/[0.04] blur-3xl"
        aria-hidden
      />

      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
                aria-hidden
              />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
                Operação · {periodLabel[period]}
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-[34px]">
                {greetingPrefix()}, <span className="text-foreground">{greetingName}</span>
                <span className="text-muted-foreground/60">.</span>
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {metrics.total === 0 ? (
                  <>Nenhuma OS registrada {contextLabel}. Hora de começar.</>
                ) : pendingTotal === 0 ? (
                  <>
                    Todas as{" "}
                    <span className="font-semibold text-emerald-400">{metrics.total} OS</span>{" "}
                    {contextLabel} foram fechadas. Operação em dia.
                  </>
                ) : (
                  <>
                    Você tem{" "}
                    <span className="font-semibold italic text-primary">
                      {pendingTotal} ordens de serviço
                    </span>{" "}
                    em aberto {contextLabel}.
                  </>
                )}
              </p>
            </div>
          </div>

          <Link
            to="/ordens/nova"
            className="group/cta relative flex shrink-0 items-center justify-center gap-2.5 self-start rounded-xl bg-primary px-7 py-3.5 font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-[0_18px_36px_-14px_oklch(0.72_0.19_50/0.55),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-[0_22px_42px_-14px_oklch(0.72_0.19_50/0.7),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-0 active:scale-[0.97] lg:self-end"
          >
            <Plus
              size={18}
              strokeWidth={2.5}
              className="transition-transform group-hover/cta:rotate-90"
            />
            <span className="text-[13px]">Nova OS</span>
          </Link>
        </div>

        {/* mini status modules */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Abertas" value={metrics.pending} icon={ClipboardList} tone="steel" />
          <Stat label="Em execução" value={metrics.inProgress} icon={Activity} tone="orange" />
          <Stat
            label="Aguard. revisão"
            value={metrics.awaitingReview}
            icon={FileCheck2}
            tone="amber"
          />
          <Stat label="Concluídas" value={metrics.done} icon={CheckCircle2} tone="green" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ClipboardList;
  tone: "steel" | "orange" | "amber" | "green";
}) {
  const tones = {
    steel: {
      icon: "text-slate-300",
      rail: "bg-slate-300",
    },
    orange: {
      icon: "text-[#ff9a4d]",
      rail: "bg-[#ff7a18]",
    },
    amber: {
      icon: "text-amber-300",
      rail: "bg-amber-300",
    },
    green: {
      icon: "text-emerald-300",
      rail: "bg-emerald-300",
    },
  }[tone];
  const formatted = String(value).padStart(2, "0");
  return (
    <div className="group/stat relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 pl-4 transition-colors duration-200 hover:bg-white/[0.05]">
      <div
        aria-hidden
        className={`absolute bottom-2.5 left-0 top-2.5 w-[2px] rounded-r-full ${tones.rail} opacity-80`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
          {label}
        </span>
        <Icon size={14} className={`${tones.icon} shrink-0`} strokeWidth={2.2} />
      </div>
      <p className="mt-2.5 font-display text-2xl font-black leading-none tracking-tight text-foreground tabular-nums sm:text-[1.75rem]">
        {formatted}
      </p>
    </div>
  );
}
