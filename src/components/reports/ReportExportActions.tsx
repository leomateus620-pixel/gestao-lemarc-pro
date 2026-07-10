import { FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ReportOrderRow } from "@/types/reports";
import { downloadCsv, ordersToCsv, printReport } from "@/lib/reports/export";

export function ReportExportActions({
  rows,
  title,
  subtitle,
  kpis,
  filenamePrefix = "lemarc-relatorio",
}: {
  rows: ReportOrderRow[];
  title: string;
  subtitle?: string;
  kpis: { label: string; value: string }[];
  filenamePrefix?: string;
}) {
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const handleCsv = () => {
    try {
      downloadCsv(`${filenamePrefix}-${ts}.csv`, ordersToCsv(rows));
    } catch {
      toast.error("Não foi possível exportar o arquivo CSV.");
    }
  };

  const handlePrint = () => {
    try {
      const opened = printReport({ title, subtitle, kpis, rows });
      if (!opened) toast.error("Permita a abertura de janelas para imprimir o relatório.");
    } catch {
      toast.error("Não foi possível preparar a impressão do relatório.");
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      <Button
        variant="secondary"
        className="lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto"
        disabled={!rows.length}
        onClick={handleCsv}
      >
        <FileSpreadsheet size={16} />
        Exportar CSV
      </Button>
      <Button
        variant="secondary"
        className="lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto"
        disabled={!rows.length}
        onClick={handlePrint}
      >
        <Printer size={16} />
        Imprimir / PDF
      </Button>
    </div>
  );
}
