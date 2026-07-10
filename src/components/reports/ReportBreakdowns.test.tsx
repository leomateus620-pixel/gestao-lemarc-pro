import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReportSeries } from "@/types/reports";
import { ReportBreakdowns } from "./ReportBreakdowns";

const emptySeries: ReportSeries = {
  byStatus: [],
  byPriority: [],
  byServiceType: [],
  byClient: [],
  byTechnicianHours: [],
  byClientValue: [],
  avgLeadByTechnician: [],
  trend: [],
};

describe("ReportBreakdowns", () => {
  it("expõe o estado recolhido com atributos acessíveis", () => {
    const markup = renderToStaticMarkup(<ReportBreakdowns series={emptySeries} />);

    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('aria-controls="report-breakdown-content"');
    expect(markup).toContain("Ver análises");
    expect(markup).not.toContain("Horas trabalhadas");
  });
});
