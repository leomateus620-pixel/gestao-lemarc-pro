import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { maskCNPJ } from "@/lib/cnpj";
import { LEMARC_COLORS, LEMARC_COMPANY, LEMARC_LOGO_ASPECT } from "@/lib/reports/lemarcBrand";
import { loadLemarcLogoDataUrl } from "@/lib/reports/pdfShared";
import { sanitizePdfText, statusBadgeColor } from "@/lib/reports/labels";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
} from "@/types/serviceOrder";
import { displacementTypeLabel, type LaborEntry, type OrderFinancials } from "@/types/financials";

type Input = {
  order: ServiceOrder;
  entries: LaborEntry[];
  financials: OrderFinancials | null;
  generatedAt: Date;
  authorName: string | null;
};

function slug(input: string, max = 36): string {
  const s = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
  return s || "sem-cliente";
}

export function buildServiceOrderReportFilename(order: ServiceOrder, generatedAt = new Date()) {
  const day = generatedAt.toISOString().slice(0, 10);
  const clientSlug = slug(order.client?.name ?? "sem-cliente");
  return `os-${order.number}-${clientSlug}-${day}.pdf`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function fmtDateOnly(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function serviceTypeFor(order: ServiceOrder): string {
  if (order.service_type === "outro" && order.service_type_other) return order.service_type_other;
  return order.service_type ? serviceTypeLabel[order.service_type] : "—";
}

export async function downloadServiceOrderReportPdf(input: Input) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logoDataUrl = await loadLemarcLogoDataUrl();
  const { order, entries, financials, generatedAt, authorName } = input;

  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const footerReserve = 14;
  const headerHeightFull = 38;
  const headerHeightCompact = 18;

  const generatedAtLabel = fmtDateTime(generatedAt.toISOString());

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

  const drawLogo = (x: number, yy: number, targetHeight: number) => {
    const w = targetHeight * LEMARC_LOGO_ASPECT;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", x, yy, w, targetHeight, undefined, "FAST");
        return w;
      } catch {
        // fall through
      }
    }
    drawLogoMark(x, yy, w, targetHeight);
    return w;
  };

  const drawHeader = () => {
    const top = margin;
    if (isFirstPage) {
      const logoH = 10;
      const logoW = drawLogo(margin, top + 2, logoH);
      const infoX = margin + logoW + 6;
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
      doc.setDrawColor(...LEMARC_COLORS.orange);
      doc.setLineWidth(0.8);
      doc.line(margin, top + 19, pageWidth - margin, top + 19);
      txt(`RELATÓRIO DE OS #${order.number}`, margin, top + 26, {
        size: 13,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(order.title || "OS sem título", margin, top + 31, {
        size: 8.5,
        color: LEMARC_COLORS.slate,
        maxWidth: contentWidth - 40,
      });
      // status badge top-right
      drawStatusBadge(margin, top, order.status, pageWidth - margin, top + 27);
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(margin, top + 34, pageWidth - margin, top + 34);
      y = top + headerHeightFull;
      isFirstPage = false;
    } else {
      const logoH = 6;
      const logoW = drawLogo(margin, top + 1, logoH);
      const infoX = margin + logoW + 4;
      txt(LEMARC_COMPANY.legalName, infoX, top + 3.5, {
        size: 7.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(`CNPJ ${LEMARC_COMPANY.cnpj}`, infoX, top + 7, {
        size: 6.5,
        color: LEMARC_COLORS.slate,
      });
      txt(`Relatório da OS #${order.number}`, pageWidth - margin, top + 3.5, {
        size: 7.5,
        style: "bold",
        color: LEMARC_COLORS.navy,
        align: "right",
      });
      txt(order.title || "—", pageWidth - margin, top + 7, {
        size: 6.5,
        color: LEMARC_COLORS.slate,
        align: "right",
        maxWidth: contentWidth * 0.6,
      });
      doc.setDrawColor(...LEMARC_COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(margin, top + 11, pageWidth - margin, top + 11);
      y = top + headerHeightCompact;
    }
  };

  const drawStatusBadge = (
    _mx: number,
    _my: number,
    status: ServiceOrder["status"],
    xRight: number,
    yy: number,
    height = 5,
  ) => {
    const label = sanitizePdfText(statusLabel[status]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const w = doc.getTextWidth(label) + 5;
    const [r, g, b] = statusBadgeColor(status);
    doc.setFillColor(r, g, b);
    doc.roundedRect(xRight - w, yy - height + 1, w, height, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, xRight - w / 2, yy - 0.4, { align: "center" });
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

  const kvGrid = (rows: [string, string][], cols = 2) => {
    const gap = 3;
    const colW = (contentWidth - gap * (cols - 1)) / cols;
    const lineH = 4.2;
    const boxH = lineH * 2 + 3;
    for (let i = 0; i < rows.length; i++) {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      if (col === 0) {
        addPageIfNeeded(boxH + 1);
      }
      const x = margin + col * (colW + gap);
      const yy = y + rowIdx * (boxH + 1);
      txt(rows[i][0].toUpperCase(), x, yy + 3, {
        size: 6.2,
        style: "bold",
        color: LEMARC_COLORS.slateSoft,
      });
      txt(rows[i][1], x, yy + 7.5, {
        size: 8.5,
        style: "bold",
        color: LEMARC_COLORS.ink,
        maxWidth: colW,
      });
    }
    const rowsCount = Math.ceil(rows.length / cols);
    y += rowsCount * (boxH + 1) + 2;
  };

  type Col = { label: string; width: number; align?: "left" | "right" | "center" };

  const table = (cols: Col[], rows: string[][], emptyText: string) => {
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
      const wrapped = row.map((cell, i) =>
        doc.splitTextToSize(sanitizePdfText(cell), Math.max(8, cols[i].width - 3)) as string[],
      );
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
        const c = cols[i];
        const value = wrapped[i].join("\n");
        const tx =
          c.align === "right"
            ? x + c.width - 1.5
            : c.align === "center"
              ? x + c.width / 2
              : x + 1.5;
        txt(value, tx, y + 3.8, {
          size: 7,
          maxWidth: c.width - 3,
          align: c.align ?? "left",
          color: LEMARC_COLORS.ink,
        });
        x += c.width;
      }
      y += rowHeight;
      zebra = !zebra;
    }
    y += 2;
  };

  const noticeBox = (text: string, tone: "warn" | "info" = "warn") => {
    const lines = doc.splitTextToSize(sanitizePdfText(text), contentWidth - 6) as string[];
    const h = Math.max(10, lines.length * 3.6 + 5);
    addPageIfNeeded(h + 2);
    const bg: [number, number, number] = tone === "warn" ? [255, 247, 237] : [241, 245, 249];
    const border = tone === "warn" ? LEMARC_COLORS.orangeSoft : LEMARC_COLORS.border;
    doc.setDrawColor(...border);
    doc.setFillColor(...bg);
    doc.roundedRect(margin, y, contentWidth, h, 1.4, 1.4, "FD");
    txt(lines.join("\n"), margin + 3, y + 5, {
      size: 8,
      color: tone === "warn" ? LEMARC_COLORS.amber : LEMARC_COLORS.slate,
      maxWidth: contentWidth - 6,
    });
    y += h + 2;
  };

  // ============================================================
  // Render
  // ============================================================
  drawHeader();

  // ----- Identificação -----
  section("Identificação");
  const techs = getOrderTechnicians(order);
  const primary = techs.find((t) => t.is_primary) ?? techs[0];
  const unitLabel = [order.client_unit?.name ?? order.client?.unit ?? "—"];
  if (order.client_unit?.cnpj) unitLabel.push(`CNPJ ${maskCNPJ(order.client_unit.cnpj)}`);
  if (order.client_unit?.city || order.client_unit?.state) {
    unitLabel.push([order.client_unit?.city, order.client_unit?.state].filter(Boolean).join("/"));
  }
  kvGrid([
    [
      "Cliente",
      `${order.client?.name ?? "—"}${order.client?.cnpj ? ` · CNPJ ${maskCNPJ(order.client.cnpj)}` : ""}`,
    ],
    ["Unidade", unitLabel.join(" · ")],
    ["Local", order.location ?? "—"],
    ["Solicitante", order.requester_name ?? "—"],
    ["Tipo de serviço", serviceTypeFor(order)],
    ["Prioridade", order.priority ? priorityLabel[order.priority] : "—"],
    ["Abertura", fmtDateTime(order.opened_at)],
    ["Fechamento", fmtDateTime(order.finished_at ?? order.closed_at)],
    ["Responsável", primary?.full_name ?? "—"],
    [
      "Técnicos envolvidos",
      techs.length ? techs.map((t) => t.full_name).join(", ") : "—",
    ],
  ]);

  // ----- Trabalhos executados -----
  section("Trabalhos executados");
  const desc = order.description?.trim() || "Sem descrição cadastrada.";
  const descLines = doc.splitTextToSize(sanitizePdfText(desc), contentWidth) as string[];
  const descH = Math.max(6, descLines.length * 3.8 + 2);
  addPageIfNeeded(descH);
  txt(descLines.join("\n"), margin, y + 3.5, {
    size: 8.5,
    color: LEMARC_COLORS.ink,
    maxWidth: contentWidth,
  });
  y += descH;

  // ----- Apuração de horas -----
  section("Apuração de horas");
  table(
    [
      { label: "#", width: 8, align: "right" },
      { label: "Técnico", width: 40 },
      { label: "Função", width: 24 },
      { label: "Data", width: 18, align: "right" },
      { label: "Entrada", width: 14, align: "right" },
      { label: "Saída", width: 14, align: "right" },
      { label: "Horas", width: 14, align: "right" },
      { label: "R$/h", width: 20, align: "right" },
      {
        label: "Subtotal",
        width: contentWidth - 8 - 40 - 24 - 18 - 14 - 14 - 14 - 20,
        align: "right",
      },
    ],
    entries.map((e, i) => [
      String(i + 1),
      e.technician?.full_name ?? "—",
      e.role ?? "—",
      fmtDateOnly(e.work_date),
      e.start_time.slice(0, 5),
      e.end_time.slice(0, 5),
      formatHHmm(e.duration_minutes),
      formatBRL(e.hourly_rate_cents),
      formatBRL(e.subtotal_cents),
    ]),
    "Sem apontamentos registrados.",
  );

  // Descriptions (if any)
  const entriesWithDesc = entries.filter((e) => (e.description ?? "").trim().length > 0);
  if (entriesWithDesc.length > 0) {
    y += 1;
    for (const e of entriesWithDesc) {
      const line = `#${entries.indexOf(e) + 1} — ${e.description}`;
      const lines = doc.splitTextToSize(sanitizePdfText(line), contentWidth) as string[];
      const h = lines.length * 3.6 + 1;
      addPageIfNeeded(h);
      txt(lines.join("\n"), margin, y + 2, {
        size: 7,
        color: LEMARC_COLORS.slate,
        maxWidth: contentWidth,
      });
      y += h;
    }
  }

  // ----- Deslocamento -----
  if (financials && financials.displacement_type !== "none") {
    section("Deslocamento");
    const parts: string[] = [displacementTypeLabel[financials.displacement_type]];
    if (financials.displacement_type === "per_km") {
      parts.push(`${financials.displacement_count} desloc.`);
      parts.push(`${financials.displacement_km_total} km`);
      parts.push(`${formatBRL(financials.displacement_rate_cents)}/km`);
    }
    parts.push(`Total ${formatBRL(financials.displacement_total_cents)}`);
    addPageIfNeeded(8);
    txt(parts.join(" · "), margin, y + 3.5, {
      size: 8.5,
      style: "bold",
      color: LEMARC_COLORS.ink,
    });
    y += 6;
    if (financials.displacement_notes) {
      const lines = doc.splitTextToSize(
        sanitizePdfText(financials.displacement_notes),
        contentWidth,
      ) as string[];
      const h = lines.length * 3.6 + 1;
      addPageIfNeeded(h);
      txt(lines.join("\n"), margin, y + 2, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
        maxWidth: contentWidth,
      });
      y += h;
    }
  }

  // ----- Resumo financeiro -----
  section("Resumo financeiro");
  if (financials) {
    const rows: [string, string][] = [
      ["Total de horas trabalhadas", formatHHmm(financials.total_labor_minutes)],
      ["Total mão de obra", formatBRL(financials.total_labor_cents)],
      ["Deslocamento", formatBRL(financials.displacement_total_cents)],
    ];
    if (financials.materials_total_cents > 0) {
      rows.push(["Materiais", formatBRL(financials.materials_total_cents)]);
    }
    const boxH = rows.length * 5.5 + 16;
    addPageIfNeeded(boxH);
    doc.setDrawColor(...LEMARC_COLORS.navy);
    doc.setLineWidth(0.4);
    doc.setFillColor(...LEMARC_COLORS.bgSoft);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, "FD");
    let ry = y + 5.5;
    for (const [k, v] of rows) {
      txt(k, margin + 4, ry, { size: 8.5, color: LEMARC_COLORS.slate });
      txt(v, pageWidth - margin - 4, ry, {
        size: 8.5,
        style: "bold",
        color: LEMARC_COLORS.ink,
        align: "right",
      });
      ry += 5.5;
    }
    doc.setDrawColor(...LEMARC_COLORS.navy);
    doc.setLineWidth(0.4);
    doc.line(margin + 3, ry - 2, pageWidth - margin - 3, ry - 2);
    txt("TOTAL GERAL DA OS", margin + 4, ry + 3, {
      size: 9.5,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    txt(formatBRL(financials.grand_total_cents), pageWidth - margin - 4, ry + 3, {
      size: 12,
      style: "bold",
      color: LEMARC_COLORS.orange,
      align: "right",
    });
    y += boxH + 2;
  } else {
    noticeBox("Apuração financeira pendente — finalize a OS para gerar os totais.");
  }

  if (financials?.notes) {
    section("Observações");
    const lines = doc.splitTextToSize(sanitizePdfText(financials.notes), contentWidth) as string[];
    const h = lines.length * 3.8 + 2;
    addPageIfNeeded(h);
    txt(lines.join("\n"), margin, y + 3, {
      size: 8.5,
      color: LEMARC_COLORS.ink,
      maxWidth: contentWidth,
    });
    y += h;
  }

  // ----- Assinatura do responsável -----
  section("Assinatura do responsável");
  if (order.signature) {
    const sig = order.signature;
    const boxH = 40;
    addPageIfNeeded(boxH);
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setFillColor(...LEMARC_COLORS.bgSoft);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.4, 1.4, "FD");
    // signature image
    const sigW = 70;
    const sigH = 30;
    const sigX = margin + 3;
    const sigY = y + 5;
    doc.setDrawColor(...LEMARC_COLORS.borderSoft);
    doc.setFillColor(255, 255, 255);
    doc.rect(sigX, sigY, sigW, sigH, "FD");
    if (sig.signature_data_url) {
      try {
        doc.addImage(sig.signature_data_url, "PNG", sigX + 1, sigY + 1, sigW - 2, sigH - 2, undefined, "FAST");
      } catch {
        txt("imagem indisponível", sigX + sigW / 2, sigY + sigH / 2, {
          size: 7,
          color: LEMARC_COLORS.slateSoft,
          align: "center",
        });
      }
    } else {
      txt("imagem indisponível", sigX + sigW / 2, sigY + sigH / 2, {
        size: 7,
        color: LEMARC_COLORS.slateSoft,
        align: "center",
      });
    }
    const metaX = sigX + sigW + 5;
    txt(sig.signed_by_name, metaX, y + 8, {
      size: 10.5,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    if (sig.signed_by_role) {
      txt(sig.signed_by_role, metaX, y + 13, { size: 8, color: LEMARC_COLORS.slate });
    }
    txt(`Assinado em ${fmtDateTime(sig.signed_at)}`, metaX, y + 19, {
      size: 8,
      color: LEMARC_COLORS.ink,
    });
    if (sig.signature_hash) {
      txt(`Registro: SIG-${sig.signature_hash}`, metaX, y + 24, {
        size: 7.5,
        color: LEMARC_COLORS.slate,
      });
    }
    txt(
      "Rastreabilidade operacional — não substitui assinatura jurídica formal.",
      metaX,
      y + 32,
      { size: 6.8, color: LEMARC_COLORS.slateSoft, maxWidth: contentWidth - (metaX - margin) - 4 },
    );
    y += boxH + 2;
  } else if (order.signature_waiver_reason) {
    const parts = [`Finalizada sem assinatura: ${order.signature_waiver_reason}`];
    if (order.signature_waived_at) parts.push(`(em ${fmtDateTime(order.signature_waived_at)})`);
    noticeBox(parts.join(" "));
  } else {
    noticeBox("Assinatura não registrada.", "info");
  }

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

  doc.save(buildServiceOrderReportFilename(order, generatedAt));
}