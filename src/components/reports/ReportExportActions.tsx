import { FileSpreadsheet, Printer } from "lucide-react";
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
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
      <Button
        variant="secondary"
        className="lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto"
        disabled={!rows.length}
        onClick={() => downloadCsv(`${filenamePrefix}-${ts}.csv`, ordersToCsv(rows))}
      >
        <FileSpreadsheet size={16} />
        Exportar CSV
      </Button>
      <Button
        className="lemarc-report-action-primary h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto"
        disabled={!rows.length}
        onClick={() => printReport({ title, subtitle, kpis, rows })}
      >
        <Printer size={16} />
        Imprimir / PDF
      </Button>
    </div>
  );
}
