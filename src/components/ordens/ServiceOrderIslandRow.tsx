import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileDown,
  HardHat,
  Loader2,
  MapPin,
  Receipt,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { formatServiceOrderDateTime, getClosedAt, getOpenedAt } from "@/lib/serviceOrders/time";
import {
  formatTechnicianList,
  getOrderTechnicians,
  getServiceOrderWorkedMinutes,
} from "@/lib/serviceOrders/technicians";
import type { OrderFinancials } from "@/types/financials";
import { getOrderFinancials } from "@/lib/api/financials.functions";
import { downloadServiceOrderReportPdf } from "@/lib/reports/serviceOrderDownload";
import { useAuth } from "@/components/app/AuthContext";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";

type ServiceOrderIslandRowProps = {
  order: ServiceOrder;
  financials?: OrderFinancials | null;
  compact?: boolean;
};

const statusTone: Record<ServiceOrderStatus, string> = {
  pending: "border-primary/45 bg-primary/14 text-amber-100",
  dispatched: "border-primary/45 bg-primary/14 text-amber-100",
  transit: "border-status-transit/45 bg-status-transit/13 text-sky-100",
  running: "border-status-transit/50 bg-status-transit/14 text-sky-100",
  finished: "border-status-done/45 bg-status-done/13 text-emerald-100",
  review: "border-status-review/50 bg-status-review/14 text-amber-100",
  approved: "border-status-done/50 bg-status-done/14 text-emerald-100",
  cancelled: "border-destructive/48 bg-destructive/13 text-rose-100",
};

const priorityTone: Record<ServicePriority, string> = {
  baixa: "border-sky-300/35 bg-sky-300/12 text-sky-100",
  media: "border-status-review/40 bg-status-review/13 text-amber-100",
  alta: "border-primary/48 bg-primary/15 text-orange-100",
  urgente: "border-destructive/58 bg-destructive/17 text-rose-100",
};

const statusSurfaceTone: Record<ServiceOrderStatus, string> = {
  pending: "lemarc-order-tone-pending",
  dispatched: "lemarc-order-tone-pending",
  transit: "lemarc-order-tone-running",
  running: "lemarc-order-tone-running",
  finished: "lemarc-order-tone-approved",
  review: "lemarc-order-tone-review",
  approved: "lemarc-order-tone-approved",
  cancelled: "lemarc-order-tone-cancelled",
};

const nextAction: Partial<Record<ServiceOrderStatus, string>> = {
  pending: "Despachar OS",
  dispatched: "Iniciar deslocamento",
  transit: "Iniciar serviço",
  running: "Finalizar serviço",
  finished: "Enviar para revisão",
  review: "Aprovar cobrança",
};

export function ServiceOrderIslandRow({
  order,
  financials = null,
  compact = false,
}: ServiceOrderIslandRowProps) {
  const [expanded, setExpanded] = useState(false);
  const technicians = useMemo(() => getOrderTechnicians(order), [order]);
  const clientName = clean(order.client?.name) ?? "Não informado";
  const hasUnit = Boolean(clean(order.client_unit?.name) ?? clean(order.client?.unit));
  const unitName = getUnitName(order);
  const localName = getLocalName(order);
  const title = clean(order.title) ?? "Chamado não informado";
  const technicianLabel = technicians.length
    ? formatTechnicianList(technicians, 1)
    : "Sem técnico definido";
  const technicianTitle = technicians.length
    ? technicians.map((technician) => technician.full_name).join(", ")
    : "Sem técnico definido";
  const timeSummary = getTimeSummary(order, financials);
  const valueSummary = getValueSummary(order, financials);
  const openedAt = formatServiceOrderDateTime(getOpenedAt(order)) ?? "Não informado";
  const startedAt =
    formatServiceOrderDateTime(order.started_at) ??
    (order.status === "running" ? "Em andamento" : "Não informado");
  const closedAt =
    formatServiceOrderDateTime(order.finished_at ?? getClosedAt(order)) ??
    (order.status === "cancelled" ? "Cancelada sem data" : "Aguardando finalização");
  const serviceType = getServiceType(order);
  const billingStatus = getBillingStatus(order, financials);
  const actionLabel = nextAction[order.status];
  const isClosedOrder = order.status === "finished" || order.status === "approved";
  const hasValue = valueSummary.realCents > 0 || valueSummary.estimatedCents > 0;
  const hasTrackedTime = timeSummary.short !== "Sem horas";
  const technicianDetail = technicians.length
    ? technicians.length === 1
      ? "1 técnico alocado"
      : `${technicians.length} técnicos alocados`
    : "Aguardando definição";
  const locationSummary =
    localName !== "Não informado" && localName !== unitName
      ? `${unitName} · ${localName}`
      : unitName;
  const collapsedHints = buildOperationalHints({
    hasUnit,
    hasTechnicians: technicians.length > 0,
    hasValue,
    hasTrackedTime,
  });

  return (
    <article
      data-status={order.status}
      className={cn(
        "lemarc-order-island-row lemarc-island-row group/order",
        statusSurfaceTone[order.status],
        expanded && "lemarc-island-row-expanded",
        compact && "p-2.5",
      )}
    >
      <div className="lemarc-order-collapsed-shell grid min-w-0 gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="block w-full min-w-0 rounded-[1rem] border border-white/[0.07] bg-black/[0.075] px-2.5 py-2 text-left outline-none transition-colors hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-primary/70 sm:px-3 lg:py-2.5"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Recolher" : "Expandir"} OS ${order.number}`}
        >
          <span className="grid min-w-0 gap-1.5 lg:hidden">
            <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <OrderIdentity number={order.number} />
                <span className="truncate font-display text-[14px] font-black leading-tight text-white">
                  {clientName}
                </span>
              </span>
              <OrderStatusCluster status={order.status} priority={order.priority} compact />
            </span>

            <span className="block min-w-0 truncate text-[12px] font-bold leading-snug text-slate-100">
              {title} · <span className="text-slate-300">{serviceType}</span>
            </span>

            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold leading-snug text-slate-300">
              <InlineMeta label="Unidade" value={unitName} />
              <InlineMeta label="Técnico" value={technicianLabel} title={technicianTitle} />
            </span>

            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold leading-snug text-slate-300">
              <InlineMeta label="Tempo" value={timeSummary.short} tabular />
              <InlineMeta label={valueSummary.kind} value={valueSummary.short} tabular />
            </span>
          </span>

          <span className="lemarc-order-desktop-summary min-w-0">
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <OrderIdentity number={order.number} />
                <span className="truncate font-display text-[14px] font-black leading-tight text-white">
                  {clientName}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                {locationSummary}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold leading-tight text-slate-100">
                {title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                {serviceType}
              </span>
            </span>
            <OrderStatusCluster
              status={order.status}
              priority={order.priority}
              compact
              className="lg:flex-col lg:items-start lg:justify-center"
            />
            <InlineMetric label="Técnico" value={technicianLabel} title={technicianTitle} />
            <InlineMetric label="Tempo" value={timeSummary.short} tabular />
            <InlineMetric label={valueSummary.kind} value={valueSummary.short} tabular />
          </span>
        </button>

        {!expanded && (
          <OrderCollapsedActionBar
            order={order}
            hints={collapsedHints}
            actionHint={getActionHint(order.status, actionLabel, isClosedOrder)}
            isClosedOrder={isClosedOrder}
            onExpand={() => setExpanded(true)}
          />
        )}

        {!expanded && collapsedHints.length > 0 && <DesktopHintRail hints={collapsedHints} />}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="lemarc-order-expanded-ruler mt-2.5 border-t border-white/[0.08] pt-2.5">
            <div className="grid gap-2.5 lg:grid-cols-[1.02fr_1fr_1.05fr]">
              <OrderExpandedSection icon={Building2} title="Identificação">
                <OrderExpandedRow label="Cliente" value={clientName} strong />
                <OrderExpandedRow label="Unidade" value={unitName} />
                <OrderExpandedRow label="Local" value={localName} icon={MapPin} />
                <OrderExpandedRow
                  label="Solicitante"
                  value={clean(order.requester_name) ?? "Não informado"}
                  icon={UserRound}
                />
              </OrderExpandedSection>

              <OrderExpandedSection icon={Wrench} title="Operação">
                <OrderExpandedRow label="Chamado" value={title} strong />
                <OrderExpandedRow label="Tipo" value={serviceType} />
                <OrderExpandedRow
                  label="Status"
                  value={statusLabel[order.status]}
                  icon={BadgeCheck}
                />
                <OrderExpandedRow
                  label="Prioridade"
                  value={order.priority ? priorityLabel[order.priority] : "Não informada"}
                />
                <OrderExpandedRow
                  label="Técnicos"
                  value={
                    <span title={technicianTitle}>
                      {technicianTitle} · {technicianDetail}
                    </span>
                  }
                  icon={HardHat}
                />
              </OrderExpandedSection>

              <OrderExpandedSection icon={Clock3} title="Tempo e cobrança">
                <OrderExpandedRow label="Abertura" value={openedAt} tabular />
                <OrderExpandedRow label="Início" value={startedAt} tabular />
                <OrderExpandedRow label="Finalização" value={closedAt} tabular />
                <OrderExpandedRow label="Tempo total" value={timeSummary.full} strong tabular />
                <OrderExpandedRow label="Mão de obra" value={valueSummary.labor} tabular />
                <OrderExpandedRow label="Valor total" value={valueSummary.full} strong tabular />
                <OrderExpandedRow label="Cobrança" value={billingStatus} strong />
              </OrderExpandedSection>
            </div>

            <OrderActionBar order={order} actionLabel={actionLabel} isClosedOrder={isClosedOrder} />
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderIdentity({ number }: { number: number }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center rounded-xl border border-[color:var(--order-accent-line)] bg-[color:var(--order-accent-muted)] px-2 font-mono text-[11px] font-black leading-none text-white tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_18px_-18px_var(--order-accent-shadow)]">
      OS #{number}
    </span>
  );
}

function OrderStatusCluster({
  status,
  priority,
  compact = false,
  className,
}: {
  status: ServiceOrderStatus;
  priority: ServicePriority | null;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-1 lg:justify-end", className)}>
      <StatusPill status={status} compact={compact} />
      <PriorityPill priority={priority} compact={compact} />
    </span>
  );
}

function StatusPill({
  status,
  compact = false,
}: {
  status: ServiceOrderStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border font-black uppercase tracking-[0.04em]",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        statusTone[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}

function PriorityPill({
  priority,
  compact = false,
}: {
  priority: ServicePriority | null;
  compact?: boolean;
}) {
  if (!priority) {
    return (
      <span
        className={cn(
          "inline-flex w-fit rounded-full border border-slate-300/25 bg-slate-300/10 font-black uppercase tracking-[0.04em] text-slate-300",
          compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        )}
      >
        Sem prioridade
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full border font-black uppercase tracking-[0.04em]",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        priorityTone[priority],
      )}
    >
      {priorityLabel[priority]}
    </span>
  );
}

function InlineMeta({
  label,
  value,
  title,
  tabular = false,
}: {
  label: string;
  value: string;
  title?: string;
  tabular?: boolean;
}) {
  return (
    <span className={cn("min-w-0 truncate", tabular && "tabular-nums")} title={title ?? value}>
      <span className="text-slate-500">{label}:</span>{" "}
      <span className="font-bold text-slate-200">{value}</span>
    </span>
  );
}

function InlineMetric({
  label,
  value,
  title,
  tabular = false,
}: {
  label: string;
  value: string;
  title?: string;
  tabular?: boolean;
}) {
  return (
    <span className="min-w-0 lg:border-l lg:border-white/[0.065] lg:pl-2">
      <span className="lemarc-technical-label block tracking-[0.06em]">{label}</span>
      <span
        className={cn(
          "mt-0.5 block truncate text-[12px] font-black leading-tight text-white",
          tabular && "tabular-nums",
        )}
        title={title ?? value}
      >
        {value}
      </span>
    </span>
  );
}

function DesktopHintRail({ hints }: { hints: string[] }) {
  return (
    <div className="lemarc-order-desktop-hints min-w-0">
      {hints.map((hint) => (
        <HintPill key={hint}>{hint}</HintPill>
      ))}
    </div>
  );
}

function OrderCollapsedActionBar({
  order,
  hints,
  actionHint,
  isClosedOrder,
  onExpand,
}: {
  order: ServiceOrder;
  hints: string[];
  actionHint: string;
  isClosedOrder: boolean;
  onExpand: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-t border-white/[0.08] pt-2 sm:flex-row sm:items-center sm:justify-between lg:min-w-[13.25rem] lg:justify-end lg:border-t-0 lg:pt-0 xl:min-w-[14rem]">
      <div className="flex min-w-0 flex-wrap items-center gap-1 lg:hidden">
        {hints.length > 0 ? (
          hints.map((hint) => <HintPill key={hint}>{hint}</HintPill>)
        ) : (
          <span className="truncate text-[11px] font-bold text-slate-300">{actionHint}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end lg:flex-nowrap">
        <ActionLink to="/ordens/$id" params={{ id: order.id }} icon={ArrowUpRight} primary>
          Abrir
        </ActionLink>
        {isClosedOrder && <OrderCollapsedPdfButton order={order} />}
        <button
          type="button"
          onClick={onExpand}
          className="lemarc-pressable inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.055] px-2.5 text-[10px] font-black uppercase tracking-[0.06em] text-slate-200 hover:border-[color:var(--order-accent-line)] hover:bg-[color:var(--order-accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:w-auto lg:min-h-8 lg:min-w-[5.25rem]"
        >
          <ChevronDown size={13} />
          Expandir
        </button>
      </div>
    </div>
  );
}

function HintPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-amber-100">
      {children}
    </span>
  );
}

function OrderCollapsedPdfButton({ order }: { order: ServiceOrder }) {
  const { loading, download } = useOrderPdfDownload(order);
  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={loading}
      className={cn(
        "lemarc-pressable inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.06em] sm:w-auto lg:min-h-8 lg:min-w-[4.35rem]",
        "border-status-done/45 bg-status-done/12 text-emerald-100 hover:border-status-done/65 hover:bg-status-done/18",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-done/70 disabled:cursor-wait disabled:opacity-70",
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      {loading ? "Gerando" : "PDF"}
    </button>
  );
}

function OrderExpandedSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[0.95rem] border border-white/[0.075] bg-white/[0.028] p-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.07)]">
      <div className="flex items-center gap-1.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-primary/22 bg-primary/10 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.12)]">
          <Icon size={13} />
        </span>
        <h4 className="font-display text-[11px] font-black uppercase tracking-[0.06em] text-white">
          {title}
        </h4>
      </div>
      <dl className="mt-1.5 divide-y divide-white/[0.05]">{children}</dl>
    </section>
  );
}

function OrderExpandedRow({
  label,
  value,
  icon: Icon,
  strong = false,
  tabular = false,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  strong?: boolean;
  tabular?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-0.5 py-1.5 first:pt-0 last:pb-0 sm:grid-cols-[5.9rem_minmax(0,1fr)] sm:items-start sm:gap-2">
      <dt className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold leading-snug text-slate-400">
        {Icon && <Icon size={12} className="shrink-0 text-primary/80" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "min-w-0 break-words text-[12px] font-semibold leading-snug text-slate-200",
          strong && "font-display font-black text-white",
          tabular && "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function OrderActionBar({
  order,
  actionLabel,
  isClosedOrder,
}: {
  order: ServiceOrder;
  actionLabel?: string;
  isClosedOrder: boolean;
}) {
  return (
    <div className="mt-2.5 flex flex-col gap-2 border-t border-white/[0.08] pt-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="lemarc-technical-label text-slate-300">Ações da OS</p>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-end">
        <ActionLink to="/ordens/$id" params={{ id: order.id }} icon={ExternalLink} primary>
          Abrir OS
        </ActionLink>
        {actionLabel && (
          <ActionLink to="/ordens/$id" params={{ id: order.id }} icon={Receipt}>
            {actionLabel}
          </ActionLink>
        )}
        {isClosedOrder && <OrderPdfActionButton order={order} />}
      </div>
    </div>
  );
}

function ActionLink({
  to,
  params,
  icon: Icon,
  children,
  primary = false,
}: {
  to: string;
  params: Record<string, string>;
  icon: LucideIcon;
  children: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className={cn(
        "lemarc-pressable inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.06em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:w-auto lg:min-h-8 lg:min-w-[4.35rem]",
        primary
          ? "lemarc-primary-action text-[color:var(--primary-foreground)]"
          : "border-white/[0.12] bg-white/[0.055] text-slate-200 hover:border-primary/40 hover:bg-primary/12",
      )}
    >
      <Icon size={13} />
      {children}
    </Link>
  );
}

function clean(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function getUnitName(order: ServiceOrder) {
  return clean(order.client_unit?.name) ?? clean(order.client?.unit) ?? "Não informado";
}

function getLocalName(order: ServiceOrder) {
  const cityState = [clean(order.client_unit?.city), clean(order.client_unit?.state)]
    .filter(Boolean)
    .join("/");
  return (
    clean(order.location) ?? clean(order.client_unit?.sector) ?? (cityState || "Não informado")
  );
}

function getServiceType(order: ServiceOrder) {
  const other = clean(order.service_type_other);
  if (order.service_type === "outro" && other) {
    return other;
  }
  return order.service_type ? serviceTypeLabel[order.service_type] : "Não informado";
}

function getTimeSummary(order: ServiceOrder, financials: OrderFinancials | null) {
  if (financials && financials.total_labor_minutes > 0) {
    const formatted = formatHHmm(financials.total_labor_minutes);
    return { short: formatted, full: `${formatted} apurado` };
  }

  const worked = getServiceOrderWorkedMinutes(order);
  if (worked.minutes > 0) {
    const formatted = formatHHmm(worked.minutes);
    return {
      short: formatted,
      full: worked.source === "derived" ? `${formatted} estimado` : `${formatted} apurado`,
    };
  }

  if (order.status === "running" || order.status === "transit") {
    return { short: "Em andamento", full: "Em andamento" };
  }

  return { short: "Sem horas", full: "Aguardando apuração" };
}

function buildOperationalHints({
  hasUnit,
  hasTechnicians,
  hasValue,
  hasTrackedTime,
}: {
  hasUnit: boolean;
  hasTechnicians: boolean;
  hasValue: boolean;
  hasTrackedTime: boolean;
}) {
  const hints: string[] = [];
  if (!hasUnit) hints.push("Unidade não informada");
  if (!hasTechnicians) hints.push("Sem técnico");
  if (!hasTrackedTime) hints.push("Sem horas");
  if (!hasValue) hints.push("Sem valor");
  return hints.slice(0, 3);
}

function getActionHint(
  status: ServiceOrderStatus,
  actionLabel: string | undefined,
  isClosedOrder: boolean,
) {
  if (actionLabel) return `Próxima ação: ${actionLabel}`;
  if (isClosedOrder) return "OS finalizada para consulta, PDF e cobrança.";
  if (status === "cancelled") return "OS cancelada, mantida para histórico operacional.";
  return "Acompanhamento operacional ativo.";
}

function getEstimatedLaborCents(order: ServiceOrder) {
  const worked = getServiceOrderWorkedMinutes(order);
  if (worked.minutes <= 0 || !order.hour_rate || order.hour_rate <= 0) return 0;
  return Math.round((worked.minutes / 60) * order.hour_rate * 100);
}

function getValueSummary(order: ServiceOrder, financials: OrderFinancials | null) {
  const estimatedLabor = getEstimatedLaborCents(order);
  if (financials) {
    const grand = formatBRL(financials.grand_total_cents);
    return {
      short: grand,
      full: `${grand} apurado`,
      labor: `${formatBRL(financials.total_labor_cents)} apurado`,
      kind: "Valor",
      realCents: financials.grand_total_cents,
      estimatedCents: 0,
    };
  }

  if (estimatedLabor > 0) {
    const estimated = formatBRL(estimatedLabor);
    return {
      short: `${estimated} est.`,
      full: `${estimated} estimado`,
      labor: `${estimated} estimado`,
      kind: "Estimado",
      realCents: 0,
      estimatedCents: estimatedLabor,
    };
  }

  return {
    short: "Sem valor",
    full: "Sem apuração",
    labor: "Sem apuração",
    kind: "Valor",
    realCents: 0,
    estimatedCents: 0,
  };
}

function getBillingStatus(order: ServiceOrder, financials: OrderFinancials | null) {
  if (order.status === "approved") return "Aprovada para cobrança";
  if (order.status === "cancelled") return "Cancelada";
  if (order.status === "review") return "Em revisão de cobrança";
  if (order.status === "finished") return "Aguardando revisão";
  if (financials?.finalized_at) return "Apuração finalizada";
  return "Aguardando finalização";
}

function useOrderPdfDownload(order: ServiceOrder) {
  const [loading, setLoading] = useState(false);
  const fetchFinancials = useServerFn(getOrderFinancials);
  const { displayName } = useAuth();

  const download = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { entries, financials } = await fetchFinancials({ data: { orderId: order.id } });
      await downloadServiceOrderReportPdf({
        order,
        entries,
        financials,
        generatedAt: new Date(),
        authorName: displayName ?? null,
      });
      toast.success(`PDF da OS #${order.number} baixado`);
    } catch (error) {
      console.error("Failed to download OS PDF", error);
      toast.error("Não foi possível baixar o PDF da OS. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, download };
}

function OrderPdfActionButton({ order }: { order: ServiceOrder }) {
  const { loading, download } = useOrderPdfDownload(order);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void download();
      }}
      disabled={loading}
      className={cn(
        "lemarc-pressable inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.06em] sm:w-auto",
        "border-status-done/55 bg-status-done/14 text-emerald-100 shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_10px_24px_-20px_rgba(16,185,129,0.72)]",
        "hover:border-status-done/75 hover:bg-status-done/22",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-done/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-wait disabled:opacity-70",
      )}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      {loading ? "Gerando…" : "Baixar PDF"}
    </button>
  );
}
