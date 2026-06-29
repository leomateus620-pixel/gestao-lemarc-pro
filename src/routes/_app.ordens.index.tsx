import { Suspense, useMemo, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Activity, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { MetricPeriodFilter } from "@/components/dashboard/MetricPeriodFilter";
import { ServiceOrderIslandRow } from "@/components/ordens/ServiceOrderIslandRow";
import { Input } from "@/components/ui/input";
import {
  useServiceOrderFinancialSummariesQuery,
  useServiceOrdersQuery,
} from "@/hooks/useServiceOrders";
import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { filterByPeriod, type Period, type PeriodRange } from "@/lib/serviceOrders/period";
import { isAlert, isIncomplete, statusBucket } from "@/lib/serviceOrders/status";
import { getOrderTechnicians, getServiceOrderWorkedMinutes } from "@/lib/serviceOrders/technicians";
import { getOpenedAt } from "@/lib/serviceOrders/time";
import type { OrderFinancials } from "@/types/financials";
import {
  priorityLabel,
  serviceTypeLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";

type StatusFilter = "todas" | "pendente" | "andamento" | "revisao" | "concluida" | "cancelada";
type PriorityFilter = "todas" | ServicePriority;
type SortMode =
  "recentes" | "status" | "prioridade" | "cliente" | "previsao" | "maior-tempo" | "maior-valor";

const searchSchema = z.object({
  status: fallback(
    z.enum(["todas", "pendente", "andamento", "revisao", "concluida", "cancelada"]),
    "todas",
  ).default("todas"),
  priority: fallback(z.enum(["todas", "baixa", "media", "alta", "urgente"]), "todas").default(
    "todas",
  ),
  client: fallback(z.string(), "all").default("all"),
  technician: fallback(z.string(), "all").default("all"),
  sort: fallback(
    z.enum([
      "recentes",
      "status",
      "prioridade",
      "cliente",
      "previsao",
      "maior-tempo",
      "maior-valor",
    ]),
    "recentes",
  ).default("recentes"),
  period: fallback(z.enum(["day", "week", "month", "custom", "all"]), "all").default("all"),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  filtro: fallback(z.enum(["alertas", "incompletas", "none"]), "none").default("none"),
  q: fallback(z.string(), "").default(""),
});

type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/ordens/")({
  head: () => ({ meta: [{ title: "Ordens de serviço — Gestão Lemarc" }] }),
  validateSearch: zodValidator(searchSchema),
  errorComponent: OrdensError,
  component: OrdensPage,
});

const statusRank: Record<ServiceOrderStatus, number> = {
  running: 0,
  transit: 1,
  dispatched: 2,
  pending: 3,
  finished: 4,
  review: 5,
  approved: 6,
  cancelled: 7,
};

const priorityRank: Record<ServicePriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

function OrdensPage() {
  return (
    <AppShell
      title="Ordens de serviço"
      action={
        <Link
          to="/ordens/nova"
          className="lemarc-primary-action lemarc-pressable grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          aria-label="Nova OS"
        >
          <Plus size={18} />
        </Link>
      }
    >
      <Suspense fallback={<OrdensSkeleton />}>
        <OrdensList />
      </Suspense>
    </AppShell>
  );
}

function OrdensList() {
  const { status, priority, client, technician, sort, period, from, to, filtro, q } =
    Route.useSearch();
  const navigate = useNavigate({ from: "/ordens" });
  const { data: orders } = useServiceOrdersQuery();
  const { data: financials } = useServiceOrderFinancialSummariesQuery();
  const periodRange = useMemo<PeriodRange>(
    () => ({ from: from || undefined, to: to || undefined }),
    [from, to],
  );
  const financialMap = useMemo(
    () => new Map(financials.map((item) => [item.service_order_id, item])),
    [financials],
  );
  const periodOrders = useMemo(
    () => filterByPeriod(orders, period as Period, periodRange),
    [orders, period, periodRange],
  );
  const kpis = useMemo(() => computeKpis(periodOrders, financialMap), [financialMap, periodOrders]);
  const options = useMemo(() => buildFilterOptions(periodOrders), [periodOrders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return periodOrders
      .filter((order) => {
        if (!matchesStatus(order, status as StatusFilter)) return false;
        if (priority !== "todas" && order.priority !== priority) return false;
        if (!matchesClient(order, client)) return false;
        if (!matchesTechnician(order, technician)) return false;
        if (filtro === "alertas" && !isAlert(order)) return false;
        if (filtro === "incompletas" && !isIncomplete(order)) return false;
        if (needle && !searchHaystack(order).includes(needle)) return false;
        return true;
      })
      .sort((a, b) => compareOrders(a, b, sort as SortMode, financialMap));
  }, [client, financialMap, filtro, periodOrders, priority, q, sort, status, technician]);

  const setSearch = (patch: Partial<SearchState>) =>
    navigate({ search: (prev: SearchState) => ({ ...prev, ...patch }) });
  const setPeriodWithRange = (next: Period, range?: PeriodRange) =>
    navigate({
      search: (prev: SearchState) => ({
        ...prev,
        period: next,
        from: next === "custom" ? (range?.from ?? prev.from) : "",
        to: next === "custom" ? (range?.to ?? prev.to) : "",
      }),
    });

  const hasActiveFilters =
    status !== "todas" ||
    priority !== "todas" ||
    client !== "all" ||
    technician !== "all" ||
    period !== "all" ||
    filtro !== "none" ||
    q.trim() !== "";

  return (
    <main className="mx-auto max-w-6xl space-y-4 pb-8">
      <section className="lemarc-wizard-card p-4 sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:items-end">
          <div className="min-w-0">
            <p className="lemarc-technical-label">Operação Lemarc</p>
            <h1 className="mt-0.5 font-display text-xl font-black leading-tight text-white sm:text-2xl">
              Ordens de Serviço
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] font-medium leading-snug text-slate-300">
              Acompanhamento das OS abertas, em campo, finalizadas e em revisão.
            </p>
          </div>
          <Link
            to="/ordens/nova"
            className="lemarc-primary-action lemarc-pressable inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 font-display text-[11px] font-black uppercase tracking-[0.1em]"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nova OS</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        </div>

        <div className="mt-3.5 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
          <Kpi label="Total" value={kpis.total} />
          <Kpi label="Abertas" value={kpis.open} />
          <Kpi label="Em campo" value={kpis.inField} />
          <Kpi label="Em revisão" value={kpis.review} />
          <Kpi label="Finalizadas" value={kpis.done} />
          <Kpi
            label="Horas apuradas"
            value={formatHHmm(kpis.realMinutes)}
            hint={
              kpis.estimatedMinutes > 0
                ? `Estimado: ${formatHHmm(kpis.estimatedMinutes)}`
                : undefined
            }
          />
          <Kpi
            label="Valor apurado"
            value={formatBRL(kpis.realValueCents)}
            hint={
              kpis.estimatedValueCents > 0
                ? `Estimado: ${formatBRL(kpis.estimatedValueCents)}`
                : undefined
            }
          />
        </div>
      </section>

      <section className="lemarc-horizontal-row flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={q}
            onChange={(event) => setSearch({ q: event.target.value })}
            placeholder="Buscar OS..."
            className="lemarc-form-control h-11 rounded-full pl-10"
          />
        </div>
        <div className="flex w-full gap-2 overflow-x-auto pb-1 lemarc-smart-scroll lg:w-auto lg:pb-0">
          <MetricPeriodFilter
            value={period as Period}
            range={periodRange}
            onChange={setPeriodWithRange}
            label="Período"
          />
          <Select value={status} onChange={(value) => setSearch({ status: value as StatusFilter })}>
            <option value="todas">Status</option>
            <option value="pendente">Pendentes</option>
            <option value="andamento">Em campo</option>
            <option value="revisao">Em revisão</option>
            <option value="concluida">Finalizadas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
          <Select
            value={priority}
            onChange={(value) => setSearch({ priority: value as PriorityFilter })}
          >
            <option value="todas">Prioridade</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
          <Select value={client} onChange={(value) => setSearch({ client: value })}>
            <option value="all">Cliente</option>
            {options.clients.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={technician} onChange={(value) => setSearch({ technician: value })}>
            <option value="all">Técnico</option>
            {options.technicians.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(value) => setSearch({ sort: value as SortMode })}>
            <option value="recentes">Mais recentes</option>
            <option value="status">Status</option>
            <option value="prioridade">Prioridade</option>
            <option value="cliente">Cliente</option>
            <option value="previsao">Previsão de início</option>
            <option value="maior-tempo">Maior tempo</option>
            <option value="maior-valor">Maior valor</option>
          </Select>
        </div>
      </section>

      {(hasActiveFilters || filtro !== "none") && (
        <section className="flex flex-wrap items-center gap-2 px-1">
          <p className="text-[11px] font-bold text-slate-400">
            {filtered.length} {filtered.length === 1 ? "ordem" : "ordens"} na lista
          </p>
          {filtro !== "none" && (
            <span className="rounded-full border border-primary/40 bg-primary/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
              {filtro === "alertas" ? "Alertas operacionais" : "OS incompletas"}
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  search: {
                    status: "todas",
                    priority: "todas",
                    client: "all",
                    technician: "all",
                    sort: "recentes",
                    period: "all",
                    from: "",
                    to: "",
                    filtro: "none",
                    q: "",
                  },
                })
              }
              className="lemarc-pressable rounded-full border border-white/[0.12] bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/40 hover:bg-primary/12"
            >
              Limpar filtros
            </button>
          )}
        </section>
      )}

      <section className="space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma ordem encontrada para os filtros atuais."
            text="Ajuste a busca operacional ou cadastre uma nova ordem de serviço."
            action={
              <Link
                to="/ordens/nova"
                className="lemarc-primary-action lemarc-pressable inline-flex min-h-10 items-center gap-2 rounded-full px-4 font-display text-[11px] font-black uppercase tracking-[0.1em]"
              >
                <Plus size={15} />
                Nova OS
              </Link>
            }
          />
        ) : (
          filtered.map((order) => (
            <ServiceOrderIslandRow
              key={order.id}
              order={order}
              financials={financialMap.get(order.id) ?? null}
            />
          ))
        )}
      </section>
    </main>
  );
}

function matchesStatus(order: ServiceOrder, status: StatusFilter) {
  if (status === "todas") return true;
  if (status === "cancelada") return order.status === "cancelled";
  const bucket = statusBucket[order.status];
  if (status === "pendente") return bucket === "pending";
  if (status === "andamento") return bucket === "inProgress";
  if (status === "revisao") return bucket === "review";
  if (status === "concluida") return bucket === "done";
  return true;
}

function matchesClient(order: ServiceOrder, client: string) {
  if (client === "all") return true;
  if (client === "__none__") return !order.client_id;
  return order.client_id === client;
}

function matchesTechnician(order: ServiceOrder, technician: string) {
  if (technician === "all") return true;
  const technicians = getOrderTechnicians(order);
  if (technician === "__none__") return technicians.length === 0;
  return technicians.some((item) => item.id === technician);
}

function searchHaystack(order: ServiceOrder) {
  const technicians = getOrderTechnicians(order);
  const serviceType =
    order.service_type === "outro" && order.service_type_other
      ? order.service_type_other
      : order.service_type
        ? serviceTypeLabel[order.service_type]
        : "";
  return [
    order.number,
    order.title,
    order.client?.name,
    order.client?.unit,
    order.client_unit?.name,
    order.client_unit?.sector,
    order.client_unit?.city,
    order.client_unit?.state,
    order.requester_name,
    order.location,
    serviceType,
    ...technicians.flatMap((technician) => [technician.full_name, technician.role]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareOrders(
  a: ServiceOrder,
  b: ServiceOrder,
  sort: SortMode,
  financialMap: Map<string, OrderFinancials>,
) {
  if (sort === "status") {
    return statusRank[a.status] - statusRank[b.status] || recentSort(a, b);
  }
  if (sort === "prioridade") {
    return priorityValue(a.priority) - priorityValue(b.priority) || recentSort(a, b);
  }
  if (sort === "cliente") {
    return clientName(a).localeCompare(clientName(b), "pt-BR") || recentSort(a, b);
  }
  if (sort === "previsao") {
    return dateValue(a.scheduled_for, true) - dateValue(b.scheduled_for, true) || recentSort(a, b);
  }
  if (sort === "maior-tempo") {
    return (
      orderMinutes(b, financialMap.get(b.id) ?? null) -
      orderMinutes(a, financialMap.get(a.id) ?? null)
    );
  }
  if (sort === "maior-valor") {
    return (
      orderValueCents(b, financialMap.get(b.id) ?? null) -
      orderValueCents(a, financialMap.get(a.id) ?? null)
    );
  }
  return recentSort(a, b);
}

function recentSort(a: ServiceOrder, b: ServiceOrder) {
  return dateValue(getOpenedAt(b)) - dateValue(getOpenedAt(a));
}

function dateValue(value: string | null | undefined, nullsLast = false) {
  if (!value) return nullsLast ? Number.MAX_SAFE_INTEGER : 0;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return nullsLast ? Number.MAX_SAFE_INTEGER : 0;
  return parsed;
}

function priorityValue(priority: ServicePriority | null) {
  return priority ? priorityRank[priority] : 4;
}

function clientName(order: ServiceOrder) {
  return order.client?.name ?? "Sem cliente";
}

function orderMinutes(order: ServiceOrder, financials: OrderFinancials | null) {
  if (financials) return financials.total_labor_minutes;
  return getServiceOrderWorkedMinutes(order).minutes;
}

function orderValueCents(order: ServiceOrder, financials: OrderFinancials | null) {
  if (financials) return financials.grand_total_cents;
  return estimatedLaborCents(order);
}

function estimatedLaborCents(order: ServiceOrder) {
  const worked = getServiceOrderWorkedMinutes(order);
  if (worked.minutes <= 0 || !order.hour_rate || order.hour_rate <= 0) return 0;
  return Math.round((worked.minutes / 60) * order.hour_rate * 100);
}

function computeKpis(orders: ServiceOrder[], financialMap: Map<string, OrderFinancials>) {
  let realMinutes = 0;
  let estimatedMinutes = 0;
  let realValueCents = 0;
  let estimatedValueCents = 0;

  for (const order of orders) {
    const financials = financialMap.get(order.id);
    if (financials) {
      realMinutes += financials.total_labor_minutes;
      realValueCents += financials.grand_total_cents;
      continue;
    }

    const worked = getServiceOrderWorkedMinutes(order);
    if (worked.source === "reported") realMinutes += worked.minutes;
    if (worked.source === "derived") estimatedMinutes += worked.minutes;
    estimatedValueCents += estimatedLaborCents(order);
  }

  return {
    total: orders.length,
    open: orders.filter((order) => !["approved", "cancelled"].includes(order.status)).length,
    inField: orders.filter((order) => statusBucket[order.status] === "inProgress").length,
    review: orders.filter((order) => statusBucket[order.status] === "review").length,
    done: orders.filter((order) => statusBucket[order.status] === "done").length,
    realMinutes,
    estimatedMinutes,
    realValueCents,
    estimatedValueCents,
  };
}

function buildFilterOptions(orders: ServiceOrder[]) {
  const clients = new Map<string, string>();
  const technicians = new Map<string, string>();
  let hasNoClient = false;
  let hasNoTechnician = false;

  for (const order of orders) {
    if (order.client_id && order.client?.name) clients.set(order.client_id, order.client.name);
    else hasNoClient = true;

    const orderTechnicians = getOrderTechnicians(order);
    if (orderTechnicians.length === 0) hasNoTechnician = true;
    for (const technician of orderTechnicians) {
      technicians.set(technician.id, technician.full_name);
    }
  }

  const clientOptions = Array.from(clients.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const technicianOptions = Array.from(technicians.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  if (hasNoClient) clientOptions.push({ value: "__none__", label: "Sem cliente" });
  if (hasNoTechnician) technicianOptions.push({ value: "__none__", label: "Sem técnico" });

  return { clients: clientOptions, technicians: technicianOptions };
}

function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="lemarc-compact-metric min-w-[8.75rem]">
      <p className="lemarc-technical-label">{label}</p>
      <p className="mt-1 font-display text-lg font-black text-white tabular-nums">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[10px] font-bold text-amber-200/85 tabular-nums">{hint}</p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="lemarc-form-control h-11 min-w-[9.5rem] rounded-full px-3 text-xs font-bold text-white"
    >
      {children}
    </select>
  );
}

function OrdensSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-3 pb-8">
      <div className="relative h-40 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.045]">
        <div className="lemarc-shimmer absolute inset-0 opacity-25" />
      </div>
      <div className="h-16 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.045]" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="relative h-[4.75rem] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.04]"
        >
          <div className="lemarc-shimmer absolute inset-0 opacity-25" />
        </div>
      ))}
    </main>
  );
}

function OrdensError({ error }: { error: Error }) {
  return (
    <AppShell title="Ordens de serviço">
      <div className="lemarc-wizard-card mx-auto max-w-2xl p-6 text-center">
        <Activity className="mx-auto text-primary" size={28} />
        <h1 className="mt-3 font-display text-xl font-black text-white">
          Não foi possível carregar as ordens.
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-300">{error.message}</p>
      </div>
    </AppShell>
  );
}
