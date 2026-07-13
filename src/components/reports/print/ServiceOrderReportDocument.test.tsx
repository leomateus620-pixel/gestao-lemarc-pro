import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ServiceOrder } from "@/types/serviceOrder";
import type { LaborEntry } from "@/types/financials";
import { ServiceOrderReportDocument } from "./ServiceOrderReportDocument";

const baseOrder = {
  id: "os-1",
  number: 1067,
  title: "Teste",
  description: "descrição",
  status: "closed",
  priority: "media",
  service_type: "eletrica",
  service_type_other: null,
  opened_at: "2026-07-13T18:33:00Z",
  started_at: "2026-07-13T18:33:00Z",
  finished_at: "2026-07-13T18:35:00Z",
  closed_at: "2026-07-13T18:36:00Z",
  requester_name: "Renan",
  location: "Ccm",
  client: { id: "c1", name: "Cliente", cnpj: null, unit: null },
  client_unit: null,
  technicians: [],
  signature: null,
  signature_waiver_reason: null,
  signature_waived_at: null,
} as unknown as ServiceOrder;

function entry(idx: number, total: number): LaborEntry {
  return {
    id: `e${idx}`,
    service_order_id: "os-1",
    technician_id: "t1",
    role: "Técnico",
    work_date: "2026-07-13",
    start_time: "15:33",
    end_time: "15:35",
    duration_minutes: 1,
    hourly_rate_cents: 5500,
    subtotal_cents: 92,
    description: total > 1 ? `Intervalo ${idx} de ${total}` : "Trabalho executado",
    technician: { id: "t1", full_name: "Leonardo", role: "Técnico" },
  };
}

describe("ServiceOrderReportDocument — bloco Serviço executado", () => {
  it("nunca mostra a palavra 'intervalo' no resumo de serviço executado (1 sessão)", () => {
    const markup = renderToStaticMarkup(
      <ServiceOrderReportDocument
        order={baseOrder}
        entries={[entry(1, 1)]}
        financials={null}
        generatedAt={new Date("2026-07-13T18:36:00Z")}
        authorName={null}
      />,
    );
    // Extrai apenas o bloco "Serviço executado"
    const idx = markup.indexOf("Serviço executado");
    const block = idx >= 0 ? markup.slice(idx, idx + 500) : "";
    expect(block).not.toMatch(/intervalo/i);
    expect(block).toContain("Leonardo");
    expect(block).toContain("horas trabalhadas");
  });

  it("nunca mostra 'intervalo' com múltiplas sessões do mesmo técnico", () => {
    const markup = renderToStaticMarkup(
      <ServiceOrderReportDocument
        order={baseOrder}
        entries={[entry(1, 2), entry(2, 2)]}
        financials={null}
        generatedAt={new Date("2026-07-13T18:36:00Z")}
        authorName={null}
      />,
    );
    const idx = markup.indexOf("Serviço executado");
    const block = idx >= 0 ? markup.slice(idx, idx + 500) : "";
    expect(block).not.toMatch(/\bintervalo\b/i);
    expect(block).toContain("Leonardo");
  });
});