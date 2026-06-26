import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { displacementTypeLabel } from "@/types/financials";
import type { LaborEntry, OrderFinancials } from "@/types/financials";
import type { ServiceOrder } from "@/types/serviceOrder";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";

type Props = {
  order: ServiceOrder;
  entries: LaborEntry[];
  financials: OrderFinancials | null;
  generatedAt: Date;
  authorName: string | null;
};

const STYLES = `
@page { size: A4; margin: 14mm 12mm; }
@media print { .no-print { display: none !important; } body { background: #fff !important; } }
.os-pdf { color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; line-height: 1.5; background: #fff; }
.os-pdf h1, .os-pdf h2, .os-pdf h3 { color: #0b2545; font-weight: 800; margin: 0; }
.os-pdf .accent { color: #ea580c; }
.os-pdf .cover { border-bottom: 3px solid #0b2545; padding-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.os-pdf .cover .brand { font-size: 18px; letter-spacing: 1px; }
.os-pdf .cover .title { font-size: 24px; margin-top: 4px; }
.os-pdf .cover .meta { font-size: 10.5px; color: #475569; text-align: right; }
.os-pdf .section { margin-top: 18px; page-break-inside: avoid; }
.os-pdf .section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; color: #0b2545; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
.os-pdf .metaGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 18px; font-size: 11px; }
.os-pdf .metaGrid .k { color: #64748b; font-weight: 600; }
.os-pdf table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
.os-pdf th, .os-pdf td { padding: 6px 7px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.os-pdf th { background: #f1f5f9; text-align: left; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.6px; color: #334155; }
.os-pdf td.num, .os-pdf th.num { text-align: right; font-variant-numeric: tabular-nums; }
.os-pdf .totalsBox { margin-top: 12px; border: 2px solid #0b2545; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
.os-pdf .totalsBox .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11.5px; }
.os-pdf .totalsBox .grand { border-top: 2px solid #0b2545; margin-top: 6px; padding-top: 8px; font-size: 14px; font-weight: 900; color: #ea580c; }
.os-pdf .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #0b2545; color: #fff; font-size: 9.5px; letter-spacing: 0.6px; }
.os-pdf .footer { margin-top: 22px; font-size: 9.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; }
.os-pdf .warn { margin-top: 10px; padding: 8px 10px; border: 1px dashed #f59e0b; color: #92400e; background: #fef3c7; border-radius: 6px; font-size: 11px; }
`;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function fmtDateOnly(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function ServiceOrderReportDocument({
  order,
  entries,
  financials,
  generatedAt,
  authorName,
}: Props) {
  const techs = getOrderTechnicians(order);
  return (
    <div className="os-pdf">
      <style>{STYLES}</style>
      <header className="cover">
        <div>
          <div className="brand accent">LEMARC</div>
          <h1 className="title">RELATÓRIO DE ATIVIDADES</h1>
          <div className="pill">OS #{order.number}</div>
        </div>
        <div className="meta">
          Emitido em {fmtDate(generatedAt.toISOString())}
          <br />
          {authorName ? `Por ${authorName}` : null}
        </div>
      </header>

      <section className="section">
        <h2>Identificação</h2>
        <div className="metaGrid">
          <div>
            <span className="k">Cliente:</span> {order.client?.name ?? "—"}
          </div>
          <div>
            <span className="k">Unidade:</span>{" "}
            {order.client_unit?.name ?? order.client?.unit ?? "—"}
          </div>
          <div>
            <span className="k">Local:</span> {order.location ?? "—"}
          </div>
          <div>
            <span className="k">Abertura:</span> {fmtDate(order.opened_at)}
          </div>
          <div>
            <span className="k">Fechamento:</span> {fmtDate(order.finished_at ?? order.closed_at)}
          </div>
          <div>
            <span className="k">Responsável:</span>{" "}
            {techs.find((t) => t.is_primary)?.full_name ?? techs[0]?.full_name ?? "—"}
          </div>
          <div>
            <span className="k">Solicitante:</span> {order.requester_name ?? "—"}
          </div>
          <div style={{ gridColumn: "1 / span 2" }}>
            <span className="k">Técnicos envolvidos:</span>{" "}
            {techs.length ? techs.map((t) => t.full_name).join(", ") : "—"}
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Trabalhos executados</h2>
        <p>{order.description?.trim() || "Sem descrição cadastrada."}</p>
      </section>

      <section className="section">
        <h2>Apuração de horas</h2>
        {entries.length === 0 ? (
          <p>Sem apontamentos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Funcionário</th>
                <th>Função</th>
                <th>Data</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th className="num">Horas</th>
                <th className="num">R$/h</th>
                <th className="num">Subtotal</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.technician?.full_name ?? "—"}</td>
                  <td>{e.role ?? "—"}</td>
                  <td>{fmtDateOnly(e.work_date)}</td>
                  <td>{e.start_time.slice(0, 5)}</td>
                  <td>{e.end_time.slice(0, 5)}</td>
                  <td className="num">{formatHHmm(e.duration_minutes)}</td>
                  <td className="num">{formatBRL(e.hourly_rate_cents)}</td>
                  <td className="num">{formatBRL(e.subtotal_cents)}</td>
                  <td>{e.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {financials && financials.displacement_type !== "none" && (
        <section className="section">
          <h2>Deslocamento</h2>
          <p>
            <strong>{displacementTypeLabel[financials.displacement_type]}</strong>
            {financials.displacement_type === "per_km" && (
              <>
                {" "}
                — {financials.displacement_count} desloc. · {financials.displacement_km_total} km ·{" "}
                {formatBRL(financials.displacement_rate_cents)}/km
              </>
            )}
            {" — "}
            <strong>{formatBRL(financials.displacement_total_cents)}</strong>
          </p>
          {financials.displacement_notes && <p>{financials.displacement_notes}</p>}
        </section>
      )}

      <section className="section">
        <h2>Resumo financeiro</h2>
        {financials ? (
          <div className="totalsBox">
            <div className="row">
              <span>Total de horas trabalhadas</span>
              <span>{formatHHmm(financials.total_labor_minutes)}</span>
            </div>
            <div className="row">
              <span>Total mão de obra</span>
              <span>{formatBRL(financials.total_labor_cents)}</span>
            </div>
            <div className="row">
              <span>Deslocamento</span>
              <span>{formatBRL(financials.displacement_total_cents)}</span>
            </div>
            {financials.materials_total_cents > 0 && (
              <div className="row">
                <span>Materiais</span>
                <span>{formatBRL(financials.materials_total_cents)}</span>
              </div>
            )}
            <div className="row grand">
              <span>TOTAL GERAL DA OS</span>
              <span>{formatBRL(financials.grand_total_cents)}</span>
            </div>
          </div>
        ) : (
          <div className="warn">
            Apuração financeira pendente — finalize a OS para gerar os totais.
          </div>
        )}
      </section>

      {financials?.notes && (
        <section className="section">
          <h2>Observações</h2>
          <p>{financials.notes}</p>
        </section>
      )}

      <footer className="footer">
        <span>Gestão Lemarc — Relatório de OS #{order.number}</span>
        <span>Página gerada em {fmtDate(generatedAt.toISOString())}</span>
      </footer>
    </div>
  );
}
