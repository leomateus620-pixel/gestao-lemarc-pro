import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Pencil,
  Plus,
  Phone,
  Mail,
  MapPin,
  Star,
  Trash2,
  Power,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { clientPageQueryOptions, useClientPageQuery } from "@/hooks/useClients";
import {
  createClientUnit,
  deleteClientUnit,
  getClientPage,
  updateClientUnit,
} from "@/lib/api/clients.functions";
import { maskCNPJ } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientUnit } from "@/types/client";
import { statusLabel, priorityLabel } from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/clientes/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Cliente — Gestão Lemarc` }],
    title: params.id,
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      clientPageQueryOptions(params.id, (args) => getClientPage(args)),
    ),
  pendingComponent: () => (
    <AppShell title="Cliente" back>
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />
    </AppShell>
  ),
  component: DetailPage,
  notFoundComponent: () => (
    <AppShell title="Cliente não encontrado" back>
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Esta empresa não existe ou foi removida.
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Erro" back>
      <div className="mt-8 text-center text-sm text-rose-300">{error.message}</div>
    </AppShell>
  ),
});

function DetailPage() {
  return (
    <AppShell title="Cliente" back>
      <Detail />
    </AppShell>
  );
}

function Detail() {
  const { id } = Route.useParams();
  const { data } = useClientPageQuery(id);
  if (!data) throw notFound();
  const { client, units, orders: clientOrders, counts } = data;
  const lastOrder = clientOrders[0];

  return (
    <div className="space-y-5">
      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Detalhe da empresa
            </p>
            <h1 className="mt-1 font-display text-2xl font-black leading-tight text-foreground">
              {client.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 font-black uppercase tracking-wider",
                  client.active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/10 text-muted-foreground",
                )}
              >
                {client.active ? "Ativo" : "Inativo"}
              </span>
              {client.cnpj && (
                <span className="font-mono text-muted-foreground">
                  CNPJ {maskCNPJ(client.cnpj)}
                </span>
              )}
              {(client.city || client.state) && (
                <span className="text-muted-foreground">
                  · {[client.city, client.state].filter(Boolean).join(" / ")}
                </span>
              )}
              {client.segment && (
                <span className="text-muted-foreground">· {client.segment}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/ordens/nova"
              search={{ clientId: client.id } as never}
              className="lemarc-orange-glow inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-[11px] font-black uppercase tracking-wider text-primary-foreground"
            >
              <Plus size={14} /> Nova OS
            </Link>
            <Link
              to="/clientes/$id/editar"
              params={{ id: client.id }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-wider text-foreground hover:bg-white/[0.08]"
            >
              <Pencil size={14} /> Editar
            </Link>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label="Unidades" value={units.length} />
        <Mini label="OS abertas" value={open.length} accent />
        <Mini label="Em andamento" value={running.length} />
        <Mini label="Concluídas" value={done.length} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-white/[0.04] p-1">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="units">Unidades ({units.length})</TabsTrigger>
          <TabsTrigger value="orders">OS ({clientOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-3">
          <GlassCard className="p-5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              Contato principal
            </h3>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              {client.responsible_name && (
                <Row icon={Building2}>{client.responsible_name}</Row>
              )}
              {client.phone && <Row icon={Phone}>{client.phone}</Row>}
              {client.email && <Row icon={Mail}>{client.email}</Row>}
              {client.address && <Row icon={MapPin}>{client.address}</Row>}
              {!client.responsible_name && !client.phone && !client.email && !client.address && (
                <p className="text-sm text-muted-foreground">
                  Sem contato cadastrado. Edite a empresa para adicionar.
                </p>
              )}
            </div>
          </GlassCard>

          {lastOrder && (
            <GlassCard className="p-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                Última OS
              </h3>
              <Link
                to="/ordens/$id"
                params={{ id: lastOrder.id }}
                className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-black text-foreground">
                    #{lastOrder.number} · {lastOrder.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {statusLabel[lastOrder.status]} ·{" "}
                    {lastOrder.priority ? priorityLabel[lastOrder.priority] : "—"}
                  </div>
                </div>
                <ArrowRight size={16} className="text-primary" />
              </Link>
            </GlassCard>
          )}

          {client.notes && (
            <GlassCard className="p-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                Observações
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitsSection clientId={client.id} units={units} orders={clientOrders} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-2">
          {clientOrders.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <ClipboardList className="mx-auto text-primary" size={24} />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma OS vinculada a este cliente ainda.
              </p>
            </GlassCard>
          ) : (
            clientOrders.map((o) => (
              <Link
                key={o.id}
                to="/ordens/$id"
                params={{ id: o.id }}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-sm font-black text-foreground">
                      #{o.number} · {o.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {statusLabel[o.status]}
                      {o.client_unit && ` · ${o.client_unit.name}`}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-primary" />
                </div>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <GlassCard className={cn("p-4", accent && "border-primary/30 bg-primary/5")}>
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-3xl font-black",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-primary" />
      <span>{children}</span>
    </div>
  );
}

function UnitsSection({
  clientId,
  units,
  orders,
}: {
  clientId: string;
  units: ClientUnit[];
  orders: { id: string; client_unit_id: string | null }[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const create = useServerFn(createClientUnit);
  const update = useServerFn(updateClientUnit);
  const remove = useServerFn(deleteClientUnit);

  const osByUnit = new Map<string, number>();
  orders.forEach((o) => {
    if (o.client_unit_id) {
      osByUnit.set(o.client_unit_id, (osByUnit.get(o.client_unit_id) ?? 0) + 1);
    }
  });

  const addMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          client_id: clientId,
          name: name.trim(),
          sector: sector || null,
          is_primary: units.length === 0,
        },
      }),
    onSuccess: () => {
      setName("");
      setSector("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: (u: ClientUnit) =>
      update({ data: { id: u.id, patch: { active: !u.active } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  return (
    <div className="space-y-3">
      {units.length === 0 && !adding && (
        <GlassCard className="p-8 text-center">
          <Building2 className="mx-auto text-primary" size={24} />
          <p className="mt-3 text-sm text-muted-foreground">
            Esta empresa ainda não tem unidades cadastradas.
          </p>
        </GlassCard>
      )}

      {units.map((u) => {
        const osCount = osByUnit.get(u.id) ?? 0;
        return (
          <GlassCard key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate font-display text-base font-black text-foreground">
                    {u.name}
                  </h4>
                  {u.is_primary && (
                    <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      <Star size={10} /> Principal
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      u.active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/10 text-muted-foreground",
                    )}
                  >
                    {u.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {[u.sector, u.city, u.state].filter(Boolean).join(" · ") || "Sem localização"}
                </div>
                {u.responsible_name && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Responsável: {u.responsible_name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-black text-primary">
                  {osCount} OS
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive.mutate(u)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                  title={u.active ? "Desativar" : "Ativar"}
                >
                  <Power size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remover unidade "${u.name}"?`)) removeMut.mutate(u.id);
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-300"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/ordens/nova",
                    search: { clientId, unitId: u.id } as never,
                  })
                }
                className="text-[11px] font-black uppercase tracking-wider text-primary hover:underline"
              >
                + Nova OS nesta unidade
              </button>
            </div>
          </GlassCard>
        );
      })}

      {adding ? (
        <GlassCard className="space-y-3 p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da unidade (ex.: Matriz, Oficina)"
            className="h-12 rounded-xl border-white/10 bg-white/[0.04] focus-visible:ring-primary/40"
          />
          <Input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Setor (opcional)"
            className="h-12 rounded-xl border-white/10 bg-white/[0.04] focus-visible:ring-primary/40"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAdding(false)}
              className="h-11 flex-1 rounded-xl bg-white/[0.04]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || addMut.isPending}
              onClick={() => addMut.mutate()}
              className="h-11 flex-1 gap-2 rounded-xl bg-primary text-primary-foreground"
            >
              <Plus size={14} /> {addMut.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </GlassCard>
      ) : (
        <Button
          type="button"
          onClick={() => setAdding(true)}
          variant="secondary"
          className="h-12 w-full gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02]"
        >
          <Plus size={16} /> Adicionar unidade
        </Button>
      )}
    </div>
  );
}