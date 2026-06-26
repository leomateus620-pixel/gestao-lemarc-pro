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
import { LEMARC_COLORS, LEMARC_COMPANY, LEMARC_LOGO_ASPECT, LEMARC_LOGO_URL } from "@/lib/reports/lemarcBrand";
import {
  PENDING_LABELS,
  formatFechamento,
  formatHorasAgregado,
  formatTempo,
  formatValor,
  formatValorAgregado,
  isOpenOrder,
  sanitizePdfText,
  statusBadgeColor,
} from "@/lib/reports/labels";

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
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const footerReserve = 14;
  const headerHeightFull = 38;
  const headerHeightCompact = 18;

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

  const generatedAtLabel = formatDateTime(generatedAt.toISOString());

  let y = margin;
  let isFirstPage = true;

  const txt = (
    value: string,
    x: number,
    yy: number,
    options?: {
      maxWidth?: number;
      size?: number;
      style?: "normal" | "bold";
      color?: readonly [number, number, number];
      align?: "left" | "right" | "center";
    },
  ) => {
    doc.setFont("helvetica", options?.style ?? "normal");
    doc.setFontSize(options?.size ?? 9);
    const [r, g, b] = options?.color ?? LEMARC_COLORS.ink;
    doc.setTextColor(r, g, b);
    doc.text(sanitizePdfText(value), x, yy, {
      maxWidth: options?.maxWidth,
      align: options?.align,
    });
  };

  const drawLogoMark = (x: number, yy: number, w: number, h: number) => {
    // Typographic fallback mark — orange square with "L" + "GESTÃO LEMARC" beside.
    doc.setFillColor(...LEMARC_COLORS.orange);
    doc.roundedRect(x, yy, h, h, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(h * 2.2);
    doc.setTextColor(255, 255, 255);
    doc.text("L", x + h / 2, yy + h * 0.72, { align: "center" });
    txt("GESTÃO", x + h + 2, yy + h * 0.42, { size: 7.5, style: "bold", color: LEMARC_COLORS.slate });
    txt("LEMARC", x + h + 2, yy + h * 0.85, { size: 11, style: "bold", color: LEMARC_COLORS.navy });
    return x + h + 2 + Math.max(w - h - 2, 22);
  };

  const drawHeader = () => {
    const top = margin;
    if (isFirstPage) {
      drawLogoMark(margin, top, 34, 14);
      // Company info block (right of logo)
      const infoX = margin + 38;
      txt(LEMARC_COMPANY.legalName, infoX, top + 4, {
        size: 8.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(`${LEMARC_COMPANY.address} · ${LEMARC_COMPANY.city}`, infoX, top + 8, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
      });
      txt(`Fone: ${LEMARC_COMPANY.phone} · ${LEMARC_COMPANY.email}`, infoX, top + 11.5, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
      });
      txt(`CNPJ: ${LEMARC_COMPANY.cnpj}`, infoX, top + 15, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
      });
      // Right meta column
      txt("Gerado em", pageWidth - margin, top + 4, {
        size: 6.5,
        color: LEMARC_COLORS.slateSoft,
        align: "right",
      });
      txt(generatedAtLabel, pageWidth - margin, top + 8, {
        size: 8,
        style: "bold",
        color: LEMARC_COLORS.navy,
        align: "right",
      });
      if (authorName) {
        txt(`Por ${authorName}`, pageWidth - margin, top + 12, {
          size: 7,
          color: LEMARC_COLORS.slate,
          align: "right",
        });
      }
      // Orange separator
      doc.setDrawColor(...LEMARC_COLORS.orange);
      doc.setLineWidth(0.8);
      doc.line(margin, top + 19, pageWidth - margin, top + 19);
      // Title bar
      txt("RELATÓRIO GERENCIAL DE ORDENS DE SERVIÇO", margin, top + 26, {
        size: 13,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(`Período: ${periodLabel}`, margin, top + 31, {
        size: 8.5,
        color: LEMARC_COLORS.slate,
      });
      // Thin under-bar
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(margin, top + 34, pageWidth - margin, top + 34);
      y = top + headerHeightFull;
      isFirstPage = false;
    } else {
      drawLogoMark(margin, top, 22, 8);
      txt(LEMARC_COMPANY.legalName, margin + 32, top + 3.5, {
        size: 7.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(`CNPJ ${LEMARC_COMPANY.cnpj}`, margin + 32, top + 7, {
        size: 6.5,
        color: LEMARC_COLORS.slate,
      });
      txt("Relatório Gerencial de OS", pageWidth - margin, top + 3.5, {
        size: 7.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
        align: "right",
      });
      txt(`Período: ${periodLabel}`, pageWidth - margin, top + 7, {
        size: 6.5,
        color: LEMARC_COLORS.slate,
        align: "right",
      });
      doc.setDrawColor(...LEMARC_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(margin, top + 11, pageWidth - margin, top + 11);
      y = top + headerHeightCompact;
    }
  };

  const addPageIfNeeded = (height: number) => {
    if (y + height <= pageHeight - margin - footerReserve) return;
    doc.addPage();
    drawHeader();
  };

  const section = (title: string) => {
    addPageIfNeeded(14);
    y += 4;
    txt(title.toUpperCase(), margin, y, {
      size: 9,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    y += 2;
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const drawStatusBadge = (
    status: ReportOrderRow["status"],
    x: number,
    yy: number,
    height = 4.6,
  ) => {
    const label = sanitizePdfText(statusLabel[status]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const w = doc.getTextWidth(label) + 4;
    const [r, g, b] = statusBadgeColor(status);
    doc.setFillColor(r, g, b);
    doc.roundedRect(x, yy - height + 1, w, height, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + w / 2, yy - 0.3, { align: "center" });
    return w;
  };

  type Col = {
    label: string;
    width: number;
    align?: "left" | "right" | "center";
    badge?: boolean;
  };

  const table = (
    cols: Col[],
    rows: (string | { status: ReportOrderRow["status"]; label?: string })[][],
    emptyText: string,
  ) => {
    if (rows.length === 0) {
      addPageIfNeeded(8);
      txt(emptyText, margin, y + 3, { size: 8, color: LEMARC_COLORS.slateSoft });
      y += 7;
      return;
    }
    const drawTableHeader = () => {
      addPageIfNeeded(8);
      let x = margin;
      doc.setFillColor(...LEMARC_COLORS.bgSoft);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.line(margin, y + 7, margin + contentWidth, y + 7);
      for (const c of cols) {
        txt(c.label, x + (c.align === "right" ? c.width - 1.5 : 1.5), y + 4.7, {
          size: 7,
          style: "bold",
          color: LEMARC_COLORS.navy,
          align: c.align === "right" ? "right" : "left",
        });
        x += c.width;
      }
      y += 7;
    };
    drawTableHeader();
    let zebra = false;
    for (const row of rows) {
      const wrapped = row.map((cell, i) => {
        if (typeof cell === "string") {
          return doc.splitTextToSize(
            sanitizePdfText(cell),
            Math.max(8, cols[i].width - 3),
          ) as string[];
        }
        return [cell.label ?? statusLabel[cell.status]];
      });
      const rowHeight = Math.max(6.5, Math.max(...wrapped.map((l) => l.length)) * 3.6 + 3);
      if (y + rowHeight > pageHeight - margin - footerReserve) {
        doc.addPage();
        drawHeader();
        drawTableHeader();
        zebra = false;
      }
      if (zebra) {
        doc.setFillColor(...LEMARC_COLORS.zebra);
        doc.rect(margin, y, contentWidth, rowHeight, "F");
      }
      doc.setDrawColor(...LEMARC_COLORS.borderSoft);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      let x = margin;
      for (let i = 0; i < row.length; i++) {
        const cell = row[i];
        const c = cols[i];
        if (typeof cell === "object" && c.badge) {
          drawStatusBadge(cell.status, x + 1.5, y + rowHeight / 2 + 1.2);
        } else {
          const value = wrapped[i].join("\n");
          const tx =
            c.align === "right" ? x + c.width - 1.5 : c.align === "center" ? x + c.width / 2 : x + 1.5;
          txt(value, tx, y + 3.8, {
            size: 7,
            maxWidth: c.width - 3,
            align: c.align ?? "left",
            color: LEMARC_COLORS.ink,
          });
        }
        x += c.width;
      }
      y += rowHeight;
      zebra = !zebra;
    }
    // outer border
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(margin, y - 1 - (rows.length === 0 ? 0 : 0), 0, 0);
    y += 2;
  };

  // ===== Render =====
  drawHeader();

  // ----- Resumo executivo -----
  section("Resumo executivo");
  const kpis = [
    ["Total de OS", formatNumber(summary.totalOrders)],
    ["Concluídas", formatNumber(summary.finished)],
    ["Em execução", formatNumber(summary.running)],
    ["Pendentes", formatNumber(summary.pending)],
    ["Em revisão", formatNumber(summary.review)],
    ["Aguardando cobrança", formatNumber(summary.awaitingBilling)],
    [
      "Horas trabalhadas",
      summary.totalHours > 0
        ? `${summary.totalHours.toFixed(1).replace(".", ",")}h`
        : PENDING_LABELS.awaitingClose,
    ],
    [
      "Tempo médio",
      summary.avgLeadMinutes !== null
        ? formatHours(summary.avgLeadMinutes)
        : PENDING_LABELS.awaitingClose,
    ],
    [
      "Valor apurado",
      summary.estimatedValue > 0
        ? formatCurrency(summary.estimatedValue)
        : PENDING_LABELS.awaitingValue,
    ],
    ["Taxa de conclusão", formatPercent(summary.completionRate)],
    ["Clientes envolvidos", formatNumber(summary.clientsInvolved)],
    ["Técnicos envolvidos", formatNumber(summary.techniciansInvolved)],
  ];
  const cols = 4;
  const gap = 2.5;
  const boxW = (contentWidth - gap * (cols - 1)) / cols;
  const boxH = 13;
  for (let i = 0; i < kpis.length; i++) {
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = margin + col * (boxW + gap);
    const boxY = y + rowIdx * (boxH + gap);
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, boxY, boxW, boxH, 1.2, 1.2, "FD");
    txt(kpis[i][0], x + 2, boxY + 4, {
      size: 6.5,
      style: "bold",
      color: LEMARC_COLORS.slateSoft,
    });
    const value = kpis[i][1];
    const isPending =
      value === PENDING_LABELS.awaitingValue || value === PENDING_LABELS.awaitingClose;
    txt(value, x + 2, boxY + 10, {
      size: isPending ? 8 : 11,
      style: "bold",
      color: isPending ? LEMARC_COLORS.slateSoft : LEMARC_COLORS.navy,
      maxWidth: boxW - 4,
    });
  }
  y += Math.ceil(kpis.length / cols) * (boxH + gap) + 2;

  // ----- Análise por status -----
  section("Análise por status");
  if (byStatus.length === 0) {
    txt("Sem dados.", margin, y + 3, { size: 8, color: LEMARC_COLORS.slateSoft });
    y += 6;
  } else {
    const barWidth = contentWidth - 95;
    for (const s of byStatus) {
      addPageIfNeeded(8);
      txt(s.label, margin, y + 4, { size: 8, color: LEMARC_COLORS.ink });
      txt(formatNumber(s.count), margin + 70, y + 4, {
        size: 8,
        style: "bold",
        color: LEMARC_COLORS.navy,
        align: "right",
      });
      // bar
      const barX = margin + 75;
      doc.setFillColor(...LEMARC_COLORS.bgSoft);
      doc.roundedRect(barX, y + 1.5, barWidth, 3.5, 0.6, 0.6, "F");
      const fill = Math.max(0.5, Math.min(barWidth, barWidth * (s.percent || 0)));
      doc.setFillColor(...LEMARC_COLORS.navy);
      doc.roundedRect(barX, y + 1.5, fill, 3.5, 0.6, 0.6, "F");
      txt(formatPercent(s.percent), pageWidth - margin, y + 4, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
        align: "right",
      });
      y += 7;
    }
  }

  // ----- Top clientes -----
  section("Top clientes");
  const clientsHaveOpen = orders.some((o) => isOpenOrder(o));
  table(
    [
      { label: "Cliente", width: 60 },
      { label: "OS", width: 14, align: "right" },
      { label: "Concl.", width: 16, align: "right" },
      { label: "Pend.", width: 16, align: "right" },
      { label: "Horas", width: 26, align: "right" },
      { label: "Valor apurado", width: contentWidth - 60 - 14 - 16 - 16 - 26, align: "right" },
    ],
    topClients.map((c) => [
      c.name,
      formatNumber(c.orders),
      formatNumber(c.finished),
      formatNumber(c.pending),
      formatHorasAgregado(c.hours, c.pending > 0 || clientsHaveOpen),
      formatValorAgregado(c.estimatedValue, c.pending > 0 || clientsHaveOpen),
    ]),
    "Nenhum cliente envolvido no período.",
  );

  // ----- Produtividade por técnico -----
  section("Produtividade por técnico");
  table(
    [
      { label: "Técnico", width: 60 },
      { label: "OS", width: 14, align: "right" },
      { label: "Concl.", width: 16, align: "right" },
      { label: "Horas", width: 24, align: "right" },
      { label: "Tempo médio", width: 28, align: "right" },
      { label: "Valor apurado", width: contentWidth - 60 - 14 - 16 - 24 - 28, align: "right" },
    ],
    topTechnicians.map((t) => [
      t.name,
      formatNumber(t.orders),
      formatNumber(t.finished),
      formatHorasAgregado(t.hours, t.orders > t.finished),
      t.avgLeadMinutes !== null ? formatHours(t.avgLeadMinutes) : PENDING_LABELS.awaitingClose,
      formatValorAgregado(t.estimatedValue, t.orders > t.finished),
    ]),
    "Nenhum técnico envolvido no período.",
  );

  // ----- Tipos de serviço -----
  section("Tipos de serviço");
  table(
    [
      { label: "Tipo", width: contentWidth - 30 },
      { label: "Qtd", width: 30, align: "right" },
    ],
    byServiceType.map((s) => [s.label, formatNumber(s.count)]),
    "Sem tipos registrados.",
  );

  // ----- Observações das OS -----
  section("Observações das OS");
  if (observations.length === 0) {
    txt("Nenhuma observação registrada nas OS deste período.", margin, y + 3, {
      size: 8,
      color: LEMARC_COLORS.slateSoft,
    });
    y += 7;
  } else {
    for (const row of observations.slice(0, 20)) {
      const desc = sanitizePdfText(row.description ?? "");
      const lines = doc.splitTextToSize(desc, contentWidth - 6) as string[];
      const visibleLines = lines.slice(0, 6);
      const h = Math.max(20, visibleLines.length * 3.6 + 16);
      addPageIfNeeded(h + 2);
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, contentWidth, h, 1.5, 1.5, "FD");
      // accent left bar
      doc.setFillColor(...LEMARC_COLORS.orange);
      doc.rect(margin, y, 1.4, h, "F");
      txt(`OS #${row.number} — ${row.title}`, margin + 3.5, y + 4.5, {
        size: 8.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
        maxWidth: contentWidth - 50,
      });
      drawStatusBadge(row.status, pageWidth - margin - 28, y + 5.2);
      txt(
        `Cliente: ${row.client_name ?? PENDING_LABELS.noClient}${row.client_unit_name ? " · " + row.client_unit_name : ""}`,
        margin + 3.5,
        y + 8.5,
        { size: 7, color: LEMARC_COLORS.slate, maxWidth: contentWidth - 6 },
      );
      txt(
        `Técnico: ${technicianNamesFor(row)} · Aberta em ${formatDate(row.opened_at)} · ${isOpenOrder(row) ? PENDING_LABELS.awaitingFinalization : "Fechada em " + formatDate(row.closed_at)}`,
        margin + 3.5,
        y + 11.5,
        { size: 7, color: LEMARC_COLORS.slate, maxWidth: contentWidth - 6 },
      );
      txt(visibleLines.join("\n"), margin + 3.5, y + 15, {
        size: 7.5,
        maxWidth: contentWidth - 6,
        color: LEMARC_COLORS.ink,
      });
      y += h + 2;
    }
  }

  // ----- Lista detalhada de OS -----
  section("Lista detalhada de OS");
  table(
    [
      { label: "Nº", width: 9, align: "right" },
      { label: "Título", width: 26 },
      { label: "Cliente", width: 24 },
      { label: "Técnico(s)", width: 22 },
      { label: "Status", width: 20, badge: true },
      { label: "Abertura", width: 16, align: "right" },
      { label: "Fechamento", width: 16, align: "right" },
      { label: "Tempo", width: 22, align: "right" },
      {
        label: "Valor",
        width: contentWidth - 9 - 26 - 24 - 22 - 20 - 16 - 16 - 22,
        align: "right",
      },
    ],
    orders.map((r) => [
      String(r.number),
      r.title,
      `${r.client_name ?? "—"}${r.client_unit_name ? ` · ${r.client_unit_name}` : ""}`,
      technicianNamesFor(r),
      { status: r.status },
      formatDate(r.opened_at),
      formatFechamento(r),
      formatTempo(r),
      formatValor(r),
    ]),
    "Nenhuma OS no período.",
  );

  // ----- Pontos de atenção cadastral -----
  section("Pontos de atenção cadastral");
  const attentionItems = [
    {
      label: "Sem técnico",
      value: incomplete.withoutTechnician,
      hint: "Atribua um técnico responsável para acompanhar a execução.",
    },
    {
      label: "Sem valor/hora",
      value: incomplete.withoutHourRate,
      hint: "Cadastre o valor/hora na finalização para permitir apuração financeira.",
    },
    {
      label: "Sem horas registradas",
      value: incomplete.withoutWorkedMinutes,
      hint: "Aponte o tempo trabalhado para apurar mão de obra.",
    },
    {
      label: "Sem fechamento",
      value: incomplete.withoutClosedAt,
      hint: "Finalize a OS para liberar o relatório e a cobrança.",
    },
  ];
  const aw = (contentWidth - gap * (attentionItems.length - 1)) / attentionItems.length;
  for (let i = 0; i < attentionItems.length; i++) {
    const a = attentionItems[i];
    const x = margin + i * (aw + gap);
    addPageIfNeeded(26);
    const isWarn = a.value > 0;
    doc.setDrawColor(...(isWarn ? LEMARC_COLORS.orangeSoft : LEMARC_COLORS.border));
    doc.setFillColor(...(isWarn ? [255, 247, 237] as [number, number, number] : [255, 255, 255] as [number, number, number]));
    doc.roundedRect(x, y, aw, 24, 1.5, 1.5, "FD");
    txt(a.label, x + 2, y + 4.5, {
      size: 7,
      style: "bold",
      color: LEMARC_COLORS.slate,
    });
    txt(formatNumber(a.value), x + 2, y + 12, {
      size: 16,
      style: "bold",
      color: isWarn ? LEMARC_COLORS.orange : LEMARC_COLORS.navy,
    });
    txt(a.hint, x + 2, y + 17, {
      size: 6.5,
      color: LEMARC_COLORS.slate,
      maxWidth: aw - 4,
    });
  }
  y += 26;

  // ----- Footer on every page -----
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = pageHeight - 8;
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(margin, fy - 4, pageWidth - margin, fy - 4);
    txt(
      `${LEMARC_COMPANY.legalName} · CNPJ ${LEMARC_COMPANY.cnpj} · ${LEMARC_COMPANY.phoneShort}`,
      margin,
      fy,
      { size: 6.8, color: LEMARC_COLORS.slate },
    );
    txt(`Gerado em ${generatedAtLabel}`, margin, fy + 3.5, {
      size: 6.5,
      color: LEMARC_COLORS.slateSoft,
    });
    txt(`Página ${p} de ${totalPages}`, pageWidth - margin, fy + 3.5, {
      size: 6.8,
      style: "bold",
      color: LEMARC_COLORS.navy,
      align: "right",
    });
  }

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
