import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, FileDown, MoreVertical, Send, XCircle } from "lucide-react";
import type { ReportOrderRow, BillingStatus } from "@/types/reports";
import { StatusBadge, type OrderStatus } from "@/components/app/StatusBadge";
import { BillingStatusBadge } from "./BillingStatusBadge";
import { formatCurrency, formatDate, formatHours } from "@/lib/reports/formatters";
import {
  priorityLabel,
  serviceTypeLabel,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";
import { useUpdateBillingStatus } from "@/hooks/useReports";
import { toast } from "sonner";
import { getReportRowTechnicians } from "@/lib/serviceOrders/technicians";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const VISIBLE_STATUSES = new Set<ServiceOrderStatus>([
  "pending",
  "dispatched",
  "transit",
  "running",
  "finished",
  "review",
  "approved",
]);

const PRIORITY_STYLES: Record<ServicePriority, string> = {
  baixa: "border-status-done/35 bg-status-done/10 text-status-done",
  media: "border-status-review/35 bg-status-review/10 text-status-review",
  alta: "border-primary/45 bg-primary/15 text-primary",
  urgente: "border-destructive/50 bg-destructive/20 text-destructive",
};

function mapStatus(s: ServiceOrderStatus): OrderStatus | null {
  if (!VISIBLE_STATUSES.has(s)) return null;
  if (s === "dispatched" || s === "transit") return "transit";
  return s as OrderStatus;
}

function typeLabel(r: ReportOrderRow) {
  if (!r.service_type) return "—";
  if (r.service_type === "outro" && r.service_type_other) return r.service_type_other;
  return serviceTypeLabel[r.service_type];
}

function technicianNames(r: ReportOrderRow): string {
  const techs = getReportRowTechnicians(r);
  if (techs.length === 0) return "Sem técnico";
  return techs.map((t) => t.name).join(", ");
}

function technicianCompact(r: ReportOrderRow): string {
  const techs = getReportRowTechnicians(r);
  if (techs.length === 0) return "Sem técnico";
  if (techs.length <= 2) return techs.map((t) => t.name).join(", ");
  return `${techs.slice(0, 2).map((t) => t.name).join(", ")} +${techs.length - 2}`;
}

function timeLabel(r: ReportOrderRow) {
  return r.worked_minutes === null ? "Sem horas" : formatHours(r.worked_minutes);
}

function valueLabel(r: ReportOrderRow) {
  if (r.estimated_value > 0) return formatCurrency(r.estimated_value);
  if (r.worked_minutes_effective > 0 && (r.hour_rate ?? 0) <= 0) return "Sem hour_rate";
  return "—";
}

function ReportPriorityBadge({ priority }: { priority: ServicePriority | null }) {
  if (!priority) return <Muted>Sem prioridade</Muted>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
        PRIORITY_STYLES[priority],
      )}
    >
      {priorityLabel[priority]}
    </span>
  );
}

function BillingActions({ id, current }: { id: string; current: BillingStatus }) {
  const mutation = useUpdateBillingStatus();
  function set(status: BillingStatus, label: string) {
    mutation.mutate(
      { data: { id, billing_status: status } },
      {
        onSuccess: () => toast.success(`Cobrança: ${label}`),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao atualizar"),
      },
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-lg border border-white/0 text-slate-300 transition hover:border-white/10 hover:bg-white/10 hover:text-white"
          aria-label="Ações de cobrança"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cobrança</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={current === "ready"} onClick={() => set("ready", "pronta")}>
          <Send size={14} className="mr-2" /> Marcar como pronta
        </DropdownMenuItem>
        <DropdownMenuItem disabled={current === "billed"} onClick={() => set("billed", "faturada")}>
          <CheckCircle2 size={14} className="mr-2" /> Marcar como faturada
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={current === "pending"}
          onClick={() => set("pending", "pendente")}
        >
          <FileDown size={14} className="mr-2" /> Voltar para pendente
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={current === "cancelled"}
          onClick={() => set("cancelled", "cancelada")}
        >
          <XCircle size={14} className="mr-2" /> Cancelar cobrança
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReportOrdersTable({ rows }: { rows: ReportOrderRow[] }) {
  return (
    <div className="lemarc-report-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="lemarc-report-table w-full min-w-[1040px] text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-[0.12em] text-slate-300">
            <tr>
              <Th>OS</Th>
              <Th>Cliente</Th>
              <Th>Unidade</Th>
              <Th>Técnicos</Th>
              <Th>Status</Th>
              <Th>Prioridade</Th>
              <Th>Tipo</Th>
              <Th>Abertura</Th>
              <Th>Fechamento</Th>
              <Th className="text-right">Tempo</Th>
              <Th className="text-right">Valor</Th>
              <Th>Cobrança</Th>
              <Th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = mapStatus(r.status);
              return (
                <tr key={r.id} className="border-t border-white/[0.07]">
                  <Td>
                    <Link
                      to="/ordens/$id"
                      params={{ id: r.id }}
                      className="font-display text-[13px] font-black text-primary hover:text-orange-glow"
                    >
                      #{r.number}
                    </Link>
                    <div
                      className="line-clamp-1 max-w-[142px] text-[11px] font-medium text-slate-300/72"
                      title={r.title}
                    >
                      {r.title}
                    </div>
                  </Td>
                  <Td className="max-w-[150px] font-semibold text-slate-100">
                    <span className="line-clamp-2" title={r.client_name ?? "Sem cliente"}>
                      {r.client_name ?? <Muted>Sem cliente</Muted>}
                    </span>
                  </Td>
                  <Td>{r.client_unit_name ?? <Muted>—</Muted>}</Td>
                  <Td className="max-w-[150px]">
                    {(() => {
                      const techs = getReportRowTechnicians(r);
                      const full = technicianNames(r);
                      return (
                        <span
                          className="line-clamp-2 font-semibold text-slate-100"
                          title={full}
                        >
                          {techs.length === 0 ? (
                            <Muted>Sem técnico</Muted>
                          ) : (
                            technicianCompact(r)
                          )}
                        </span>
                      );
                    })()}
                  </Td>
                  <Td>
                    {st ? (
                      <StatusBadge
                        status={st}
                        className="max-w-[136px] whitespace-normal text-center leading-tight"
                      />
                    ) : (
                      <Muted>{r.status}</Muted>
                    )}
                  </Td>
                  <Td>
                    <ReportPriorityBadge priority={r.priority} />
                  </Td>
                  <Td className="max-w-[138px]">
                    <span className="line-clamp-2" title={typeLabel(r)}>
                      {typeLabel(r)}
                    </span>
                  </Td>
                  <Td>{formatDate(r.opened_at)}</Td>
                  <Td>{formatDate(r.closed_at)}</Td>
                  <Td className="text-right font-bold tabular-nums text-slate-100">
                    {timeLabel(r)}
                  </Td>
                  <Td className="text-right font-bold tabular-nums text-slate-100">
                    {valueLabel(r) === "—" ? <Muted>—</Muted> : valueLabel(r)}
                  </Td>
                  <Td>
                    <BillingStatusBadge status={r.billing_status} />
                  </Td>
                  <Td>
                    <BillingActions id={r.id} current={r.billing_status} />
                  </Td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td
                  colSpan={13}
                  className="py-12 text-center text-xs font-semibold text-slate-300/82"
                >
                  Nenhuma OS encontrada para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportOrdersMobileList({ rows }: { rows: ReportOrderRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!rows.length)
    return (
      <div className="lemarc-report-card p-6 text-center text-xs font-semibold text-slate-300/82">
        Nenhuma OS encontrada para os filtros atuais.
      </div>
    );
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const st = mapStatus(r.status);
        const isOpen = expanded === r.id;
        return (
          <article key={r.id} className="lemarc-report-card lemarc-report-mobile-card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/ordens/$id"
                    params={{ id: r.id }}
                    className="font-display text-base font-black text-primary"
                  >
                    #{r.number}
                  </Link>
                  {st && (
                    <StatusBadge
                      status={st}
                      className="max-w-full whitespace-normal text-center leading-tight"
                    />
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug text-white">
                  {r.title}
                </div>
              </div>
              <BillingActions id={r.id} current={r.billing_status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <MobileFact label="Cliente" value={r.client_name ?? "Sem cliente"} wide />
              <MobileFact label="Técnicos" value={technicianCompact(r)} />
              <MobileFact
                label="Prioridade"
                value={<ReportPriorityBadge priority={r.priority} />}
              />
              <MobileFact label="Abertura" value={formatDate(r.opened_at)} />
              <MobileFact label="Tempo" value={timeLabel(r)} />
              <MobileFact label="Valor" value={valueLabel(r)} strong />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
              <BillingStatusBadge status={r.billing_status} />
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="rounded-full border border-primary/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary transition hover:bg-primary/10"
              >
                {isOpen ? "Menos" : "Detalhes"}
              </button>
            </div>
            {isOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3 text-[11px]">
                <MobileFact label="Unidade" value={r.client_unit_name ?? "—"} />
                <MobileFact label="Tipo" value={typeLabel(r)} />
                <MobileFact label="Fechamento" value={formatDate(r.closed_at)} />
                <MobileFact
                  label="Cobrança"
                  value={<BillingStatusBadge status={r.billing_status} />}
                />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function MobileFact({
  label,
  value,
  strong,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.045] p-2",
        wide && "col-span-2",
      )}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 truncate font-semibold text-slate-100",
          strong && "font-display font-black tabular-nums text-white",
        )}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-3 py-3 text-left font-black", className)} {...props}>
      {children}
    </th>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3 align-middle text-slate-200/92", className)}>{children}</td>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-slate-400/88">{children}</span>;
}
