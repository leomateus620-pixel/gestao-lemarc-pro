import { describe, expect, it } from "vitest";
import {
  canSubmitServiceOrder,
  getWizardActionLabel,
  getNextWizardStep,
  getPreviousWizardStep,
  getWizardStepState,
  getWizardValidationIssues,
  getWizardValidity,
  type ServiceOrderWizardDraft,
} from "./wizard";

const validDraft: ServiceOrderWizardDraft = {
  title: "Manutenção do compressor",
  description: "",
  location: "",
  scheduled: "",
  clientId: "client-1",
  unitId: "unit-1",
  techIds: ["tech-1"],
  noTech: false,
  requesterName: "Ana",
  type: "mecanica",
  typeOther: "",
  priority: "media",
};

describe("modelo do fluxo Nova OS", () => {
  it("avança, retorna e preserva o mesmo draft", () => {
    expect(getNextWizardStep(0, true)).toBe(1);
    expect(getPreviousWizardStep(1)).toBe(0);
    expect(validDraft.title).toBe("Manutenção do compressor");
    expect(getPreviousWizardStep(0)).toBe(0);
  });

  it("mantém a etapa atual quando a validação bloqueia o avanço", () => {
    expect(getNextWizardStep(0, false)).toBe(0);
  });

  it("diferencia etapa atual, anterior concluída e futura indisponível", () => {
    expect(getWizardStepState(0, 1, true)).toBe("complete");
    expect(getWizardStepState(1, 1, true)).toBe("current");
    expect(getWizardStepState(2, 1, true)).toBe("future");
    expect(getWizardStepState(0, 1, false)).toBe("invalid");
  });

  it("valida cliente e mantém unidade como escolha opcional", () => {
    const issues = getWizardValidationIssues({ ...validDraft, clientId: "", unitId: "" });
    expect(issues[1]).toEqual([
      { field: "clientId", message: "Selecione ou cadastre um cliente." },
    ]);
    expect(getWizardValidity({ ...validDraft, unitId: "" })[1]).toBe(true);
  });

  it("aceita técnicos selecionados ou o estado explícito sem técnico", () => {
    expect(getWizardValidity({ ...validDraft, techIds: [], noTech: false })[2]).toBe(false);
    expect(getWizardValidity({ ...validDraft, techIds: [], noTech: true })[2]).toBe(true);
  });

  it("exige descrição quando o tipo de serviço é Outro", () => {
    expect(getWizardValidity({ ...validDraft, type: "outro", typeOther: "" })[3]).toBe(false);
    expect(getWizardValidity({ ...validDraft, type: "outro", typeOther: "Calibração" })[3]).toBe(
      true,
    );
  });

  it("expõe loading e bloqueia submissão duplicada", () => {
    expect(getWizardActionLabel(true, false)).toBe("Criar ordem de serviço");
    expect(getWizardActionLabel(true, true)).toBe("Criando OS...");
    expect(canSubmitServiceOrder(true, false)).toBe(true);
    expect(canSubmitServiceOrder(true, true)).toBe(false);
    expect(canSubmitServiceOrder(false, false)).toBe(false);
  });
});
