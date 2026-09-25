import { Link } from "@tanstack/react-router";
import { Clock, DollarSign, User, Wrench } from "lucide-react";
import type { TechnicianReport } from "@/lib/api/reports.functions";
import { formatCurrency, formatHoursDecimal, formatNumber } from "@/lib/reports/formatters";
import { statusLabel } from "@/types/serviceOrder";

function formatWorkDate(row: { first_work_date: string; last_work_date: string }): string {
  const format = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  if (row.first_work_date === row.last_work_date) return format(row.first_work_date);
  return `${format(row.first_work_date)} — ${format(row.last_work_date)}`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
}) {
  return (
    <div className="lemarc-report-card flex items-center gap-3 p-3.5 sm:p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-base font-black text-white sm:text-lg">{value}</p>
      </div>
    </div>
  );
}

export function TechnicianReportSection({ report }: { report: TechnicianReport }) {
  const name = report.technician?.full_name ?? "Técnico selecionado";

  return (
    <section aria-labelledby="technician-report-title" className="space-y-3">
      <div className="lemarc-report-section-heading">
        <div className="min-w-0">
          <p className="lemarc-report-section-kicker">Desempenho do técnico</p>
          <h2
            id="technician-report-title"
            className="lemarc-report-section-title flex items-center gap-2"
          >
            <User size={16} className="shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{name}</span>
          </h2>
        </div>
        <span className="text-[11px] font-bold text-slate-700">
          {formatNumber(report.total_orders)} OS no período
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <SummaryCard icon={Wrench} label="OS no período" value={formatNumber(report.total_orders)} />
        <SummaryCard
          icon={Clock}
          label="Horas no período"
          value={`${formatHoursDecimal(report.total_minutes)}h`}
        />
        <SummaryCard
          icon={DollarSign}
          label="Valor total no período"
          value={formatCurrency(report.total_value_cents / 100)}
        />
      </div>

      {report.rows.length === 0 ? (
        <div className="lemarc-report-card p-5 text-center text-sm font-semibold text-slate-300">
          Nenhuma hora lançada por este técnico no período selecionado.
        </div>
      ) : (
        <>
          <div className="lemarc-report-card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Nº da OS</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Horas dele</th>
                  <th className="px-4 py-3 text-right">Valor dele</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.order_id}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-black text-primary">
                      <Link
                        to="/ordens/$id"
                        params={{ id: row.order_id }}
                        className="hover:underline"
                      >
                        #{row.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-200">
                      {formatWorkDate(row)}
                    </td>
                    <td className="max-w-64 truncate px-4 py-3 font-semibold text-slate-200">
                      {row.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-300">
                      {statusLabel[row.status]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-white">
                      {formatHoursDecimal(row.minutes)}h
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black text-white">
                      {formatCurrency(row.value_cents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.04] text-sm font-black text-white">
                  <td className="px-4 py-3" colSpan={4}>
                    Total do período
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatHoursDecimal(report.total_minutes)}h
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatCurrency(report.total_value_cents / 100)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-2 lg:hidden">
            {report.rows.map((row) => (
              <Link
                key={row.order_id}
                to="/ordens/$id"
                params={{ id: row.order_id }}
                className="lemarc-report-card block p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-primary">OS #{row.number}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-white">{row.title}</p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {formatWorkDate(row)} · {statusLabel[row.status]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-white">
                      {formatCurrency(row.value_cents / 100)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-300">
                      {formatHoursDecimal(row.minutes)}h
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            <div className="lemarc-report-card flex items-center justify-between gap-3 border-primary/30 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                Total do período
              </p>
              <div className="text-right">
                <p className="text-sm font-black text-white">
                  {formatCurrency(report.total_value_cents / 100)}
                </p>
                <p className="text-[11px] font-bold text-slate-300">
                  {formatHoursDecimal(report.total_minutes)}h
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
