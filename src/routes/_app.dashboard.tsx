import { Suspense, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  HardHat,
  ShieldCheck,
  Route as RouteIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/components/app/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useServiceOrdersQuery, useTechniciansQuery } from "@/hooks/useServiceOrders";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { Plus, ClipboardCheck } from "lucide-react";
import { ServiceOrderCard } from "@/components/app/ServiceOrderCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { EmptyOperations } from "@/components/dashboard/EmptyOperations";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricPeriodFilter } from "@/components/dashboard/MetricPeriodFilter";
import { OperationTodayCard } from "@/components/dashboard/OperationTodayCard";
import { OrderTechnicianTimeCard } from "@/components/dashboard/OrderTechnicianTimeCard";
import { useDashboardTechnicianTimeQuery } from "@/hooks/useServiceOrders";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";
import { groupDashboardTechnicianTimeByOrder } from "@/lib/serviceOrders/dashboardTechnicianTime";
import type { DashboardMetrics } from "@/lib/serviceOrders/metrics";
import { periodContextLabel, type Period, type PeriodRange } from "@/lib/serviceOrders/period";
import type { ServiceOrder } from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Central de Operação — Gestão Lemarc" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardRouter />
      </Suspense>
    </AppShell>
  );
}

function DashboardRouter() {
  const { isTecnico, loading } = useUserRole();
  if (loading) return <DashboardSkeleton />;
  if (isTecnico) return <TechnicianHome />;
  return <Dashboard />;
}

function TechnicianHome() {
  const { displayName, user } = useAuth();
  const { data: orders } = useServiceOrdersQuery();
  const { data: technicians } = useTechniciansQuery();
  const firstName = (displayName || "Técnico").split(" ")[0];
  const myTechnicianIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    return new Set(technicians.filter((t) => t.user_id === user.id).map((t) => t.id));
  }, [technicians, user?.id]);
  const myOrders = useMemo(
    () =>
      orders.filter((o) => {
        const techs = getOrderTechnicians(o);
        if (techs.some((t) => myTechnicianIds.has(t.id))) return true;
        if (o.technician_id && myTechnicianIds.has(o.technician_id)) return true;
        return false;
      }),
    [orders, myTechnicianIds],
  );
  const myActive = myOrders.filter((o) =>
    ["pending", "dispatched", "transit", "running"].includes(o.status),
  );
  const myRecent = myOrders.slice(0, 6);
  return (
    <main className="mx-auto max-w-3xl space-y-5 pb-6">
      <section className="lemarc-hero-gradient rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          Bem-vindo, {firstName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-black text-foreground">
          Central do técnico
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe suas ordens de serviço e registre a execução em campo.
        </p>
        <Link
          to="/ordens/nova"
          className="lemarc-pressable mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-lg"
        >
          <Plus size={18} /> Nova OS
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <ClipboardCheck size={16} className="text-primary" /> OS em execução
        </h2>
        {myActive.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-muted-foreground">
            Nenhuma OS atribuída a você.
            <br />
            Crie uma nova OS para iniciar um atendimento.
          </div>
        ) : (
          <div className="grid gap-3">
            {myActive.map((o) => (
              <ServiceOrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      {myRecent.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-title">Últimas OS</h2>
          <div className="grid gap-3">
            {myRecent.map((o) => (
              <ServiceOrderCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function periodSearchParams(period: Period, range?: PeriodRange) {
  if (period !== "custom") return { period };
  return { period, from: range?.from, to: range?.to };
}

function uniqueCount(orders: ServiceOrder[], field: "client_id" | "client_unit_id") {
  return new Set(orders.map((order) => order[field]).filter(Boolean)).size;
}

function countDelayed(orders: ServiceOrder[]) {
  const now = Date.now();
  return orders.filter((order) => {
    if (!order.scheduled_for || order.finished_at) return false;
    return new Date(order.scheduled_for).getTime() < now;
  }).length;
}

function latestUpdateLabel(orders: ServiceOrder[]) {
  const latest = orders.reduce<number | null>((current, order) => {
    const timestamp = new Date(order.updated_at).getTime();
    if (!Number.isFinite(timestamp)) return current;
    return current === null || timestamp > current ? timestamp : current;
  }, null);

  if (!latest) return "sem dado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(latest));
}

function averageWorkedTimeLabel(orders: ServiceOrder[]) {
  const workedMinutes = orders
    .map((order) => order.worked_minutes)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (workedMinutes.length === 0) return "sem dado";

  const average = Math.round(
    workedMinutes.reduce((total, minutes) => total + minutes, 0) / workedMinutes.length,
  );

  if (average < 60) return `${average}min`;

  const hours = Math.floor(average / 60);
  const minutes = average % 60;
  return minutes ? `${hours}h${String(minutes).padStart(2, "0")}` : `${hours}h`;
}

function buildCardSummaries(metrics: DashboardMetrics) {
  const activeOrders = [
    ...metrics.pendingOrders,
    ...metrics.inProgressOrders,
    ...metrics.awaitingReviewOrders,
  ];
  const transitOrders = metrics.inProgressOrders.filter((order) => order.status === "transit");
  const pendingDispatch = metrics.pendingOrders.filter((order) => order.status === "pending");
  const urgentAlerts = metrics.alertOrders.filter((order) => order.priority === "urgente");
  const delayedAlerts = countDelayed(metrics.alertOrders);
  const reviewWithoutClosure = metrics.awaitingReviewOrders.filter(
    (order) => !order.approved_at && !order.closed_at,
  );

  return {
    pending: [
      { label: "Aguardando despacho", value: pendingDispatch.length },
      {
        label: "Sem técnico",
        value: metrics.pendingOrders.filter((order) => !order.technician_id).length,
      },
      { label: "Abertas no período", value: metrics.pendingOrders.length },
    ],
    inProgress: [
      { label: "Serviços ativos", value: metrics.inProgress },
      { label: "Técnicos em execução", value: metrics.techniciansInField },
      { label: "Deslocamentos", value: transitOrders.length },
    ],
    clients: [
      { label: "Unidades com OS", value: uniqueCount(activeOrders, "client_unit_id") },
      { label: "Clientes no período", value: metrics.activeClients },
      { label: "Última atualização", value: latestUpdateLabel(metrics.periodOrders) },
    ],
    technicians: [
      { label: "OS em campo", value: metrics.inProgress },
      { label: "Em deslocamento", value: transitOrders.length },
      {
        label: "Sem técnico definido",
        value: activeOrders.filter((order) => !order.technician_id).length,
      },
    ],
    alerts: [
      { label: "Urgências", value: urgentAlerts.length },
      { label: "Atrasos", value: delayedAlerts },
      { label: "Risco operacional", value: metrics.alerts },
      { label: "Dados ausentes", value: metrics.incomplete },
    ],
    priorities: [
      { label: "Sem fechamento", value: reviewWithoutClosure.length },
      { label: "Dados ausentes", value: metrics.incomplete },
      { label: "Aguard. revisão", value: metrics.awaitingReview },
    ],
    done: [
      { label: "No período", value: metrics.done },
      {
        label: "Aprovadas",
        value: metrics.doneOrders.filter((order) => order.status === "approved").length,
      },
      { label: "Tempo médio", value: averageWorkedTimeLabel(metrics.doneOrders) },
    ],
  };
}

function Dashboard() {
  const { displayName } = useAuth();
  const navigate = useNavigate();
  const { period, setPeriod, periodRange, metrics, orders } = useOperationalDashboard("day");
  const firstName = displayName.split(" ")[0];
  const periodText = periodContextLabel(period, periodRange);
  const periodSearch = periodSearchParams(period, periodRange);
  const summaries = useMemo(() => buildCardSummaries(metrics), [metrics]);
  const recent = useMemo(() => orders.slice(0, 4), [orders]);
  const recentOrderIds = useMemo(() => recent.map((order) => order.id), [recent]);
  const { data: technicianTimeData } = useDashboardTechnicianTimeQuery(recentOrderIds);
  const technicianTimeByOrder = useMemo(
    () => groupDashboardTechnicianTimeByOrder(technicianTimeData),
    [technicianTimeData],
  );

  return (
    <>
      <OperationTodayCard
        greetingName={firstName}
        metrics={metrics}
        period={period}
        periodRange={periodRange}
      />

      <section className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--on-app-bg)]/10 bg-white/55 p-3 shadow-[0_8px_24px_-18px_oklch(0.2_0.05_252/0.35)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div className="min-w-0 px-1 sm:px-0">
            <h2 className="section-title">Cards operacionais</h2>
            <p className="mt-1 text-[11px] font-medium text-[color:var(--on-app-bg-muted)]">
              Resumo {periodText}.
            </p>
          </div>
          <MetricPeriodFilter
            value={period}
            range={periodRange}
            onChange={setPeriod}
            label="Período dos cards"
          />
        </div>

        <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Ordens pendentes"
            value={metrics.pending}
            subtitle={`Fila aguardando despacho ${periodText}.`}
            icon={ClipboardList}
            footerLabel="Abrir ordens"
            accent="steel"
            badge={metrics.pending > 0 ? "Pendentes" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.pending}
            onClick={() =>
              navigate({ to: "/ordens", search: { status: "pendente", ...periodSearch } })
            }
          />
          <MetricCard
            title="Em andamento"
            value={metrics.inProgress}
            subtitle={`Serviços ativos e deslocamentos ${periodText}.`}
            icon={Activity}
            footerLabel="Acompanhar campo"
            accent="orange"
            badge={metrics.inProgress > 0 ? "Ao vivo" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.inProgress}
            onClick={() =>
              navigate({ to: "/ordens", search: { status: "andamento", ...periodSearch } })
            }
          />
          <MetricCard
            title="Clientes ativos"
            value={metrics.activeClients}
            subtitle={`Unidades com OS aberta ${periodText}.`}
            icon={Building2}
            footerLabel="Ver carteira"
            accent="blue"
            badge={metrics.activeClients > 0 ? "Carteira ativa" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.clients}
            onClick={() => navigate({ to: "/clientes" })}
          />
          <MetricCard
            title="Técnicos em campo"
            value={metrics.techniciansInField}
            subtitle={`Equipes em execução ou deslocamento ${periodText}.`}
            icon={HardHat}
            footerLabel="Ver equipe"
            accent="orange"
            badge={metrics.techniciansInField > 0 ? "Em campo" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.technicians}
            onClick={() => navigate({ to: "/colaboradores" })}
          />
          <MetricCard
            title="Alertas"
            value={metrics.alerts}
            subtitle={`Urgências, atrasos e risco operacional ${periodText}.`}
            icon={AlertTriangle}
            footerLabel="Tratar alertas"
            accent="red"
            badge={metrics.alerts > 0 ? "Criticidade" : undefined}
            emphasis={metrics.alerts > 0}
            periodLabel={periodText}
            summaryItems={summaries.alerts}
            onClick={() =>
              navigate({ to: "/ordens", search: { filtro: "alertas", ...periodSearch } })
            }
          />
          <MetricCard
            title="Prioridades"
            value={metrics.incomplete}
            subtitle={`OS sem dados obrigatórios ou sem fechamento ${periodText}.`}
            icon={ShieldCheck}
            footerLabel="Revisar agora"
            accent="amber"
            badge={metrics.incomplete > 0 ? "Revisão" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.priorities}
            onClick={() =>
              navigate({ to: "/ordens", search: { filtro: "incompletas", ...periodSearch } })
            }
          />
          <MetricCard
            title="Serviços concluídos"
            value={metrics.done}
            subtitle={`OS finalizadas ou aprovadas ${periodText}.`}
            icon={CheckCircle2}
            footerLabel="Ver concluídas"
            accent="green"
            badge={metrics.done > 0 ? "Finalizadas" : undefined}
            periodLabel={periodText}
            summaryItems={summaries.done}
            onClick={() =>
              navigate({ to: "/ordens", search: { status: "concluida", ...periodSearch } })
            }
          />
        </div>
      </section>

      {orders.length === 0 && <EmptyOperations />}

      {recent.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <RouteIcon size={14} />
              Ordens recentes
            </h2>
            <Link to="/ordens" className="text-xs font-bold text-primary hover:text-primary/80">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {recent.map((order) => (
              <ServiceOrderCard key={order.id} order={order}>
                <OrderTechnicianTimeCard order={order} data={technicianTimeByOrder[order.id]} />
              </ServiceOrderCard>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
