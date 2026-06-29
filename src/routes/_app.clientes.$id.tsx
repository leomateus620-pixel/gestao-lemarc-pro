import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
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
import { formatServiceOrderDateTime } from "@/lib/serviceOrders/time";
import { cn } from "@/lib/utils";
import type { ClientUnit } from "@/types/client";
import {
  statusLabel,
  priorityLabel,
  type ServiceOrderStatus,
  type ServicePriority,
} from "@/types/serviceOrder";

type ClientOrderCardData = {
  id: string;
  number: number;
  title: string;
  status: ServiceOrderStatus;
  priority: ServicePriority | null;
  client_unit_id: string | null;
  opened_at: string | null;
  scheduled_for: string | null;
  started_at: string | null;
  finished_at: string | null;
  client_unit: { id: string; name: string } | null;
};

type OrderTone = "pending" | "running" | "done" | "danger" | "neutral";

const orderToneStyles: Record<
  OrderTone,
  { bar: string; badge: string; card: string; icon: string }
> = {
  pending: {
    bar: "bg-primary shadow-[0_0_18px_oklch(0.72_0.19_50/0.55)]",
    badge: "border-primary/45 bg-primary/15 text-primary",
    card: "hover:border-primary/35 hover:shadow-[0_22px_46px_-30px_oklch(0.72_0.19_50/0.5)]",
    icon: "text-primary",
  },
  running: {
    bar: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.48)]",
    badge: "border-cyan-300/45 bg-cyan-300/12 text-cyan-100",
    card: "hover:border-cyan-300/35 hover:shadow-[0_22px_46px_-30px_rgba(103,232,249,0.42)]",
    icon: "text-cyan-200",
  },
  done: {
    bar: "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]",
    badge: "border-amber-300/45 bg-amber-300/12 text-amber-100",
    card: "hover:border-amber-300/35 hover:shadow-[0_22px_46px_-30px_rgba(252,211,77,0.42)]",
    icon: "text-amber-200",
  },
  danger: {
    bar: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.45)]",
    badge: "border-rose-300/45 bg-rose-400/12 text-rose-100",
    card: "hover:border-rose-300/35 hover:shadow-[0_22px_46px_-30px_rgba(251,113,133,0.42)]",
    icon: "text-rose-200",
  },
  neutral: {
    bar: "bg-slate-300 shadow-[0_0_18px_rgba(203,213,225,0.3)]",
    badge: "border-slate-300/35 bg-slate-300/10 text-slate-100",
    card: "hover:border-slate-300/30 hover:shadow-[0_22px_46px_-30px_rgba(148,163,184,0.4)]",
    icon: "text-slate-200",
  },
};

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
  const hasContact = Boolean(
    client.responsible_name || client.phone || client.email || client.address,
  );

  return (
    <div className="space-y-5 pb-24 sm:pb-8">
      <section className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,#172233_0%,#101827_58%,#0d1420_100%)] p-5 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-primary">
              Detalhe da empresa
            </p>
            <h1 className="mt-2 break-words font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              {client.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <StatusBadge active={client.active} />
              {client.cnpj && (
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 font-mono text-[0.72rem] text-slate-200">
                  CNPJ {maskCNPJ(client.cnpj)}
                </span>
              )}
              {(client.city || client.state) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-200">
                  <MapPin size={12} className="text-primary" />
                  {[client.city, client.state].filter(Boolean).join(" / ")}
                </span>
              )}
              {client.segment && (
                <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-slate-200">
                  {client.segment}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Link
              to="/ordens/nova"
              search={{ clientId: client.id } as never}
              className="lemarc-orange-glow lemarc-pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary-foreground shadow-[0_14px_28px_-18px_oklch(0.72_0.19_50)] outline-none transition hover:bg-primary/95 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
            >
              <Plus size={15} /> Nova OS
            </Link>
            <Link
              to="/clientes/$id/editar"
              params={{ id: client.id }}
              className="lemarc-pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/14 bg-white/10 px-3 font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-white outline-none transition hover:border-white/22 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
            >
              <Pencil size={15} /> Editar
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Mini label="Unidades" value={units.length} />
        <Mini label="OS abertas" value={counts.open} accent="orange" />
        <Mini label="Em andamento" value={counts.running} accent="cyan" />
        <Mini label="Concluídas" value={counts.done} accent="amber" />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/10 bg-[#111a28] p-1.5 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <DetailTab value="overview">Visão geral</DetailTab>
          <DetailTab value="units">Unidades ({units.length})</DetailTab>
          <DetailTab value="orders">OS ({clientOrders.length})</DetailTab>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <Panel>
              <SectionTitle icon={Phone}>Contato principal</SectionTitle>
              <div className="mt-4 space-y-2.5">
                {client.responsible_name && <Row icon={Building2}>{client.responsible_name}</Row>}
                {client.phone && <Row icon={Phone}>{client.phone}</Row>}
                {client.email && <Row icon={Mail}>{client.email}</Row>}
                {client.address && <Row icon={MapPin}>{client.address}</Row>}
                {!hasContact && (
                  <EmptyInline icon={Phone}>
                    Sem contato cadastrado. Edite a empresa para adicionar.
                  </EmptyInline>
                )}
              </div>
            </Panel>

            <Panel>
              <SectionTitle icon={ClipboardList}>Última OS</SectionTitle>
              <div className="mt-4">
                {lastOrder ? (
                  <OrderSummaryCard order={lastOrder} compact />
                ) : (
                  <EmptyInline
                    icon={ClipboardList}
                    action={
                      <Link
                        to="/ordens/nova"
                        search={{ clientId: client.id } as never}
                        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary-foreground"
                      >
                        <Plus size={14} /> Nova OS
                      </Link>
                    }
                  >
                    Nenhuma OS cadastrada para este cliente.
                  </EmptyInline>
                )}
              </div>
            </Panel>
          </div>

          {client.notes && (
            <Panel>
              <SectionTitle icon={ClipboardList}>Observações</SectionTitle>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-100">
                {client.notes}
              </p>
            </Panel>
          )}
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitsSection clientId={client.id} units={units} orders={clientOrders} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-3">
          {clientOrders.length === 0 ? (
            <EmptyBlock
              icon={ClipboardList}
              title="Nenhuma OS cadastrada para este cliente."
              description="Quando uma ordem for aberta para esta empresa, ela aparecerá aqui com status, prioridade e data de abertura."
              action={
                <Link
                  to="/ordens/nova"
                  search={{ clientId: client.id } as never}
                  className="lemarc-orange-glow mt-5 inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 font-display text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary-foreground"
                >
                  <Plus size={15} /> Nova OS
                </Link>
              }
            />
          ) : (
            clientOrders.map((order) => <OrderSummaryCard key={order.id} order={order} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailTab({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="min-h-11 rounded-xl px-2.5 py-2 text-center text-[0.72rem] font-black uppercase tracking-[0.08em] text-slate-300 transition hover:bg-white/7 hover:text-white focus-visible:ring-primary/70 data-[state=active]:bg-[#263244] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_28px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.1)] sm:text-xs"
    >
      {children}
    </TabsTrigger>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[1.25rem] border border-white/10 bg-[#111a28] p-5 text-slate-100 shadow-[0_18px_44px_-32px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-display text-sm font-black uppercase tracking-[0.12em] text-white">
      <span className="grid size-7 place-items-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
        <Icon size={15} />
      </span>
      {children}
    </h3>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em]",
        active
          ? "border-emerald-300/40 bg-emerald-400/14 text-emerald-100"
          : "border-slate-300/25 bg-slate-300/10 text-slate-200",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function Mini({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "orange" | "cyan" | "amber" | "slate";
}) {
  const tone = {
    orange:
      "border-primary/28 bg-[linear-gradient(145deg,#1b2533_0%,#151f2e_64%,oklch(0.72_0.19_50/0.16)_100%)] text-primary",
    cyan: "border-cyan-300/24 bg-[linear-gradient(145deg,#1b2533_0%,#151f2e_64%,rgba(103,232,249,0.12)_100%)] text-cyan-100",
    amber:
      "border-amber-300/24 bg-[linear-gradient(145deg,#1b2533_0%,#151f2e_64%,rgba(252,211,77,0.12)_100%)] text-amber-100",
    slate: "border-white/10 bg-[#131d2b] text-white",
  }[accent];

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 shadow-[0_16px_36px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]",
        tone,
      )}
    >
      <div className="text-[0.66rem] font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-black leading-none tabular-nums">{value}</div>
    </section>
  );
}

function Row({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/8 bg-white/6 px-3 py-2.5">
      <Icon size={15} className="shrink-0 text-primary" />
      <span className="min-w-0 break-words text-sm font-semibold leading-relaxed text-slate-100">
        {children}
      </span>
    </div>
  );
}

function EmptyInline({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/14 bg-white/6 px-4 py-5 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
        <Icon size={18} />
      </div>
      <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-200">
        {children}
      </p>
      {action}
    </div>
  );
}

function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-dashed border-white/16 bg-[#111a28] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/12 text-primary">
        <Icon size={23} />
      </div>
      <h3 className="mt-4 font-display text-base font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-300">
        {description}
      </p>
      {action}
    </section>
  );
}

function getOrderTone(status: ServiceOrderStatus): OrderTone {
  if (status === "finished" || status === "approved" || status === "review") return "done";
  if (status === "running" || status === "transit") return "running";
  if (status === "pending" || status === "dispatched") return "pending";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function OrderSummaryCard({
  order,
  compact = false,
}: {
  order: ClientOrderCardData;
  compact?: boolean;
}) {
  const tone = orderToneStyles[getOrderTone(order.status)];
  const openedAt = formatServiceOrderDateTime(order.opened_at);
  const scheduledFor = formatServiceOrderDateTime(order.scheduled_for);
  const dateLabel = openedAt
    ? `Aberta ${openedAt}`
    : scheduledFor
      ? `Prevista ${scheduledFor}`
      : "Data de abertura não informada";

  return (
    <Link
      to="/ordens/$id"
      params={{ id: order.id }}
      aria-label={`Abrir OS ${order.number}`}
      className={cn(
        "group/order relative block overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(145deg,#151f2e_0%,#0f1724_100%)] text-left shadow-[0_18px_42px_-32px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.07)] outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0",
        compact ? "p-4 pl-5" : "p-4 pl-5 sm:p-5 sm:pl-6",
        tone.card,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute bottom-4 left-0 top-4 w-1 rounded-r-full", tone.bar)}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("font-mono text-xs font-black uppercase tracking-[0.14em]", tone.icon)}
            >
              OS #{order.number}
            </span>
            <OrderStatusBadge status={order.status} tone={tone.badge} />
            {order.priority && <PriorityBadge priority={order.priority} />}
          </div>
          <h4
            className={cn(
              "mt-2 line-clamp-2 font-display font-black leading-tight text-white",
              compact ? "text-base" : "text-lg",
            )}
          >
            {order.title || "OS sem título"}
          </h4>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/7 text-primary transition group-hover/order:translate-x-0.5 group-hover/order:border-primary/30 group-hover/order:bg-primary/12">
          <ArrowRight size={17} />
        </span>
      </div>

      <div className={cn("mt-4 grid gap-2 text-sm", compact ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
        <OrderMeta icon={CalendarClock} label="Abertura" value={dateLabel} />
        <OrderMeta
          icon={Factory}
          label="Unidade"
          value={order.client_unit?.name ?? "Unidade não informada"}
          muted={!order.client_unit?.name}
        />
        {!compact && (
          <OrderMeta
            icon={CheckCircle2}
            label="Prioridade"
            value={order.priority ? priorityLabel[order.priority] : "Sem prioridade"}
            muted={!order.priority}
          />
        )}
      </div>
    </Link>
  );
}

function OrderStatusBadge({ status, tone }: { status: ServiceOrderStatus; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em]",
        tone,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />
      {statusLabel[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ServicePriority }) {
  const tone = {
    baixa: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    media: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    alta: "border-primary/35 bg-primary/12 text-primary",
    urgente: "border-rose-300/40 bg-rose-400/12 text-rose-100",
  }[priority];

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em]",
        tone,
      )}
    >
      {priorityLabel[priority]}
    </span>
  );
}

function OrderMeta({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/8 bg-white/6 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.1em] text-slate-400">
        <Icon size={12} className="text-primary" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 truncate text-sm font-bold leading-tight text-slate-100",
          muted && "text-slate-300",
        )}
      >
        {value}
      </div>
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
      qc.invalidateQueries({ queryKey: ["client-page", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: (u: ClientUnit) => update({ data: { id: u.id, patch: { active: !u.active } } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-page", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-page", clientId] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
    },
  });

  return (
    <div className="space-y-3">
      {units.length === 0 && !adding && (
        <EmptyBlock
          icon={Building2}
          title="Nenhuma unidade cadastrada."
          description="Adicione unidades para separar setores, plantas ou áreas de atendimento desta empresa."
        />
      )}

      {units.map((u) => {
        const osCount = osByUnit.get(u.id) ?? 0;
        return (
          <Panel key={u.id} className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="break-words font-display text-lg font-black leading-tight text-white">
                    {u.name}
                  </h4>
                  {u.is_primary && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-300/12 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-amber-100">
                      <Star size={11} /> Principal
                    </span>
                  )}
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em]",
                      u.active
                        ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-100"
                        : "border-slate-300/25 bg-slate-300/10 text-slate-200",
                    )}
                  >
                    {u.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-300">
                  {[u.sector, u.city, u.state].filter(Boolean).join(" · ") || "Sem localização"}
                </div>
                {u.responsible_name && (
                  <div className="mt-1 text-sm font-semibold text-slate-300">
                    Responsável: <span className="text-slate-100">{u.responsible_name}</span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">
                <span className="rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.1em] text-primary">
                  {osCount} OS
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive.mutate(u)}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/7 text-slate-200 transition hover:border-primary/30 hover:bg-primary/12 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  title={u.active ? "Desativar" : "Ativar"}
                  aria-label={u.active ? "Desativar unidade" : "Ativar unidade"}
                >
                  <Power size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remover unidade "${u.name}"?`)) removeMut.mutate(u.id);
                  }}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/7 text-slate-200 transition hover:border-rose-300/35 hover:bg-rose-400/12 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
                  title="Remover"
                  aria-label="Remover unidade"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-start sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/ordens/nova",
                    search: { clientId, unitId: u.id } as never,
                  })
                }
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/12 px-3 font-display text-[0.66rem] font-black uppercase tracking-[0.1em] text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                <Plus size={14} /> Nova OS nesta unidade
              </button>
            </div>
          </Panel>
        );
      })}

      {adding ? (
        <Panel className="space-y-3 p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da unidade (ex.: Matriz, Oficina)"
            className="h-12 rounded-xl border-white/12 bg-[#0d1420] text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50"
          />
          <Input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Setor (opcional)"
            className="h-12 rounded-xl border-white/12 bg-[#0d1420] text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary/50"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAdding(false)}
              className="h-11 rounded-xl border border-white/10 bg-white/8 text-slate-100 hover:bg-white/12"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || addMut.isPending}
              onClick={() => addMut.mutate()}
              className="h-11 gap-2 rounded-xl bg-primary font-display text-[0.72rem] font-black uppercase tracking-[0.1em] text-primary-foreground hover:bg-primary/95 disabled:opacity-55"
            >
              <Plus size={14} /> {addMut.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </Panel>
      ) : (
        <Button
          type="button"
          onClick={() => setAdding(true)}
          variant="secondary"
          className="h-12 w-full gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/12 font-display text-[0.72rem] font-black uppercase tracking-[0.1em] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-primary hover:text-primary-foreground"
        >
          <Plus size={16} /> Adicionar unidade
        </Button>
      )}
    </div>
  );
}
