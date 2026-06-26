import { Suspense, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { reportSearchSchema, searchToFilters } from "@/lib/reports/filters";
import { useReportOrdersQuery } from "@/hooks/useReports";
import { buildManagerialReport, describePeriod } from "@/lib/reports/managerial";
import { ManagerialReportDocument } from "@/components/reports/print/ManagerialReportDocument";
import { useAuth } from "@/components/app/AuthContext";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_app/relatorios_/imprimir")({
  head: () => ({ meta: [{ title: "Relatório gerencial — Gestão Lemarc" }] }),
  validateSearch: zodValidator(reportSearchSchema),
  staticData: { hideBottomNav: true },
  component: PrintPage,
});

function PrintPage() {
  return (
    <div className="min-h-dvh bg-white p-3 sm:p-6 print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Pré-visualização do relatório. Use o botão para imprimir ou salvar como PDF.
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer size={15} /> Imprimir / Salvar PDF
        </Button>
      </div>
      <div className="mx-auto max-w-[900px] rounded border border-slate-200 bg-white p-4 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando dados…</p>}>
          <PrintBody />
        </Suspense>
      </div>
    </div>
  );
}

function PrintBody() {
  const search = Route.useSearch();
  const { displayName } = useAuth();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data: rows } = useReportOrdersQuery(filters);
  const report = useMemo(() => buildManagerialReport(rows), [rows]);
  const generatedAt = useMemo(() => new Date(), []);
  const periodLabel = describePeriod(filters);

  useEffect(() => {
    const stamp = generatedAt.toISOString().slice(0, 10);
    document.title = `relatorio-gestao-lemarc-${stamp}.pdf`;
    const id = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        /* user cancelled */
      }
    }, 600);
    return () => window.clearTimeout(id);
  }, [generatedAt]);

  return (
    <ManagerialReportDocument
      report={report}
      periodLabel={periodLabel}
      generatedAt={generatedAt}
      authorName={displayName ?? null}
    />
  );
}