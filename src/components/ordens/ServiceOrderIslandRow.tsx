import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
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
  pending: "border-primary/55 bg-primary/18 text-amber-100",
  dispatched: "border-primary/55 bg-primary/18 text-amber-100",
  transit: "border-status-transit/55 bg-status-transit/16 text-sky-100",
  running: "border-status-transit/60 bg-status-transit/18 text-sky-100",
  finished: "border-status-review/55 bg-status-review/17 text-amber-100",
  review: "border-status-review/60 bg-status-review/18 text-amber-100",
  approved: "border-status-done/55 bg-status-done/16 text-emerald-100",
  cancelled: "border-destructive/55 bg-destructive/16 text-rose-100",
};

const priorityTone: Record<ServicePriority, string> = {
  baixa: "border-sky-300/35 bg-sky-300/12 text-sky-100",
  media: "border-status-review/40 bg-status-review/13 text-amber-100",
  alta: "border-primary/48 bg-primary/15 text-orange-100",
  urgente: "border-destructive/58 bg-destructive/17 text-rose-100",
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

  return (
    <article
      className={cn(
        "lemarc-order-island-row lemarc-island-row group/order",
        expanded && "lemarc-island-row-expanded",
        compact && "p-2.5",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        aria-expanded={expanded}
        aria-label={`${expanded ? "Recolher" : "Expandir"} OS ${order.number}`}
      >
        <span className="flex min-w-0 items-start gap-2 lg:hidden">
          <OrderNumber number={order.number} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] font-black leading-tight text-white">
              #{order.number} · {clientName}
            </span>
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="truncate text-[12px] font-bold text-slate-200">{unitName}</span>
              <StatusPill status={order.status} compact />
              {isClosedOrder ? (
                <OrderPdfButton order={order} compact />
              ) : (
                <PriorityPill priority={order.priority} compact />
              )}
            </span>
            <span className="mt-1 block truncate text-[12px] font-bold tabular-nums text-slate-300">
              {technicianLabel} · {timeSummary.short}
            </span>
          </span>
          <ExpandIcon expanded={expanded} />
        </span>

        <span className="hidden min-w-0 grid-cols-[auto_minmax(7rem,1.05fr)_minmax(7rem,0.8fr)_minmax(10rem,1.2fr)_auto_auto_minmax(6.5rem,0.7fr)_minmax(6.5rem,0.7fr)_auto] items-center gap-3 lg:grid">
          <OrderNumber number={order.number} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[14px] font-black text-white">
              {clientName}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
              Cliente
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-slate-100">{unitName}</span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
              Unidade
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-bold text-slate-100">{title}</span>
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
              Chamado inicial
            </span>
          </span>
          <StatusPill status={order.status} />
          {isClosedOrder ? (
            <OrderPdfButton order={order} />
          ) : (
            <PriorityPill priority={order.priority} />
          )}
          <DesktopMetric label="Técnicos" value={technicianLabel} title={technicianTitle} />
          <DesktopMetric label="Tempo" value={timeSummary.short} />
          <DesktopMetric label={valueSummary.kind} value={valueSummary.short} />
          <ExpandIcon expanded={expanded} />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="lemarc-order-expanded-ruler mt-4 border-t border-white/[0.08] pt-4">
            <OrderExpandedSummary
              number={order.number}
              title={title}
              serviceType={serviceType}
              clientName={clientName}
              unitName={unitName}
              status={order.status}
              priority={order.priority}
            />

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.05fr_1fr_0.95fr]">
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
                <OrderExpandedRow label="Chamado inicial" value={title} strong />
                <OrderExpandedRow
                  label="Status"
                  value={statusLabel[order.status]}
                  icon={BadgeCheck}
                />
                <OrderExpandedRow
                  label="Prioridade"
                  value={order.priority ? priorityLabel[order.priority] : "Não informada"}
                />
                <OrderExpandedRow label="Tipo de serviço" value={serviceType} />
                <OrderExpandedRow
                  label="Técnicos"
                  value={<span title={technicianTitle}>{technicianTitle}</span>}
                  icon={HardHat}
                />
              </OrderExpandedSection>

              <OrderExpandedSection icon={Clock3} title="Tempo e cobrança">
                <OrderExpandedRow label="Abertura" value={openedAt} tabular />
                <OrderExpandedRow label="Início" value={startedAt} tabular />
                <OrderExpandedRow label="Tempo" value={timeSummary.full} strong tabular />
                <OrderExpandedRow label="Finalização" value={closedAt} tabular />
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

function OrderNumber({ number }: { number: number }) {
  return (
    <span className="grid h-10 min-w-12 shrink-0 place-items-center rounded-2xl border border-primary/42 bg-primary/16 px-2 font-mono text-[12px] font-black text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
      #{number}
    </span>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.055] text-primary transition group-hover/order:border-primary/40">
      <ChevronDown
        size={16}
        className={cn("transition-transform duration-200", expanded && "rotate-180")}
      />
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
        "inline-flex w-fit items-center gap-1.5 rounded-full border font-black uppercase tracking-[0.08em]",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        statusTone[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
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
          "inline-flex w-fit rounded-full border border-slate-300/25 bg-slate-300/10 font-black uppercase tracking-[0.08em] text-slate-300",
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
        "inline-flex w-fit rounded-full border font-black uppercase tracking-[0.08em]",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        priorityTone[priority],
      )}
    >
      {priorityLabel[priority]}
    </span>
  );
}

function DesktopMetric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <span className="min-w-0">
      <span className="lemarc-technical-label block">{label}</span>
      <span
        className="mt-0.5 block truncate font-display text-[13px] font-black tabular-nums text-white"
        title={title ?? value}
      >
        {value}
      </span>
    </span>
  );
}

function OrderExpandedSummary({
  number,
  title,
  serviceType,
  clientName,
  unitName,
  status,
  priority,
}: {
  number: number;
  title: string;
  serviceType: string;
  clientName: string;
  unitName: string;
  status: ServiceOrderStatus;
  priority: ServicePriority | null;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/[0.09] bg-[linear-gradient(135deg,oklch(1_0_0/0.075),oklch(1_0_0/0.025))] px-3 py-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.11),0_16px_36px_-30px_oklch(0_0_0/0.88)] sm:px-4">
      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-black text-primary tabular-nums">
            OS #{number} · {serviceType}
          </p>
          <h4 className="mt-1 truncate font-display text-[15px] font-black leading-tight text-white sm:text-[17px]">
            {title}
          </h4>
          <p className="mt-1 truncate text-[12px] font-semibold text-slate-300">
            Cliente: {clientName} · Unidade: {unitName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
          <StatusPill status={status} compact />
          <PriorityPill priority={priority} compact />
        </div>
      </div>
    </div>
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
    <section className="min-w-0 rounded-[1.15rem] border border-white/[0.075] bg-white/[0.032] p-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.075)]">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.14)]">
          <Icon size={15} />
        </span>
        <h4 className="font-display text-[12px] font-black uppercase tracking-[0.08em] text-white">
          {title}
        </h4>
      </div>
      <dl className="mt-2 divide-y divide-white/[0.055]">{children}</dl>
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
    <div className="grid min-w-0 gap-1 py-2 first:pt-0 last:pb-0 sm:grid-cols-[6.75rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <dt className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold leading-snug text-slate-400">
        {Icon && <Icon size={12} className="shrink-0 text-primary/80" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={cn(
          "min-w-0 break-words text-[13px] font-semibold leading-snug text-slate-200",
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
    <div className="mt-3 flex flex-col gap-2.5 border-t border-white/[0.08] pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="lemarc-technical-label text-slate-300">Ações da OS</p>
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
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
        "lemarc-pressable inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.1em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:w-auto",
        primary
          ? "lemarc-primary-action text-[color:var(--primary-foreground)]"
          : "border-white/[0.12] bg-white/[0.055] text-slate-200 hover:border-primary/40 hover:bg-primary/12",
      )}
    >
      <Icon size={14} />
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

function OrderPdfButton({ order, compact = false }: { order: ServiceOrder; compact?: boolean }) {
  const { loading, download } = useOrderPdfDownload(order);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void download();
      }}
      disabled={loading}
      aria-label={`Baixar PDF da OS #${order.number}`}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border border-status-done/50 bg-status-done/12 font-black uppercase tracking-[0.08em] text-emerald-100 transition-colors",
        compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
        "hover:bg-status-done/20 disabled:cursor-wait disabled:opacity-70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-done/60",
      )}
    >
      {loading ? (
        <>
          <Loader2 size={compact ? 10 : 12} className="animate-spin" />
          <span>Gerando…</span>
        </>
      ) : (
        <>
          <FileDown size={compact ? 10 : 12} />
          <span>PDF OS</span>
        </>
      )}
    </button>
  );
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
        "lemarc-pressable inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-black uppercase tracking-[0.1em] sm:w-auto",
        "border-status-done/55 bg-status-done/14 text-emerald-100 shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_10px_24px_-20px_rgba(16,185,129,0.72)]",
        "hover:border-status-done/75 hover:bg-status-done/22",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-done/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-wait disabled:opacity-70",
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
      {loading ? "Gerando…" : "Baixar PDF"}
    </button>
  );
}
