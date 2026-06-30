import { Suspense, useMemo, type ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  BriefcaseBusiness,
  Clock3,
  Mail,
  PenLine,
  Phone,
  ShieldOff,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import {
  formatCurrency,
  formatMinutes,
  formatShortDate,
  initials,
} from "@/components/colaboradores/format";
import {
  useServiceOrdersQuery,
  useTechnicianLaborHistoryQuery,
  useTechniciansQuery,
} from "@/hooks/useServiceOrders";
import { updateTechnician } from "@/lib/api/serviceOrders.functions";
import {
  buildCollaboratorOperationalDashboard,
  collaboratorOrdersFor,
} from "@/lib/serviceOrders/collaborators";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/colaboradores/$id")({
  head: () => ({ meta: [{ title: "Perfil do colaborador — Gestão Lemarc" }] }),
  component: ColaboradorPerfilPage,
});

function ColaboradorPerfilPage() {
  return (
    <AppShell title="Perfil do colaborador" back>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white/[0.06]" />}>
        <PerfilContent />
      </Suspense>
    </AppShell>
  );
}

function PerfilContent() {
  const { id } = Route.useParams();
  const { data: technicians } = useTechniciansQuery();
  const { data: orders } = useServiceOrdersQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTechnician);

  const dashboard = useMemo(
    () => buildCollaboratorOperationalDashboard({ technicians, orders, laborHistory }),
    [laborHistory, orders, technicians],
  );
  const collaborator = dashboard.collaborators.find((item) => item.id === id);
  const technician = technicians.find((item) => item.id === id);
  if (!collaborator || !technician) throw notFound();

  const linkedOrders = collaboratorOrdersFor(orders, id);
  const latest = collaborator.history[0];
  const rateUndefined = collaborator.hourlyRateCents == null;

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { ...technician, active: !collaborator.active } }),
    onSuccess: () => {
      toast.success(collaborator.active ? "Colaborador desativado" : "Colaborador ativado");
      invalidateCollaboratorQueries(queryClient, id);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao alterar status"),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-4">
      <section className="lemarc-wizard-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-[1.35rem] border border-primary/35 bg-primary/14 font-display text-lg font-black uppercase text-primary">
              {initials(collaborator.name)}
            </span>
            <div className="min-w-0">
              <p className="lemarc-technical-label">
                COL-{collaborator.id.slice(0, 6).toUpperCase()}
              </p>
              <h1 className="truncate font-display text-2xl font-black leading-tight text-white sm:text-3xl">
                {collaborator.name}
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-300">
                {collaborator.role ?? "Função não informada"} · {collaborator.status}
              </p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
            <Action to="/colaboradores/$id/editar" id={id} icon={PenLine}>
              Editar
            </Action>
            <Action to="/colaboradores/$id/horas" id={id} icon={Clock3}>
              Ver horas
            </Action>
            <Action to="/colaboradores/$id/ordens" id={id} icon={BriefcaseBusiness}>
              Ver OS
            </Action>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.11] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-rose-300/40 hover:bg-rose-400/10 disabled:opacity-60"
            >
              <ShieldOff size={14} />
              {collaborator.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <Metric label="Valor/hora" value={formatCurrency(collaborator.hourlyRateCents)} />
          <Metric label="Horas no mês" value={formatMinutes(collaborator.hoursMonthMinutes)} />
          <Metric label="OS concluídas" value={String(collaborator.servicesMonth)} />
          <Metric label="OS abertas" value={String(collaborator.ordersOpen)} />
        </div>
      </section>

      {rateUndefined && (
        <Link
          to="/colaboradores/$id/editar"
          params={{ id }}
          search={{ focus: "rate" as const }}
          aria-label="Definir valor/hora do colaborador"
          className="lemarc-pressable lemarc-wizard-card group flex flex-col gap-3 rounded-3xl border border-white/[0.08] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <AlertTriangle size={18} strokeWidth={2.4} />
            </span>
            <span className="min-w-0">
              <p className="lemarc-technical-label text-amber-300/90">
                Pendência de cadastro
              </p>
              <p className="mt-1 font-display text-base font-black uppercase tracking-[0.04em] text-white">
                Definir valor/hora
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-300">
                Necessário para apontamento de horas em novas OS.
              </p>
            </span>
          </span>
          <span className="lemarc-primary-action inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] sm:w-auto">
            Definir agora
            <ArrowRight size={14} strokeWidth={2.6} />
          </span>
        </Link>
      )}

      <section className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
        <Panel title="Dados principais" icon={UserRound}>
          <Info label="Nome" value={collaborator.name} />
          <Info label="Telefone" value={collaborator.phone ?? "Não informado"} icon={Phone} />
          <Info label="E-mail" value={collaborator.email ?? "Não informado"} icon={Mail} />
          <Info label="Função" value={collaborator.role ?? "Não informada"} />
          <Info label="Especialidade" value={collaborator.specialty ?? "Não informada"} />
          <Info label="Usuário vinculado" value={collaborator.userId ?? "Sem usuário vinculado"} />
          <Info label="Cadastro" value={formatShortDate(collaborator.createdAt)} />
        </Panel>

        <Panel title="Precificação" icon={WalletCards}>
          <Info label="Valor normal" value={formatCurrency(collaborator.hourlyRateCents)} />
          <Info label="Hora extra 50%" value={formatCurrency(collaborator.hourlyRate50Cents)} />
          <Info label="Hora extra 100%" value={formatCurrency(collaborator.hourlyRate100Cents)} />
          <Info label="Observação" value={collaborator.pricingNotes ?? "Sem observação"} />
        </Panel>
      </section>

      <section className="lemarc-wizard-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="lemarc-technical-label">Horas e produtividade</p>
            <h2 className="font-display text-xl font-black text-white">Resumo operacional</h2>
          </div>
          {latest && (
            <Link
              to="/ordens/$id"
              params={{ id: latest.orderId }}
              className="lemarc-pressable hidden min-h-10 items-center rounded-full border border-primary/35 bg-primary/12 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-primary sm:inline-flex"
            >
              Última OS
            </Link>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Horas no mês" value={formatMinutes(collaborator.hoursMonthMinutes)} />
          <Metric label="Horas hoje" value={`${collaborator.ordersToday} OS`} />
          <Metric label="Valor gerado" value={formatCurrency(collaborator.valueMonthCents)} />
          <Metric
            label="Média por OS"
            value={
              collaborator.servicesMonth > 0
                ? formatMinutes(
                    Math.round(collaborator.hoursMonthMinutes / collaborator.servicesMonth),
                  )
                : "0h"
            }
          />
          <Metric label="OS vinculadas" value={String(linkedOrders.length)} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="lemarc-technical-label">Histórico de OS</p>
          <Link
            to="/colaboradores/$id/ordens"
            params={{ id }}
            className="text-[10px] font-black uppercase tracking-[0.12em] text-primary"
          >
            Ver todas
          </Link>
        </div>
        {collaborator.history.length === 0 ? (
          <div className="lemarc-island-row p-5 text-sm font-semibold text-slate-300">
            Nenhum apontamento ou OS vinculada encontrada.
          </div>
        ) : (
          collaborator.history.map((item) => (
            <Link
              key={item.id}
              to="/ordens/$id"
              params={{ id: item.orderId }}
              className="lemarc-island-row grid gap-2 p-4 sm:grid-cols-[0.8fr_1.5fr_0.7fr_0.8fr_0.8fr] sm:items-center"
            >
              <span className="font-display text-sm font-black text-white">
                {item.orderNumber ? `#${item.orderNumber}` : "OS"}
              </span>
              <span className="min-w-0 truncate text-sm font-bold text-slate-200">
                {item.clientName} · {item.title}
              </span>
              <span className="text-xs font-black text-slate-300 tabular-nums">
                {formatMinutes(item.minutes)}
              </span>
              <span className="text-xs font-black text-primary tabular-nums">
                {formatCurrency(item.valueCents)}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                {item.statusLabel}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

function Action({
  to,
  id,
  icon: Icon,
  children,
}: {
  to: string;
  id: string;
  icon: LucideIcon;
  children: string;
}) {
  return (
    <Link
      to={to as never}
      params={{ id } as never}
      className="lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.11] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/40 hover:bg-primary/12"
    >
      <Icon size={14} />
      {children}
    </Link>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="lemarc-wizard-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
          <Icon size={18} />
        </span>
        <h2 className="font-display text-xl font-black text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="lemarc-horizontal-row min-h-12 items-center px-3 py-2">
      {Icon && <Icon size={14} className="shrink-0 text-primary" />}
      <span className="min-w-0">
        <span className="lemarc-technical-label block">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-bold text-white">{value}</span>
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lemarc-compact-metric">
      <p className="lemarc-technical-label">{label}</p>
      <p className="mt-1 font-display text-sm font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function invalidateCollaboratorQueries(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ["technicians"] });
  queryClient.invalidateQueries({ queryKey: ["service-orders"] });
  queryClient.invalidateQueries({ queryKey: ["technician-labor-history"] });
  queryClient.invalidateQueries({ queryKey: ["report-orders"] });
  queryClient.invalidateQueries({ queryKey: ["order-financials", id] });
}
