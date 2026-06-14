import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { FilterChips, PageHero } from "@/components/app/operations";
import { OrderCard } from "@/components/app/OrderCard";
import { ordens } from "@/lib/mock/serviceOrders";
import { Search, Plus, SlidersHorizontal, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { statusLabels, type OrderStatus } from "@/components/app/StatusBadge";
import { EmptyState } from "@/components/app/EmptyState";

export const Route = createFileRoute("/_app/ordens/")({
  head: () => ({ meta: [{ title: "Ordens de serviço — Gestão Lemarc" }] }),
  component: OrdensList,
});

const filters: ({ key: "todas" } | { key: OrderStatus })[] = [
  { key: "todas" },
  { key: "pending" },
  { key: "transit" },
  { key: "running" },
  { key: "finished" },
  { key: "review" },
  { key: "approved" },
];

function OrdensList() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todas" | OrderStatus>("todas");

  const filtered = ordens.filter((o) => {
    const matchesQ = !q || `${o.numero} ${o.titulo} ${o.cliente}`.toLowerCase().includes(q.toLowerCase());
    const matchesF = filter === "todas" || o.status === filter;
    return matchesQ && matchesF;
  });

  return (
    <AppShell
      title="Ordens de serviço"
      action={
        <Link
          to="/ordens/nova"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]"
          aria-label="Nova OS"
        >
          <Plus size={18} />
        </Link>
      }
    >
      <PageHero eyebrow="Execução e acompanhamento" title="Ordens" description="Busca, filtros por status e cards táteis para acompanhar o campo." icon={ClipboardList} />
      <div className="mt-4 flex items-center gap-2">
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3">
          <Search size={16} className="text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por OS, cliente..."
            className="h-11 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
          />
        </div>
        <button className="lemarc-liquid grid h-11 w-11 shrink-0 place-items-center rounded-xl text-foreground lemarc-pressable">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="mt-4"><FilterChips items={filters.map((f) => ({ key: f.key, label: f.key === "todas" ? "Todas" : statusLabels[f.key], count: f.key === "todas" ? ordens.length : ordens.filter((o) => o.status === f.key).length }))} value={filter} onChange={setFilter} /></div>

      <div className="mt-4 space-y-3">
        {filtered.map((o) => <OrderCard key={o.id} ordem={o} />)}
        {filtered.length === 0 && (
          <EmptyState icon={Search} title="Nenhuma OS encontrada" text="Ajuste a busca ou os filtros para localizar ordens de serviço." />
        )}
      </div>
    </AppShell>
  );
}
