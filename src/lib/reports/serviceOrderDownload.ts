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

type TextOptions = {
  maxWidth?: number;
  size?: number;
  style?: "normal" | "bold";
  color?: readonly [number, number, number];
  align?: "left" | "right" | "center";
};

type FieldCell = {
  label: string;
  value: string;
};

type WorkItem = {
  label: string;
  value: string;
};

type TableCol = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

const EMPTY = "—";

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
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
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

function fmtEntryDateTime(entry: LaborEntry, time: string): string {
  return `${fmtDateOnly(entry.work_date)} ${time.slice(0, 5)}`;
}

function serviceTypeFor(order: ServiceOrder): string {
  if (order.service_type === "outro" && order.service_type_other) return order.service_type_other;
  return order.service_type ? serviceTypeLabel[order.service_type] : EMPTY;
}

function joinParts(parts: Array<string | null | undefined>, separator = " · "): string {
  const clean = parts.map((part) => part?.trim()).filter(Boolean);
  return clean.length ? clean.join(separator) : EMPTY;
}

function shortHash(hash: string | null | undefined): string | null {
  return hash ? hash.slice(0, 14) : null;
}

function displacementDetail(financials: OrderFinancials | null): string {
  if (!financials || financials.displacement_type === "none") return "Sem deslocamento";
  const parts = [displacementTypeLabel[financials.displacement_type]];
  if (financials.displacement_type === "per_km") {
    parts.push(`${financials.displacement_count} desloc.`);
    parts.push(`${financials.displacement_km_total} km`);
    parts.push(`${formatBRL(financials.displacement_rate_cents)}/km`);
  }
  return parts.join(" · ");
}

export async function buildServiceOrderReportPdfDocument(input: Input) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const logoDataUrl = await loadLemarcLogoDataUrl();
  const { order, entries, financials, generatedAt, authorName } = input;

  const marginX = 10;
  const marginTop = 9;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const footerReserve = 11;
  const generatedAtLabel = fmtDateTime(generatedAt.toISOString());
  const filename = buildServiceOrderReportFilename(order, generatedAt);

  let y = marginTop;

  const txt = (value: string, x: number, yy: number, options?: TextOptions) => {
    doc.setFont("helvetica", options?.style ?? "normal");
    doc.setFontSize(options?.size ?? 8);
    doc.setTextColor(...(options?.color ?? LEMARC_COLORS.ink));
    doc.text(sanitizePdfText(value), x, yy, {
      maxWidth: options?.maxWidth,
      align: options?.align,
    });
  };

  const split = (value: string, width: number): string[] =>
    doc.splitTextToSize(sanitizePdfText(value), width) as string[];

  const drawLogoFallback = (x: number, yy: number, targetHeight: number) => {
    doc.setFillColor(...LEMARC_COLORS.orange);
    doc.roundedRect(x, yy, targetHeight, targetHeight, 1.1, 1.1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(targetHeight * 2.1);
    doc.setTextColor(255, 255, 255);
    doc.text("L", x + targetHeight / 2, yy + targetHeight * 0.72, { align: "center" });
    txt("LEMARC", x + targetHeight + 2, yy + targetHeight * 0.72, {
      size: 10.5,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
  };

  const drawLogo = (x: number, yy: number, targetHeight: number) => {
    const width = targetHeight * LEMARC_LOGO_ASPECT;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", x, yy, width, targetHeight, undefined, "FAST");
        return width;
      } catch {
        drawLogoFallback(x, yy, targetHeight);
        return width;
      }
    }
    drawLogoFallback(x, yy, targetHeight);
    return width;
  };

  const drawStatusBadge = (
    status: ServiceOrder["status"],
    xRight: number,
    yy: number,
    height = 5,
  ) => {
    const label = sanitizePdfText(statusLabel[status]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const width = doc.getTextWidth(label) + 5;
    doc.setFillColor(...statusBadgeColor(status));
    doc.roundedRect(xRight - width, yy - height + 1, width, height, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(label, xRight - width / 2, yy - 0.45, { align: "center" });
  };

  const drawHeader = (compact = false) => {
    const top = marginTop;
    if (compact) {
      const logoH = 6;
      const logoW = drawLogo(marginX, top + 1, logoH);
      const infoX = marginX + logoW + 4;
      txt(LEMARC_COMPANY.legalName, infoX, top + 3.4, {
        size: 7.2,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(`CNPJ ${LEMARC_COMPANY.cnpj}`, infoX, top + 6.8, {
        size: 6.2,
        color: LEMARC_COLORS.slate,
      });
      txt(`Relatório da OS #${order.number}`, pageWidth - marginX, top + 3.4, {
        size: 7.2,
        style: "bold",
        color: LEMARC_COLORS.navy,
        align: "right",
      });
      txt(statusLabel[order.status], pageWidth - marginX, top + 6.8, {
        size: 6.2,
        color: LEMARC_COLORS.slate,
        align: "right",
      });
      doc.setDrawColor(...LEMARC_COLORS.orange);
      doc.setLineWidth(0.45);
      doc.line(marginX, top + 10.5, pageWidth - marginX, top + 10.5);
      y = top + 15;
      return;
    }

    const logoH = 12;
    const logoW = drawLogo(marginX, top + 1.5, logoH);
    const infoX = marginX + logoW + 6;
    txt(LEMARC_COMPANY.legalName, infoX, top + 4, {
      size: 8,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    txt(`${LEMARC_COMPANY.address} · ${LEMARC_COMPANY.city}`, infoX, top + 7.8, {
      size: 6.8,
      color: LEMARC_COLORS.slate,
    });
    txt(`Fone: ${LEMARC_COMPANY.phone} · ${LEMARC_COMPANY.email}`, infoX, top + 11, {
      size: 6.8,
      color: LEMARC_COLORS.slate,
    });
    txt(`CNPJ: ${LEMARC_COMPANY.cnpj}`, infoX, top + 14.2, {
      size: 6.8,
      color: LEMARC_COLORS.slate,
    });
    txt(`OS #${order.number}`, pageWidth - marginX, top + 4, {
      size: 7,
      color: LEMARC_COLORS.slate,
      align: "right",
    });
    txt(generatedAtLabel, pageWidth - marginX, top + 8, {
      size: 7.5,
      style: "bold",
      color: LEMARC_COLORS.navy,
      align: "right",
    });
    if (authorName) {
      txt(`Por ${authorName}`, pageWidth - marginX, top + 11.6, {
        size: 6.5,
        color: LEMARC_COLORS.slate,
        align: "right",
      });
    }
    doc.setDrawColor(...LEMARC_COLORS.orange);
    doc.setLineWidth(0.75);
    doc.line(marginX, top + 18.5, pageWidth - marginX, top + 18.5);
    txt(`RELATÓRIO DE OS #${order.number}`, marginX, top + 25, {
      size: 12.5,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    txt(order.title || "OS sem título", marginX, top + 30, {
      size: 8,
      color: LEMARC_COLORS.slate,
      maxWidth: contentWidth - 46,
    });
    drawStatusBadge(order.status, pageWidth - marginX, top + 27.6);
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, top + 33.5, pageWidth - marginX, top + 33.5);
    y = top + 37.5;
  };

  const ensurePage = (height: number) => {
    if (y + height <= pageHeight - footerReserve) return;
    doc.addPage();
    drawHeader(true);
  };

  const section = (title: string) => {
    ensurePage(9);
    y += 2.5;
    txt(title.toUpperCase(), marginX, y, {
      size: 8.3,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });
    y += 2;
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4.2;
  };

  const fieldGrid = (cells: FieldCell[], cols = 3) => {
    const gap = 4;
    const colW = (contentWidth - gap * (cols - 1)) / cols;
    for (let start = 0; start < cells.length; start += cols) {
      const row = cells.slice(start, start + cols);
      const prepared = row.map((cell) => ({
        ...cell,
        lines: split(cell.value || EMPTY, colW),
      }));
      const rowH = Math.max(9, Math.max(...prepared.map((cell) => cell.lines.length)) * 3.2 + 5);
      ensurePage(rowH + 1);
      prepared.forEach((cell, index) => {
        const x = marginX + index * (colW + gap);
        txt(cell.label.toUpperCase(), x, y + 2.4, {
          size: 5.8,
          style: "bold",
          color: LEMARC_COLORS.slateSoft,
        });
        txt(cell.lines.join("\n"), x, y + 6, {
          size: 7.6,
          style: "bold",
          color: LEMARC_COLORS.ink,
          maxWidth: colW,
        });
      });
      y += rowH + 1;
    }
  };

  const workBox = (items: WorkItem[]) => {
    const prepared = items.map((item) => ({
      ...item,
      lines: split(item.value, contentWidth - 8),
    }));
    const height =
      prepared.reduce((total, item) => total + 6 + Math.max(1, item.lines.length) * 3.35, 5) +
      Math.max(0, prepared.length - 1) * 1.2;
    ensurePage(height + 1);
    doc.setDrawColor(...LEMARC_COLORS.borderSoft);
    doc.setFillColor(...LEMARC_COLORS.zebra);
    doc.roundedRect(marginX, y, contentWidth, height, 1.5, 1.5, "FD");
    let yy = y + 4;
    prepared.forEach((item, index) => {
      if (index > 0) {
        doc.setDrawColor(...LEMARC_COLORS.borderSoft);
        doc.line(marginX + 3, yy - 1.3, pageWidth - marginX - 3, yy - 1.3);
      }
      txt(item.label.toUpperCase(), marginX + 4, yy, {
        size: 6.1,
        style: "bold",
        color: LEMARC_COLORS.slateSoft,
      });
      yy += 3.4;
      txt(item.lines.join("\n"), marginX + 4, yy, {
        size: 7.8,
        color: LEMARC_COLORS.ink,
        maxWidth: contentWidth - 8,
      });
      yy += Math.max(1, item.lines.length) * 3.35 + 2.4;
    });
    y += height + 1.5;
  };

  const table = (cols: TableCol[], rows: string[][], emptyText: string) => {
    if (rows.length === 0) {
      ensurePage(8);
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.setFillColor(...LEMARC_COLORS.bgSoft);
      doc.roundedRect(marginX, y, contentWidth, 8, 1.3, 1.3, "FD");
      txt(emptyText, marginX + 3, y + 5, { size: 7.5, color: LEMARC_COLORS.slate });
      y += 10;
      return;
    }

    const drawTableHeader = () => {
      ensurePage(6.2);
      doc.setFillColor(...LEMARC_COLORS.bgSoft);
      doc.rect(marginX, y, contentWidth, 6.2, "F");
      doc.setDrawColor(...LEMARC_COLORS.border);
      doc.line(marginX, y + 6.2, marginX + contentWidth, y + 6.2);
      let x = marginX;
      cols.forEach((col) => {
        const tx =
          col.align === "right"
            ? x + col.width - 1.3
            : col.align === "center"
              ? x + col.width / 2
              : x + 1.3;
        txt(col.label, tx, y + 4.1, {
          size: 6.2,
          style: "bold",
          color: LEMARC_COLORS.navy,
          align: col.align ?? "left",
          maxWidth: col.width - 2,
        });
        x += col.width;
      });
      y += 6.2;
    };

    drawTableHeader();
    let zebra = false;
    rows.forEach((row) => {
      const wrapped = row.map((cell, index) => split(cell, Math.max(8, cols[index].width - 2.5)));
      const rowH = Math.max(5.7, Math.max(...wrapped.map((lines) => lines.length)) * 3 + 2.3);
      if (y + rowH > pageHeight - footerReserve) {
        doc.addPage();
        drawHeader(true);
        drawTableHeader();
        zebra = false;
      }
      if (zebra) {
        doc.setFillColor(...LEMARC_COLORS.zebra);
        doc.rect(marginX, y, contentWidth, rowH, "F");
      }
      doc.setDrawColor(...LEMARC_COLORS.borderSoft);
      doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH);
      let x = marginX;
      row.forEach((_cell, index) => {
        const col = cols[index];
        const lines = wrapped[index].join("\n");
        const tx =
          col.align === "right"
            ? x + col.width - 1.3
            : col.align === "center"
              ? x + col.width / 2
              : x + 1.3;
        txt(lines, tx, y + 3.5, {
          size: 6.8,
          color: LEMARC_COLORS.ink,
          align: col.align ?? "left",
          maxWidth: col.width - 2.5,
        });
        x += col.width;
      });
      y += rowH;
      zebra = !zebra;
    });
    y += 1.5;
  };

  const noticeBox = (text: string, tone: "warn" | "info" = "warn", width = contentWidth) => {
    const lines = split(text, width - 6);
    const height = Math.max(8, lines.length * 3.3 + 4.5);
    doc.setDrawColor(...(tone === "warn" ? LEMARC_COLORS.orangeSoft : LEMARC_COLORS.border));
    doc.setFillColor(
      ...(tone === "warn"
        ? ([255, 247, 237] as [number, number, number])
        : LEMARC_COLORS.bgSoft),
    );
    doc.roundedRect(marginX, y, width, height, 1.4, 1.4, "FD");
    txt(lines.join("\n"), marginX + 3, y + 4.6, {
      size: 7.3,
      color: tone === "warn" ? LEMARC_COLORS.amber : LEMARC_COLORS.slate,
      maxWidth: width - 6,
    });
    y += height;
  };

  const drawTotalsAndSignature = () => {
    const totalRows: [string, string][] = financials
      ? [
          ["Horas totais", formatHHmm(financials.total_labor_minutes)],
          ["Mão de obra", formatBRL(financials.total_labor_cents)],
          ["Deslocamento", formatBRL(financials.displacement_total_cents)],
        ]
      : [];
    if (financials?.materials_total_cents && financials.materials_total_cents > 0) {
      totalRows.push(["Materiais", formatBRL(financials.materials_total_cents)]);
    }

    const displacementLines = financials
      ? split(displacementDetail(financials), contentWidth - 8)
      : [];
    const displacementNoteLines = financials?.displacement_notes
      ? split(financials.displacement_notes, contentWidth - 8)
      : [];
    const totalsH = financials
      ? 10 +
        totalRows.length * 4.25 +
        8 +
        Math.max(1, displacementLines.length) * 3 +
        displacementNoteLines.length * 3
      : 10;

    const signatureH = order.signature
      ? 32
      : order.signature_waiver_reason
        ? Math.max(14, split(order.signature_waiver_reason, contentWidth - 8).length * 3.2 + 8)
        : 10;
    const groupH = totalsH + 2.5 + signatureH;
    ensurePage(groupH);

    if (financials) {
      doc.setDrawColor(...LEMARC_COLORS.navy);
      doc.setLineWidth(0.35);
      doc.setFillColor(...LEMARC_COLORS.bgSoft);
      doc.roundedRect(marginX, y, contentWidth, totalsH, 1.5, 1.5, "FD");
      txt("TOTAIS DA OS", marginX + 4, y + 4.8, {
        size: 7.4,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      let ry = y + 9;
      totalRows.forEach(([label, value]) => {
        txt(label, marginX + 4, ry, { size: 7.5, color: LEMARC_COLORS.slate });
        txt(value, pageWidth - marginX - 4, ry, {
          size: 7.5,
          style: "bold",
          color: LEMARC_COLORS.ink,
          align: "right",
        });
        ry += 4.25;
      });
      doc.setDrawColor(...LEMARC_COLORS.navy);
      doc.setLineWidth(0.35);
      doc.line(marginX + 3, ry - 1.6, pageWidth - marginX - 3, ry - 1.6);
      txt("Total geral", marginX + 4, ry + 3, {
        size: 8.6,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      txt(formatBRL(financials.grand_total_cents), pageWidth - marginX - 4, ry + 3, {
        size: 10.5,
        style: "bold",
        color: LEMARC_COLORS.orange,
        align: "right",
      });
      ry += 7.2;
      txt(displacementLines.join("\n"), marginX + 4, ry, {
        size: 6.7,
        color: LEMARC_COLORS.slate,
        maxWidth: contentWidth - 8,
      });
      ry += Math.max(1, displacementLines.length) * 3;
      if (displacementNoteLines.length > 0) {
        txt(displacementNoteLines.join("\n"), marginX + 4, ry, {
          size: 6.6,
          color: LEMARC_COLORS.slateSoft,
          maxWidth: contentWidth - 8,
        });
      }
      y += totalsH + 2.5;
    } else {
      noticeBox("Apuração financeira pendente — finalize a OS para gerar os totais.");
      y += 2.5;
    }

    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setFillColor(...LEMARC_COLORS.bgSoft);
    doc.roundedRect(marginX, y, contentWidth, signatureH, 1.5, 1.5, "FD");
    txt("ASSINATURA DO RESPONSÁVEL", marginX + 4, y + 4.8, {
      size: 7.4,
      style: "bold",
      color: LEMARC_COLORS.navy,
    });

    if (order.signature) {
      const sig = order.signature;
      const sigW = 62;
      const sigH = 21;
      const sigX = marginX + 4;
      const sigY = y + 7.5;
      doc.setDrawColor(...LEMARC_COLORS.borderSoft);
      doc.setFillColor(255, 255, 255);
      doc.rect(sigX, sigY, sigW, sigH, "FD");
      if (sig.signature_data_url) {
        try {
          doc.addImage(
            sig.signature_data_url,
            "PNG",
            sigX + 1,
            sigY + 1,
            sigW - 2,
            sigH - 2,
            undefined,
            "FAST",
          );
        } catch {
          txt("imagem indisponível", sigX + sigW / 2, sigY + sigH / 2, {
            size: 6.5,
            color: LEMARC_COLORS.slateSoft,
            align: "center",
          });
        }
      } else {
        txt("imagem indisponível", sigX + sigW / 2, sigY + sigH / 2, {
          size: 6.5,
          color: LEMARC_COLORS.slateSoft,
          align: "center",
        });
      }

      const metaX = sigX + sigW + 5;
      txt(sig.signed_by_name, metaX, y + 10.2, {
        size: 9,
        style: "bold",
        color: LEMARC_COLORS.navy,
      });
      if (sig.signed_by_role) {
        txt(sig.signed_by_role, metaX, y + 14, { size: 7, color: LEMARC_COLORS.slate });
      }
      txt(`Assinado em ${fmtDateTime(sig.signed_at)}`, metaX, y + 18.5, {
        size: 7.2,
        color: LEMARC_COLORS.ink,
      });
      if (sig.signature_hash) {
        txt(`Registro: SIG-${shortHash(sig.signature_hash)}`, metaX, y + 22.5, {
          size: 6.7,
          color: LEMARC_COLORS.slate,
        });
      }
      txt(
        "Rastreabilidade operacional — não substitui assinatura jurídica formal.",
        metaX,
        y + 27,
        {
          size: 6.2,
          color: LEMARC_COLORS.slateSoft,
          maxWidth: contentWidth - (metaX - marginX) - 4,
        },
      );
    } else if (order.signature_waiver_reason) {
      const parts = [`Finalizada sem assinatura: ${order.signature_waiver_reason}`];
      if (order.signature_waived_at) parts.push(`(${fmtDateTime(order.signature_waived_at)})`);
      txt(parts.join(" "), marginX + 4, y + 9.5, {
        size: 7.2,
        color: LEMARC_COLORS.amber,
        maxWidth: contentWidth - 8,
      });
    } else {
      txt("Assinatura não registrada.", marginX + 4, y + 9.5, {
        size: 7.2,
        color: LEMARC_COLORS.slate,
      });
    }
    y += signatureH + 1.5;
  };

  drawHeader(false);

  const techs = getOrderTechnicians(order);
  const primary = techs.find((technician) => technician.is_primary) ?? techs[0];
  const unitName = order.client_unit?.name ?? order.client?.unit ?? EMPTY;
  const localSetor = joinParts([order.location, order.client_unit?.sector], " / ");

  section("Identificação");
  fieldGrid([
    { label: "Empresa", value: order.client?.name ?? EMPTY },
    { label: "CNPJ da empresa", value: order.client?.cnpj ? maskCNPJ(order.client.cnpj) : EMPTY },
    { label: "Unidade", value: unitName },
    {
      label: "CNPJ da unidade",
      value: order.client_unit?.cnpj ? maskCNPJ(order.client_unit.cnpj) : EMPTY,
    },
    { label: "Local / setor", value: localSetor },
    { label: "Solicitante", value: order.requester_name ?? EMPTY },
    { label: "Prioridade", value: order.priority ? priorityLabel[order.priority] : EMPTY },
    { label: "Tipo de serviço", value: serviceTypeFor(order) },
    { label: "Técnico responsável", value: primary?.full_name ?? EMPTY },
  ]);

  const executedDescriptions = entries
    .map((entry, index) => {
      const description = entry.description?.trim();
      if (!description) return null;
      const technician = entry.technician?.full_name ? `${entry.technician.full_name}: ` : "";
      return `${index + 1}. ${technician}${description}`;
    })
    .filter((description): description is string => Boolean(description));

  const workItems: WorkItem[] = [
    {
      label: "Descrição inicial / chamado",
      value: order.description?.trim() || "Sem descrição cadastrada.",
    },
  ];
  if (executedDescriptions.length > 0) {
    workItems.push({ label: "Serviço executado", value: executedDescriptions.join("\n") });
  }
  if (financials?.notes?.trim()) {
    workItems.push({ label: "Observações da apuração", value: financials.notes.trim() });
  }

  section("Trabalho executado");
  workBox(workItems);

  section("Execução e valores");
  table(
    [
      { label: "Técnico", width: 43 },
      { label: "Função", width: 24 },
      { label: "Início", width: 28 },
      { label: "Fim", width: 28 },
      { label: "Horas", width: 15, align: "right" },
      { label: "R$/h", width: 24, align: "right" },
      { label: "Total", width: contentWidth - 43 - 24 - 28 - 28 - 15 - 24, align: "right" },
    ],
    entries.map((entry) => [
      entry.technician?.full_name ?? EMPTY,
      entry.role ?? EMPTY,
      fmtEntryDateTime(entry, entry.start_time),
      fmtEntryDateTime(entry, entry.end_time),
      formatHHmm(entry.duration_minutes),
      formatBRL(entry.hourly_rate_cents),
      formatBRL(entry.subtotal_cents),
    ]),
    "Sem apontamentos registrados.",
  );

  drawTotalsAndSignature();

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    const fy = pageHeight - 8;
    doc.setDrawColor(...LEMARC_COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(marginX, fy - 4, pageWidth - marginX, fy - 4);
    txt(
      `${LEMARC_COMPANY.legalName} · CNPJ ${LEMARC_COMPANY.cnpj} · ${LEMARC_COMPANY.phoneShort}`,
      marginX,
      fy,
      { size: 6.4, color: LEMARC_COLORS.slate },
    );
    txt(`Gerado em ${generatedAtLabel}`, marginX, fy + 3.2, {
      size: 6.2,
      color: LEMARC_COLORS.slateSoft,
    });
    txt(`Página ${page} de ${totalPages}`, pageWidth - marginX, fy + 3.2, {
      size: 6.4,
      style: "bold",
      color: LEMARC_COLORS.navy,
      align: "right",
    });
  }

  return { doc, filename, pages: totalPages };
}

export async function downloadServiceOrderReportPdf(input: Input) {
  const { doc, filename, pages } = await buildServiceOrderReportPdfDocument(input);
  doc.save(filename);
  return { filename, pages };
}
