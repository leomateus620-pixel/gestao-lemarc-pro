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
import { filterByPeriod, type Period } from "@/lib/serviceOrders/period";
import { isAlert, isIncomplete, statusBucket } from "@/lib/serviceOrders/status";

type StatusFilter = "todas" | "pendente" | "andamento" | "revisao" | "concluida";
type SpecialFilter = "alertas" | "incompletas" | "none";

const searchSchema = z.object({
  status: fallback(
    z.enum(["todas", "pendente", "andamento", "revisao", "concluida"]),
    "todas",
  ).default("todas"),
  period: fallback(z.enum(["day", "week", "month", "all"]), "all").default("all"),
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
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <OrdensList />
      </Suspense>
    </AppShell>
  );
}

function OrdensList() {
  const { status, period, filtro, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/ordens" });
  const { data: orders } = useServiceOrdersQuery();

  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(orders, period as Period);
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
        const hay = `${o.number} ${o.title} ${o.client?.name ?? ""} ${o.technician?.full_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [orders, status, period, filtro, q]);

  type Search = { status: StatusFilter; period: Period; filtro: SpecialFilter; q: string };
  const setStatus = (next: StatusFilter) =>
    navigate({ search: (prev: Search) => ({ ...prev, status: next }) });
  const setPeriod = (next: Period) =>
    navigate({ search: (prev: Search) => ({ ...prev, period: next }) });
  const setFiltro = (next: SpecialFilter) =>
    navigate({ search: (prev: Search) => ({ ...prev, filtro: next }) });
  const setQuery = (next: string) =>
    navigate({ search: (prev: Search) => ({ ...prev, q: next }) });

  return (
    <>
      <PageHero
        eyebrow="Execução e acompanhamento"
        title="Ordens"
        description="Filtre por período, status, alertas ou pendências para acompanhar o campo, revisão e cobrança."
        icon={ClipboardList}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <MetricPeriodFilter value={period as Period} onChange={setPeriod} />
        {(filtro !== "none" || status !== "todas") && (
          <button
            type="button"
            onClick={() => navigate({ search: { status: "todas", period: "all", filtro: "none", q: "" } })}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
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
