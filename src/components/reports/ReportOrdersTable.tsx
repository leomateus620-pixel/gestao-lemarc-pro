import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, FileDown, MoreVertical, Send, XCircle } from "lucide-react";
import type { ReportOrderRow, BillingStatus } from "@/types/reports";
import { GlassCard } from "@/components/app/GlassCard";
import { StatusBadge, type OrderStatus } from "@/components/app/StatusBadge";
import { BillingStatusBadge } from "./BillingStatusBadge";
import { formatCurrency, formatDate, formatHours } from "@/lib/reports/formatters";
import {
  priorityLabel,
  serviceTypeLabel,
  type ServiceOrderStatus,
} from "@/types/serviceOrder";
import { useUpdateBillingStatus } from "@/hooks/useReports";
import { toast } from "sonner";
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

function BillingActions({
  id,
  current,
}: {
  id: string;
  current: BillingStatus;
}) {
  const mutation = useUpdateBillingStatus();
  function set(status: BillingStatus, label: string) {
    mutation.mutate(
      { data: { id, billing_status: status } },
      {
        onSuccess: () => toast.success(`Cobrança: ${label}`),
        onError: (e: any) => toast.error(e?.message ?? "Falha ao atualizar"),
      },
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
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
        <DropdownMenuItem disabled={current === "pending"} onClick={() => set("pending", "pendente")}>
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
    <GlassCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[12px]">
          <thead className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>OS</Th>
              <Th>Cliente</Th>
              <Th>Unidade</Th>
              <Th>Técnico</Th>
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
                <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <Td>
                    <Link
                      to="/ordens/$id"
                      params={{ id: r.id }}
                      className="font-display text-[12px] font-black text-primary"
                    >
                      #{r.number}
                    </Link>
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">{r.title}</div>
                  </Td>
                  <Td>{r.client_name ?? <Muted>Sem cliente</Muted>}</Td>
                  <Td>{r.client_unit_name ?? <Muted>—</Muted>}</Td>
                  <Td>{r.technician_name ?? <Muted>Sem técnico</Muted>}</Td>
                  <Td>{st ? <StatusBadge status={st} /> : <Muted>{r.status}</Muted>}</Td>
                  <Td>{r.priority ? priorityLabel[r.priority] : <Muted>—</Muted>}</Td>
                  <Td>{typeLabel(r)}</Td>
                  <Td>{formatDate(r.opened_at)}</Td>
                  <Td>{formatDate(r.closed_at)}</Td>
                  <Td className="text-right tabular-nums">{formatHours(r.worked_minutes)}</Td>
                  <Td className="text-right tabular-nums">
                    {r.estimated_value > 0 ? formatCurrency(r.estimated_value) : <Muted>—</Muted>}
                  </Td>
                  <Td><BillingStatusBadge status={r.billing_status} /></Td>
                  <Td><BillingActions id={r.id} current={r.billing_status} /></Td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={13} className="py-12 text-center text-xs text-muted-foreground">
                  Sem OS para os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

export function ReportOrdersMobileList({ rows }: { rows: ReportOrderRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!rows.length)
    return (
      <GlassCard className="p-6 text-center text-xs text-muted-foreground">
        Sem OS para os filtros atuais.
      </GlassCard>
    );
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const st = mapStatus(r.status);
        const isOpen = expanded === r.id;
        return (
          <GlassCard key={r.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to="/ordens/$id"
                    params={{ id: r.id }}
                    className="font-display text-sm font-black text-primary"
                  >
                    #{r.number}
                  </Link>
                  {st && <StatusBadge status={st} />}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[12px] font-semibold text-foreground">
                  {r.title}
                </div>
                <div className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                  {(r.client_name ?? "Sem cliente") + " · " + (r.technician_name ?? "Sem técnico")}
                </div>
              </div>
              <BillingActions id={r.id} current={r.billing_status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="tabular-nums text-muted-foreground">
                {formatHours(r.worked_minutes)} · {formatDate(r.opened_at)}
              </span>
              <span className="font-display font-black tabular-nums text-foreground">
                {r.estimated_value > 0 ? formatCurrency(r.estimated_value) : "—"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <BillingStatusBadge status={r.billing_status} />
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="text-[11px] font-bold uppercase tracking-wider text-primary"
              >
                {isOpen ? "Menos" : "Detalhes"}
              </button>
            </div>
            {isOpen && (
              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-white/5 pt-2 text-[11px]">
                <DetailRow label="Unidade" value={r.client_unit_name ?? "—"} />
                <DetailRow label="Tipo" value={typeLabel(r)} />
                <DetailRow label="Prioridade" value={r.priority ? priorityLabel[r.priority] : "—"} />
                <DetailRow label="Fechamento" value={formatDate(r.closed_at)} />
              </dl>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </>
  );
}

function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-3 py-2 text-left font-black", className)} {...props}>
      {children}
    </th>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}