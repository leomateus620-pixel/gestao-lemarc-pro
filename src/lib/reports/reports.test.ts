import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  createDefaultReportFilters,
  isCustomRangeInvalid,
  resetReportFilters,
} from "./filters";
import {
  DATA_UNAVAILABLE_LABEL,
  formatCurrency,
  formatHours,
  formatHoursDecimal,
  formatNumber,
} from "./formatters";
import { computeDataQuality, computeOrderRow, computeOverview, computeSeries } from "./metrics";
import { getReportEmptyState } from "./presentation";
import type { ReportOrderRow } from "@/types/reports";

function reportRow(overrides: Partial<ReportOrderRow> = {}): ReportOrderRow {
  return {
    id: "os-1",
    number: 1001,
    title: "Manutenção preventiva",
    status: "pending",
    priority: "media",
    service_type: "mecanica",
    service_type_other: null,
    client_id: "cliente-1",
    client_name: "Indústria Exemplo",
    client_cnpj: null,
    client_unit_id: "unidade-1",
    client_unit_name: "Matriz",
    client_unit_cnpj: null,
    client_unit_city: null,
    client_unit_state: null,
    technician_id: "tecnico-1",
    technician_name: "Ana Técnica",
    technicians: [
      {
        id: "tecnico-1",
        name: "Ana Técnica",
        role: "Técnica",
        is_primary: true,
      },
    ],
    opened_at: "2026-06-10T12:00:00.000Z",
    started_at: null,
    finished_at: null,
    closed_at: null,
    worked_minutes: 120,
    worked_minutes_effective: 120,
    worked_minutes_source: "reported",
    hour_rate: 150,
    estimated_value: 300,
    lead_time_minutes: null,
    billing_status: "pending",
    billed_at: null,
    invoice_reference: null,
    description: null,
    ...overrides,
  };
}

describe("filtros de relatórios", () => {
  it("conta somente condições diferentes do padrão", () => {
    const filters = {
      ...createDefaultReportFilters(),
      period: "quarter" as const,
      clientId: "cliente-1",
      onlyAwaitingBilling: true,
    };

    expect(countActiveFilters(filters)).toBe(3);
  });

  it("limpa filtros e preserva o cliente na rota dedicada", () => {
    const filters = {
      ...createDefaultReportFilters("cliente-1"),
      status: "running" as const,
      technicianId: "tecnico-1",
    };

    expect(resetReportFilters(filters, true)).toEqual(createDefaultReportFilters("cliente-1"));
    expect(resetReportFilters(filters, false)).toEqual(createDefaultReportFilters());
  });

  it("detecta intervalo personalizado invertido", () => {
    expect(
      isCustomRangeInvalid({
        ...createDefaultReportFilters(),
        period: "custom",
        from: "2026-07-10",
        to: "2026-07-01",
      }),
    ).toBe(true);
  });
});

describe("formatação operacional", () => {
  it("formata moeda, duração e números em PT-BR", () => {
    expect(formatCurrency(1234.56, true)).toContain("1.234,56");
    expect(formatHours(90)).toBe("1h30");
    expect(formatHoursDecimal(90)).toBe("1,5");
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("diferencia dados ausentes de zero real", () => {
    expect(formatHours(null)).toBe(DATA_UNAVAILABLE_LABEL);
    expect(formatCurrency(Number.NaN)).toBe(DATA_UNAVAILABLE_LABEL);
    expect(formatHours(0)).toBe("0min");
    expect(formatCurrency(0)).toContain("0");
  });
});

describe("métricas e séries de relatórios", () => {
  it("prioriza horas informadas e limita derivações longas a 24 horas", () => {
    expect(
      computeOrderRow({
        worked_minutes: 75,
        hour_rate: 100,
        opened_at: "2026-06-01T08:00:00.000Z",
        started_at: "2026-06-01T08:00:00.000Z",
        finished_at: "2026-06-03T08:00:00.000Z",
        closed_at: "2026-06-03T08:00:00.000Z",
      }),
    ).toMatchObject({ worked_minutes_effective: 75, worked_minutes_source: "reported" });

    expect(
      computeOrderRow({
        worked_minutes: null,
        hour_rate: 100,
        opened_at: "2026-06-01T08:00:00.000Z",
        started_at: "2026-06-01T08:00:00.000Z",
        finished_at: "2026-06-03T08:00:00.000Z",
        closed_at: "2026-06-03T08:00:00.000Z",
      }),
    ).toMatchObject({ worked_minutes_effective: 1440, worked_minutes_source: "derived" });
  });

  it("mantém zero real e indisponibilidade separados no resumo", () => {
    const overview = computeOverview([
      reportRow({
        status: "finished",
        closed_at: "2026-06-10T14:00:00.000Z",
        lead_time_minutes: 120,
      }),
      reportRow({
        id: "os-2",
        number: 1002,
        worked_minutes: null,
        worked_minutes_effective: 0,
        worked_minutes_source: "none",
        hour_rate: null,
        estimated_value: 0,
      }),
    ]);

    expect(overview.totalOrders).toBe(2);
    expect(overview.totalHours).toBe(2);
    expect(overview.avgLeadTimeMinutes).toBe(120);
    expect(overview.completionRate).toBe(0.5);
  });

  it("contabiliza pendências e dados derivados sem fabricar valores", () => {
    const quality = computeDataQuality([
      reportRow({
        status: "finished",
        billing_status: "ready",
        worked_minutes_source: "derived",
      }),
      reportRow({
        id: "os-2",
        number: 1002,
        client_unit_id: null,
        client_unit_name: null,
        technician_id: null,
        technician_name: null,
        technicians: [],
        worked_minutes: null,
        worked_minutes_effective: 0,
        worked_minutes_source: "none",
        hour_rate: null,
        estimated_value: 0,
      }),
    ]);

    expect(quality).toEqual({
      withoutUnit: 1,
      withoutTechnician: 1,
      withoutWorkedMinutes: 1,
      withoutHourlyRate: 1,
      pendingBilling: 1,
      derivedWorkedMinutes: 1,
    });
  });

  it("gera a comparação mensal de abertas e concluídas a partir das OS reais", () => {
    const series = computeSeries([
      reportRow({ status: "approved" }),
      reportRow({ id: "os-2", number: 1002, status: "running" }),
      reportRow({
        id: "os-3",
        number: 1003,
        opened_at: "2026-07-02T12:00:00.000Z",
        status: "finished",
      }),
    ]);

    expect(series.trend).toMatchObject([
      { month: "2026-06", orders: 2, completed: 1 },
      { month: "2026-07", orders: 1, completed: 1 },
    ]);
  });
});

describe("estado vazio do relatório", () => {
  it("diferencia período sem dados de filtros sem correspondência", () => {
    expect(getReportEmptyState(0).title).toBe("Nenhuma OS no período selecionado");
    expect(getReportEmptyState(2).title).toBe("Nenhuma OS corresponde aos filtros");
  });
});
