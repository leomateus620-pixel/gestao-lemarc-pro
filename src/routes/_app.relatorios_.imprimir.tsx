import { Suspense, useMemo, type ReactNode } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { reportSearchSchema, searchToFilters } from "@/lib/reports/filters";
import { useReportOrdersQuery } from "@/hooks/useReports";
import { buildManagerialReport, describePeriod } from "@/lib/reports/managerial";
import { ManagerialReportDocument } from "@/components/reports/print/ManagerialReportDocument";
import { useAuth } from "@/components/app/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileDown, Printer, RefreshCcw } from "lucide-react";
import { downloadManagerialReportPdf } from "@/lib/reports/managerialDownload";

export const Route = createFileRoute("/_app/relatorios_/imprimir")({
  head: () => ({ meta: [{ title: "Relatório gerencial — Gestão Lemarc" }] }),
  validateSearch: zodValidator(reportSearchSchema),
  staticData: { hideBottomNav: true },
  component: PrintPage,
  errorComponent: PrintError,
  notFoundComponent: PrintNotFound,
});

function PrintError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <PrintMessage
      title="Não foi possível gerar o relatório"
      text={error.message || "Falha ao carregar os dados do relatório."}
      action={
        <Button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="gap-2"
        >
          <RefreshCcw size={15} /> Tentar novamente
        </Button>
      }
    />
  );
}

function PrintNotFound() {
  return (
    <PrintMessage
      title="Relatório não encontrado"
      text="Volte para relatórios e gere uma nova visualização."
      action={
        <Button asChild>
          <Link to="/relatorios">Voltar aos relatórios</Link>
        </Button>
      }
    />
  );
}

function PrintMessage({ title, text, action }: { title: string; text: string; action: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f7f2e9] p-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto size-8 text-orange-600" />
        <h1 className="mt-3 text-lg font-black text-slate-900">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">{text}</p>
        <div className="mt-5 flex justify-center">{action}</div>
      </div>
    </div>
  );
}

function PrintPage() {
  return (
    <div className="min-h-dvh bg-white p-3 sm:p-6 print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Pré-visualização do relatório gerencial. Baixe o arquivo ou use o botão para
          imprimir/salvar como PDF.
        </div>
        <Suspense
          fallback={<div className="text-xs font-semibold text-slate-500">Preparando ações…</div>}
        >
          <PrintActions />
        </Suspense>
      </div>
      <div className="mx-auto max-w-[900px] overflow-x-auto rounded border border-slate-200 bg-white p-4 shadow-sm print:max-w-none print:overflow-visible print:border-0 print:p-0 print:shadow-none">
        <Suspense fallback={<PrintLoading />}>
          <PrintBody />
        </Suspense>
      </div>
    </div>
  );
}

function PrintActions() {
  const search = Route.useSearch();
  const { displayName } = useAuth();
  const filters = useMemo(() => searchToFilters(search), [search]);
  const { data: rows } = useReportOrdersQuery(filters);
  const report = useMemo(() => buildManagerialReport(rows), [rows]);
  const generatedAt = useMemo(() => new Date(), []);
  const periodLabel = describePeriod(filters);
  const handleDownload = async () => {
    await downloadManagerialReportPdf({
      report,
      periodLabel,
      generatedAt,
      authorName: displayName ?? null,
    });
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="secondary" onClick={handleDownload} className="gap-2">
        <FileDown size={15} /> Baixar relatório
      </Button>
      <Button onClick={() => window.print()} className="gap-2">
        <Printer size={15} /> Imprimir / Salvar PDF
      </Button>
    </div>
  );
}

function PrintLoading() {
  return (
    <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-slate-500">
      Carregando dados do relatório…
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

  return (
    <ManagerialReportDocument
      report={report}
      periodLabel={periodLabel}
      generatedAt={generatedAt}
      authorName={displayName ?? null}
    />
  );
}
