import { Suspense } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  MapPin,
  Pause,
  Play,
  Receipt,
  Send,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { SectionHeader } from "@/components/app/SectionHeader";
import { PrimaryCTA } from "@/components/app/operations";
import { getServiceOrder, updateServiceOrderStatus } from "@/lib/api/serviceOrders.functions";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
} from "@/types/serviceOrder";
import { missingFields } from "@/lib/serviceOrders/status";
import {
  formatServiceOrderDateTime,
  formatServiceOrderDuration,
  getClosedAt,
  getOpenedAt,
} from "@/lib/serviceOrders/time";

export const Route = createFileRoute("/_app/ordens/$id")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Gestão Lemarc` }] }),
  component: OrdemPage,
  notFoundComponent: () => (
    <AppShell title="OS não encontrada" back>
      <div className="mt-8 text-center text-sm text-muted-foreground">Esta ordem não existe.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Erro ao carregar OS" back>
      <div className="mt-8 text-center text-sm text-rose-300">{error.message}</div>
    </AppShell>
  ),
});

const flow: Record<ServiceOrderStatus, { label: string; next: ServiceOrderStatus | null; icon: typeof Truck }> = {
  pending: { label: "Despachar OS", next: "dispatched", icon: Send },
  dispatched: { label: "Iniciar deslocamento", next: "transit", icon: Truck },
  transit: { label: "Iniciar serviço", next: "running", icon: Play },
  running: { label: "Finalizar serviço", next: "finished", icon: Pause },
  finished: { label: "Enviar para revisão", next: "review", icon: Send },
  review: { label: "Aprovar para cobrança", next: "approved", icon: Receipt },
  approved: { label: "Aprovada para cobrança", next: null, icon: CheckCircle2 },
  cancelled: { label: "OS cancelada", next: null, icon: CheckCircle2 },
};

function OrdemPage() {
  return (
    <AppShell title="Ordem de serviço" back>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <OrdemDetalhe />
      </Suspense>
    </AppShell>
  );
}

function OrdemDetalhe() {
  const { id } = Route.useParams();
  const fetcher = useServerFn(getServiceOrder);
  const { data: order } = useSuspenseQuery(
    queryOptions({
      queryKey: ["service-order", id],
      queryFn: () => fetcher({ data: { id } }),
    }),
  );
  if (!order) throw notFound();

  const queryClient = useQueryClient();
  const updateStatus = useServerFn(updateServiceOrderStatus);
  const mutation = useMutation({
    mutationFn: (status: ServiceOrderStatus) => updateStatus({ data: { id: order.id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
    },
  });

  const action = flow[order.status];
  const missing = missingFields(order);

  return (
    <>
      <GlassCard className="lemarc-hero-gradient mt-2 overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              {order.service_type === "outro" && order.service_type_other
                ? order.service_type_other
                : order.service_type
                  ? serviceTypeLabel[order.service_type]
                  : "Sem tipo"}
            </p>
            <h1 className="mt-1 font-display text-xl font-black leading-tight text-foreground">
              OS #{order.number} · {order.title}
            </h1>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            {statusLabel[order.status]}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          {order.priority && (
            <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5">
              Prioridade {priorityLabel[order.priority]}
            </span>
          )}
          <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5">
            Aberta {formatServiceOrderDateTime(getOpenedAt(order)) ?? "—"}
          </span>
          {(() => {
            const closed = getClosedAt(order);
            const closedLabel = formatServiceOrderDateTime(closed);
            if (!closedLabel) return null;
            const verb = order.status === "cancelled" ? "Cancelada" : "Fechada";
            return (
              <span className="rounded-full border border-border bg-secondary/50 px-2 py-0.5">
                {verb} {closedLabel}
              </span>
            );
          })()}
          {(() => {
            const dur = formatServiceOrderDuration(getOpenedAt(order), getClosedAt(order));
            if (!dur) return null;
            return (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                Tempo total {dur}
              </span>
            );
          })()}
        </div>
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
          <MetaRow icon={Building2}>
            {order.client?.name ?? "Sem cliente"}
            {order.client?.unit ? ` · ${order.client.unit}` : ""}
          </MetaRow>
          {order.location && <MetaRow icon={MapPin}>{order.location}</MetaRow>}
          <MetaRow icon={HardHat}>{order.technician?.full_name ?? "Sem técnico"}</MetaRow>
          {order.scheduled_for && (
            <MetaRow icon={Clock}>
              Previsão de início: {new Date(order.scheduled_for).toLocaleString("pt-BR")}
            </MetaRow>
          )}
        </div>
      </GlassCard>

      {action.next && (
        <GlassCard className="mt-4 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Próxima ação
          </p>
          <h2 className="font-display text-lg font-black text-foreground">{action.label}</h2>
          <div className="mt-3">
            <PrimaryCTA
              onClick={() => action.next && mutation.mutate(action.next)}
              icon={action.icon}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Atualizando..." : action.label}
            </PrimaryCTA>
          </div>
        </GlassCard>
      )}

      {missing.length > 0 && (
        <Section title="Pendências de cadastro" icon={FileText}>
          <p className="text-xs text-muted-foreground">
            Esta OS está marcada como incompleta. Faltam:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missing.map((m) => (
              <span
                key={m}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300"
              >
                {m}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Descrição" icon={FileText}>
        <p className="text-sm leading-relaxed text-foreground">
          {order.description?.trim() || "Sem descrição cadastrada."}
        </p>
      </Section>

      <Section title="Linha do tempo" icon={Clock}>
        <Timeline order={order} />
      </Section>
    </>
  );
}

function MetaRow({ icon: Icon, children }: { icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="shrink-0 text-primary" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <SectionHeader title={title} icon={icon} />
      <GlassCard className="p-4">{children}</GlassCard>
    </section>
  );
}

function Timeline({ order }: { order: ServiceOrder }) {
  const events: { label: string; iso: string | null }[] = [
    { label: "OS criada", iso: order.opened_at },
    { label: "Serviço iniciado", iso: order.started_at },
    { label: "Serviço finalizado", iso: order.finished_at },
    { label: "Aprovada para cobrança", iso: order.approved_at },
    { label: "Fechada", iso: order.closed_at },
  ];
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li
          key={e.label}
          className={`flex items-center gap-3 rounded-2xl border p-3 ${
            e.iso
              ? "border-primary/35 bg-primary/10"
              : "border-border bg-secondary/35"
          }`}
        >
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${
              e.iso ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{e.label}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatServiceOrderDateTime(e.iso) ?? "—"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
