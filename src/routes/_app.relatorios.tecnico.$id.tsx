import { Suspense, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft, User } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { RequireAdmin } from "@/lib/auth/requireAdmin";
import { getPeriodLabel, reportSearchSchema, searchToFilters } from "@/lib/reports/filters";
import { useTechnicianReportQuery } from "@/hooks/useReports";
import { TechnicianReportSection } from "@/components/reports/TechnicianReportSection";

export const Route = createFileRoute("/_app/relatorios/tecnico/$id")({
  head: () => ({
    meta: [
      { title: "Desempenho do técnico — Gestão Lemarc" },
      {
        name: "description",
        content: "Ordens de serviço, horas e valores de um técnico no período filtrado.",
      },
      { property: "og:title", content: "Desempenho do técnico — Gestão Lemarc" },
      {
        property: "og:description",
        content: "Ordens de serviço, horas e valores de um técnico no período filtrado.",
      },
    ],
  }),
  validateSearch: zodValidator(reportSearchSchema),
  component: () => (
    <RequireAdmin>
      <TechnicianReportPage />
    </RequireAdmin>
  ),
});

function TechnicianReportPage() {
  const search = Route.useSearch();

  return (
    <AppShell title="Desempenho do técnico">
      <main className="lemarc-report-page space-y-4 pt-2 sm:space-y-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-2 -ml-2 text-slate-300">
            <Link to="/relatorios" search={search}>
              <ArrowLeft size={15} aria-hidden="true" />
              Voltar aos relatórios
            </Link>
          </Button>
        </div>
        <Suspense
          fallback={
            <div
              className="lemarc-report-card h-64 animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
          }
        >
          <TechnicianReportContent />
        </Suspense>
      </main>
    </AppShell>
  );
}

function TechnicianReportContent() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data: report } = useTechnicianReportQuery(id, filters);

  const name = report.technician?.full_name ?? "Técnico selecionado";

  return (
    <>
      <header className="lemarc-report-hero">
        <div className="min-w-0 max-w-3xl">
          <p className="lemarc-report-section-kicker text-primary">Desempenho do técnico</p>
          <h1 className="lemarc-report-page-title mt-1.5 flex items-center gap-2.5 text-white">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <User size={18} aria-hidden="true" />
            </span>
            <span className="truncate">{name}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-200/86 sm:text-sm">
            Período analisado: {getPeriodLabel(filters.period)}. Todas as OS em que ele lançou
            horas, com o valor dele em cada uma.
          </p>
        </div>
      </header>

      <TechnicianReportSection report={report} />
    </>
  );
}
