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
import { ReportOrdersMobileList, ReportOrdersTable } from "@/components/reports/ReportOrdersTable";
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
      <div className="lemarc-report-page space-y-5">
        <PageHeader />
        <Suspense fallback={<LoadingState />}>
          <RelatoriosContent />
        </Suspense>
      </div>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <div className="lemarc-report-hero mt-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            Relatórios operacionais
          </p>
          <h1 className="mt-2 font-display text-3xl font-black leading-none text-white sm:text-4xl">
            Cobrança & produtividade
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-300/84">
            Métricas reais de OS, horas, valor e cobrança calculadas direto da base operacional, com
            filtros, exportação e visão por cliente.
          </p>
        </div>
        <Suspense fallback={null}>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:items-center">
            <ReportGenerateDialog />
            <ClientReportDrawer />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <ReportsKpiSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lemarc-report-card h-[268px] animate-pulse rounded-2xl" />
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
  const hasReportedMinutes = rows.some((r) => (r.worked_minutes ?? 0) > 0);
  const hasDerivedMinutes = rows.some((r) => r.worked_minutes_source === "derived");
  const hasAnyMinutes = hasReportedMinutes || hasDerivedMinutes;
  const hasEstimatedValues = rows.some((r) => r.estimated_value > 0);

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
      hint: hasReportedMinutes
        ? "Soma de worked_minutes informado nas OS."
        : hasDerivedMinutes
          ? "Derivado de start → finish (worked_minutes ausente)."
          : "Sem horas trabalhadas registradas no período.",
      icon: Clock,
    },
    {
      label: "Valor estimado",
      value: formatCurrency(overview.estimatedValue),
      hint: overview.ordersMissingRate
        ? `${overview.ordersMissingRate} OS sem valor/hora`
        : hasEstimatedValues
          ? "Pré-cobrança baseada em hour_rate"
          : "Configure hour_rate nas OS para ver valores",
      icon: DollarSign,
      tone: "success",
      alert: overview.ordersMissingRate > 0 || (!hasEstimatedValues && rows.length > 0),
    },
    {
      label: "Tempo médio",
      value: overview.avgLeadTimeMinutes !== null ? formatHours(overview.avgLeadTimeMinutes) : "—",
      hint:
        overview.avgLeadTimeMinutes !== null
          ? "Abertura até fechamento"
          : "Sem OS fechada no período",
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
      hint: overview.avgTicket > 0 ? "Valor médio por OS concluída" : "Sem OS concluída com valor",
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
    <div className="space-y-5">
      <div className="lemarc-report-card p-3 sm:p-3.5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ReportsFilters filters={filters} routePath="/_app/relatorios" />
          <ReportExportActions
            rows={rows}
            title="Relatório operacional Lemarc"
            subtitle={`Período: ${filters.period} · ${rows.length} OS`}
            kpis={kpiTextForPrint}
          />
        </div>
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
                emptyLabel="Sem horas informadas nas OS do período."
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
                emptyLabel="Sem fechamentos suficientes para calcular tempo médio."
              />
            </ReportChartCard>
          </div>

          <section className="space-y-3 pb-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-sm font-black uppercase tracking-[0.12em] text-slate-900">
                <CheckCircle2 className="mr-1.5 inline-block text-primary" size={15} />
                Ordens de serviço no período
              </h2>
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">
                {rows.length} registros
              </span>
            </div>
            <div className="hidden lg:block">
              <ReportOrdersTable rows={rows} />
            </div>
            <div className="lg:hidden">
              <ReportOrdersMobileList rows={rows} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
