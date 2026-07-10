import { useEffect, useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ReportSeries } from "@/types/reports";
import {
  formatCompactNumber,
  formatCurrency,
  formatHours,
  formatHoursDecimal,
} from "@/lib/reports/formatters";
import { HorizontalBarList, ReportChartCard, TrendArea, VerticalBars } from "./ReportCharts";
import { cn } from "@/lib/utils";

export function ReportBreakdowns({ series }: { series: ReportSeries }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section aria-labelledby="report-breakdown-title" className="space-y-3">
        <div className="lemarc-report-section-heading">
          <div className="min-w-0">
            <p className="lemarc-report-section-kicker">Análise operacional</p>
            <h2 id="report-breakdown-title" className="lemarc-report-section-title">
              Detalhamentos por período
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
              Horas, valores, clientes, técnicos, prioridades e tipos de serviço.
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              className="lemarc-report-action h-11 w-full shrink-0 gap-2 rounded-xl px-4 font-black sm:w-auto"
              aria-expanded={open}
              aria-controls="report-breakdown-content"
            >
              <BarChart3 size={15} aria-hidden="true" />
              {open ? "Ocultar análises" : "Ver análises"}
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={cn("transition-transform duration-200", open && "rotate-180")}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent
          id="report-breakdown-content"
          className="lemarc-report-collapsible-content"
        >
          {open && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ReportChartCard title="Horas trabalhadas" subtitle="Evolução por mês de abertura">
                <TrendArea
                  data={series.trend}
                  metric="hours"
                  formatter={(value) => `${formatHoursDecimal(value * 60)}h`}
                  axisFormatter={(value) => `${formatCompactNumber(value)}h`}
                />
              </ReportChartCard>
              <ReportChartCard title="Valor estimado" subtitle="Evolução por mês de abertura">
                <TrendArea
                  data={series.trend}
                  metric="value"
                  formatter={(value) => formatCurrency(value)}
                  axisFormatter={(value) => `R$ ${formatCompactNumber(value)}`}
                />
              </ReportChartCard>
              <ReportChartCard
                title="Horas por técnico"
                subtitle="Top 8 · cada OS considera todos os técnicos vinculados"
              >
                <HorizontalBarList
                  data={series.byTechnicianHours}
                  valueFormatter={(value) => `${formatHoursDecimal(value * 60)}h`}
                  emptyLabel="Nenhuma hora foi registrada nas ordens do período."
                />
              </ReportChartCard>
              <ReportChartCard title="OS por cliente" subtitle="Top 8 por volume">
                <HorizontalBarList data={series.byClient} />
              </ReportChartCard>
              <ReportChartCard
                title="Valor estimado por cliente"
                subtitle="Top 8 com precificação disponível"
              >
                <HorizontalBarList
                  data={series.byClientValue}
                  valueFormatter={(value) => formatCurrency(value)}
                  emptyLabel="Nenhuma ordem do período possui horas e valor/hora suficientes para estimativa."
                />
              </ReportChartCard>
              <ReportChartCard title="Tipos de serviço" subtitle="Recorrência no período">
                <VerticalBars data={series.byServiceType} />
              </ReportChartCard>
              <ReportChartCard title="OS por prioridade" subtitle="Distribuição operacional">
                <HorizontalBarList data={series.byPriority} />
              </ReportChartCard>
              <ReportChartCard
                title="Tempo médio por técnico"
                subtitle="Da abertura ao fechamento · menor tempo indica maior agilidade"
              >
                <HorizontalBarList
                  data={series.avgLeadByTechnician}
                  valueFormatter={(value) => formatHours(value)}
                  emptyLabel="Não há fechamentos suficientes para calcular o tempo médio."
                />
              </ReportChartCard>
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
