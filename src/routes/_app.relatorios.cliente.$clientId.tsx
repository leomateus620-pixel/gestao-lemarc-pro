import { Suspense, useMemo } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Receipt,
  RefreshCcw,
  Timer,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { reportSearchSchema, searchToFilters } from "@/lib/reports/filters";
import { useClientReportQuery } from "@/hooks/useReports";
import { computeOverview, groupByTechnician, groupByUnit } from "@/lib/reports/metrics";
import {
  formatCurrency,
  formatHours,
  formatHoursDecimal,
  formatNumber,
  formatPercent,
} from "@/lib/reports/formatters";
import { ReportsKpiGrid, ReportsKpiSkeleton, type Kpi } from "@/components/reports/ReportsKpiGrid";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { HorizontalBarList, ReportChartCard } from "@/components/reports/ReportCharts";
import {
  ReportOrdersMobileList,
  ReportOrdersTable,
} from "@/components/reports/ReportOrdersTable";
import { ReportExportActions } from "@/components/reports/ReportExportActions";

export const Route = createFileRoute("/_app/relatorios/cliente/$clientId")({
  head: () => ({ meta: [{ title: "Relatório por cliente — Gestão Lemarc" }] }),
  validateSearch: zodValidator(reportSearchSchema),
  component: ClientReportPage,
  errorComponent: ({ error }) => <ErrorView error={error} />,
  notFoundComponent: () => (
    <AppShell title="Relatório por cliente" back>
      <EmptyState
        icon={Receipt}
        title="Cliente não encontrado"
        text="O cliente solicitado não existe ou foi removido."
        action={
          <Link to="/relatorios">
            <Button variant="secondary" className="gap-2">
              <ArrowLeft size={15} /> Voltar
            </Button>
          </Link>
        }
      />
    </AppShell>
  ),
});

function ErrorView({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <AppShell title="Relatório por cliente" back>
      <EmptyState
        icon={AlertTriangle}
        title="Falha ao carregar"
        text={error.message}
        action={
          <Button onClick={() => router.invalidate()} className="gap-2">
            <RefreshCcw size={15} /> Tentar novamente
          </Button>
        }
      />
    </AppShell>
  );
}

function ClientReportPage() {
  return (
    <AppShell title="Relatório por cliente" back>
      <Suspense
        fallback={
          <div className="mt-4 space-y-4">
            <ReportsKpiSkeleton />
          </div>
        }
      >
        <Content />
      </Suspense>
    </AppShell>
  );
}

function Content() {
  const { clientId } = Route.useParams();
  const search = Route.useSearch();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data } = useClientReportQuery(clientId, filters);
  const { client, orders } = data;

  const overview = useMemo(() => computeOverview(orders), [orders]);
  const byUnit = useMemo(() => groupByUnit(orders), [orders]);
  const byTech = useMemo(() => groupByTechnician(orders), [orders]);

  const kpis: Kpi[] = [
    {
      label: "OS no período",
      value: formatNumber(overview.totalOrders),
      hint: `${overview.finishedOrders} concluídas`,
      icon: Wrench,
      tone: "primary",
    },
    {
      label: "Horas trabalhadas",
      value: `${formatHoursDecimal(overview.totalHours * 60)}h`,
      icon: Clock,
    },
    {
      label: "Valor estimado",
      value: formatCurrency(overview.estimatedValue),
      icon: DollarSign,
      tone: "success",
    },
    {
      label: "Aguardando cobrança",
      value: formatNumber(overview.pendingBilling),
      icon: Receipt,
      tone: "warning",
      alert: overview.pendingBilling > 0,
    },
    {
      label: "Tempo médio",
      value: overview.avgLeadTimeMinutes !== null ? formatHours(overview.avgLeadTimeMinutes) : "—",
      icon: Timer,
    },
    {
      label: "Taxa de conclusão",
      value: formatPercent(overview.completionRate),
      icon: CheckCircle2,
      tone: "success",
    },
  ];

  const kpiTextForPrint = kpis.map((k) => ({ label: k.label, value: k.value }));

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            Cliente
          </p>
          <h1 className="mt-1 font-display text-xl font-black leading-tight text-foreground sm:text-2xl">
            {client?.name ?? "Cliente"}
          </h1>
          {client?.unit && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 size={12} /> {client.unit}
            </p>
          )}
        </div>
        <Link to="/relatorios">
          <Button variant="secondary" className="gap-2 bg-secondary/60">
            <ArrowLeft size={15} /> Voltar para relatórios
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReportsFilters
          filters={filters}
          routePath="/_app/relatorios/cliente/$clientId"
          hideClient
        />
        <ReportExportActions
          rows={orders}
          title={`Relatório — ${client?.name ?? "Cliente"}`}
          subtitle={`Período: ${filters.period} · ${orders.length} OS`}
          kpis={kpiTextForPrint}
          filenamePrefix={`lemarc-${(client?.name ?? "cliente").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        />
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sem OS para este cliente no período"
          text="Ajuste o período ou limpe os filtros para visualizar dados."
        />
      ) : (
        <>
          <ReportsKpiGrid kpis={kpis} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ReportChartCard title="Por unidade" subtitle="OS abertas">
              <HorizontalBarList data={byUnit} />
            </ReportChartCard>
            <ReportChartCard title="Por técnico" subtitle="OS abertas">
              <HorizontalBarList data={byTech} />
            </ReportChartCard>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-foreground">
              Ordens de serviço
              <span className="ml-2 text-[11px] font-bold text-muted-foreground">
                {orders.length} registros
              </span>
            </h2>
            <div className="hidden lg:block">
              <ReportOrdersTable rows={orders} />
            </div>
            <div className="lg:hidden">
              <ReportOrdersMobileList rows={orders} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}