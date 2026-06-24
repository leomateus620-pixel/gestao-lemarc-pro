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
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        className="h-10 gap-2 bg-secondary/60"
        disabled={!rows.length}
        onClick={() => downloadCsv(`${filenamePrefix}-${ts}.csv`, ordersToCsv(rows))}
      >
        <FileSpreadsheet size={16} />
        Exportar CSV
      </Button>
      <Button
        className="h-10 gap-2 lemarc-orange-glow"
        disabled={!rows.length}
        onClick={() => printReport({ title, subtitle, kpis, rows })}
      >
        <Printer size={16} />
        Imprimir / PDF
      </Button>
    </div>
  );
}