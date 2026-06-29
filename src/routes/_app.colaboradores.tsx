import { Suspense, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowDownAZ, Plus, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CollaboratorIslandRow } from "@/components/colaboradores/CollaboratorIslandRow";
import { formatMoneyOrZero, formatMinutes } from "@/components/colaboradores/format";
import { Input } from "@/components/ui/input";
import {
  useServiceOrdersQuery,
  useTechnicianLaborHistoryQuery,
  useTechniciansQuery,
} from "@/hooks/useServiceOrders";
import {
  buildCollaboratorOperationalDashboard,
  type CollaboratorOperationalStatus,
  type CollaboratorSummary,
} from "@/lib/serviceOrders/collaborators";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({ meta: [{ title: "Colaboradores — Gestão Lemarc" }] }),
  errorComponent: ColaboradoresError,
  component: ColaboradoresPage,
});

type ActiveFilter = "all" | "active" | "inactive";
type SortMode = "status" | "name" | "hours" | "value";

const statusRank: Record<CollaboratorOperationalStatus, number> = {
  "Em campo": 0,
  "Em deslocamento": 1,
  Alocado: 2,
  Disponível: 3,
  Inativo: 4,
};

function ColaboradoresPage() {
  return (
    <AppShell title="Colaboradores">
      <Suspense fallback={<ColaboradoresSkeleton />}>
        <ColaboradoresContent />
      </Suspense>
    </AppShell>
  );
}

function ColaboradoresContent() {
  const { data: technicians } = useTechniciansQuery();
  const { data: orders } = useServiceOrdersQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();

  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | CollaboratorOperationalStatus>("all");
  const [active, setActive] = useState<ActiveFilter>("active");
  const [sort, setSort] = useState<SortMode>("status");

  const dashboard = useMemo(
    () => buildCollaboratorOperationalDashboard({ technicians, orders, laborHistory }),
    [laborHistory, orders, technicians],
  );

  const roles = useMemo(() => {
    return Array.from(
      new Set(dashboard.collaborators.map((item) => item.role).filter(Boolean)),
    ).sort((a, b) => String(a).localeCompare(String(b))) as string[];
  }, [dashboard.collaborators]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dashboard.collaborators
      .filter((item) => {
        const haystack = [item.name, item.role, item.specialty, item.email, item.phone, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (role !== "all" && item.role !== role) return false;
        if (status !== "all" && item.status !== status) return false;
        if (active === "active" && !item.active) return false;
        if (active === "inactive" && item.active) return false;
        return true;
      })
      .sort((a, b) => compareCollaborators(a, b, sort));
  }, [active, dashboard.collaborators, query, role, sort, status]);

  return (
    <main className="mx-auto max-w-6xl space-y-4">
      <section className="lemarc-wizard-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="lemarc-technical-label">Gestão operacional</p>
            <h1 className="font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              Colaboradores
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
              Gestão da equipe técnica, valores/hora e histórico operacional.
            </p>
          </div>
          <Link
            to="/colaboradores/novo"
            className="lemarc-primary-action lemarc-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 font-display text-xs font-black uppercase tracking-[0.14em]"
          >
            <Plus size={16} />
            Novo colaborador
          </Link>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
          <Kpi label="Total" value={dashboard.kpis.total} />
          <Kpi label="Ativos" value={dashboard.kpis.active} />
          <Kpi label="Em campo" value={dashboard.kpis.inField} />
          <Kpi label="Horas mês" value={formatMinutes(dashboard.kpis.hoursMonthMinutes)} />
          <Kpi label="Mão de obra mês" value={formatMoneyOrZero(dashboard.kpis.valueMonthCents)} />
        </div>
      </section>

      <nav className="lemarc-operational-tabs" aria-label="Navegação de colaboradores">
        <Tab active>Visão geral</Tab>
        <Tab asLink to="/colaboradores/novo">
          Cadastrar colaborador
        </Tab>
        <Tab>Perfis</Tab>
        <Tab>Horas trabalhadas</Tab>
        <Tab>Histórico de OS</Tab>
        <Tab>Valor/hora</Tab>
      </nav>

      <section className="lemarc-horizontal-row flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar colaborador..."
            className="lemarc-form-control h-11 rounded-full pl-10"
          />
        </div>
        <Select value={status} onChange={(value) => setStatus(value as typeof status)}>
          <option value="all">Status</option>
          <option value="Em campo">Em campo</option>
          <option value="Em deslocamento">Em deslocamento</option>
          <option value="Alocado">Alocado</option>
          <option value="Disponível">Disponível</option>
          <option value="Inativo">Inativo</option>
        </Select>
        <Select value={role} onChange={setRole}>
          <option value="all">Função</option>
          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select value={active} onChange={(value) => setActive(value as ActiveFilter)}>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </Select>
        <Select value={sort} onChange={(value) => setSort(value as SortMode)}>
          <option value="status">Ordenar: status</option>
          <option value="name">Ordenar: nome</option>
          <option value="hours">Ordenar: horas</option>
          <option value="value">Ordenar: valor</option>
        </Select>
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="lemarc-technical-label">
            {visible.length} {visible.length === 1 ? "colaborador" : "colaboradores"}
          </p>
          <span className="hidden items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 sm:inline-flex">
            <SlidersHorizontal size={13} />
            Lista horizontal
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="lemarc-island-row p-6 text-center">
            <UsersRound className="mx-auto text-primary" size={26} />
            <p className="mt-3 font-display text-lg font-black text-white">
              Nenhum colaborador encontrado
            </p>
            <p className="mt-1 text-sm font-medium text-slate-300">
              Ajuste os filtros ou cadastre um novo colaborador.
            </p>
          </div>
        ) : (
          visible.map((collaborator) => (
            <CollaboratorIslandRow key={collaborator.id} collaborator={collaborator} />
          ))
        )}
      </section>
    </main>
  );
}

function compareCollaborators(a: CollaboratorSummary, b: CollaboratorSummary, sort: SortMode) {
  if (sort === "name") return a.name.localeCompare(b.name);
  if (sort === "hours") return b.hoursMonthMinutes - a.hoursMonthMinutes;
  if (sort === "value") return (b.valueMonthCents ?? 0) - (a.valueMonthCents ?? 0);
  const ranked = statusRank[a.status] - statusRank[b.status];
  if (ranked !== 0) return ranked;
  return b.ordersOpen - a.ordersOpen || a.name.localeCompare(b.name);
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="lemarc-compact-metric min-w-[9rem]">
      <p className="lemarc-technical-label">{label}</p>
      <p className="mt-1 font-display text-lg font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function Tab({
  children,
  active,
  asLink,
  to,
}: {
  children: string;
  active?: boolean;
  asLink?: boolean;
  to?: string;
}) {
  const cls = cn(
    "lemarc-pressable inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-white/[0.1] bg-white/[0.045] text-slate-300 hover:border-primary/35 hover:text-white",
  );
  if (asLink && to) {
    return (
      <Link to={to as never} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <span className={cls} aria-current={active ? "page" : undefined}>
      {children}
    </span>
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

function ColaboradoresSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-3">
      <div className="h-40 animate-pulse rounded-3xl bg-white/[0.06]" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-[2rem] bg-white/[0.05]" />
      ))}
    </main>
  );
}

function ColaboradoresError({ error }: { error: Error }) {
  return (
    <AppShell title="Colaboradores">
      <div className="lemarc-wizard-card mx-auto max-w-2xl p-6 text-center">
        <Activity className="mx-auto text-primary" size={28} />
        <h1 className="mt-3 font-display text-xl font-black text-white">
          Não foi possível carregar colaboradores
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-300">{error.message}</p>
      </div>
    </AppShell>
  );
}
