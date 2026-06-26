import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatHours,
  formatNumber,
  formatPercent,
} from "@/lib/reports/formatters";
import { getReportRowTechnicians } from "@/lib/serviceOrders/technicians";
import type { ManagerialReport, ReportOrderRow } from "@/types/reports";
import { priorityLabel, serviceTypeLabel, statusLabel } from "@/types/serviceOrder";

type ManagerialReportHtmlInput = {
  report: ManagerialReport;
  periodLabel: string;
  generatedAt: Date;
  authorName: string | null;
};

export function buildManagerialReportFilename(period: string, generatedAt = new Date()) {
  const day = generatedAt.toISOString().slice(0, 10);
  const safePeriod = period
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
  return `relatorio-gerencial-lemarc-${safePeriod || "periodo"}-${day}.html`;
}

export function downloadHtmlFile(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadManagerialReportPdf(input: ManagerialReportHtmlInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPageIfNeeded = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const text = (
    value: string,
    x: number,
    yy: number,
    options?: {
      maxWidth?: number;
      size?: number;
      style?: "normal" | "bold";
      color?: [number, number, number];
    },
  ) => {
    doc.setFont("helvetica", options?.style ?? "normal");
    doc.setFontSize(options?.size ?? 9);
    const [r, g, b] = options?.color ?? [15, 23, 42];
    doc.setTextColor(r, g, b);
    doc.text(cleanPdfText(value), x, yy, { maxWidth: options?.maxWidth });
  };

  const section = (title: string) => {
    addPageIfNeeded(12);
    y += y === margin ? 0 : 6;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    text(title.toUpperCase(), margin, y, { size: 9, style: "bold", color: [11, 37, 69] });
    y += 2.5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const table = (headers: string[], rows: string[][], widths: number[], emptyText: string) => {
    if (rows.length === 0) {
      addPageIfNeeded(8);
      text(emptyText, margin, y, { size: 8, color: [100, 116, 139] });
      y += 6;
      return;
    }

    const drawHeader = () => {
      addPageIfNeeded(8);
      let x = margin;
      for (let i = 0; i < headers.length; i++) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y, widths[i], 7, "S");
        text(headers[i], x + 1.5, y + 4.6, { size: 7, style: "bold", color: [11, 37, 69] });
        x += widths[i];
      }
      y += 7;
    };

    drawHeader();
    for (const row of rows) {
      const wrapped = row.map(
        (cell, i) =>
          doc.splitTextToSize(cleanPdfText(cell), Math.max(8, widths[i] - 3)) as string[],
      );
      const rowHeight = Math.max(7, Math.max(...wrapped.map((lines) => lines.length)) * 4 + 3);
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
      }
      let x = margin;
      doc.setDrawColor(226, 232, 240);
      for (let i = 0; i < row.length; i++) {
        doc.rect(x, y, widths[i], rowHeight);
        text(wrapped[i].join("\n"), x + 1.5, y + 4.4, { size: 7, maxWidth: widths[i] - 3 });
        x += widths[i];
      }
      y += rowHeight;
    }
    y += 2;
  };

  const { report, periodLabel, generatedAt, authorName } = input;
  const {
    summary,
    byStatus,
    topClients,
    topTechnicians,
    byServiceType,
    observations,
    incomplete,
    orders,
  } = report;

  doc.setDrawColor(11, 37, 69);
  doc.setLineWidth(0.6);
  text("GESTÃO LEMARC", margin, y, { size: 8, style: "bold", color: [234, 88, 12] });
  text("Relatório Gerencial de Ordens de Serviço", margin, y + 7, {
    size: 15,
    style: "bold",
    color: [11, 37, 69],
  });
  text(periodLabel, margin, y + 13, { size: 9, color: [100, 116, 139] });
  text(`Gerado em ${formatDateTime(generatedAt.toISOString())}`, pageWidth - margin - 55, y + 3, {
    size: 7,
    color: [71, 85, 105],
  });
  if (authorName)
    text(`Por ${authorName}`, pageWidth - margin - 55, y + 8, { size: 7, color: [71, 85, 105] });
  doc.line(margin, y + 17, pageWidth - margin, y + 17);
  y += 25;

  section("Resumo executivo");
  const kpis = [
    ["Total de OS", formatNumber(summary.totalOrders)],
    ["Concluídas", formatNumber(summary.finished)],
    ["Em execução", formatNumber(summary.running)],
    ["Pendentes", formatNumber(summary.pending)],
    ["Em revisão", formatNumber(summary.review)],
    ["Aguardando cobrança", formatNumber(summary.awaitingBilling)],
    ["Horas trabalhadas", `${summary.totalHours.toFixed(1)}h`],
    ["Tempo médio", summary.avgLeadMinutes !== null ? formatHours(summary.avgLeadMinutes) : "-"],
    ["Valor estimado", formatCurrency(summary.estimatedValue)],
    ["Taxa de conclusão", formatPercent(summary.completionRate)],
    ["Clientes envolvidos", formatNumber(summary.clientsInvolved)],
    ["Técnicos envolvidos", formatNumber(summary.techniciansInvolved)],
  ];
  for (let i = 0; i < kpis.length; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const boxW = (contentWidth - 6) / 4;
    const x = margin + col * (boxW + 2);
    const boxY = y + row * 14;
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, boxY, boxW, 11.5);
    text(kpis[i][0], x + 1.5, boxY + 4, { size: 6.5, style: "bold", color: [100, 116, 139] });
    text(kpis[i][1], x + 1.5, boxY + 9, { size: 10, style: "bold", color: [11, 37, 69] });
  }
  y += 45;

  section("Análise por status");
  table(
    ["Status", "Qtd", "%"],
    byStatus.map((s) => [s.label, formatNumber(s.count), formatPercent(s.percent)]),
    [110, 35, 35],
    "Sem dados.",
  );

  section("Top clientes");
  table(
    ["Cliente", "OS", "Concl.", "Pend.", "Horas", "Valor est."],
    topClients.map((c) => [
      c.name,
      formatNumber(c.orders),
      formatNumber(c.finished),
      formatNumber(c.pending),
      `${c.hours.toFixed(1)}h`,
      c.estimatedValue > 0 ? formatCurrency(c.estimatedValue) : "-",
    ]),
    [58, 18, 24, 22, 24, 34],
    "Nenhum cliente envolvido no período.",
  );

  section("Produtividade por técnico");
  table(
    ["Técnico", "OS", "Concl.", "Horas", "Tempo médio", "Valor est."],
    topTechnicians.map((t) => [
      t.name,
      formatNumber(t.orders),
      formatNumber(t.finished),
      `${t.hours.toFixed(1)}h`,
      t.avgLeadMinutes !== null ? formatHours(t.avgLeadMinutes) : "-",
      t.estimatedValue > 0 ? formatCurrency(t.estimatedValue) : "-",
    ]),
    [58, 18, 24, 24, 28, 28],
    "Nenhum técnico envolvido no período.",
  );

  section("Tipos de serviço");
  table(
    ["Tipo", "Qtd"],
    byServiceType.map((s) => [s.label, formatNumber(s.count)]),
    [140, 40],
    "Sem tipos registrados.",
  );

  section("Observações das OS");
  if (observations.length === 0) {
    text("Nenhuma observação registrada nas OS deste período.", margin, y, {
      size: 8,
      color: [100, 116, 139],
    });
    y += 6;
  } else {
    for (const row of observations.slice(0, 20)) {
      const desc = cleanPdfText(row.description ?? "");
      const lines = doc.splitTextToSize(desc, contentWidth - 4) as string[];
      addPageIfNeeded(Math.min(28, lines.length * 4 + 12));
      doc.setDrawColor(226, 232, 240);
      const h = Math.max(12, Math.min(30, lines.length * 4 + 10));
      doc.rect(margin, y, contentWidth, h);
      text(`#${row.number} - ${row.title} (${statusLabel[row.status]})`, margin + 2, y + 4.5, {
        size: 7.5,
        style: "bold",
        color: [11, 37, 69],
      });
      text(
        `${row.client_name ?? "Sem cliente"} - ${technicianNamesFor(row)} - Aberta ${formatDate(row.opened_at)}`,
        margin + 2,
        y + 8.5,
        { size: 6.8, color: [100, 116, 139] },
      );
      text(lines.slice(0, 5).join("\n"), margin + 2, y + 13, {
        size: 7,
        maxWidth: contentWidth - 4,
      });
      y += h + 2;
    }
  }

  section("Lista detalhada de OS");
  table(
    ["Nº", "Título", "Cliente", "Técnico", "Status", "Abertura", "Tempo", "Valor est."],
    orders.map((r) => [
      String(r.number),
      r.title,
      `${r.client_name ?? "-"}${r.client_unit_name ? ` - ${r.client_unit_name}` : ""}`,
      technicianNamesFor(r),
      statusLabel[r.status],
      formatDate(r.opened_at),
      r.worked_minutes_effective > 0 ? formatHours(r.worked_minutes_effective) : "-",
      r.estimated_value > 0 ? formatCurrency(r.estimated_value) : "-",
    ]),
    [12, 36, 32, 30, 22, 18, 14, 22],
    "Nenhuma OS no período.",
  );

  section("Pontos de atenção cadastral");
  table(
    ["Sem técnico", "Sem valor/hora", "Sem horas", "Sem fechamento"],
    [
      [
        formatNumber(incomplete.withoutTechnician),
        formatNumber(incomplete.withoutHourRate),
        formatNumber(incomplete.withoutWorkedMinutes),
        formatNumber(incomplete.withoutClosedAt),
      ],
    ],
    [45, 45, 45, 45],
    "Sem pontos de atenção.",
  );

  doc.save(buildManagerialReportFilename(periodLabel, generatedAt).replace(/\.html$/i, ".pdf"));
}

export function buildManagerialReportHtml({
  report,
  periodLabel,
  generatedAt,
  authorName,
}: ManagerialReportHtmlInput) {
  const {
    summary,
    byStatus,
    topClients,
    topTechnicians,
    byServiceType,
    observations,
    incomplete,
    orders,
  } = report;
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Relatório gerencial Lemarc — ${escapeHtml(periodLabel)}</title>
  <style>${REPORT_HTML_STYLES}</style>
</head>
<body>
  <main class="lemarc-pdf">
    <header class="cover">
      <div>
        <div class="accent">Gestão Lemarc</div>
        <h1>Relatório Gerencial de Ordens de Serviço</h1>
        <p>${escapeHtml(periodLabel)}</p>
      </div>
      <div class="meta">
        <div>Gerado em ${escapeHtml(formatDateTime(generatedAt.toISOString()))}</div>
        ${authorName ? `<div>Por ${escapeHtml(authorName)}</div>` : ""}
        <div>Sistema: Gestão Lemarc</div>
      </div>
    </header>

    <section class="section">
      <h2>Resumo executivo</h2>
      <div class="kpis">
        ${kpi("Total de OS", formatNumber(summary.totalOrders))}
        ${kpi("Concluídas", formatNumber(summary.finished))}
        ${kpi("Em execução", formatNumber(summary.running))}
        ${kpi("Pendentes", formatNumber(summary.pending))}
        ${kpi("Em revisão", formatNumber(summary.review))}
        ${kpi("Aguardando cobrança", formatNumber(summary.awaitingBilling))}
        ${kpi("Horas trabalhadas", `${summary.totalHours.toFixed(1)}h`)}
        ${kpi("Tempo médio", summary.avgLeadMinutes !== null ? formatHours(summary.avgLeadMinutes) : "—")}
        ${kpi("Valor estimado", formatCurrency(summary.estimatedValue))}
        ${kpi("Taxa de conclusão", formatPercent(summary.completionRate))}
        ${kpi("Clientes envolvidos", formatNumber(summary.clientsInvolved))}
        ${kpi("Técnicos envolvidos", formatNumber(summary.techniciansInvolved))}
      </div>
      <p class="muted small">Valor estimado calculado apenas para OS com tempo trabalhado e valor/hora preenchidos. Tempo médio considera apenas OS encerradas.</p>
    </section>

    <section class="section">
      <h2>Análise por status</h2>
      ${table(
        ["Status", "Qtd", "%"],
        byStatus.map((s) => [s.label, formatNumber(s.count), formatPercent(s.percent)]),
        "Sem dados.",
      )}
    </section>

    <section class="section">
      <h2>Top clientes</h2>
      ${table(
        ["Cliente", "OS", "Concluídas", "Pendentes", "Horas", "Valor est."],
        topClients.map((c) => [
          c.name,
          formatNumber(c.orders),
          formatNumber(c.finished),
          formatNumber(c.pending),
          `${c.hours.toFixed(1)}h`,
          c.estimatedValue > 0 ? formatCurrency(c.estimatedValue) : "—",
        ]),
        "Nenhum cliente envolvido no período.",
      )}
    </section>

    <section class="section">
      <h2>Produtividade por técnico</h2>
      ${table(
        ["Técnico", "OS", "Concluídas", "Horas", "Tempo médio", "Valor est."],
        topTechnicians.map((t) => [
          t.name,
          formatNumber(t.orders),
          formatNumber(t.finished),
          `${t.hours.toFixed(1)}h`,
          t.avgLeadMinutes !== null ? formatHours(t.avgLeadMinutes) : "—",
          t.estimatedValue > 0 ? formatCurrency(t.estimatedValue) : "—",
        ]),
        "Nenhum técnico envolvido no período.",
      )}
      <p class="muted small">As horas por técnico consideram a duração total da OS para cada técnico vinculado como responsável.</p>
    </section>

    <section class="section">
      <h2>Tipos de serviço</h2>
      ${table(
        ["Tipo", "Qtd"],
        byServiceType.map((s) => [s.label, formatNumber(s.count)]),
        "Sem tipos registrados.",
      )}
    </section>

    <section class="section">
      <h2>Observações das OS</h2>
      ${
        observations.length === 0
          ? `<p class="muted">Nenhuma observação registrada nas OS deste período.</p>`
          : observations.map(observationBlock).join("")
      }
    </section>

    <section class="section">
      <h2>Lista detalhada de OS</h2>
      ${table(
        [
          "Nº",
          "Título",
          "Cliente",
          "Técnico",
          "Tipo",
          "Prior.",
          "Status",
          "Abertura",
          "Fechamento",
          "Tempo",
          "Valor est.",
        ],
        orders.map((r) => [
          String(r.number),
          r.title,
          `${r.client_name ?? "—"}${r.client_unit_name ? ` · ${r.client_unit_name}` : ""}`,
          technicianNamesFor(r),
          serviceTypeFor(r),
          r.priority ? priorityLabel[r.priority] : "—",
          statusLabel[r.status],
          formatDate(r.opened_at),
          formatDate(r.closed_at),
          r.worked_minutes_effective > 0 ? formatHours(r.worked_minutes_effective) : "—",
          r.estimated_value > 0 ? formatCurrency(r.estimated_value) : "—",
        ]),
        "Nenhuma OS no período.",
      )}
    </section>

    <section class="section">
      <h2>Pontos de atenção cadastral</h2>
      <div class="kpis compact">
        ${kpi("Sem técnico", formatNumber(incomplete.withoutTechnician))}
        ${kpi("Sem valor/hora", formatNumber(incomplete.withoutHourRate))}
        ${kpi("Sem horas", formatNumber(incomplete.withoutWorkedMinutes))}
        ${kpi("Sem fechamento", formatNumber(incomplete.withoutClosedAt))}
      </div>
    </section>

    <footer class="footer-note">Relatório gerado com dados reais do Gestão Lemarc conforme filtros selecionados.</footer>
  </main>
</body>
</html>`;
}

const REPORT_HTML_STYLES = `
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #f7f2e9; color: #0f172a; font-family: Arial, Helvetica, sans-serif; }
.lemarc-pdf { max-width: 980px; margin: 0 auto; min-height: 100vh; background: #fff; padding: 28px; font-size: 11px; line-height: 1.45; }
h1, h2, h3 { color: #0b2545; font-weight: 800; margin: 0; }
h1 { font-size: 22px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 7px; }
.cover { border-bottom: 2px solid #0b2545; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.cover p { margin: 4px 0 0; color: #64748b; }
.accent { color: #ea580c; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
.meta { font-size: 10px; color: #475569; text-align: right; white-space: nowrap; }
.section { margin-top: 18px; page-break-inside: avoid; }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.kpis.compact { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
.kpi .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
.kpi .val { font-size: 15px; font-weight: 800; color: #0b2545; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
th, td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
th { background: #f1f5f9; font-weight: 700; color: #0b2545; }
tr { page-break-inside: avoid; }
.muted { color: #64748b; }
.small { font-size: 9px; margin-top: 6px; }
.pill { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #f1f5f9; font-size: 9px; font-weight: 700; }
.obs { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-top: 6px; page-break-inside: avoid; }
.obs .head { font-weight: 700; color: #0b2545; font-size: 10px; margin-bottom: 2px; }
.obs .body { font-size: 10px; white-space: pre-wrap; }
.footer-note { margin-top: 18px; padding: 8px 10px; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 9px; color: #475569; }
@media print {
  body { background: #fff; }
  .lemarc-pdf { max-width: none; margin: 0; padding: 0; }
}
@media (max-width: 720px) {
  .lemarc-pdf { padding: 18px; }
  .cover { align-items: flex-start; flex-direction: column; }
  .meta { text-align: left; white-space: normal; }
  .kpis, .kpis.compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;

function kpi(label: string, value: string) {
  return `<div class="kpi"><div class="lbl">${escapeHtml(label)}</div><div class="val">${escapeHtml(value)}</div></div>`;
}

function table(headers: string[], rows: string[][], emptyText: string) {
  if (rows.length === 0) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function observationBlock(row: ReportOrderRow) {
  return `<div class="obs">
    <div class="head">#${row.number} · ${escapeHtml(row.title)} <span class="pill">${escapeHtml(statusLabel[row.status])}</span></div>
    <div class="muted small">${escapeHtml(row.client_name ?? "Sem cliente")} · ${escapeHtml(technicianNamesFor(row))} · ${escapeHtml(row.priority ? priorityLabel[row.priority] : "—")} · Aberta ${escapeHtml(formatDate(row.opened_at))}${row.closed_at ? ` · Fechada ${escapeHtml(formatDate(row.closed_at))}` : ""}</div>
    <div class="body">${escapeHtml(row.description ?? "")}</div>
  </div>`;
}

function technicianNamesFor(row: ReportOrderRow) {
  const technicians = getReportRowTechnicians(row);
  if (technicians.length === 0) return "Sem técnico";
  return technicians.map((t) => t.name).join(", ");
}

function cleanPdfText(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[áàãâäÁÀÃÂÄ]/g, (m) => (m === m.toUpperCase() ? "A" : "a"))
    .replace(/[éèêëÉÈÊË]/g, (m) => (m === m.toUpperCase() ? "E" : "e"))
    .replace(/[íìîïÍÌÎÏ]/g, (m) => (m === m.toUpperCase() ? "I" : "i"))
    .replace(/[óòõôöÓÒÕÔÖ]/g, (m) => (m === m.toUpperCase() ? "O" : "o"))
    .replace(/[úùûüÚÙÛÜ]/g, (m) => (m === m.toUpperCase() ? "U" : "u"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/·/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function serviceTypeFor(row: ReportOrderRow) {
  if (row.service_type === "outro" && row.service_type_other) return row.service_type_other;
  return row.service_type ? serviceTypeLabel[row.service_type] : "—";
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
