import { Suspense, useMemo } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  PercentCircle,
  PlayCircle,
  Receipt,
  RefreshCcw,
  Timer,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { RequireAdmin } from "@/lib/auth/requireAdmin";
import {
  countActiveFilters,
  getPeriodLabel,
  reportSearchSchema,
  searchToFilters,
} from "@/lib/reports/filters";
import { useReportOrdersQuery } from "@/hooks/useReports";
import { computeDataQuality, computeOverview, computeSeries } from "@/lib/reports/metrics";
import { getReportEmptyState } from "@/lib/reports/presentation";
import {
  DATA_UNAVAILABLE_LABEL,
  formatCurrency,
  formatHours,
  formatHoursDecimal,
  formatNumber,
  formatPercent,
} from "@/lib/reports/formatters";
import { ReportsKpiGrid, ReportsKpiSkeleton, type Kpi } from "@/components/reports/ReportsKpiGrid";
import { ReportsFilters } from "@/components/reports/ReportsFilters";
import { ReportChartCard, StatusDonut, TrendComparison } from "@/components/reports/ReportCharts";
import { ReportBreakdowns } from "@/components/reports/ReportBreakdowns";
import { ReportDataQuality } from "@/components/reports/ReportDataQuality";
import { ReportOrdersMobileList, ReportOrdersTable } from "@/components/reports/ReportOrdersTable";
import { ReportExportActions } from "@/components/reports/ReportExportActions";
import { ClientReportDrawer } from "@/components/reports/ClientReportDrawer";
import { ReportGenerateDialog } from "@/components/reports/ReportGenerateDialog";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({
    meta: [{ title: "Relatórios — Gestão Lemarc" }],
  }),
  validateSearch: zodValidator(reportSearchSchema),
  component: () => (
    <RequireAdmin>
      <RelatoriosPage />
    </RequireAdmin>
  ),
  errorComponent: RelatoriosError,
});

function RelatoriosError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <AppShell title="Relatórios">
      <div className="lemarc-report-page pt-2">
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os relatórios"
          text={
            error.message || "A consulta falhou. Tente novamente sem alterar os filtros atuais."
          }
          action={
            <Button onClick={() => router.invalidate()} className="gap-2">
              <RefreshCcw size={15} aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    </AppShell>
  );
}

function RelatoriosPage() {
  return (
    <AppShell title="Relatórios">
      <main className="lemarc-report-page space-y-4 pt-2 sm:space-y-5">
        <PageHeader />
        <Suspense fallback={<LoadingState />}>
          <RelatoriosContent />
        </Suspense>
      </main>
    </AppShell>
  );
}

function PageHeader() {
  return (
    <header className="lemarc-report-hero">
      <div className="min-w-0 max-w-3xl">
        <p className="lemarc-report-section-kicker text-primary">Relatórios operacionais</p>
        <h1 className="lemarc-report-page-title mt-1.5 text-white">Cobrança e produtividade</h1>
        <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-200/86 sm:text-sm">
          Acompanhe ordens, horas, valores e pendências com dados da operação e filtros por período.
        </p>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando dados do relatório</span>
      <div
        className="lemarc-report-card h-36 animate-pulse motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2" aria-hidden="true">
        <div className="lemarc-report-card h-12 animate-pulse motion-reduce:animate-none" />
        <div className="lemarc-report-card h-12 animate-pulse motion-reduce:animate-none" />
      </div>
      <ReportsKpiSkeleton />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-hidden="true">
        <div className="lemarc-report-card h-[300px] animate-pulse motion-reduce:animate-none lg:col-span-2" />
        <div className="lemarc-report-card h-[300px] animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function RelatoriosContent() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data: rows } = useReportOrdersQuery(filters);

  const overview = useMemo(() => computeOverview(rows), [rows]);
  const series = useMemo(() => computeSeries(rows), [rows]);
  const quality = useMemo(() => computeDataQuality(rows), [rows]);
  const activeFilters = countActiveFilters(filters);
  const emptyState = getReportEmptyState(activeFilters);
  const hasReportedMinutes = rows.some((row) => (row.worked_minutes ?? 0) > 0);
  const hasDerivedMinutes = quality.derivedWorkedMinutes > 0;
  const hasEstimatedValues = rows.some((row) => row.estimated_value > 0);

  const hoursHint = hasReportedMinutes
    ? hasDerivedMinutes
      ? "Total registrado nas OS; alguns tempos foram calculados entre início e conclusão."
      : "Total de horas registradas nas ordens de serviço."
    : hasDerivedMinutes
      ? "Calculado entre o início e a conclusão quando não houve lançamento manual."
      : "Nenhuma hora foi registrada nas ordens do período.";

  const kpis: Kpi[] = [
    {
      label: "OS no período",
      value: formatNumber(overview.totalOrders),
      hint: `${formatNumber(overview.finishedOrders)} concluídas · ${formatNumber(overview.runningOrders)} em campo`,
      icon: Wrench,
      tone: "primary",
      featured: true,
      wideOnMobile: true,
    },
    {
      label: "Horas trabalhadas",
      value:
        hasReportedMinutes || hasDerivedMinutes
          ? `${formatHoursDecimal(overview.totalHours * 60)}h`
          : DATA_UNAVAILABLE_LABEL,
      hint: hoursHint,
      icon: Clock,
      unavailable: !hasReportedMinutes && !hasDerivedMinutes,
      wideOnMobile: true,
    },
    {
      label: "Valor estimado",
      value: hasEstimatedValues ? formatCurrency(overview.estimatedValue) : DATA_UNAVAILABLE_LABEL,
      hint:
        overview.ordersMissingRate > 0
          ? `${overview.ordersMissingRate} OS com horas, mas sem valor/hora cadastrado.`
          : hasEstimatedValues
            ? "Estimativa calculada com as horas e o valor/hora cadastrados."
            : "Não há horas e valor/hora suficientes para estimar o período.",
      icon: DollarSign,
      tone: "success",
      alert: overview.ordersMissingRate > 0 || (!hasEstimatedValues && rows.length > 0),
      unavailable: !hasEstimatedValues,
      wideOnMobile: true,
    },
    {
      label: "Tempo médio de conclusão",
      value:
        overview.avgLeadTimeMinutes !== null
          ? formatHours(overview.avgLeadTimeMinutes)
          : DATA_UNAVAILABLE_LABEL,
      hint:
        overview.avgLeadTimeMinutes !== null
          ? "Da abertura ao fechamento das ordens concluídas."
          : "Não há OS fechada suficiente para este cálculo.",
      icon: Timer,
      unavailable: overview.avgLeadTimeMinutes === null,
      wideOnMobile: true,
    },
    {
      label: "Aguardando cobrança",
      value: formatNumber(overview.pendingBilling),
      hint: "Ordens prontas para conferência financeira.",
      icon: Receipt,
      tone: "warning",
      alert: overview.pendingBilling > 0,
    },
    {
      label: "Taxa de conclusão",
      value: formatPercent(overview.completionRate),
      hint: `${formatNumber(overview.finishedOrders)} de ${formatNumber(overview.totalOrders)} ordens concluídas.`,
      icon: PercentCircle,
      tone: "success",
    },
    {
      label: "Ticket médio estimado",
      value: overview.avgTicket > 0 ? formatCurrency(overview.avgTicket) : DATA_UNAVAILABLE_LABEL,
      hint:
        overview.avgTicket > 0
          ? "Valor estimado médio por OS concluída."
          : "Não há OS concluída com valor estimado.",
      icon: TrendingUp,
      unavailable: overview.avgTicket <= 0,
    },
    {
      label: "OS em campo",
      value: formatNumber(overview.runningOrders),
      hint: "Ordens despachadas, em trânsito ou em execução.",
      icon: PlayCircle,
      tone: "primary",
    },
  ];

  const kpiTextForPrint = kpis.slice(0, 4).map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
  }));

  const showPendingBilling = () =>
    navigate({
      to: "/relatorios",
      search: ((previous: Record<string, unknown>) => ({
        ...previous,
        onlyAwaitingBilling: true,
      })) as never,
      replace: true,
    });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="lemarc-report-card p-4 sm:p-5">
        <ReportsFilters filters={filters} routePath="/relatorios" />
      </div>

      <section aria-labelledby="report-actions-title" className="lemarc-report-command-panel">
        <div className="min-w-0">
          <p className="lemarc-report-section-kicker">Ações principais</p>
          <h2 id="report-actions-title" className="text-sm font-black text-white">
            Gere o documento adequado à análise
          </h2>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300/82">
            O relatório gerencial é a ação principal; a visão por cliente permanece como
            alternativa.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[390px]:grid-cols-2 lg:w-auto">
          <ReportGenerateDialog />
          <ClientReportDrawer />
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title={emptyState.title} text={emptyState.description} />
      ) : (
        <>
          <ReportsKpiGrid kpis={kpis} />

          <section aria-labelledby="report-comparison-title" className="space-y-3">
            <div className="lemarc-report-section-heading">
              <div className="min-w-0">
                <p className="lemarc-report-section-kicker">Comparativo</p>
                <h2 id="report-comparison-title" className="lemarc-report-section-title">
                  Volume e situação das ordens
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                {formatNumber(rows.length)} registro{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ReportChartCard
                title="Abertas e concluídas"
                subtitle="Agrupadas pelo mês de abertura dentro do período filtrado"
                className="lg:col-span-2"
              >
                <TrendComparison data={series.trend} />
              </ReportChartCard>
              <ReportChartCard title="OS por status" subtitle="Distribuição operacional atual">
                <StatusDonut data={series.byStatus} />
              </ReportChartCard>
            </div>
          </section>

          <ReportBreakdowns series={series} />

          <section id="report-orders" aria-labelledby="report-orders-title" className="space-y-3">
            <div className="lemarc-report-section-heading">
              <div className="min-w-0">
                <p className="lemarc-report-section-kicker">Registros operacionais</p>
                <h2 id="report-orders-title" className="lemarc-report-section-title">
                  Ordens de serviço no período
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <CheckCircle2 size={14} className="text-primary" aria-hidden="true" />
                {formatNumber(rows.length)} registro{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="hidden lg:block">
              <ReportOrdersTable rows={rows} />
            </div>
            <div className="lg:hidden">
              <ReportOrdersMobileList rows={rows} />
            </div>
          </section>

          <ReportDataQuality quality={quality} onShowPendingBilling={showPendingBilling} />

          <section aria-labelledby="report-export-title" className="lemarc-report-export-panel">
            <div className="min-w-0">
              <p className="lemarc-report-section-kicker">Exportação</p>
              <h2 id="report-export-title" className="text-sm font-black text-white">
                Leve os resultados para conferência
              </h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300/82">
                As exportações respeitam o período e os filtros visíveis acima.
              </p>
            </div>
            <ReportExportActions
              rows={rows}
              title="Relatório operacional Lemarc"
              subtitle={`Período: ${getPeriodLabel(filters.period)} · ${formatNumber(rows.length)} OS`}
              kpis={kpiTextForPrint}
            />
          </section>
        </>
      )}
    </div>
  );
}
