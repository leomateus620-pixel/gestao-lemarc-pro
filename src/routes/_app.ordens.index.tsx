import { Suspense, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ClipboardList, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { FilterChips, PageHero } from "@/components/app/operations";
import { ServiceOrderCard } from "@/components/app/ServiceOrderCard";
import { MetricPeriodFilter } from "@/components/dashboard/MetricPeriodFilter";
import { Input } from "@/components/ui/input";
import { useServiceOrdersQuery } from "@/hooks/useServiceOrders";
import { filterByPeriod, type Period, type PeriodRange } from "@/lib/serviceOrders/period";
import { isAlert, isIncomplete, statusBucket } from "@/lib/serviceOrders/status";

type StatusFilter = "todas" | "pendente" | "andamento" | "revisao" | "concluida";
type SpecialFilter = "alertas" | "incompletas" | "none";

const searchSchema = z.object({
  status: fallback(
    z.enum(["todas", "pendente", "andamento", "revisao", "concluida"]),
    "todas",
  ).default("todas"),
  period: fallback(z.enum(["day", "week", "month", "custom", "all"]), "all").default("all"),
  from: fallback(z.string(), "").default(""),
  to: fallback(z.string(), "").default(""),
  filtro: fallback(z.enum(["alertas", "incompletas", "none"]), "none").default("none"),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_app/ordens/")({
  head: () => ({ meta: [{ title: "Ordens de serviço — Gestão Lemarc" }] }),
  validateSearch: zodValidator(searchSchema),
  component: OrdensPage,
});

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendente", label: "Pendentes" },
  { key: "andamento", label: "Em andamento" },
  { key: "revisao", label: "Aguard. revisão" },
  { key: "concluida", label: "Concluídas" },
];

function OrdensPage() {
  return (
    <AppShell
      title="Ordens de serviço"
      action={
        <Link
          to="/ordens/nova"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]"
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

function OrdensSkeleton() {
  return (
    <div className="mt-2 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="lemarc-shimmer absolute inset-0 opacity-25" />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-3 w-36 rounded-full bg-white/[0.08]" />
            <div className="h-7 w-44 rounded-xl bg-white/[0.08]" />
            <div className="h-4 w-full max-w-md rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </div>
      <div className="h-12 rounded-2xl border border-white/[0.08] bg-white/[0.035]" />
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative min-h-[238px] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <div className="lemarc-shimmer absolute inset-0 opacity-25" />
            <div className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-full bg-white/[0.08]" />
            <div className="relative pl-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-white/[0.08]" />
                  <div className="h-5 w-44 rounded-lg bg-white/[0.08]" />
                </div>
                <div className="h-7 w-24 rounded-full bg-white/[0.08]" />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-[3.25rem] rounded-2xl bg-white/[0.045]" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdensList() {
  const { status, period, from, to, filtro, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/ordens" });
  const { data: orders } = useServiceOrdersQuery();
  const periodRange = useMemo<PeriodRange>(
    () => ({ from: from || undefined, to: to || undefined }),
    [from, to],
  );

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(orders, period as Period, periodRange);
    return byPeriod.filter((o) => {
      if (status !== "todas") {
        const b = statusBucket[o.status];
        if (status === "pendente" && b !== "pending") return false;
        if (status === "andamento" && b !== "inProgress") return false;
        if (status === "revisao" && b !== "review") return false;
        if (status === "concluida" && b !== "done") return false;
      }
      if (filtro === "alertas" && !isAlert(o)) return false;
      if (filtro === "incompletas" && !isIncomplete(o)) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay =
          `${o.number} ${o.title} ${o.client?.name ?? ""} ${o.technician?.full_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, status, period, periodRange, filtro, q]);

  type Search = {
    status: StatusFilter;
    period: Period;
    from: string;
    to: string;
    filtro: SpecialFilter;
    q: string;
  };
  const setStatus = (next: StatusFilter) =>
    navigate({ search: (prev: Search) => ({ ...prev, status: next }) });
  const setPeriodWithRange = (next: Period, range?: PeriodRange) =>
    navigate({
      search: (prev: Search) => ({
        ...prev,
        period: next,
        from: next === "custom" ? (range?.from ?? prev.from) : "",
        to: next === "custom" ? (range?.to ?? prev.to) : "",
      }),
    });
  const setFiltro = (next: SpecialFilter) =>
    navigate({ search: (prev: Search) => ({ ...prev, filtro: next }) });
  const setQuery = (next: string) => navigate({ search: (prev: Search) => ({ ...prev, q: next }) });

  return (
    <>
      <PageHero
        eyebrow="Execução e acompanhamento"
        title="Ordens"
        description="Filtre por período, status, alertas ou pendências para acompanhar o campo, revisão e cobrança."
        icon={ClipboardList}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <MetricPeriodFilter
          value={period as Period}
          range={periodRange}
          onChange={setPeriodWithRange}
          label="Período da lista"
        />
        {(filtro !== "none" || status !== "todas") && (
          <button
            type="button"
            onClick={() =>
              navigate({
                search: {
                  status: "todas",
                  period: "all",
                  from: "",
                  to: "",
                  filtro: "none",
                  q: "",
                },
              })
            }
            className="rounded-full border border-[color:var(--on-app-bg)]/15 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[color:var(--on-app-bg)] hover:bg-white"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="glass flex flex-1 items-center gap-2 rounded-2xl px-3">
          <Search size={16} className="text-muted-foreground" />
          <Input
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por número, cliente, técnico..."
            className="h-12 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="mt-3">
        <FilterChips
          items={statusFilters.map((it) => ({
            key: it.key,
            label: it.label,
            count: 0,
          }))}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {filtro !== "none" && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
          Filtro especial: {filtro === "alertas" ? "Alertas operacionais" : "OS incompletas"}
          <button
            onClick={() => setFiltro("none")}
            className="rounded-full bg-primary/20 px-1.5"
            aria-label="Remover filtro"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {filtered.map((order) => (
          <ServiceOrderCard key={order.id} order={order} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon={Search}
            title="Nenhuma OS encontrada"
            text="Ajuste a busca ou os filtros para localizar ordens de serviço."
          />
        </div>
      )}
    </>
  );
}
