import { Link } from "@tanstack/react-router";
import { ClipboardList, CheckCircle2, AlertOctagon, Activity, FileCheck2 } from "lucide-react";
import { MetricPeriodFilter } from "./MetricPeriodFilter";
import type { Period } from "@/lib/serviceOrders/period";
import { periodLabel } from "@/lib/serviceOrders/period";
import type { DashboardMetrics } from "@/lib/serviceOrders/metrics";

function summary(metrics: DashboardMetrics, period: Period): string {
  if (metrics.total === 0) return `Nenhuma OS no período (${periodLabel[period].toLowerCase()}).`;
  const pendingTotal = metrics.pending + metrics.inProgress + metrics.awaitingReview;
  if (pendingTotal === 0) return "Todas as OS do período foram fechadas corretamente.";
  return `${pendingTotal} OS ainda precisam de fechamento.`;
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
  const headline = `${metrics.pending + metrics.inProgress} OS abertas · ${metrics.inProgress} em execução · ${metrics.awaitingReview} em revisão`;
  const allClosed =
    metrics.total > 0 && metrics.pending + metrics.inProgress + metrics.awaitingReview === 0;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-6"
      style={{
        background:
          "linear-gradient(135deg,#0d1c33 0%,#0a1424 55%,#070d1a 100%)",
      }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#ff7a18]/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 size-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
            Operação · {periodLabel[period]}
          </p>
          <h1 className="mt-1 font-display text-2xl font-black leading-tight text-foreground sm:text-3xl">
            Olá, {greetingName}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{headline}</p>
        </div>
        <MetricPeriodFilter value={period} onChange={onPeriodChange} />
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Abertas" value={metrics.pending} icon={ClipboardList} tone="steel" />
        <Stat label="Em execução" value={metrics.inProgress} icon={Activity} tone="orange" />
        <Stat label="Aguard. revisão" value={metrics.awaitingReview} icon={FileCheck2} tone="amber" />
        <Stat label="Concluídas" value={metrics.done} icon={CheckCircle2} tone="green" />
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
            allClosed
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : metrics.total === 0
                ? "border-white/10 bg-white/5 text-muted-foreground"
                : "border-amber-400/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          {allClosed ? (
            <CheckCircle2 size={12} />
          ) : metrics.total === 0 ? (
            <ClipboardList size={12} />
          ) : (
            <AlertOctagon size={12} />
          )}
          {summary(metrics, period)}
        </span>
      </div>

      <Link
        to="/ordens/nova"
        className="relative mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff7a18] to-[#ff5a00] font-display text-base font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_40px_-12px_rgba(255,122,24,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] transition active:scale-[0.99]"
      >
        <ClipboardList size={18} />
        Nova OS
      </Link>
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
  const toneClass = {
    steel: "text-slate-200",
    orange: "text-[#ff9a4d]",
    amber: "text-amber-300",
    green: "text-emerald-300",
  }[tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[9px] font-black uppercase tracking-[0.16em]">{label}</span>
        <Icon size={13} className={toneClass} />
      </div>
      <p className={`mt-1 font-display text-3xl font-black leading-none ${toneClass}`}>{value}</p>
    </div>
  );
}