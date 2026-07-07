import { Suspense, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { ServiceOrderCard } from "@/components/app/ServiceOrderCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { EmptyOperations } from "@/components/dashboard/EmptyOperations";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MetricPeriodFilter } from "@/components/dashboard/MetricPeriodFilter";
import { OperationTodayCard } from "@/components/dashboard/OperationTodayCard";
import { OrderTechnicianTimeCard } from "@/components/dashboard/OrderTechnicianTimeCard";
import { TechnicianAssignedOrderNotification } from "@/components/dashboard/TechnicianAssignedOrderNotification";
import {
  TechnicianHomeHero,
  TechnicianHomeSkeleton,
} from "@/components/dashboard/TechnicianHomeHero";
import { TechnicianOrderList } from "@/components/dashboard/TechnicianOrderList";
import { technicianOrderNeedsAction } from "@/components/dashboard/technicianOrderUtils";
import { TechnicianQuickActionCard } from "@/components/dashboard/TechnicianQuickActionCard";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useDashboardTechnicianTimeQuery,
  useServiceOrdersQuery,
  useTechniciansQuery,
} from "@/hooks/useServiceOrders";
import {
  TECHNICIAN_NOTIFICATIONS_QUERY_KEY,
  useTechnicianAssignedOrderNotificationsQuery,
} from "@/hooks/useTechnicianNotifications";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";
import {
  dismissServiceOrderNotification,
  markServiceOrderNotificationRead,
} from "@/lib/api/notifications.functions";
import { groupDashboardTechnicianTimeByOrder } from "@/lib/serviceOrders/dashboardTechnicianTime";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import type { DashboardMetrics } from "@/lib/serviceOrders/metrics";
import { periodContextLabel, type Period, type PeriodRange } from "@/lib/serviceOrders/period";
import type { ServiceOrder, ServiceOrderStatus } from "@/types/serviceOrder";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Central de Operação — Gestão Lemarc" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <DashboardRouter />
    </AppShell>
  );
}

function DashboardRouter() {
  const { isTecnico, loading } = useUserRole();
  if (loading) return <TechnicianHomeSkeleton />;
  if (isTecnico) {
    return (
      <Suspense fallback={<TechnicianHomeSkeleton />}>
        <TechnicianHome />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

const technicianVisibleStatuses = new Set<ServiceOrderStatus>([
  "pending",
  "dispatched",
  "transit",
  "running",
  "finished",
  "review",
]);

function TechnicianHome() {
  const { displayName, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orders } = useServiceOrdersQuery();
  const { data: technicians } = useTechniciansQuery();
  const { data: notifications = [] } = useTechnicianAssignedOrderNotificationsQuery();
  const markRead = useServerFn(markServiceOrderNotificationRead);
  const dismissNotification = useServerFn(dismissServiceOrderNotification);
  const firstName = (displayName || "Técnico").split(" ")[0];
  const myTechnicianIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    return new Set(technicians.filter((t) => t.user_id === user.id).map((t) => t.id));
  }, [technicians, user?.id]);
  const technicianOrders = useMemo(() => {
    return orders
      .filter((order) => {
        if (!technicianVisibleStatuses.has(order.status)) return false;

        const assigned = getOrderTechnicians(order);
        if (assigned.some((technician) => myTechnicianIds.has(technician.id))) return true;
        return Boolean(order.technician_id && myTechnicianIds.has(order.technician_id));
      })
      .sort(compareTechnicianOrders);
  }, [orders, myTechnicianIds]);
  const actionCount = useMemo(
    () => technicianOrders.filter(technicianOrderNeedsAction).length,
    [technicianOrders],
  );
  const currentNotification = notifications[0] ?? null;
  const readMutation = useMutation({
    mutationFn: (id: string) => markRead({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECHNICIAN_NOTIFICATIONS_QUERY_KEY });
    },
  });
  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissNotification({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECHNICIAN_NOTIFICATIONS_QUERY_KEY });
    },
  });
  const notificationBusy = readMutation.isPending || dismissMutation.isPending;

  async function handleOpenAssignedOrder() {
    if (!currentNotification || notificationBusy) return;
    try {
      await readMutation.mutateAsync(currentNotification.id);
      navigate({
        to: "/ordens/$id",
        params: { id: currentNotification.service_order_id },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível abrir a notificação desta OS.",
      );
    }
  }

  async function handleDismissNotification() {
    if (!currentNotification || notificationBusy) return;
    try {
      await dismissMutation.mutateAsync(currentNotification.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível dispensar a notificação.",
      );
    }
  }

  function handleNotificationOpenChange(open: boolean) {
    if (!open) void handleDismissNotification();
  }

  return (
    <>
      <main className="mx-auto w-full max-w-3xl space-y-3.5 pb-6 sm:space-y-4">
        <TechnicianHomeHero
          firstName={firstName}
          orderCount={technicianOrders.length}
          actionCount={actionCount}
        />
        <TechnicianQuickActionCard />
        <TechnicianOrderList orders={technicianOrders} actionCount={actionCount} />
      </main>
      <TechnicianAssignedOrderNotification
        notification={currentNotification}
        open={Boolean(currentNotification)}
        busy={notificationBusy}
        onOpenChange={handleNotificationOpenChange}
        onOpenOrder={handleOpenAssignedOrder}
        onDismiss={handleDismissNotification}
      />
    </>
  );
}

function compareTechnicianOrders(a: ServiceOrder, b: ServiceOrder) {
  return (
    technicianStatusRank(a.status) - technicianStatusRank(b.status) ||
    technicianPriorityRank(a) - technicianPriorityRank(b) ||
    dateValueForSort(b.opened_at ?? b.created_at) - dateValueForSort(a.opened_at ?? a.created_at)
  );
}

function technicianStatusRank(status: ServiceOrderStatus) {
  const rank: Record<ServiceOrderStatus, number> = {
    running: 0,
    transit: 1,
    dispatched: 2,
    pending: 3,
    finished: 4,
    review: 5,
    approved: 6,
    cancelled: 7,
  };
  return rank[status];
}

function technicianPriorityRank(order: ServiceOrder) {
  if (order.priority === "urgente") return 0;
  if (order.priority === "alta") return 1;
  if (order.priority === "media") return 2;
  if (order.priority === "baixa") return 3;
  return 4;
}

function dateValueForSort(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
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
