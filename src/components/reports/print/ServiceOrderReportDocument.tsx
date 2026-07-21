import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { maskCNPJ } from "@/lib/cnpj";
import { LEMARC_COMPANY, LEMARC_LOGO_URL } from "@/lib/reports/lemarcBrand";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
} from "@/types/serviceOrder";
import { displacementTypeLabel, type LaborEntry, type OrderFinancials } from "@/types/financials";

type Props = {
  order: ServiceOrder;
  entries: LaborEntry[];
  financials: OrderFinancials | null;
  generatedAt: Date;
  authorName: string | null;
  /**
   * Total Líquido extraído do primeiro PDF anexado em "Materiais" (em centavos).
   * `null` = extração falhou; `undefined` = sem anexo.
   */
  materialsNetCents?: number | null;
  /** Motivo da falha, se houver. */
  materialsExtractionReason?: "not_found" | "parse_error" | null;
  /** Nome do primeiro anexo de materiais, exibido no card. */
  materialsFileName?: string | null;
};

const EMPTY = "—";

const STYLES = `
@page { size: A4; margin: 9mm 10mm 10mm; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  .os-pdf { min-height: auto !important; }
}
.os-pdf { color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 10.2px; line-height: 1.32; background: #fff; }
.os-pdf * { box-sizing: border-box; }
.os-pdf h1, .os-pdf h2, .os-pdf h3, .os-pdf p { margin: 0; }
.os-pdf h1, .os-pdf h2, .os-pdf h3 { color: #0b2545; font-weight: 800; }
.os-pdf .cover { border-bottom: 2px solid #ea580c; padding-bottom: 7px; break-inside: avoid; page-break-inside: avoid; }
.os-pdf .coverTop { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.os-pdf .brandLine { display: flex; gap: 10px; align-items: flex-start; min-width: 0; }
.os-pdf .logo { width: 142px; height: auto; display: block; margin-top: 1px; }
.os-pdf .company { font-size: 7.4px; color: #475569; line-height: 1.25; }
.os-pdf .company strong { display: block; color: #0b2545; font-size: 8.2px; margin-bottom: 1px; }
.os-pdf .meta { min-width: 128px; text-align: right; font-size: 7.6px; color: #475569; line-height: 1.35; }
.os-pdf .meta strong { color: #0b2545; font-size: 8.5px; }
.os-pdf .statusPill { display: inline-block; margin-top: 4px; padding: 2px 7px; border-radius: 999px; background: #107a57; color: #fff; font-size: 7.4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
.os-pdf .titleRow { display: flex; justify-content: space-between; gap: 14px; align-items: flex-end; margin-top: 7px; }
.os-pdf .title { font-size: 18px; line-height: 1.05; letter-spacing: 0; }
.os-pdf .subtitle { margin-top: 2px; max-width: 520px; color: #475569; font-size: 9px; font-weight: 600; }
.os-pdf .section { margin-top: 9px; break-inside: avoid; page-break-inside: avoid; }
.os-pdf .section h2 { border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 5px; font-size: 9.4px; text-transform: uppercase; letter-spacing: 0.08em; }
.os-pdf .identityGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 10px; }
.os-pdf .field { min-width: 0; }
.os-pdf .field .k { display: block; color: #64748b; font-size: 6.9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.os-pdf .field .v { margin-top: 1px; color: #0f172a; font-size: 9px; font-weight: 700; overflow-wrap: anywhere; }
.os-pdf .workBox { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background: #f8fafc; }
.os-pdf .workItem + .workItem { margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; }
.os-pdf .workItem .k { display: block; color: #64748b; font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
.os-pdf .workItem .v { margin-top: 1px; color: #0f172a; font-size: 9px; white-space: pre-wrap; }
.os-pdf .executionBlock { break-inside: auto; page-break-inside: auto; }
.os-pdf table { width: 100%; border-collapse: collapse; font-size: 8.4px; table-layout: fixed; }
.os-pdf thead { display: table-header-group; }
.os-pdf tr { break-inside: avoid; page-break-inside: avoid; }
.os-pdf th, .os-pdf td { padding: 4px 5px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.os-pdf th { background: #f1f5f9; text-align: left; text-transform: uppercase; font-size: 7.2px; letter-spacing: 0.04em; color: #334155; }
.os-pdf td.num, .os-pdf th.num { text-align: right; font-variant-numeric: tabular-nums; }
.os-pdf tr.techSubtotal td { background: #eef2ff; color: #0b2545; font-weight: 800; border-bottom: 1.2px solid #cbd5e1; }
.os-pdf tr.techSubtotal td.label { text-transform: uppercase; font-size: 7.2px; letter-spacing: 0.06em; }
.os-pdf .execNote { margin-top: 4px; color: #64748b; font-size: 7.4px; font-style: italic; }
.os-pdf .totalsSignatureGroup { margin-top: 7px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; break-inside: avoid; page-break-inside: avoid; }
.os-pdf .totalsBox, .os-pdf .signatureBox { border: 1.4px solid #cbd5e1; border-radius: 7px; background: #f8fafc; padding: 7px 9px; }
.os-pdf .boxTitle { color: #0b2545; font-size: 8.6px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.os-pdf .totalRow { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; font-size: 8.8px; }
.os-pdf .totalRow span:last-child { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.os-pdf .totalRow.grand { margin-top: 3px; padding-top: 5px; border-top: 1.4px solid #0b2545; color: #ea580c; font-size: 10.5px; font-weight: 900; }
.os-pdf .mutedNote { margin-top: 3px; color: #64748b; font-size: 7.3px; }
.os-pdf .warn { border: 1px dashed #f59e0b; color: #92400e; background: #fff7ed; border-radius: 6px; padding: 6px 7px; font-size: 8.6px; }
.os-pdf .sigContent { display: flex; gap: 8px; align-items: flex-start; }
.os-pdf .sigImg { width: 138px; height: 46px; flex: 0 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.os-pdf .sigImg img { max-width: 100%; max-height: 100%; object-fit: contain; }
.os-pdf .sigMeta { min-width: 0; font-size: 8.1px; color: #334155; line-height: 1.35; }
.os-pdf .sigMeta .name { color: #0b2545; font-size: 10px; font-weight: 900; }
.os-pdf .sigMissing { border: 1px dashed #94a3b8; color: #475569; background: #f1f5f9; border-radius: 5px; padding: 5px 6px; font-size: 8.4px; }
.os-pdf .footer { margin-top: 9px; border-top: 1px solid #e2e8f0; padding-top: 4px; display: flex; justify-content: space-between; gap: 12px; color: #64748b; font-size: 7.4px; break-inside: avoid; page-break-inside: avoid; }
`;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function fmtDateOnly(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function fmtEntryDateTime(entry: LaborEntry, time: string) {
  return `${fmtDateOnly(entry.work_date)} ${time.slice(0, 5)}`;
}

function serviceTypeFor(order: ServiceOrder) {
  if (order.service_type === "outro" && order.service_type_other) return order.service_type_other;
  return order.service_type ? serviceTypeLabel[order.service_type] : EMPTY;
}

function joinParts(parts: Array<string | null | undefined>, separator = " · ") {
  const clean = parts.map((part) => part?.trim()).filter(Boolean);
  return clean.length ? clean.join(separator) : EMPTY;
}

function shortHash(hash: string | null | undefined) {
  return hash ? hash.slice(0, 14) : null;
}

function displacementDetail(financials: OrderFinancials | null) {
  if (!financials || financials.displacement_type === "none") return "Sem deslocamento";
  const parts = [displacementTypeLabel[financials.displacement_type]];
  if (financials.displacement_type === "per_km") {
    parts.push(`${financials.displacement_count} desloc.`);
    parts.push(`${financials.displacement_km_total} km`);
    parts.push(`${formatBRL(financials.displacement_rate_cents)}/km`);
  }
  return parts.join(" · ");
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span className="k">{label}</span>
      <div className="v">{value}</div>
    </div>
  );
}

function WorkItem({ label, children }: { label: string; children: string }) {
  return (
    <div className="workItem">
      <span className="k">{label}</span>
      <div className="v">{children}</div>
    </div>
  );
}

export function ServiceOrderReportDocument({
  order,
  entries,
  financials,
  generatedAt,
  authorName,
  materialsNetCents,
  materialsExtractionReason,
  materialsFileName,
}: Props) {
  const techs = getOrderTechnicians(order);
  const primary = techs.find((t) => t.is_primary) ?? techs[0];

  // Agrupa entries por técnico preservando a ordem por data/hora.
  const orderedEntries = [...entries].sort((a, b) => {
    const byDate = a.work_date.localeCompare(b.work_date);
    if (byDate !== 0) return byDate;
    return a.start_time.localeCompare(b.start_time);
  });
  const grouped = new Map<string, LaborEntry[]>();
  for (const e of orderedEntries) {
    const key = e.technician_id ?? e.technician?.id ?? "sem-tecnico";
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }

  // Resumo executado: horas por técnico (não repete "Calculado automaticamente").
  const executedSummaryLines: string[] = [];
  let summaryIndex = 1;
  for (const [, list] of grouped) {
    const name = list[0].technician?.full_name ?? "Técnico";
    const totalMin = list.reduce((acc, e) => acc + (e.duration_minutes ?? 0), 0);
    executedSummaryLines.push(
      `${summaryIndex}. ${name}: ${formatHHmm(totalMin)} horas trabalhadas`,
    );
    summaryIndex += 1;
  }
  const executedDescriptions = executedSummaryLines.join("\n");

  const workNotes = financials?.notes?.trim();
  const unitName = order.client_unit?.name ?? order.client?.unit ?? EMPTY;
  const localSetor = joinParts([order.location, order.client_unit?.sector], " / ");

  const hasMaterialAttachment =
    materialsNetCents !== undefined || Boolean(materialsFileName);
  const materialsExtractionFailed =
    hasMaterialAttachment && materialsNetCents == null;
  const grandTotalWithMaterialsCents =
    (financials?.grand_total_cents ?? 0) + (materialsNetCents ?? 0);

  return (
    <div className="os-pdf">
      <style>{STYLES}</style>
      <header className="cover">
        <div className="coverTop">
          <div className="brandLine">
            <img className="logo" src={LEMARC_LOGO_URL} alt="Lemarc" />
            <div className="company">
              <strong>{LEMARC_COMPANY.legalName}</strong>
              <div>
                {LEMARC_COMPANY.address} · {LEMARC_COMPANY.city}
              </div>
              <div>
                Fone: {LEMARC_COMPANY.phone} · {LEMARC_COMPANY.email}
              </div>
              <div>CNPJ: {LEMARC_COMPANY.cnpj}</div>
            </div>
          </div>
          <div className="meta">
            <div>OS #{order.number}</div>
            <strong>{fmtDate(generatedAt.toISOString())}</strong>
            {authorName && <div>Por {authorName}</div>}
            <span className="statusPill">{statusLabel[order.status]}</span>
          </div>
        </div>
        <div className="titleRow">
          <div>
            <h1 className="title">RELATÓRIO DE OS #{order.number}</h1>
            <div className="subtitle">{order.title || "OS sem título"}</div>
          </div>
        </div>
      </header>

      <section className="section">
        <h2>Identificação</h2>
        <div className="identityGrid">
          <Field label="Empresa" value={order.client?.name ?? EMPTY} />
          <Field
            label="CNPJ da empresa"
            value={order.client?.cnpj ? maskCNPJ(order.client.cnpj) : EMPTY}
          />
          <Field label="Unidade" value={unitName} />
          <Field
            label="CNPJ da unidade"
            value={order.client_unit?.cnpj ? maskCNPJ(order.client_unit.cnpj) : EMPTY}
          />
          <Field label="Local / setor" value={localSetor} />
          <Field label="Solicitante" value={order.requester_name ?? EMPTY} />
          <Field
            label="Prioridade"
            value={order.priority ? priorityLabel[order.priority] : EMPTY}
          />
          <Field label="Tipo de serviço" value={serviceTypeFor(order)} />
          <Field label="Técnico responsável" value={primary?.full_name ?? EMPTY} />
        </div>
      </section>

      <section className="section">
        <h2>Trabalho executado</h2>
        <div className="workBox">
          <WorkItem label="Descrição inicial / chamado">
            {order.description?.trim() || "Sem descrição cadastrada."}
          </WorkItem>
          {executedDescriptions && (
            <WorkItem label="Serviço executado">{executedDescriptions}</WorkItem>
          )}
          {workNotes && <WorkItem label="Observações da apuração">{workNotes}</WorkItem>}
        </div>
      </section>

      <section className="section executionBlock">
        <h2>Execução e valores</h2>
        {entries.length === 0 ? (
          <div className="sigMissing">Sem apontamentos registrados.</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Técnico</th>
                  <th style={{ width: "14%" }}>Função</th>
                  <th style={{ width: "18%" }}>Início</th>
                  <th style={{ width: "18%" }}>Fim</th>
                  <th className="num" style={{ width: "8%" }}>
                    Horas
                  </th>
                  <th className="num" style={{ width: "9%" }}>
                    R$/h
                  </th>
                  <th className="num" style={{ width: "9%" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...grouped.entries()].flatMap(([techKey, list]) => {
                  const rows = list.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.technician?.full_name ?? EMPTY}</td>
                      <td>{entry.role ?? EMPTY}</td>
                      <td>{fmtEntryDateTime(entry, entry.start_time)}</td>
                      <td>{fmtEntryDateTime(entry, entry.end_time)}</td>
                      <td className="num">{formatHHmm(entry.duration_minutes)}</td>
                      <td className="num">{formatBRL(entry.hourly_rate_cents)}</td>
                      <td className="num">{formatBRL(entry.subtotal_cents)}</td>
                    </tr>
                  ));
                  if (list.length > 1) {
                    const totalMin = list.reduce((a, e) => a + (e.duration_minutes ?? 0), 0);
                    const totalCents = list.reduce((a, e) => a + (e.subtotal_cents ?? 0), 0);
                    rows.push(
                      <tr key={`${techKey}-subtotal`} className="techSubtotal">
                        <td colSpan={4} className="label">
                          Subtotal · {list[0].technician?.full_name ?? EMPTY}
                        </td>
                        <td className="num">{formatHHmm(totalMin)}</td>
                        <td className="num">—</td>
                        <td className="num">{formatBRL(totalCents)}</td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
            <div className="execNote">
              Horas trabalhadas não incluem intervalos de pausa. O total financeiro é calculado
              apenas sobre as horas efetivamente trabalhadas.
            </div>
          </>
        )}

        <div className="totalsSignatureGroup">
          {financials ? (
            <div className="totalsBox">
              <div className="boxTitle">Totais da OS</div>
              <div className="totalRow">
                <span>Horas totais</span>
                <span>{formatHHmm(financials.total_labor_minutes)}</span>
              </div>
              <div className="totalRow">
                <span>Mão de obra</span>
                <span>{formatBRL(financials.total_labor_cents)}</span>
              </div>
              <div className="totalRow">
                <span>Deslocamento</span>
                <span>{formatBRL(financials.displacement_total_cents)}</span>
              </div>
              {financials.materials_total_cents > 0 && (
                <div className="totalRow">
                  <span>Materiais</span>
                  <span>{formatBRL(financials.materials_total_cents)}</span>
                </div>
              )}
              <div className="totalRow grand">
                <span>Total geral</span>
                <span>{formatBRL(financials.grand_total_cents)}</span>
              </div>
              <div className="mutedNote">{displacementDetail(financials)}</div>
              {financials.displacement_notes && (
                <div className="mutedNote">{financials.displacement_notes}</div>
              )}
            </div>
          ) : (
            <div className="warn">
              Apuração financeira pendente — finalize a OS para gerar os totais.
            </div>
          )}

          {hasMaterialAttachment && financials && (
            <div className="totalsBox">
              <div className="boxTitle">Total geral com materiais</div>
              <div className="totalRow">
                <span>Total da OS</span>
                <span>{formatBRL(financials.grand_total_cents)}</span>
              </div>
              <div className="totalRow">
                <span>
                  Total dos materiais (anexo)
                  {materialsFileName ? ` · ${materialsFileName}` : ""}
                </span>
                <span>
                  {materialsExtractionFailed ? "—" : formatBRL(materialsNetCents ?? 0)}
                </span>
              </div>
              <div className="totalRow grand">
                <span>Total final</span>
                <span>
                  {materialsExtractionFailed
                    ? formatBRL(financials.grand_total_cents)
                    : formatBRL(grandTotalWithMaterialsCents)}
                </span>
              </div>
              {materialsExtractionFailed ? (
                <div className="mutedNote">
                  Não foi possível extrair o Total Líquido do PDF de materiais — total final
                  exibido considera apenas a OS.
                </div>
              ) : (
                <div className="mutedNote">
                  Total Líquido extraído automaticamente do PDF de materiais anexado.
                </div>
              )}
            </div>
          )}

          <div className="signatureBox">
            <div className="boxTitle">Assinatura do responsável</div>
            {order.signature ? (
              <div className="sigContent">
                <div className="sigImg">
                  {order.signature.signature_data_url ? (
                    <img
                      src={order.signature.signature_data_url}
                      alt={`Assinatura de ${order.signature.signed_by_name}`}
                    />
                  ) : (
                    <span style={{ fontSize: 8, color: "#94a3b8" }}>imagem indisponível</span>
                  )}
                </div>
                <div className="sigMeta">
                  <div className="name">{order.signature.signed_by_name}</div>
                  {order.signature.signed_by_role && <div>{order.signature.signed_by_role}</div>}
                  <div>Assinado em {fmtDate(order.signature.signed_at)}</div>
                  {order.signature.signature_hash && (
                    <div>Registro: SIG-{shortHash(order.signature.signature_hash)}</div>
                  )}
                  <div className="mutedNote">
                    Rastreabilidade operacional — não substitui assinatura jurídica formal.
                  </div>
                </div>
              </div>
            ) : order.signature_waiver_reason ? (
              <div className="warn">
                <strong>Finalizada sem assinatura.</strong> {order.signature_waiver_reason}
                {order.signature_waived_at ? ` (${fmtDate(order.signature_waived_at)})` : ""}
              </div>
            ) : (
              <div className="sigMissing">Assinatura não registrada.</div>
            )}
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Gestão Lemarc · Relatório de OS #{order.number}</span>
        <span>Gerado em {fmtDate(generatedAt.toISOString())}</span>
      </footer>
    </div>
  );
}
