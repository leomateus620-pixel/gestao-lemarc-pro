/* eslint-disable react-refresh/only-export-components -- UI primitives and their formatters share one boundary. */
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function WirePage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("wire-page", className)}>{children}</div>;
}

export function WirePageHeader({
  eyebrow,
  title,
  description,
  action,
  backTo,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  backTo?: string;
}) {
  return (
    <header className="wire-page-header">
      <div className="flex min-w-0 items-start gap-3">
        {backTo ? (
          <Link to={backTo as never} className="wire-icon-btn mt-0.5 shrink-0" aria-label="Voltar">
            <ArrowLeft size={18} />
          </Link>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="wire-eyebrow">{eyebrow}</p> : null}
          <h2 className="wire-page-title">{title}</h2>
          {description ? <p className="wire-page-description">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="wire-page-actions">{action}</div> : null}
    </header>
  );
}

export function WirePanel({
  children,
  className,
  title,
  description,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("wire-panel", className)}>
      {title || action ? (
        <div className="wire-panel-header">
          <div>
            {title ? <h3 className="wire-panel-title">{title}</h3> : null}
            {description ? <p className="wire-panel-description">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function WireLoadingState({
  label = "Carregando dados persistidos...",
}: {
  label?: string;
}) {
  return (
    <div className="wire-state" role="status" aria-live="polite">
      <span className="wire-state-icon bg-orange-50 text-orange-700">
        <Loader2 className="animate-spin" size={23} />
      </span>
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-500">
        A operação será exibida assim que a consulta terminar.
      </p>
    </div>
  );
}

export function WireErrorState({
  error,
  onRetry,
  title = "Não foi possível carregar esta operação",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : "Ocorreu uma falha inesperada.";
  return (
    <div className="wire-state border-red-200 bg-red-50/55" role="alert">
      <span className="wire-state-icon bg-red-100 text-red-700">
        <AlertTriangle size={22} />
      </span>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">{message}</p>
      {onRetry ? (
        <button type="button" className="wire-button-secondary mt-4" onClick={onRetry}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function WireEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="wire-state">
      <span className="wire-state-icon bg-slate-100 text-slate-600">
        <Inbox size={22} />
      </span>
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function WireRestrictedState({ description }: { description?: string }) {
  return (
    <div className="wire-state border-amber-200 bg-amber-50/60" role="status">
      <span className="wire-state-icon bg-amber-100 text-amber-800">
        <LockKeyhole size={22} />
      </span>
      <p className="font-semibold text-slate-950">Acesso restrito</p>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-600">
        {description ?? "Seu perfil não possui permissão para consultar ou executar esta operação."}
      </p>
    </div>
  );
}

export type WireTone = "neutral" | "info" | "success" | "warning" | "danger";

export function WireStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: WireTone;
}) {
  return <span className={cn("wire-status", `wire-status-${tone}`)}>{children}</span>;
}

export function WireProgress({ value, label }: { value: number; label?: string }) {
  const safe = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="min-w-28">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <span>{label ?? "Progresso"}</span>
        <span>{safe}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        aria-label={`${safe}% concluído`}
      >
        <div
          className="h-full rounded-full bg-orange-600 transition-[width]"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

export function WirePager({
  page,
  pageSize,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  count: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (count <= pageSize) return null;
  return (
    <div className="wire-pager">
      <p className="text-sm text-slate-600">
        Página <strong>{page}</strong> de <strong>{pages}</strong> · {count} registros
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="wire-icon-btn"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="wire-icon-btn"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export function WireMetric({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon: ReactNode;
  tone?: WireTone;
}) {
  return (
    <article className={cn("wire-metric", `wire-metric-${tone}`)}>
      <div className="flex items-start justify-between gap-3">
        <p className="wire-metric-label">{label}</p>
        <span className="wire-metric-icon">{icon}</span>
      </div>
      <p className="wire-metric-value">{value}</p>
      {detail ? <p className="wire-metric-detail">{detail}</p> : null}
    </article>
  );
}

export function formatWireDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(
    "pt-BR",
    withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" },
  ).format(date);
}

export function formatWireCurrency(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatWireQuantity(value: number, unit?: string) {
  const formatted = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function orderStatusTone(status: string): WireTone {
  if (["completed", "dispatched", "ready_for_dispatch"].includes(status)) return "success";
  if (["cancelled"].includes(status)) return "danger";
  if (["production_pending", "paused", "awaiting_check", "ready_for_billing"].includes(status))
    return "warning";
  if (["in_production", "separating", "billed", "stock_reserved"].includes(status)) return "info";
  return "neutral";
}

export function inventoryTone(available: number, minimum: number): WireTone {
  if (available <= 0) return "danger";
  if (available <= minimum) return "warning";
  if (minimum > 0 && available <= minimum * 1.35) return "info";
  return "success";
}
