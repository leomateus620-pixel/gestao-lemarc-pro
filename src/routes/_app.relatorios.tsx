import { Suspense, useMemo } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  PercentCircle,
  Receipt,
  RefreshCcw,
  Timer,
  TrendingUp,
  Wrench,
  PlayCircle,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { reportSearchSchema, searchToFilters } from "@/lib/reports/filters";
import { useReportOrdersQuery } from "@/hooks/useReports";
import { computeOverview, computeSeries } from "@/lib/reports/metrics";
import {
  formatCurrency,
  formatHours,
  formatHoursDecimal,
  formatNumber,
  formatPercent,
} from "@/lib/reports/formatters";
import { ReportsKpiGrid, ReportsKpiSkeleton, type Kpi } from "@/components/reports/ReportsKpiGrid";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import {
  HorizontalBarList,
  ReportChartCard,
  StatusDonut,
  TrendArea,
  VerticalBars,
} from "@/components/reports/ReportCharts";
import {
  ReportOrdersMobileList,
  ReportOrdersTable,
} from "@/components/reports/ReportOrdersTable";
import { ReportExportActions } from "@/components/reports/ReportExportActions";
import { ClientReportDrawer } from "@/components/reports/ClientReportDrawer";
import { ReportGenerateDialog } from "@/components/reports/ReportGenerateDialog";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({
    meta: [{ title: "Relatórios — Gestão Lemarc" }],
  }),
  validateSearch: zodValidator(reportSearchSchema),
  component: RelatoriosPage,
  errorComponent: RelatoriosError,
});

function RelatoriosError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <AppShell title="Relatórios">
      <EmptyState
        icon={AlertTriangle}
        title="Não foi possível carregar os relatórios"
        text={error.message ?? "Falha inesperada ao buscar dados."}
        action={
          <Button onClick={() => router.invalidate()} className="gap-2">
            <RefreshCcw size={15} /> Tentar novamente
          </Button>
        }
      />
    </AppShell>
  );
}

function RelatoriosPage() {
  return (
    <AppShell title="Relatórios">
      <PageHeader />
      <Suspense fallback={<LoadingState />}>
        <RelatoriosContent />
      </Suspense>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          Relatórios operacionais
        </p>
        <h1 className="mt-1 font-display text-2xl font-black leading-tight text-foreground sm:text-3xl">
          Cobrança & produtividade
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
          Métricas reais de OS, horas, valor e cobrança — calculadas direto da base
          operacional, com filtros, exportação e visão por cliente.
        </p>
      </div>
      <Suspense fallback={null}>
        <div className="flex flex-wrap items-center gap-2">
          <ReportGenerateDialog />
          <ClientReportDrawer />
        </div>
      </Suspense>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-5 space-y-4">
      <ReportsKpiSkeleton />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-[260px] animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function RelatoriosContent() {
  const search = Route.useSearch();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data: rows } = useReportOrdersQuery(filters);

  const overview = useMemo(() => computeOverview(rows), [rows]);
  const series = useMemo(() => computeSeries(rows), [rows]);

  const kpis: Kpi[] = [
    {
      label: "OS no período",
      value: formatNumber(overview.totalOrders),
      hint: `${overview.finishedOrders} concluídas · ${overview.runningOrders} em execução`,
      icon: Wrench,
      tone: "primary",
    },
    {
      label: "Horas trabalhadas",
      value: `${formatHoursDecimal(overview.totalHours * 60)}h`,
      hint: "Soma de worked_minutes informado",
      icon: Clock,
    },
    {
      label: "Valor estimado",
      value: formatCurrency(overview.estimatedValue),
      hint: overview.ordersMissingRate
        ? `${overview.ordersMissingRate} OS sem valor/hora`
        : "Pré-cobrança baseada em hour_rate",
      icon: DollarSign,
      tone: "success",
      alert: overview.ordersMissingRate > 0,
    },
    {
      label: "Tempo médio",
      value: overview.avgLeadTimeMinutes !== null ? formatHours(overview.avgLeadTimeMinutes) : "—",
      hint: "Abertura até fechamento",
      icon: Timer,
    },
    {
      label: "Aguardando cobrança",
      value: formatNumber(overview.pendingBilling),
      hint: "OS prontas para conferência",
      icon: Receipt,
      tone: "warning",
      alert: overview.pendingBilling > 0,
    },
    {
      label: "Taxa de conclusão",
      value: formatPercent(overview.completionRate),
      hint: `${overview.finishedOrders} de ${overview.totalOrders} OS`,
      icon: PercentCircle,
      tone: "success",
    },
    {
      label: "Ticket médio",
      value: overview.avgTicket > 0 ? formatCurrency(overview.avgTicket) : "—",
      hint: "Valor médio por OS concluída",
      icon: TrendingUp,
    },
    {
      label: "Em execução",
      value: formatNumber(overview.runningOrders),
      hint: "OS abertas no campo agora",
      icon: PlayCircle,
      tone: "primary",
    },
  ];

  const kpiTextForPrint = kpis.slice(0, 4).map((k) => ({ label: k.label, value: k.value }));

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReportsFilters filters={filters} routePath="/_app/relatorios" />
        <ReportExportActions
          rows={rows}
          title="Relatório operacional Lemarc"
          subtitle={`Período: ${filters.period} · ${rows.length} OS`}
          kpis={kpiTextForPrint}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sem OS no período"
          text="Ajuste o período ou limpe os filtros para visualizar dados operacionais."
        />
      ) : (
        <>
          <ReportsKpiGrid kpis={kpis} />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ReportChartCard
              title="Evolução mensal"
              subtitle="OS abertas por mês"
              className="lg:col-span-2"
            >
              <TrendArea data={series.trend} metric="orders" />
            </ReportChartCard>
            <ReportChartCard title="OS por status" subtitle="Distribuição operacional">
              <StatusDonut data={series.byStatus} />
            </ReportChartCard>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ReportChartCard title="Horas por técnico" subtitle="Top 8 colaboradores">
              <HorizontalBarList
                data={series.byTechnicianHours}
                valueFormatter={(v) => `${formatHoursDecimal(v * 60)}h`}
              />
            </ReportChartCard>
            <ReportChartCard title="OS por cliente" subtitle="Top 8">
              <HorizontalBarList data={series.byClient} />
            </ReportChartCard>
            <ReportChartCard title="Valor estimado por cliente" subtitle="Pré-cobrança · top 8">
              <HorizontalBarList
                data={series.byClientValue}
                valueFormatter={(v) => formatCurrency(v)}
                emptyLabel="Configure hour_rate nas OS para ver valores."
              />
            </ReportChartCard>
            <ReportChartCard title="Tipos de serviço" subtitle="Recorrência">
              <VerticalBars data={series.byServiceType} />
            </ReportChartCard>
            <ReportChartCard title="OS por prioridade">
              <HorizontalBarList data={series.byPriority} />
            </ReportChartCard>
            <ReportChartCard
              title="Tempo médio por técnico"
              subtitle="Abertura → fechamento (menor é melhor)"
            >
              <HorizontalBarList
                data={series.avgLeadByTechnician}
                valueFormatter={(v) => formatHours(v)}
              />
            </ReportChartCard>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-foreground">
              <CheckCircle2 className="mr-1.5 inline-block text-primary" size={14} />
              Ordens de serviço no período
              <span className="ml-2 text-[11px] font-bold text-muted-foreground">
                {rows.length} registros
              </span>
            </h2>
            <div className="hidden lg:block">
              <ReportOrdersTable rows={rows} />
            </div>
            <div className="lg:hidden">
              <ReportOrdersMobileList rows={rows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
