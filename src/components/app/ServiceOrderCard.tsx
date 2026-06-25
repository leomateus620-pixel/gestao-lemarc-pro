import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Factory,
  HardHat,
  MapPin,
  Timer,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { isAlert, isIncomplete, missingFields, statusBucket } from "@/lib/serviceOrders/status";
import {
  closureKind,
  formatRelativeServiceOrderTime,
  formatServiceOrderDateTime,
  formatServiceOrderDuration,
  getClosedAt,
  getOpenedAt,
  isClosedStatus,
} from "@/lib/serviceOrders/time";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";
import {
  formatTechnicianList,
  getOrderTechnicians,
} from "@/lib/serviceOrders/technicians";

type CardAccent = "orange" | "blue" | "amber" | "green" | "red" | "steel";

const accentConfig: Record<CardAccent, { color: string; glow: string }> = {
  orange: { color: "var(--primary)", glow: "oklch(0.72 0.19 50 / 0.42)" },
  blue: { color: "var(--status-transit)", glow: "oklch(0.7 0.15 230 / 0.34)" },
  amber: { color: "var(--status-review)", glow: "oklch(0.78 0.16 90 / 0.34)" },
  green: { color: "var(--status-done)", glow: "oklch(0.7 0.16 155 / 0.28)" },
  red: { color: "var(--destructive)", glow: "oklch(0.62 0.22 25 / 0.36)" },
  steel: { color: "var(--status-pending)", glow: "oklch(0.72 0.025 250 / 0.26)" },
};

const statusTone: Record<ServiceOrderStatus, string> = {
  pending: "border-primary/[0.45] bg-primary/[0.13] text-primary",
  dispatched: "border-primary/[0.45] bg-primary/[0.13] text-primary",
  transit: "border-status-transit/[0.45] bg-status-transit/[0.13] text-status-transit",
  running: "border-status-transit/[0.45] bg-status-transit/[0.13] text-status-transit",
  finished: "border-status-review/[0.45] bg-status-review/[0.13] text-status-review",
  review: "border-status-review/[0.45] bg-status-review/[0.13] text-status-review",
  approved: "border-status-done/[0.45] bg-status-done/[0.13] text-status-done",
  cancelled: "border-destructive/[0.45] bg-destructive/[0.13] text-destructive",
};

const priorityTone: Record<ServicePriority, string> = {
  baixa: "border-status-transit/[0.25] bg-status-transit/[0.08] text-status-transit",
  media: "border-status-review/30 bg-status-review/10 text-status-review",
  alta: "border-primary/35 bg-primary/10 text-primary",
  urgente: "border-destructive/[0.45] bg-destructive/[0.13] text-destructive",
};

function cardAccent(order: ServiceOrder): CardAccent {
  if (order.priority === "urgente" || isAlert(order)) return "red";

  const bucket = statusBucket[order.status];
  if (bucket === "pending") return "orange";
  if (bucket === "inProgress") return "blue";
  if (bucket === "review") return "amber";
  if (bucket === "done") return "green";
  if (bucket === "cancelled") return "red";
  return "steel";
}

export function ServiceOrderCard({ order }: { order: ServiceOrder }) {
  const accent = accentConfig[cardAccent(order)];
  const physics = usePhysicsCard<HTMLDivElement>({
    maxRotate: 3.4,
    mobileMaxRotate: 1,
    lift: -2,
  });
  const missing = missingFields(order);
  const incomplete = isIncomplete(order);
  const orderTechs = getOrderTechnicians(order);
  const hasTechnician = orderTechs.length > 0;
  const technicianLabel = hasTechnician
    ? formatTechnicianList(orderTechs, 2)
    : "Sem técnico definido";
  const technicianTitle = hasTechnician
    ? orderTechs.map((t) => t.full_name).join(", ")
    : "Sem técnico";
  const hasUnit = Boolean(order.client_unit_id || order.client_unit?.name || order.client?.unit);
  const hasClient = Boolean(order.client_id || order.client?.name);
  const unitName = order.client_unit?.name ?? order.client?.unit;
  const localName = order.location ?? order.client_unit?.sector;
  const openedIso = getOpenedAt(order);
  const closedIso = getClosedAt(order);
  const openedAt = formatServiceOrderDateTime(openedIso);
  const closedAt = formatServiceOrderDateTime(closedIso);
  const scheduledFor = formatServiceOrderDateTime(order.scheduled_for);
  const elapsed = !isClosedStatus(order.status) ? formatRelativeServiceOrderTime(openedIso) : null;
  const duration = formatServiceOrderDuration(openedIso, closedIso);
  const closure = closureKind(order);
  const style = {
    ...physics.style,
    "--lemarc-card-accent": accent.color,
    "--lemarc-card-glow": accent.glow,
  } as CSSProperties;

  return (
    <Link
      to="/ordens/$id"
      params={{ id: order.id }}
      className="group/order block rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Abrir OS ${order.number}`}
    >
      <div
        ref={physics.ref}
        className="lemarc-kinetic-card relative overflow-hidden rounded-[1.5rem] border border-white/[0.1] bg-[linear-gradient(155deg,oklch(0.265_0.042_252/0.94),oklch(0.135_0.036_252/0.92))] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_18px_40px_-26px_oklch(0_0_0/0.85),0_6px_16px_-18px_var(--lemarc-card-glow)] backdrop-blur-xl transition-all duration-300 hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_38%,white_8%)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.14),0_22px_46px_-24px_oklch(0_0_0/0.9),0_10px_22px_-16px_var(--lemarc-card-glow)] sm:p-5"
        data-kinetic-active={physics.active}
        style={style}
        {...physics.handlers}
      >
        <div aria-hidden="true" className="lemarc-card-glare" />
        <div
          aria-hidden="true"
          className="absolute bottom-5 left-0 top-5 w-[3px] rounded-r-full bg-gradient-to-b from-[var(--lemarc-card-accent)] via-[color-mix(in_oklab,var(--lemarc-card-accent)_70%,transparent)] to-transparent shadow-[0_0_18px_var(--lemarc-card-glow)]"
        />

        <div className="relative pl-3 sm:pl-4">
          {/* Header: ID + tipo / status + prioridade */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--lemarc-card-accent)]">
                OS #{order.number}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="truncate text-[0.7rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {order.service_type ? serviceTypeLabel[order.service_type] : "Tipo pendente"}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <ServiceOrderStatusBadge status={order.status} />
              <ServiceOrderPriorityBadge priority={order.priority} />
            </div>
          </div>

          {/* Título — protagonista */}
          <h3 className="mt-2.5 line-clamp-2 font-display text-[1.05rem] font-black leading-tight text-foreground sm:text-[1.15rem]">
            {order.title || "OS sem título"}
          </h3>

          {/* Lista operacional com divisores finos */}
          <div className="mt-3.5 divide-y divide-white/[0.05] border-y border-white/[0.05]">
            <MetaLine
              left={{
                icon: Building2,
                value: order.client?.name ?? "Cliente não vinculado",
                pending: !hasClient,
              }}
              right={{
                icon: Factory,
                value: unitName ?? "Unidade não informada",
                pending: !hasUnit,
              }}
            />
            <MetaLine
              left={{
                icon: MapPin,
                value: localName ?? "Local não informado",
                pending: !localName,
              }}
              right={{
                icon: HardHat,
                value: <span title={technicianTitle}>{technicianLabel}</span>,
                pending: !hasTechnician,
              }}
            />
          </div>

          {/* Mini-timeline: abertura, fechamento, duração ou tempo decorrido */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SummaryChip icon={Clock3}>
              {openedAt ? `Aberta ${openedAt}` : "Abertura não registrada"}
            </SummaryChip>
            {closure === "cancelada" ? (
              <SummaryChip icon={XCircle} tone="danger">
                {closedAt ? `Cancelada ${closedAt}` : "Cancelada"}
              </SummaryChip>
            ) : closure ? (
              <>
                <SummaryChip icon={CheckCircle2} tone="accent">
                  {closedAt
                    ? `${closure === "aprovada" ? "Aprovada" : "Concluída"} ${closedAt}`
                    : "Fechamento não registrado"}
                </SummaryChip>
                {duration && (
                  <SummaryChip icon={Timer} tone="accent">
                    Tempo total {duration}
                  </SummaryChip>
                )}
              </>
            ) : (
              <>
                {scheduledFor && (
                  <SummaryChip icon={CalendarClock}>Prevista {scheduledFor}</SummaryChip>
                )}
                {elapsed && <SummaryChip icon={Timer}>{elapsed}</SummaryChip>}
              </>
            )}
          </div>

          {/* Pendências (somente quando relevantes) */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {!hasTechnician && (
              <SummaryChip icon={AlertTriangle} tone="warn">
                Técnico pendente
              </SummaryChip>
            )}
            {!hasUnit && (
              <SummaryChip icon={AlertTriangle} tone="warn">
                Unidade pendente
              </SummaryChip>
            )}
            {incomplete && (
              <SummaryChip icon={AlertTriangle} tone="warn">
                Dados pendentes{missing.length ? ` (${missing.length})` : ""}
              </SummaryChip>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ServiceOrderStatusBadge({ status }: { status: ServiceOrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em]",
        statusTone[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />
      {statusLabel[status]}
    </span>
  );
}

function ServiceOrderPriorityBadge({ priority }: { priority: ServicePriority | null }) {
  if (!priority) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-1.5 text-[0.54rem] font-bold uppercase tracking-[0.14em] opacity-90",
        priorityTone[priority],
        "border-0 bg-transparent",
      )}
    >
      · {priorityLabel[priority]}
    </span>
  );
}

type MetaItem = { icon: LucideIcon; value: ReactNode; pending?: boolean };

function MetaLine({ left, right }: { left: MetaItem; right: MetaItem }) {
  return (
    <div className="grid gap-y-1.5 py-2 sm:grid-cols-2 sm:gap-x-5">
      <MetaCell {...left} />
      <MetaCell {...right} />
    </div>
  );
}

function MetaCell({
  icon: Icon,
  value,
  pending,
}: {
  icon: LucideIcon;
  value: ReactNode;
  pending?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          pending ? "text-status-review/70" : "text-[var(--lemarc-card-accent)]/85",
        )}
      />
      <span
      className={cn(
          "truncate text-[0.8rem] font-semibold text-foreground/90",
          pending && "font-medium text-muted-foreground/70 italic",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "neutral" | "warn" | "accent" | "danger";
}) {
  const toneClass =
    tone === "warn"
      ? "border border-status-review/30 bg-status-review/10 text-status-review"
      : tone === "accent"
        ? "border border-[color-mix(in_oklab,var(--lemarc-card-accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--lemarc-card-accent)_14%,transparent)] text-[var(--lemarc-card-accent)]"
        : tone === "danger"
          ? "border border-destructive/40 bg-destructive/10 text-destructive"
          : "border border-white/[0.08] bg-white/[0.04] text-muted-foreground";
  const iconClass =
    tone === "warn"
      ? "text-status-review"
      : tone === "danger"
        ? "text-destructive"
        : "text-[var(--lemarc-card-accent)]";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.1em] tabular-nums",
        toneClass,
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", iconClass)} />
      <span className="truncate">{children}</span>
    </span>
  );
}
