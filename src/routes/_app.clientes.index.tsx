import { Suspense, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Factory,
  MapPin,
  Plus,
  Search,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { Input } from "@/components/ui/input";
import { FilterChips, PageHero } from "@/components/app/operations";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ClientCard } from "@/components/clientes/ClientCard";
import { useClientsFullQuery, useAllUnitsQuery } from "@/hooks/useClients";
import { useServiceOrdersQuery } from "@/hooks/useServiceOrders";
import { isDone, isCancelled } from "@/lib/serviceOrders/status";
import type { ClientFull } from "@/types/client";

export const Route = createFileRoute("/_app/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Lemarc" }] }),
  component: ClientesIndex,
});

function ClientesIndex() {
  return (
    <AppShell
      title="Clientes"
      action={
        <Link
          to="/clientes/novo"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]"
          aria-label="Cadastrar cliente"
        >
          <Plus size={18} />
        </Link>
      }
    >
      <Suspense fallback={<ClientesSkeleton />}>
        <ClientesList />
      </Suspense>
    </AppShell>
  );
}

function ClientesSkeleton() {
  return (
    <div className="mt-2 space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="lemarc-shimmer absolute inset-0 opacity-25" />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-3 w-32 rounded-full bg-white/[0.08]" />
            <div className="h-7 w-56 rounded-xl bg-white/[0.08]" />
            <div className="h-4 w-full max-w-lg rounded-full bg-white/[0.06]" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-[1.55rem] border border-white/[0.08] bg-white/[0.03]"
          />
        ))}
      </div>
      <div className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.035]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="relative min-h-[280px] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <div className="lemarc-shimmer absolute inset-0 opacity-25" />
            <div className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-full bg-white/[0.08]" />
            <div className="relative pl-2">
              <div className="flex gap-3">
                <div className="h-[3.25rem] w-[3.25rem] rounded-2xl bg-white/[0.08]" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-44 rounded-lg bg-white/[0.08]" />
                  <div className="h-3 w-32 rounded-full bg-white/[0.06]" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-[4.5rem] rounded-2xl bg-white/[0.045]" />
                ))}
              </div>
              <div className="mt-3 h-12 rounded-2xl bg-white/[0.045]" />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="h-12 rounded-2xl bg-white/[0.04]" />
                <div className="h-12 rounded-2xl bg-white/[0.04]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Filter = "todos" | "com-os" | "sem-os" | "ativos" | "inativos";

function ClientesList() {
  const { data: clients } = useClientsFullQuery();
  const { data: units } = useAllUnitsQuery();
  const { data: orders } = useServiceOrdersQuery();
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("todos");

  const unitsByClient = useMemo(() => {
    const m = new Map<string, number>();
    units.forEach((u) => m.set(u.client_id, (m.get(u.client_id) ?? 0) + 1));
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

  const activeOsClients = useMemo(
    () => new Set([...osByClient.entries()].filter(([, v]) => v.open > 0).map(([k]) => k)),
    [osByClient],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c) => {
      const hay = [c.name, c.cnpj, c.city, c.state, c.segment, c.responsible_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchUnit = units.some(
        (u) => u.client_id === c.id && u.name.toLowerCase().includes(term),
      );
      if (term && !hay.includes(term) && !matchUnit) return false;
      const open = osByClient.get(c.id)?.open ?? 0;
      if (f === "com-os" && open === 0) return false;
      if (f === "sem-os" && open > 0) return false;
      if (f === "ativos" && !c.active) return false;
      if (f === "inativos" && c.active) return false;
      return true;
    });
  }, [clients, units, osByClient, q, f]);

  const totalUnits = units.length;
  const totalActive = clients.filter((c) => c.active).length;
  const totalOsOpen = [...osByClient.values()].reduce((s, v) => s + v.open, 0);

  return (
    <>
      <PageHero
        eyebrow="Base de atendimento"
        title="Clientes industriais"
        description="Cadastre empresas, unidades e contatos para vincular ordens de serviço com precisão."
        icon={Factory}
        action={
          <Link
            to="/clientes/novo"
            className="lemarc-orange-glow lemarc-pressable inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-4 font-display text-xs font-black uppercase tracking-[0.18em] text-primary-foreground"
          >
            <Plus size={16} /> Cadastrar empresa
          </Link>
        }
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Empresas ativas"
          value={totalActive}
          subtitle={`${clients.length} cadastradas no total.`}
          icon={Building2}
          footerLabel="Carteira"
          accent="blue"
        />
        <MetricCard
          title="Unidades"
          value={totalUnits}
          subtitle="Filiais, oficinas e setores cadastrados."
          icon={MapPin}
          footerLabel="Distribuição"
          accent="steel"
        />
        <MetricCard
          title="OS ativas"
          value={totalOsOpen}
          subtitle="Em fila, deslocamento ou execução."
          icon={ClipboardList}
          footerLabel="Operação"
          accent="orange"
        />
        <MetricCard
          title="Com pendência"
          value={activeOsClients.size}
          subtitle="Empresas com OS abertas no momento."
          icon={AlertTriangle}
          footerLabel="Atenção"
          accent={activeOsClients.size > 0 ? "amber" : "steel"}
        />
      </div>

      <div className="glass mt-5 flex items-center gap-2 rounded-xl px-3">
        <Search size={16} className="text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, CNPJ, cidade, unidade ou responsável..."
          className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <FilterChips
          items={[
            { key: "todos", label: "Todos", count: clients.length },
            { key: "com-os", label: "Com OS ativa", count: activeOsClients.size },
            { key: "sem-os", label: "Sem OS" },
            { key: "ativos", label: "Ativos", count: totalActive },
            { key: "inativos", label: "Inativos" },
          ]}
          value={f}
          onChange={setF}
        />
      </div>

      {clients.length === 0 ? (
        <EmptyClients />
      ) : filtered.length === 0 ? (
        <GlassCard className="mt-6 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum cliente corresponde ao filtro atual.
          </p>
        </GlassCard>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: ClientFull) => (
            <ClientCard
              key={c.id}
              client={c}
              unitCount={unitsByClient.get(c.id) ?? 0}
              osOpen={osByClient.get(c.id)?.open ?? 0}
              osDone={osByClient.get(c.id)?.done ?? 0}
              lastOrder={osByClient.get(c.id)?.lastOrder ?? null}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EmptyClients() {
  return (
    <GlassCard className="relative mt-6 overflow-hidden p-10 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <Building2 size={26} />
        </div>
        <h3 className="mt-4 font-display text-lg font-black text-foreground">
          Nenhum cliente cadastrado ainda
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Cadastre a primeira empresa para vincular unidades e abrir ordens de serviço com dados
          estruturados.
        </p>
        <Link
          to="/clientes/novo"
          className="lemarc-orange-glow lemarc-pressable mt-5 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-display text-xs font-black uppercase tracking-[0.18em] text-primary-foreground"
        >
          <Plus size={16} /> Cadastrar empresa
        </Link>
      </div>
    </GlassCard>
  );
}
