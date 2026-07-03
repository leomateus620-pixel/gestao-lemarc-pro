import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Hourglass,
  PauseCircle,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildDashboardTechnicianTimeSummaries,
  formatTechnicianTime,
  type DashboardTechnicianTimeDataset,
  type TechnicianTimeState,
  type TechnicianTimeSummary,
} from "@/lib/serviceOrders/dashboardTechnicianTime";
import { formatHm } from "@/lib/serviceOrders/timeSessions";
import type { ServiceOrder } from "@/types/serviceOrder";

type Props = {
  order: ServiceOrder;
  data?: DashboardTechnicianTimeDataset;
};

const EMPTY_DATASET: DashboardTechnicianTimeDataset = {
  sessions: [],
  laborEntries: [],
};

const stateConfig: Record<
  TechnicianTimeState,
  {
    label: string;
    icon: LucideIcon;
    badge: string;
    row: string;
    avatar: string;
    dot: string;
  }
> = {
  operating: {
    label: "Em operação",
    icon: Activity,
    badge: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
    row: "border-cyan-300/24 bg-cyan-300/[0.075] shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_10px_24px_-18px_oklch(0.74_0.14_205/0.62)]",
    avatar: "border-cyan-300/35 bg-cyan-300/14 text-cyan-100",
    dot: "bg-cyan-200 shadow-[0_0_12px_oklch(0.82_0.12_205/0.72)] animate-pulse",
  },
  paused: {
    label: "Pausado",
    icon: PauseCircle,
    badge: "border-amber-300/40 bg-amber-300/13 text-amber-100",
    row: "border-amber-300/25 bg-amber-300/[0.07] shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_10px_24px_-20px_oklch(0.78_0.15_75/0.52)]",
    avatar: "border-amber-300/35 bg-amber-300/14 text-amber-100",
    dot: "bg-amber-200 shadow-[0_0_10px_oklch(0.82_0.15_75/0.58)]",
  },
  waiting: {
    label: "Aguardando",
    icon: Hourglass,
    badge: "border-sky-300/28 bg-sky-300/10 text-sky-100",
    row: "border-sky-300/16 bg-sky-300/[0.045] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
    avatar: "border-sky-300/24 bg-sky-300/10 text-sky-100",
    dot: "bg-sky-200/80 shadow-[0_0_8px_oklch(0.76_0.1_230/0.42)]",
  },
  finished: {
    label: "Finalizado",
    icon: CheckCircle2,
    badge: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100",
    row: "border-emerald-300/20 bg-emerald-300/[0.055] shadow-[inset_0_1px_0_oklch(1_0_0/0.09)]",
    avatar: "border-emerald-300/28 bg-emerald-300/12 text-emerald-100",
    dot: "bg-emerald-200 shadow-[0_0_9px_oklch(0.78_0.13_155/0.48)]",
  },
  no_time: {
    label: "Sem tempo registrado",
    icon: TimerReset,
    badge: "border-white/12 bg-white/[0.045] text-slate-200",
    row: "border-white/[0.085] bg-white/[0.028] shadow-[inset_0_1px_0_oklch(1_0_0/0.07)]",
    avatar: "border-white/12 bg-white/[0.055] text-slate-200",
    dot: "bg-slate-300/65",
  },
};

function stopCardNavigation(event: SyntheticEvent) {
  event.stopPropagation();
}

function hasLiveSession(summaries: TechnicianTimeSummary[]) {
  return summaries.some((summary) => summary.state === "operating");
}

function panelBadgeLabel(summaries: TechnicianTimeSummary[]) {
  if (summaries.some((summary) => summary.accuracy === "recorded")) return "Apurado";
  if (summaries.some((summary) => summary.accuracy === "estimated")) return "Estimado";
  return "Sem apontamento";
}

function statusLabel(summary: TechnicianTimeSummary) {
  if (summary.state === "paused" && summary.pauseLabel) {
    return `Pausado · ${summary.pauseLabel}`;
  }
  return stateConfig[summary.state].label;
}

function detailLabel(summary: TechnicianTimeSummary) {
  if (summary.state === "operating" && summary.activeStartedAt) {
    return `Cronômetro ativo desde ${formatHm(summary.activeStartedAt)}`;
  }

  if (summary.state === "paused") {
    if (summary.pauseNotes) return `Motivo: ${summary.pauseNotes}`;
    if (summary.pauseLabel) return "Pausa registrada";
    return "Motivo não informado";
  }

  if (summary.state === "finished") {
    return summary.accuracy === "estimated" ? "Tempo final estimado" : "Tempo final apurado";
  }

  if (summary.minutes > 0) {
    return "Sem sessão ativa agora";
  }

  if (summary.isAssigned) {
    return "Técnico atribuído · sem tempo registrado ainda";
  }

  return "Sem tempo registrado";
}

function sourceBadge(summary: TechnicianTimeSummary) {
  if (summary.accuracy === "recorded") return "Apurado";
  if (summary.accuracy === "estimated") return "Estimado";
  return null;
}

function timeLabel(summary: TechnicianTimeSummary) {
  if (summary.minutes <= 0 && summary.source === "none") return "Sem tempo";
  return formatTechnicianTime(summary.minutes);
}

export function OrderTechnicianTimeCard({ order, data = EMPTY_DATASET }: Props) {
  const [now, setNow] = useState(() => new Date());
  const summaries = useMemo(
    () => buildDashboardTechnicianTimeSummaries({ order, data, now }),
    [data, now, order],
  );
  const live = hasLiveSession(summaries);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [live]);

  if (summaries.length === 0) {
    return (
      <section
        className="mt-3 rounded-[1.05rem] border border-white/[0.095] bg-[linear-gradient(145deg,oklch(0.23_0.038_252/0.92),oklch(0.16_0.034_252/0.9))] px-3 py-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_14px_30px_-26px_oklch(0_0_0/0.78)]"
        aria-label={`Tempo por técnico da OS ${order.number}`}
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-primary">
            Tempo por técnico
          </p>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em] text-slate-200">
            Sem técnico
          </span>
        </div>
        <p className="mt-2 text-[0.8rem] font-semibold text-foreground">Sem técnico atribuído</p>
        <p className="mt-0.5 text-[0.72rem] font-medium leading-relaxed text-muted-foreground/85">
          Vincule um técnico para acompanhar o tempo operacional da OS.
        </p>
      </section>
    );
  }

  const compactGrid = summaries.length <= 3;

  return (
    <section
      className="mt-3 rounded-[1.05rem] border border-white/[0.105] bg-[linear-gradient(145deg,oklch(0.245_0.044_252/0.96),oklch(0.155_0.036_252/0.94))] px-3 py-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.11),inset_0_-1px_0_oklch(0_0_0/0.2),0_16px_34px_-26px_oklch(0_0_0/0.82),0_8px_20px_-20px_var(--lemarc-card-glow)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_26%,white_7%)] active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`Tempo por técnico da OS ${order.number}`}
      onClick={stopCardNavigation}
      onPointerDown={stopCardNavigation}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-[color-mix(in_oklab,var(--lemarc-card-accent)_34%,white_8%)] bg-[color-mix(in_oklab,var(--lemarc-card-accent)_16%,transparent)] text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.11)]">
            <Clock3 size={14} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.14em] text-primary">
              Tempo por técnico
            </p>
            <p className="truncate text-[0.64rem] font-semibold text-muted-foreground/80">
              Acompanhamento operacional da OS
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em] text-slate-100">
          <BadgeCheck size={10} />
          {panelBadgeLabel(summaries)}
        </span>
      </div>

      <div
        className={cn(
          "mt-2.5 gap-2",
          compactGrid
            ? "grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(10.75rem,1fr))]"
            : "grid grid-cols-1 sm:flex sm:overflow-x-auto sm:scroll-smooth sm:pb-1 lemarc-smart-scroll",
        )}
      >
        {summaries.map((summary) => (
          <TechnicianTimeRow
            key={`${summary.technicianId}-${summary.source}`}
            summary={summary}
            scrollItem={!compactGrid}
          />
        ))}
      </div>
    </section>
  );
}

function TechnicianTimeRow({
  summary,
  scrollItem,
}: {
  summary: TechnicianTimeSummary;
  scrollItem: boolean;
}) {
  const config = stateConfig[summary.state];
  const Icon = config.icon;
  const source = sourceBadge(summary);

  return (
    <div
      className={cn(
        "group/time-row relative min-w-0 rounded-xl border px-2.5 py-2.5 transition duration-200 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        config.row,
        scrollItem && "sm:min-w-[13.5rem] sm:snap-start",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-[0.7rem] font-black shadow-[inset_0_1px_0_oklch(1_0_0/0.12)]",
            config.avatar,
          )}
        >
          {summary.initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate text-[0.78rem] font-black leading-tight text-foreground">
              {summary.technicianName}
            </p>
            {source && (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.1em]",
                  summary.accuracy === "estimated"
                    ? "border-amber-300/32 bg-amber-300/10 text-amber-100"
                    : "border-emerald-300/28 bg-emerald-300/10 text-emerald-100",
                )}
              >
                {source}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="font-mono text-[0.86rem] font-black leading-none text-foreground tabular-nums">
              {timeLabel(summary)}
            </span>
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.09em]",
                config.badge,
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", config.dot)} />
              <Icon size={10} className="shrink-0" />
              <span className="truncate">{statusLabel(summary)}</span>
            </span>
          </div>

          <p className="mt-1.5 truncate text-[0.68rem] font-semibold leading-relaxed text-muted-foreground/85">
            {detailLabel(summary)}
          </p>
        </div>
      </div>
    </div>
  );
}
