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
    badge: "border-teal-200/25 bg-teal-200/[0.085] text-teal-50",
    row: "border-teal-100/16 bg-[linear-gradient(180deg,oklch(0.78_0.11_190/0.08),oklch(1_0_0/0.032))]",
    avatar: "border-teal-100/22 bg-teal-100/[0.085] text-teal-50",
    dot: "bg-teal-200 shadow-[0_0_8px_oklch(0.8_0.1_190/0.42)] animate-pulse",
  },
  paused: {
    label: "Pausado",
    icon: PauseCircle,
    badge: "border-amber-200/28 bg-amber-200/[0.09] text-amber-50",
    row: "border-amber-100/18 bg-[linear-gradient(180deg,oklch(0.78_0.14_78/0.075),oklch(1_0_0/0.03))]",
    avatar: "border-amber-100/22 bg-amber-100/[0.085] text-amber-50",
    dot: "bg-amber-200",
  },
  waiting: {
    label: "Aguardando",
    icon: Hourglass,
    badge: "border-slate-200/18 bg-slate-100/[0.07] text-slate-100",
    row: "border-white/[0.105] bg-white/[0.04]",
    avatar: "border-white/[0.13] bg-white/[0.06] text-slate-100",
    dot: "bg-slate-300/80",
  },
  finished: {
    label: "Finalizado",
    icon: CheckCircle2,
    badge: "border-emerald-200/24 bg-emerald-200/[0.08] text-emerald-50",
    row: "border-emerald-100/15 bg-[linear-gradient(180deg,oklch(0.72_0.12_155/0.06),oklch(1_0_0/0.03))]",
    avatar: "border-emerald-100/20 bg-emerald-100/[0.075] text-emerald-50",
    dot: "bg-emerald-200",
  },
  no_time: {
    label: "Sem tempo registrado",
    icon: TimerReset,
    badge: "border-white/[0.12] bg-white/[0.045] text-slate-200",
    row: "border-white/[0.095] bg-white/[0.032]",
    avatar: "border-white/[0.12] bg-white/[0.05] text-slate-200",
    dot: "bg-slate-300/60",
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

function technicianCountLabel(total: number) {
  return total === 1 ? "1 técnico acompanhado" : `${total} técnicos acompanhados`;
}

function detailLabel(summary: TechnicianTimeSummary) {
  if (summary.state === "operating" && summary.activeStartedAt) {
    return `Cronômetro ativo desde ${formatHm(summary.activeStartedAt)}`;
  }

  if (summary.state === "paused") {
    if (summary.pauseNotes) return `Pausado · ${summary.pauseNotes}`;
    if (summary.pauseLabel) return `Pausado · ${summary.pauseLabel}`;
    return "Pausado · motivo não informado";
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
        className="lemarc-timekeeper-panel mt-3 px-3 py-3"
        aria-label={`Tempo por técnico da OS ${order.number}`}
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
      >
        <div className="flex items-center justify-between gap-3">
          <SectionTitle subtitle="Nenhum técnico vinculado" />
          <PanelBadge label="Sem técnico" />
        </div>

        <div className="mt-3 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
          <p className="text-[0.84rem] font-semibold text-foreground">Sem técnico atribuído</p>
          <p className="mt-0.5 text-[0.72rem] font-medium leading-relaxed text-muted-foreground/90">
            Vincule um técnico para acompanhar o tempo operacional da OS.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="lemarc-timekeeper-panel mt-3 px-3 py-3 transition duration-200 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-label={`Tempo por técnico da OS ${order.number}`}
      onClick={stopCardNavigation}
      onPointerDown={stopCardNavigation}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle subtitle={technicianCountLabel(summaries.length)} />
        <PanelBadge icon={BadgeCheck} label={panelBadgeLabel(summaries)} />
      </div>

      <div
        className={cn(
          "mt-3 grid gap-2.5",
          summaries.length > 3 &&
            "sm:flex sm:overflow-x-auto sm:scroll-smooth sm:pb-1 lemarc-smart-scroll lemarc-scroll-fade",
        )}
      >
        {summaries.map((summary) => (
          <TechnicianTimeRow
            key={`${summary.technicianId}-${summary.source}`}
            summary={summary}
            scrollItem={summaries.length > 3}
          />
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/[0.13] bg-white/[0.055] text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_10px_22px_-18px_oklch(0_0_0/0.82)]">
        <Clock3 size={15} strokeWidth={2.3} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-[0.86rem] font-black leading-tight text-foreground">
          Tempo por técnico
        </p>
        <p className="truncate text-[0.68rem] font-semibold leading-tight text-muted-foreground/90">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function PanelBadge({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.055] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.08em] text-slate-100 shadow-[inset_0_1px_0_oklch(1_0_0/0.1)]">
      {Icon && <Icon size={11} className="shrink-0 text-primary" />}
      {label}
    </span>
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
    <article
      className={cn(
        "lemarc-timekeeper-row min-w-0 px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        config.row,
        scrollItem && "sm:min-w-[18rem] sm:snap-start",
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border font-mono text-[0.72rem] font-black shadow-[inset_0_1px_0_oklch(1_0_0/0.12),inset_0_-8px_16px_oklch(0_0_0/0.12)]",
            config.avatar,
          )}
        >
          {summary.initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.84rem] font-bold leading-tight text-foreground">
                {summary.technicianName}
              </p>
              <p className="mt-1 line-clamp-2 text-[0.7rem] font-medium leading-snug text-muted-foreground/90 sm:truncate">
                {detailLabel(summary)}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-mono text-[1rem] font-black leading-none text-foreground tabular-nums">
                {timeLabel(summary)}
              </p>
              {source && (
                <p
                  className={cn(
                    "mt-1 text-[0.55rem] font-black uppercase tracking-[0.08em]",
                    summary.accuracy === "estimated" ? "text-amber-100/90" : "text-emerald-50/90",
                  )}
                >
                  {source}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <span className="h-px min-w-6 flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.075em] shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
                config.badge,
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", config.dot)} />
              <Icon size={11} className="shrink-0" />
              <span className="truncate">{config.label}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
