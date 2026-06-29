import { Suspense, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock3,
  ExternalLink,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { formatCurrency, formatMinutes, formatShortDate } from "@/components/colaboradores/format";
import {
  useServiceOrdersQuery,
  useTechnicianLaborHistoryQuery,
  useTechniciansQuery,
} from "@/hooks/useServiceOrders";
import { collaboratorLaborFor, collaboratorOrdersFor } from "@/lib/serviceOrders/collaborators";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { statusLabel } from "@/types/serviceOrder";
import type { ServiceOrder } from "@/types/serviceOrder";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/colaboradores/$id/ordens")({
  head: () => ({ meta: [{ title: "OS do colaborador — Gestão Lemarc" }] }),
  component: ColaboradorOrdensPage,
});

function ColaboradorOrdensPage() {
  return (
    <AppShell title="OS do colaborador" back>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white/[0.06]" />}>
        <OrdensContent />
      </Suspense>
    </AppShell>
  );
}

function OrdensContent() {
  const { id } = Route.useParams();
  const { data: technicians } = useTechniciansQuery();
  const { data: orders } = useServiceOrdersQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();
  const technician = technicians.find((item) => item.id === id);
  if (!technician) throw notFound();

  const labor = collaboratorLaborFor(laborHistory, id);
  const entriesByOrder = useMemo(() => {
    const map = new Map<string, typeof labor>();
    for (const entry of labor) {
      map.set(entry.service_order_id, [...(map.get(entry.service_order_id) ?? []), entry]);
    }
    return map;
  }, [labor]);

  const linkedOrders = collaboratorOrdersFor(orders, id).sort((a, b) => {
    return new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime();
  });

  const totalMinutes = labor.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  const totalCents = labor.reduce((sum, entry) => sum + entry.subtotal_cents, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-4">
      <section className="lemarc-wizard-card p-5 sm:p-6">
        <p className="lemarc-technical-label">Histórico de OS</p>
        <h1 className="font-display text-2xl font-black text-white">{technician.full_name}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          OS vinculadas por seleção de técnico, apontamentos e fallback legado.
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
          <Kpi label="OS vinculadas" value={String(linkedOrders.length)} icon={UsersRound} />
          <Kpi label="Horas apuradas" value={formatMinutes(totalMinutes)} icon={Clock3} />
          <Kpi label="Mão de obra" value={formatCurrency(totalCents)} icon={WalletCards} />
        </div>
      </section>

      <section className="space-y-2">
        {linkedOrders.length === 0 ? (
          <div className="lemarc-island-row p-6 text-center text-sm font-semibold text-slate-300">
            Nenhuma OS vinculada a este colaborador.
          </div>
        ) : (
          linkedOrders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              entries={entriesByOrder.get(order.id) ?? []}
              collaboratorId={id}
            />
          ))
        )}
      </section>
    </main>
  );
}

function OrderRow({
  order,
  entries,
  collaboratorId,
}: {
  order: ServiceOrder;
  entries: ReturnType<typeof collaboratorLaborFor>;
  collaboratorId: string;
}) {
  const [open, setOpen] = useState(false);
  const minutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  const cents = entries.reduce((sum, entry) => sum + entry.subtotal_cents, 0);
  const technicians = getOrderTechnicians(order);
  const involved = technicians.filter((item) => item.id !== collaboratorId);

  return (
    <article className={cn("lemarc-island-row", open && "lemarc-island-row-expanded")}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid w-full gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:grid-cols-[0.6fr_1.35fr_1.2fr_0.65fr_0.8fr_0.85fr_auto] md:items-center"
        aria-expanded={open}
      >
        <span className="font-display text-sm font-black text-primary">#{order.number}</span>
        <span className="min-w-0 truncate text-sm font-black text-white">
          {order.client?.name ?? "Cliente não informado"}
          {order.client_unit?.name ? ` · ${order.client_unit.name}` : ""}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold text-slate-300">{order.title}</span>
        <span className="text-xs font-black text-slate-200 tabular-nums">
          {formatMinutes(minutes || order.worked_minutes)}
        </span>
        <span className="text-xs font-black text-primary tabular-nums">
          {formatCurrency(cents || null)}
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {statusLabel[order.status]}
        </span>
        <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-primary">
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} size={16} />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4 grid gap-3 border-t border-white/[0.08] pt-4 lg:grid-cols-[1.4fr_1fr_auto]">
            <div className="min-w-0">
              <p className="lemarc-technical-label">Descrição inicial</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-300">
                {order.description ?? "Sem descrição inicial."}
              </p>
            </div>
            <div className="min-w-0">
              <p className="lemarc-technical-label">Execução do colaborador</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-300">
                {entries[0]?.description ?? "Sem descrição específica no apontamento."}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>{formatShortDate(entries[0]?.work_date ?? order.opened_at)}</Chip>
                <Chip>{entries.length} apontamento(s)</Chip>
                <Chip>
                  Outros técnicos:{" "}
                  {involved.length > 0 ? involved.map((item) => item.full_name).join(", ") : "não"}
                </Chip>
              </div>
            </div>
            <Link
              to="/ordens/$id"
              params={{ id: order.id }}
              className="lemarc-primary-action lemarc-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-display text-xs font-black uppercase tracking-[0.14em]"
            >
              <ExternalLink size={15} />
              Abrir OS
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-300">
      {children}
    </span>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="lemarc-compact-metric min-w-[10rem]">
      <div className="flex items-center justify-between gap-2">
        <p className="lemarc-technical-label">{label}</p>
        <Icon size={14} className="text-primary" />
      </div>
      <p className="mt-1 font-display text-lg font-black text-white tabular-nums">{value}</p>
    </div>
  );
}
