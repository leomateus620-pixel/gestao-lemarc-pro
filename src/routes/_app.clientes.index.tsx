import { Suspense, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, Search, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  OperationalFilterBar,
  OperationalPageHeader,
} from "@/components/app/OperationalListChrome";
import { Input } from "@/components/ui/input";
import { ClientIslandRow } from "@/components/clientes/ClientIslandRow";
import { useClientsFullQuery, useAllUnitsQuery } from "@/hooks/useClients";
import { useServiceOrdersQuery } from "@/hooks/useServiceOrders";
import { isDone, isCancelled } from "@/lib/serviceOrders/status";

export const Route = createFileRoute("/_app/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Lemarc" }] }),
  component: ClientesIndex,
});

function ClientesIndex() {
  return (
    <AppShell title="Clientes">
      <Suspense fallback={<ClientesSkeleton />}>
        <ClientesList />
      </Suspense>
    </AppShell>
  );
}

function ClientesSkeleton() {
  return (
    <main className="mx-auto max-w-6xl space-y-3">
      <div className="h-32 animate-pulse rounded-3xl bg-white/[0.06]" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-[2rem] bg-white/[0.05]" />
      ))}
    </main>
  );
}

type StatusFilter = "all" | "active" | "inactive";
type PendencyFilter = "all" | "cnpj" | "contact" | "unit";
type OsFilter = "all" | "with" | "without";
type SortMode = "name" | "open" | "recent";

function ClientesList() {
  const { data: clients } = useClientsFullQuery();
  const { data: units } = useAllUnitsQuery();
  const { data: orders } = useServiceOrdersQuery();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendency, setPendency] = useState<PendencyFilter>("all");
  const [city, setCity] = useState("all");
  const [osFilter, setOsFilter] = useState<OsFilter>("all");
  const [sort, setSort] = useState<SortMode>("name");

  const unitsByClient = useMemo(() => {
    const m = new Map<string, typeof units>();
    units.forEach((u) => {
      const arr = m.get(u.client_id) ?? [];
      arr.push(u);
      m.set(u.client_id, arr);
    });
    return m;
  }, [units]);

  const osByClient = useMemo(() => {
    const m = new Map<
      string,
      { open: number; done: number; lastOrder: (typeof orders)[number] | null }
    >();
    orders.forEach((o) => {
      if (!o.client_id) return;
      const cur = m.get(o.client_id) ?? { open: 0, done: 0, lastOrder: null };
      if (isDone(o)) cur.done += 1;
      else if (!isCancelled(o)) cur.open += 1;
      if (
        !cur.lastOrder ||
        new Date(o.opened_at).getTime() > new Date(cur.lastOrder.opened_at).getTime()
      ) {
        cur.lastOrder = o;
      }
      m.set(o.client_id, cur);
    });
    return m;
  }, [orders]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => {
      const k = [c.city, c.state].filter(Boolean).join("/");
      if (k) set.add(k);
    });
    units.forEach((u) => {
      const k = [u.city, u.state].filter(Boolean).join("/");
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [clients, units]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients
      .filter((c) => {
        const cUnits = unitsByClient.get(c.id) ?? [];
        const hasContact = Boolean(c.responsible_name || c.phone || c.email);
        const open = osByClient.get(c.id)?.open ?? 0;
        if (term) {
          const hay = [
            c.name,
            c.cnpj,
            c.city,
            c.state,
            c.segment,
            c.responsible_name,
            c.email,
            c.phone,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const matchUnit = cUnits.some((u) => u.name.toLowerCase().includes(term));
          if (!hay.includes(term) && !matchUnit) return false;
        }
        if (status === "active" && !c.active) return false;
        if (status === "inactive" && c.active) return false;
        if (pendency === "cnpj" && c.cnpj) return false;
        if (pendency === "contact" && hasContact) return false;
        if (pendency === "unit" && cUnits.length > 0) return false;
        if (osFilter === "with" && open === 0) return false;
        if (osFilter === "without" && open > 0) return false;
        if (city !== "all") {
          const cityKey = [c.city, c.state].filter(Boolean).join("/");
          const inUnits = cUnits.some((u) => [u.city, u.state].filter(Boolean).join("/") === city);
          if (cityKey !== city && !inUnits) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "open") {
          return (osByClient.get(b.id)?.open ?? 0) - (osByClient.get(a.id)?.open ?? 0);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [clients, unitsByClient, osByClient, q, status, pendency, city, osFilter, sort]);

  const totalUnits = units.length;
  const totalActive = clients.filter((c) => c.active).length;
  const totalOsOpen = [...osByClient.values()].reduce((s, v) => s + v.open, 0);
  const withPendency = clients.filter((c) => {
    const cUnits = unitsByClient.get(c.id) ?? [];
    const hasContact = Boolean(c.responsible_name || c.phone || c.email);
    return !c.cnpj || !hasContact || cUnits.length === 0;
  }).length;
  const withFullCnpj = clients.filter((c) => Boolean(c.cnpj)).length;
  const withoutContact = clients.filter((c) => !(c.responsible_name || c.phone || c.email)).length;
  const activeFilterCount = [
    status !== "all",
    pendency !== "all",
    city !== "all",
    osFilter !== "all",
    sort !== "name",
  ].filter(Boolean).length;
  const resetFilters = () => {
    setQ("");
    setStatus("all");
    setPendency("all");
    setCity("all");
    setOsFilter("all");
    setSort("name");
  };

  return (
    <main className="mx-auto max-w-6xl space-y-3 pb-8 xl:max-w-7xl">
      <OperationalPageHeader
        eyebrow="Base de atendimento"
        title="Clientes"
        description="Empresas, unidades e vínculos operacionais organizados para abrir e acompanhar serviços."
        action={
          <Link
            to="/clientes/novo"
            className="lemarc-primary-action lemarc-pressable inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 font-display text-xs font-bold sm:px-4"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nova empresa</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        }
        metrics={[
          {
            label: "Empresas ativas",
            value: totalActive,
            detail: `${clients.length} no total`,
          },
          { label: "Unidades", value: totalUnits },
          { label: "OS ativas", value: totalOsOpen },
          {
            label: "Com pendência",
            value: withPendency,
            tone: withPendency > 0 ? "warning" : "default",
          },
          { label: "CNPJ completo", value: withFullCnpj },
          {
            label: "Sem contato",
            value: withoutContact,
            tone: withoutContact > 0 ? "warning" : "default",
          },
        ]}
      />

      <OperationalFilterBar
        activeCount={activeFilterCount}
        resultLabel={`${filtered.length} ${filtered.length === 1 ? "cliente" : "clientes"} na lista`}
        onReset={resetFilters}
        search={
          <div className="relative min-w-0">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, CNPJ, cidade, unidade..."
              className="lemarc-form-control h-11 rounded-xl pl-10"
            />
          </div>
        }
      >
        <Select value={status} onChange={(v) => setStatus(v as StatusFilter)}>
          <option value="all">Status: Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>
        <Select value={pendency} onChange={(v) => setPendency(v as PendencyFilter)}>
          <option value="all">Pendências</option>
          <option value="cnpj">Sem CNPJ</option>
          <option value="contact">Sem contato</option>
          <option value="unit">Sem unidade</option>
        </Select>
        <Select value={city} onChange={setCity}>
          <option value="all">Cidade/UF</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={osFilter} onChange={(v) => setOsFilter(v as OsFilter)}>
          <option value="all">OS: Todas</option>
          <option value="with">Com OS abertas</option>
          <option value="without">Sem OS abertas</option>
        </Select>
        <Select value={sort} onChange={(v) => setSort(v as SortMode)}>
          <option value="name">Ordenar: nome</option>
          <option value="open">Ordenar: + OS abertas</option>
          <option value="recent">Ordenar: atualizados</option>
        </Select>
      </OperationalFilterBar>

      <section className="space-y-2.5">
        {clients.length === 0 ? (
          <EmptyClients />
        ) : filtered.length === 0 ? (
          <div className="lemarc-island-row p-6 text-center">
            <UsersRound className="mx-auto text-primary" size={26} />
            <p className="mt-3 font-display text-lg font-black text-white">
              Nenhum cliente encontrado
            </p>
            <p className="mt-1 text-sm font-medium text-slate-300">
              Ajuste os filtros ou cadastre uma nova empresa.
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <ClientIslandRow
              key={c.id}
              client={c}
              units={unitsByClient.get(c.id) ?? []}
              osOpen={osByClient.get(c.id)?.open ?? 0}
              osDone={osByClient.get(c.id)?.done ?? 0}
              lastOrder={osByClient.get(c.id)?.lastOrder ?? null}
            />
          ))
        )}
      </section>
    </main>
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
      onChange={(e) => onChange(e.target.value)}
      className="lemarc-filter-control lemarc-form-control h-10 rounded-xl px-3 text-[11px] font-bold text-white"
    >
      {children}
    </select>
  );
}

function EmptyClients() {
  return (
    <div className="lemarc-island-row p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <Building2 size={26} />
      </div>
      <h3 className="mt-4 font-display text-lg font-black text-white">
        Nenhum cliente cadastrado ainda
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
        Cadastre a primeira empresa para vincular unidades e abrir ordens de serviço.
      </p>
      <Link
        to="/clientes/novo"
        className="lemarc-primary-action lemarc-pressable mt-5 inline-flex h-11 items-center gap-2 rounded-full px-5 font-display text-xs font-black uppercase tracking-[0.12em]"
      >
        <Plus size={15} /> Cadastrar empresa
      </Link>
    </div>
  );
}
