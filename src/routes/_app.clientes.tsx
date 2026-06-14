import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { MetricTile, PageHero, FilterChips } from "@/components/app/operations";
import { useState } from "react";
import { clientes } from "@/lib/mock/clients";
import { Phone, MapPin, Plus, Building2, Factory, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Gestão Lemarc" }] }),
  component: Clientes,
});

function Clientes() {
  const [q,setQ]=useState(""); const [f,setF]=useState<"todos"|"ativos">("todos"); const list=clientes.filter(c=>(!q || `${c.nome} ${c.segmento} ${c.cidade}`.toLowerCase().includes(q.toLowerCase())) && (f==="todos" || c.osAtivas>0));
  return (
    <AppShell
      title="Clientes"
      action={
        <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]">
          <Plus size={18} />
        </button>
      }
    >
      <PageHero eyebrow="Base de atendimento" title="Clientes industriais" description="Fichas de setor, unidades e contatos para acionar OS sem lista genérica." icon={Factory} />
      <div className="mt-4 grid grid-cols-3 gap-2"><MetricTile label="Ativos" value={clientes.length} icon={Building2} /><MetricTile label="OS ativas" value={clientes.reduce((s, c) => s + c.osAtivas, 0)} icon={Factory} accent /><MetricTile label="Unidades" value={clientes.reduce((s,c)=>s+c.unidades.length,0)} icon={MapPin} /></div>
      <div className="glass mt-4 flex items-center gap-2 rounded-xl px-3"><Search size={16} className="text-muted-foreground"/><Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar cliente, setor..." className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"/></div>
      <div className="mt-3"><FilterChips items={[{key:"todos",label:"Todos",count:clientes.length},{key:"ativos",label:"Com OS",count:clientes.filter(c=>c.osAtivas>0).length}]} value={f} onChange={setF}/></div>
      <div className="mt-4 space-y-3">
        {list.map((c) => (
          <GlassCard key={c.id} className="lemarc-pressable p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-sm font-black text-primary">
                {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-base font-bold text-foreground">{c.nome}</div>
                <div className="text-xs text-muted-foreground">{c.segmento}</div>
              </div>
              {c.osAtivas > 0 && (
                <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {c.osAtivas} OS
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Building2 size={12} className="text-primary" />{c.unidades.length} unidade(s) · {c.unidades.join(", ")}</div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-primary" />{c.cidade}</div>
              <div className="flex items-center gap-2"><Phone size={12} className="text-primary" />{c.contato} · {c.telefone}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <GlassCard className="p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-black text-foreground">{value}</div>
    </GlassCard>
  );
}
