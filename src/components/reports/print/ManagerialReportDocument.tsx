import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatHours,
  formatNumber,
  formatPercent,
} from "@/lib/reports/formatters";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
} from "@/types/serviceOrder";
import type {
  ManagerialReport,
  ReportOrderRow,
} from "@/types/reports";
import { getReportRowTechnicians } from "@/lib/serviceOrders/technicians";
import lemarcLogo from "@/assets/lemarc-logo.png.asset.json";

type Props = {
  report: ManagerialReport;
  periodLabel: string;
  generatedAt: Date;
  authorName: string | null;
};

const PRINT_STYLES = `
@page { size: A4; margin: 14mm 12mm; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
}
.lemarc-pdf { color: #0f172a; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 11px; line-height: 1.45; background: #fff; }
.lemarc-pdf h1, .lemarc-pdf h2, .lemarc-pdf h3 { color: #0b2545; font-weight: 800; margin: 0; }
.lemarc-pdf .accent { color: #ea580c; }
.lemarc-pdf .section { margin-top: 18px; page-break-inside: avoid; }
.lemarc-pdf .cover { border-bottom: 2px solid #0b2545; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.lemarc-pdf .cover .title { font-size: 20px; }
.lemarc-pdf .cover .meta { font-size: 10px; color: #475569; text-align: right; }
.lemarc-pdf .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
.lemarc-pdf .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
.lemarc-pdf .kpi .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
.lemarc-pdf .kpi .val { font-size: 15px; font-weight: 800; color: #0b2545; margin-top: 2px; }
.lemarc-pdf table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
.lemarc-pdf th, .lemarc-pdf td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: left; vertical-align: top; }
.lemarc-pdf th { background: #f1f5f9; font-weight: 700; color: #0b2545; }
.lemarc-pdf tr { page-break-inside: avoid; }
.lemarc-pdf .muted { color: #64748b; }
.lemarc-pdf .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #f1f5f9; font-size: 9px; font-weight: 700; }
.lemarc-pdf h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; }
.lemarc-pdf .obs { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-top: 6px; page-break-inside: avoid; }
.lemarc-pdf .obs .head { font-weight: 700; color: #0b2545; font-size: 10px; margin-bottom: 2px; }
.lemarc-pdf .obs .body { font-size: 10px; white-space: pre-wrap; }
.lemarc-pdf .footer-note { margin-top: 18px; padding: 8px 10px; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 9px; color: #475569; }
`;

export function ManagerialReportDocument({
  report,
  periodLabel,
  generatedAt,
  authorName,
}: Props) {
  const { summary, byStatus, topClients, topTechnicians, byServiceType, observations, incomplete, orders } = report;
  return (
    <div className="lemarc-pdf">
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <header className="cover">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img src={lemarcLogo.url} alt="Lemarc Industrial" style={{ height: 44, width: "auto" }} />
          <div>
          <h1 className="title">Relatório Gerencial de Ordens de Serviço</h1>
          <div className="muted" style={{ marginTop: 4 }}>{periodLabel}</div>
          </div>
        </div>
        <div className="meta">
          <div>Gerado em {formatDateTime(generatedAt.toISOString())}</div>
          {authorName && <div>Por {authorName}</div>}
          <div>Sistema: Gestão Lemarc</div>
        </div>
      </header>

      <section className="section">
        <h2>Resumo executivo</h2>
        <div className="kpis">
          <Kpi label="Total de OS" value={formatNumber(summary.totalOrders)} />
          <Kpi label="Concluídas" value={formatNumber(summary.finished)} />
          <Kpi label="Em execução" value={formatNumber(summary.running)} />
          <Kpi label="Pendentes" value={formatNumber(summary.pending)} />
          <Kpi label="Em revisão" value={formatNumber(summary.review)} />
          <Kpi label="Aguardando cobrança" value={formatNumber(summary.awaitingBilling)} />
          <Kpi label="Horas trabalhadas" value={`${summary.totalHours.toFixed(1)}h`} />
          <Kpi label="Tempo médio" value={summary.avgLeadMinutes !== null ? formatHours(summary.avgLeadMinutes) : "—"} />
          <Kpi label="Valor estimado" value={formatCurrency(summary.estimatedValue)} />
          <Kpi label="Taxa de conclusão" value={formatPercent(summary.completionRate)} />
          <Kpi label="Clientes envolvidos" value={formatNumber(summary.clientsInvolved)} />
          <Kpi label="Técnicos envolvidos" value={formatNumber(summary.techniciansInvolved)} />
        </div>
        <p className="muted" style={{ fontSize: 9, marginTop: 6 }}>
          Valor estimado calculado apenas para OS com tempo trabalhado e valor/hora preenchidos.
          Tempo médio considera apenas OS encerradas (com data de fechamento).
        </p>
      </section>

      <section className="section">
        <h2>Análise por status</h2>
        <table>
          <thead>
            <tr><th>Status</th><th style={{ width: 80 }}>Qtd</th><th style={{ width: 80 }}>%</th></tr>
          </thead>
          <tbody>
            {byStatus.map((s) => (
              <tr key={s.key}>
                <td>{s.label}</td>
                <td>{formatNumber(s.count)}</td>
                <td>{formatPercent(s.percent)}</td>
              </tr>
            ))}
            {byStatus.length === 0 && (
              <tr><td colSpan={3} className="muted">Sem dados.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Top clientes</h2>
        {topClients.length === 0 ? (
          <p className="muted">Nenhum cliente envolvido no período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th style={{ width: 60 }}>OS</th>
                <th style={{ width: 70 }}>Concluídas</th>
                <th style={{ width: 70 }}>Pendentes</th>
                <th style={{ width: 70 }}>Horas</th>
                <th style={{ width: 90 }}>Valor est.</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((c) => (
                <tr key={c.id ?? c.name}>
                  <td>{c.name}</td>
                  <td>{formatNumber(c.orders)}</td>
                  <td>{formatNumber(c.finished)}</td>
                  <td>{formatNumber(c.pending)}</td>
                  <td>{c.hours.toFixed(1)}h</td>
                  <td>{c.estimatedValue > 0 ? formatCurrency(c.estimatedValue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Produtividade por técnico</h2>
        {topTechnicians.length === 0 ? (
          <p className="muted">Nenhum técnico envolvido no período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Técnico</th>
                <th style={{ width: 60 }}>OS</th>
                <th style={{ width: 70 }}>Concluídas</th>
                <th style={{ width: 70 }}>Horas</th>
                <th style={{ width: 90 }}>Tempo médio</th>
                <th style={{ width: 90 }}>Valor est.</th>
              </tr>
            </thead>
            <tbody>
              {topTechnicians.map((t) => (
                <tr key={t.id ?? t.name}>
                  <td>{t.name}</td>
                  <td>{formatNumber(t.orders)}</td>
                  <td>{formatNumber(t.finished)}</td>
                  <td>{t.hours.toFixed(1)}h</td>
                  <td>{t.avgLeadMinutes !== null ? formatHours(t.avgLeadMinutes) : "—"}</td>
                  <td>{t.estimatedValue > 0 ? formatCurrency(t.estimatedValue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: 9, marginTop: 6 }}>
          As horas por técnico consideram a duração total da OS para cada técnico
          vinculado como responsável. Quando há mais de um técnico na mesma OS,
          o total distribuído pode exceder o total geral de horas.
        </p>
      </section>

      <section className="section">
        <h2>Tipos de serviço</h2>
        {byServiceType.length === 0 ? (
          <p className="muted">Sem tipos registrados.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Tipo</th><th style={{ width: 80 }}>Qtd</th></tr>
            </thead>
            <tbody>
              {byServiceType.map((s) => (
                <tr key={s.key}><td>{s.label}</td><td>{formatNumber(s.count)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Observações das OS</h2>
        {observations.length === 0 ? (
          <p className="muted">Nenhuma observação registrada nas OS deste período.</p>
        ) : (
          observations.map((o) => (
            <div className="obs" key={o.id}>
              <div className="head">
                #{o.number} · {o.title} <span className="pill">{statusLabel[o.status]}</span>
              </div>
              <div className="muted" style={{ fontSize: 9, marginBottom: 4 }}>
                {o.client_name ?? "Sem cliente"} · {technicianNamesFor(o)} ·{" "}
                {o.priority ? priorityLabel[o.priority] : "—"} · Aberta {formatDate(o.opened_at)}
                {o.closed_at ? ` · Fechada ${formatDate(o.closed_at)}` : ""}
              </div>
              <div className="body">{o.description}</div>
            </div>
          ))
        )}
      </section>

      <section className="section">
        <h2>Lista detalhada de OS</h2>
        {orders.length === 0 ? (
          <p className="muted">Nenhuma OS no período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>Nº</th>
                <th>Título</th>
                <th>Cliente</th>
                <th>Técnico</th>
                <th>Tipo</th>
                <th>Prior.</th>
                <th>Status</th>
                <th>Abertura</th>
                <th>Fechamento</th>
                <th>Tempo</th>
                <th>Valor est.</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((r) => (
                <tr key={r.id}>
                  <td>{r.number}</td>
                  <td>{r.title}</td>
                  <td>{r.client_name ?? "—"}{r.client_unit_name ? ` · ${r.client_unit_name}` : ""}</td>
                  <td>{technicianNamesFor(r)}</td>
                  <td>{serviceTypeFor(r)}</td>
                  <td>{r.priority ? priorityLabel[r.priority] : "—"}</td>
                  <td>{statusLabel[r.status]}</td>
                  <td>{formatDate(r.opened_at)}</td>
                  <td>{r.closed_at ? formatDate(r.closed_at) : "—"}</td>
                  <td>{r.worked_minutes_effective > 0 ? `${(r.worked_minutes_effective / 60).toFixed(1)}h` : "—"}</td>
                  <td>{r.estimated_value > 0 ? formatCurrency(r.estimated_value) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="footer-note">
        <strong>Responsabilidade dos dados:</strong>{" "}
        {incomplete.withoutTechnician} OS sem técnico atribuído ·{" "}
        {incomplete.withoutHourRate} OS sem valor/hora cadastrado ·{" "}
        {incomplete.withoutWorkedMinutes} OS sem tempo trabalhado informado ·{" "}
        {incomplete.withoutClosedAt} OS sem data de fechamento. Valores estimados calculados
        somente com registros completos.
      </div>
    </div>
  );
}

function serviceTypeFor(r: ReportOrderRow): string {
  if (!r.service_type) return "—";
  if (r.service_type === "outro" && r.service_type_other?.trim()) return r.service_type_other.trim();
  return serviceTypeLabel[r.service_type];
}

function technicianNamesFor(r: ReportOrderRow): string {
  const techs = getReportRowTechnicians(r);
  if (techs.length === 0) return "—";
  return techs.map((t) => t.name).join(", ");
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}