import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { OrderCard } from "@/components/app/OrderCard";
import { ordens } from "@/lib/mock/ordens";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { statusLabels, type OrderStatus } from "@/components/app/StatusBadge";

export const Route = createFileRoute("/_app/ordens/")({
  head: () => ({ meta: [{ title: "Ordens de serviço — Gestão Lemarc" }] }),
  component: OrdensList,
});

const filters: ({ key: "todas" } | { key: OrderStatus })[] = [
  { key: "todas" },
  { key: "pending" },
  { key: "transit" },
  { key: "running" },
  { key: "review" },
  { key: "done" },
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
      <div className="mt-2 flex items-center gap-2">
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3">
          <Search size={16} className="text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por OS, cliente..."
            className="h-11 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
          />
        </div>
        <button className="glass grid h-11 w-11 shrink-0 place-items-center rounded-xl text-foreground">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {filters.map((f) => {
          const label = f.key === "todas" ? "Todas" : statusLabels[f.key];
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((o) => <OrderCard key={o.id} ordem={o} />)}
        {filtered.length === 0 && (
          <div className="glass mt-6 rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Nenhuma OS encontrada com os filtros atuais.
          </div>
        )}
      </div>
    </AppShell>
  );
}
