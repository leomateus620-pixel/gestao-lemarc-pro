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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { isAlert, isIncomplete, missingFields, statusBucket } from "@/lib/serviceOrders/status";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";

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

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShortDateTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `hoje, ${formatTime(date)}`;
  if (isSameDay(date, yesterday)) return `ontem, ${formatTime(date)}`;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatElapsed(iso: string) {
  const opened = new Date(iso);
  if (Number.isNaN(opened.getTime())) return "Abertura sem data";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - opened.getTime()) / 60_000));
  if (diffMinutes < 2) return "Aberta agora";
  if (diffMinutes < 60) return `Aberta há ${diffMinutes}min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Aberta há ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Aberta há ${diffDays}d`;
}

export function ServiceOrderCard({ order }: { order: ServiceOrder }) {
  const accent = accentConfig[cardAccent(order)];
  const physics = usePhysicsCard<HTMLDivElement>({
    maxRotate: 4.2,
    mobileMaxRotate: 1.3,
    lift: -2,
  });
  const missing = missingFields(order);
  const incomplete = isIncomplete(order);
  const hasTechnician = Boolean(order.technician_id || order.technician?.full_name);
  const hasUnit = Boolean(order.client_unit_id || order.client_unit?.name || order.client?.unit);
  const hasClient = Boolean(order.client_id || order.client?.name);
  const unitName = order.client_unit?.name ?? order.client?.unit;
  const localName = order.location ?? order.client_unit?.sector;
  const openedAt = formatShortDateTime(order.opened_at);
  const scheduledFor = formatShortDateTime(order.scheduled_for);
  const style = {
    ...physics.style,
    "--lemarc-card-accent": accent.color,
    "--lemarc-card-glow": accent.glow,
  } as CSSProperties;

  return (
    <Link
      to="/ordens/$id"
      params={{ id: order.id }}
      className="group/order block rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Abrir OS ${order.number}`}
    >
      <div
        ref={physics.ref}
        className="lemarc-kinetic-card relative overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-[linear-gradient(145deg,oklch(0.285_0.043_252/0.92),oklch(0.145_0.038_252/0.88))] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_20px_44px_-25px_oklch(0_0_0/0.86),0_8px_20px_-17px_var(--lemarc-card-glow)] backdrop-blur-xl transition-colors hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_42%,white_10%)] sm:p-5"
        data-kinetic-active={physics.active}
        style={style}
        {...physics.handlers}
      >
        <div aria-hidden="true" className="lemarc-card-glare" />
        <div
          aria-hidden="true"
          className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lemarc-card-accent)] to-transparent opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-full bg-[var(--lemarc-card-accent)] shadow-[0_0_20px_var(--lemarc-card-glow)]"
        />

        <div className="relative pl-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[0.72rem] font-black uppercase tracking-[0.16em] text-[var(--lemarc-card-accent)]">
                  OS #{order.number}
                </span>
                <ServiceTypeTag>
                  {order.service_type ? serviceTypeLabel[order.service_type] : "Tipo pendente"}
                </ServiceTypeTag>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <ServiceOrderStatusBadge status={order.status} />
              <ServiceOrderPriorityBadge priority={order.priority} />
            </div>
          </div>

          <h3 className="mt-3 line-clamp-2 font-display text-base font-black leading-tight text-foreground sm:text-[1.05rem]">
            {order.title || "OS sem título"}
          </h3>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ServiceOrderMetaRow
              icon={Building2}
              label="Cliente"
              value={order.client?.name ?? "Cliente não vinculado"}
              pending={!hasClient}
            />
            <ServiceOrderMetaRow
              icon={Factory}
              label="Unidade"
              value={unitName ?? "Unidade não informada"}
              pending={!hasUnit}
            />
            <ServiceOrderMetaRow
              icon={MapPin}
              label="Local / setor"
              value={localName ?? "Local não informado"}
              pending={!localName}
            />
            <ServiceOrderMetaRow
              icon={HardHat}
              label="Técnico"
              value={order.technician?.full_name ?? "Sem técnico definido"}
              pending={!hasTechnician}
            />
            <ServiceOrderMetaRow
              icon={Clock3}
              label="Abertura"
              value={openedAt ? `Aberta ${openedAt}` : "Abertura sem data"}
              pending={!openedAt}
            />
            <ServiceOrderMetaRow
              icon={CalendarClock}
              label="Previsão"
              value={scheduledFor ? `Prevista ${scheduledFor}` : "Sem previsão definida"}
              pending={!scheduledFor}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3">
            <SummaryChip icon={Clock3}>{formatElapsed(order.opened_at)}</SummaryChip>
            <SummaryChip icon={hasTechnician ? CheckCircle2 : AlertTriangle}>
              {hasTechnician ? "Técnico definido" : "Técnico pendente"}
            </SummaryChip>
            <SummaryChip icon={hasUnit ? CheckCircle2 : AlertTriangle}>
              {hasUnit ? "Unidade vinculada" : "Unidade pendente"}
            </SummaryChip>
            {incomplete && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-review/30 bg-status-review/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-status-review">
                <AlertTriangle className="h-3 w-3" />
                Dados pendentes{missing.length ? ` (${missing.length})` : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function ServiceTypeTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
      <span className="truncate">{children}</span>
    </span>
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
    return (
      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
        Sem prioridade
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em]",
        priorityTone[priority],
      )}
    >
      Prioridade {priorityLabel[priority]}
    </span>
  );
}

function ServiceOrderMetaRow({
  icon: Icon,
  label,
  value,
  pending,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  pending?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5",
        pending && "border-status-review/[0.18] bg-status-review/[0.06]",
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-[#07111f]/70 text-[var(--lemarc-card-accent)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.56rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[0.78rem] font-semibold text-foreground",
            pending && "text-muted-foreground",
          )}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

function SummaryChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0 text-[var(--lemarc-card-accent)]" />
      <span className="truncate">{children}</span>
    </span>
  );
}
