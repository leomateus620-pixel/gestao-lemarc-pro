import { Suspense } from "react";
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
import { ServiceOrderCard } from "@/components/app/ServiceOrderCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { EmptyOperations } from "@/components/dashboard/EmptyOperations";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OperationTodayCard } from "@/components/dashboard/OperationTodayCard";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Central de Operação — Gestão Lemarc" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </AppShell>
  );
}

function Dashboard() {
  const { displayName } = useAuth();
  const navigate = useNavigate();
  const { period, setPeriod, metrics, orders } = useOperationalDashboard("day");
  const firstName = displayName.split(" ")[0];

  const recent = orders.slice(0, 4);

  return (
    <>
      <OperationTodayCard
        greetingName={firstName}
        metrics={metrics}
        period={period}
        onPeriodChange={setPeriod}
      />

      {orders.length === 0 ? (
        <EmptyOperations />
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Ordens pendentes"
            value={metrics.pending}
            subtitle="Fila aguardando despacho técnico."
            icon={ClipboardList}
            footerLabel="Abrir ordens"
            accent="steel"
            onClick={() => navigate({ to: "/ordens", search: { status: "pendente", period } })}
          />
          <MetricCard
            title="Em andamento"
            value={metrics.inProgress}
            subtitle="Serviços ativos e deslocamentos."
            icon={Activity}
            footerLabel="Acompanhar campo"
            accent="orange"
            badge={metrics.inProgress ? "Ao vivo" : undefined}
            onClick={() => navigate({ to: "/ordens", search: { status: "andamento", period } })}
          />
          <MetricCard
            title="Clientes ativos"
            value={metrics.activeClients}
            subtitle="Unidades com OS aberta no período."
            icon={Building2}
            footerLabel="Ver carteira"
            accent="blue"
            onClick={() => navigate({ to: "/clientes" })}
          />
          <MetricCard
            title="Técnicos em campo"
            value={metrics.techniciansInField}
            subtitle="Equipes em execução ou deslocamento."
            icon={HardHat}
            footerLabel="Ver equipe"
            accent="orange"
            onClick={() => navigate({ to: "/colaboradores" })}
          />
          <MetricCard
            title="Alertas"
            value={metrics.alerts}
            subtitle="Urgências, atrasos e risco operacional."
            icon={AlertTriangle}
            footerLabel="Tratar alertas"
            accent="red"
            emphasis={metrics.alerts > 0}
            onClick={() => navigate({ to: "/ordens", search: { filtro: "alertas", period } })}
          />
          <MetricCard
            title="Prioridades"
            value={metrics.incomplete}
            subtitle="OS sem dados obrigatórios ou sem fechamento."
            icon={ShieldCheck}
            footerLabel="Revisar agora"
            accent="amber"
            onClick={() => navigate({ to: "/ordens", search: { filtro: "incompletas", period } })}
          />
          <MetricCard
            title="Serviços concluídos"
            value={metrics.done}
            subtitle="OS finalizadas ou aprovadas no período."
            icon={CheckCircle2}
            footerLabel="Ver concluídas"
            accent="green"
            onClick={() => navigate({ to: "/ordens", search: { status: "concluida", period } })}
          />
        </div>
      )}

      {recent.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="section-title flex items-center gap-2">
              <RouteIcon size={14} />
              Ordens recentes
            </h2>
            <Link to="/ordens" className="text-xs font-bold text-primary">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {recent.map((order) => (
              <ServiceOrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
