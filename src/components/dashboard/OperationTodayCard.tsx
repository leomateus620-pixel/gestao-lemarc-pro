import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, CheckCircle2, Activity, FileCheck2, Plus } from "lucide-react";
import { MetricPeriodFilter } from "./MetricPeriodFilter";
import type { Period } from "@/lib/serviceOrders/period";
import { periodLabel } from "@/lib/serviceOrders/period";
import type { DashboardMetrics } from "@/lib/serviceOrders/metrics";

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
  onPeriodChange,
}: {
  greetingName: string;
  metrics: DashboardMetrics;
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  const pendingTotal = metrics.pending + metrics.inProgress + metrics.awaitingReview;
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
      <div className="relative p-6 sm:p-8">
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
                  <>Nenhuma OS registrada no período. Hora de começar.</>
                ) : pendingTotal === 0 ? (
                  <>
                    Todas as{" "}
                    <span className="font-semibold text-emerald-400">{metrics.total} OS</span> do
                    período foram fechadas. Operação em dia.
                  </>
                ) : (
                  <>
                    Você tem{" "}
                    <span className="font-semibold italic text-primary">
                      {pendingTotal} ordens de serviço
                    </span>{" "}
                    em aberto neste período.
                  </>
                )}
              </p>
            </div>

            <MetricPeriodFilter value={period} onChange={onPeriodChange} />
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
      hover: "group-hover/stat:text-slate-100",
      icon: "text-slate-300",
      border: "hover:border-white/[0.16]",
      rail: "bg-slate-300",
      chip: "border-white/[0.08] bg-white/[0.04]",
    },
    orange: {
      hover: "group-hover/stat:text-[#ff9a4d]",
      icon: "text-[#ff9a4d]",
      border: "hover:border-[#ff7a18]/30",
      rail: "bg-[#ff7a18]",
      chip: "border-[#ff7a18]/25 bg-[#ff7a18]/10",
    },
    amber: {
      hover: "group-hover/stat:text-amber-300",
      icon: "text-amber-300",
      border: "hover:border-amber-400/30",
      rail: "bg-amber-300",
      chip: "border-amber-400/25 bg-amber-400/10",
    },
    green: {
      hover: "group-hover/stat:text-emerald-300",
      icon: "text-emerald-300",
      border: "hover:border-emerald-400/30",
      rail: "bg-emerald-300",
      chip: "border-emerald-400/25 bg-emerald-400/10",
    },
  }[tone];
  const formatted = String(value).padStart(2, "0");
  return (
    <div
      className={`group/stat relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 pl-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.055] ${tones.border}`}
    >
      <div
        aria-hidden
        className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${tones.rail}`}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
          {label}
        </span>
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl border ${tones.chip}`}
        >
          <Icon size={13} className={`${tones.icon} transition-colors`} strokeWidth={2.2} />
        </span>
      </div>
      <p
        className={`mt-3 font-display text-3xl font-black leading-none tracking-tight text-foreground transition-colors ${tones.hover}`}
      >
        {formatted}
      </p>
    </div>
  );
}
