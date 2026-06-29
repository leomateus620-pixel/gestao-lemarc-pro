import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  ExternalLink,
  PenLine,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type {
  CollaboratorHistoryItem,
  CollaboratorOperationalStatus,
  CollaboratorSummary,
} from "@/lib/serviceOrders/collaborators";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMinutes, formatShortDate, initials, toTitleCase } from "./format";

const statusClass: Record<CollaboratorOperationalStatus, string> = {
  "Em campo": "border-primary/45 bg-primary/16 text-primary",
  "Em deslocamento": "border-sky-300/40 bg-sky-300/12 text-sky-200",
  Alocado: "border-slate-200/35 bg-slate-200/10 text-slate-100",
  Disponível: "border-emerald-300/40 bg-emerald-300/12 text-emerald-200",
  Inativo: "border-zinc-400/35 bg-zinc-400/10 text-zinc-300",
};

export function CollaboratorIslandRow({ collaborator }: { collaborator: CollaboratorSummary }) {
  const [expanded, setExpanded] = useState(false);
  const latest = collaborator.history[0];
  const displayName = toTitleCase(collaborator.name) || collaborator.name;
  const displayRole = collaborator.role?.trim() || "Sem função";
  const hasRate = (collaborator.hourlyRateCents ?? 0) > 0;

  return (
    <article
      className={cn(
        "lemarc-island-row group",
        expanded && "lemarc-island-row-expanded",
        !collaborator.active && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto_minmax(0,1fr)_auto]"
        aria-expanded={expanded}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/14 font-display text-[11px] font-black uppercase text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          {initials(displayName)}
        </span>

        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-black leading-tight text-white">
            {displayName}
          </span>
          <span className="mt-0.5 hidden truncate text-[12px] font-semibold text-slate-300 md:block">
            {displayRole}
          </span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 md:hidden">
            <MobileStatusPill status={collaborator.status} />
            <span className="truncate text-[11px] font-semibold text-slate-300">{displayRole}</span>
          </span>
          <span className="mt-1 block truncate text-[11px] font-bold tabular-nums text-slate-200 md:hidden">
            {formatMinutes(collaborator.hoursMonthRealMinutes)} mês ·{" "}
            {collaborator.ordersOpen} OS abertas
            {!hasRate && " · R$/h a definir"}
          </span>
        </span>

        <StatusPill status={collaborator.status} />

        <RatePill cents={collaborator.hourlyRateCents} />
        <Metric
          label="Horas mês"
          value={formatMinutes(collaborator.hoursMonthRealMinutes)}
          hint={
            collaborator.hoursMonthEstimatedMinutes > 0
              ? `+${formatMinutes(collaborator.hoursMonthEstimatedMinutes)} est.`
              : undefined
          }
        />
        <Metric label="OS abertas" value={String(collaborator.ordersOpen)} />

        <span className="hidden min-w-0 truncate text-[11px] font-semibold text-slate-400 md:block">
          {latest ? latestLabel(latest) : "Sem atendimento apurado"}
        </span>

        <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-primary transition group-hover:border-primary/35">
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
          />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-semibold text-slate-300">
              <RulerItem
                label="Valor mês"
                value={formatCurrency(
                  collaborator.valueMonthCentsReal > 0
                    ? collaborator.valueMonthCentsReal
                    : null,
                )}
                hint={
                  collaborator.valueMonthCentsEstimated > 0
                    ? `est. ${formatCurrency(collaborator.valueMonthCentsEstimated)}`
                    : undefined
                }
              />
              <RulerItem label="OS concluídas" value={String(collaborator.servicesMonth)} />
              <RulerItem label="Hoje" value={`${collaborator.ordersToday} OS`} />
              <RulerItem
                label="Especialidade"
                value={collaborator.specialty ?? "Não informada"}
              />
              <RulerItem
                label="Último"
                value={latest ? latestLabel(latest) : "Sem histórico"}
              />
              {collaborator.hasEstimatedFallback && !collaborator.hasLaborEntries && (
                <li className="rounded-full border border-amber-300/40 bg-amber-400/12 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
                  Sem apontamento individual
                </li>
              )}
            </ul>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
              <ActionLink to="/colaboradores/$id" params={{ id: collaborator.id }} icon={UserRound}>
                Perfil
              </ActionLink>
              <ActionLink
                to="/colaboradores/$id/horas"
                params={{ id: collaborator.id }}
                icon={Clock3}
              >
                Horas
              </ActionLink>
              <ActionLink
                to="/colaboradores/$id/ordens"
                params={{ id: collaborator.id }}
                icon={BriefcaseBusiness}
              >
                Ordens
              </ActionLink>
              <ActionLink
                to="/colaboradores/$id/editar"
                params={{ id: collaborator.id }}
                icon={PenLine}
              >
                Editar
              </ActionLink>
              {latest && (
                <ActionLink to="/ordens/$id" params={{ id: latest.orderId }} icon={ExternalLink}>
                  Última OS
                </ActionLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: CollaboratorOperationalStatus }) {
  return (
    <span
      className={cn(
        "hidden w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] md:inline-flex",
        statusClass[status],
      )}
    >
      {status}
    </span>
  );
}

function MobileStatusPill({ status }: { status: CollaboratorOperationalStatus }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]",
        statusClass[status],
      )}
    >
      {status}
    </span>
  );
}

function RatePill({ cents }: { cents: number | null }) {
  const defined = (cents ?? 0) > 0;
  return (
    <span
      className={cn(
        "hidden min-w-0 md:block",
      )}
    >
      <span className="lemarc-technical-label block">R$/h</span>
      <span
        className={cn(
          "mt-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 font-display text-[12px] font-black tabular-nums",
          defined
            ? "border-white/10 bg-white/[0.04] text-white"
            : "border-amber-300/40 bg-amber-400/12 text-amber-100",
        )}
      >
        {defined ? formatCurrency(cents) : "A definir"}
      </span>
    </span>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <span className="hidden min-w-0 md:block">
      <span className="lemarc-technical-label block">{label}</span>
      <span className="mt-0.5 block truncate font-display text-[13px] font-black tabular-nums text-white">
        {value}
      </span>
      {hint && (
        <span className="block truncate text-[10px] font-bold tabular-nums text-amber-200/80">
          {hint}
        </span>
      )}
    </span>
  );
}

function RulerItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <li className="flex min-w-0 items-baseline gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <span className="truncate font-display text-[13px] font-black tabular-nums text-white">
        {value}
      </span>
      {hint && (
        <span className="text-[10px] font-bold tabular-nums text-amber-200/85">{hint}</span>
      )}
    </li>
  );
}

function ActionLink({
  to,
  params,
  icon: Icon,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  icon: LucideIcon;
  children: string;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.11] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/40 hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <Icon size={14} />
      {children}
    </Link>
  );
}

function latestLabel(item: CollaboratorHistoryItem) {
  const number = item.orderNumber ? `#${item.orderNumber}` : "OS";
  return `${number} · ${item.clientName} · ${formatShortDate(item.date)}`;
}
