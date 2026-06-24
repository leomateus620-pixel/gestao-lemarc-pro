import type { ReportOrderRow } from "@/types/reports";
import {
  billingStatusLabel,
} from "@/types/reports";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
} from "@/types/serviceOrder";
import { formatCurrency, formatDateTime, formatHours } from "./formatters";

const CSV_HEADERS = [
  "Numero",
  "Titulo",
  "Cliente",
  "Unidade",
  "Tecnico",
  "Status",
  "Prioridade",
  "Tipo",
  "Abertura",
  "Fechamento",
  "Tempo",
  "Valor estimado (R$)",
  "Cobranca",
  "Faturada em",
  "Referencia",
];

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[;"\n\r]/.test(str) ? `"${str}"` : str;
}

export function ordersToCsv(rows: ReportOrderRow[]): string {
  const lines = [CSV_HEADERS.map(csvCell).join(";")];
  for (const r of rows) {
    const type = r.service_type
      ? r.service_type === "outro" && r.service_type_other
        ? r.service_type_other
        : serviceTypeLabel[r.service_type]
      : "—";
    lines.push(
      [
        r.number,
        r.title,
        r.client_name ?? "Sem cliente",
        r.client_unit_name ?? "Sem unidade",
        r.technician_name ?? "Sem técnico",
        statusLabel[r.status],
        r.priority ? priorityLabel[r.priority] : "—",
        type,
        formatDateTime(r.opened_at),
        formatDateTime(r.closed_at),
        formatHours(r.worked_minutes),
        (Math.round(r.estimated_value * 100) / 100).toString().replace(".", ","),
        billingStatusLabel[r.billing_status],
        formatDateTime(r.billed_at),
        r.invoice_reference ?? "",
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type PrintPayload = {
  title: string;
  subtitle?: string;
  kpis: { label: string; value: string }[];
  rows: ReportOrderRow[];
};

export function printReport({ title, subtitle, kpis, rows }: PrintPayload) {
  const win = window.open("", "_blank", "width=1000,height=720");
  if (!win) return;
  const css = `
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
    .sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .kpi { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }
    .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 700; }
    .kpi .v { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #475569; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .brand { color: #ea580c; font-weight: 900; letter-spacing: .12em; font-size: 10px; text-transform: uppercase; }
    @media print { body { padding: 0; } }
  `;
  const kpiHtml = kpis
    .map(
      (k) =>
        `<div class="kpi"><div class="l">${escapeHtml(k.label)}</div><div class="v">${escapeHtml(k.value)}</div></div>`,
    )
    .join("");
  const rowsHtml = rows
    .map((r) => {
      const type = r.service_type
        ? r.service_type === "outro" && r.service_type_other
          ? r.service_type_other
          : serviceTypeLabel[r.service_type]
        : "—";
      return `<tr>
        <td>#${r.number}</td>
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(r.client_name ?? "—")}</td>
        <td>${escapeHtml(r.client_unit_name ?? "—")}</td>
        <td>${escapeHtml(r.technician_name ?? "—")}</td>
        <td>${statusLabel[r.status]}</td>
        <td>${escapeHtml(type)}</td>
        <td>${formatDateTime(r.opened_at)}</td>
        <td>${formatDateTime(r.closed_at)}</td>
        <td class="num">${formatHours(r.worked_minutes)}</td>
        <td class="num">${formatCurrency(r.estimated_value)}</td>
        <td>${billingStatusLabel[r.billing_status]}</td>
      </tr>`;
    })
    .join("");
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>
    <div class="brand">Gestão Lemarc · Relatório</div>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ""}
    <div class="kpis">${kpiHtml}</div>
    <table>
      <thead><tr>
        <th>OS</th><th>Título</th><th>Cliente</th><th>Unidade</th><th>Técnico</th>
        <th>Status</th><th>Tipo</th><th>Abertura</th><th>Fechamento</th>
        <th class="num">Tempo</th><th class="num">Valor</th><th>Cobrança</th>
      </tr></thead>
      <tbody>${rowsHtml || `<tr><td colspan="12" style="text-align:center;padding:24px;color:#64748b">Sem registros no período.</td></tr>`}</tbody>
    </table>
    <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200));</script>
  </body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}