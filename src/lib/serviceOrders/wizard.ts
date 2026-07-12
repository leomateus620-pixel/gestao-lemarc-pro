import type { ServicePriority, ServiceType } from "@/types/serviceOrder";

export const SERVICE_ORDER_STEPS = [
  { shortLabel: "Dados", label: "Dados iniciais" },
  { shortLabel: "Cliente", label: "Cliente e unidade" },
  { shortLabel: "Equipe", label: "Solicitante e técnicos" },
  { shortLabel: "Serviço", label: "Serviço e prioridade" },
  { shortLabel: "Revisão", label: "Revisão final" },
] as const;

export type ServiceOrderWizardDraft = {
  title: string;
  description: string;
  location: string;
  scheduled: string;
  clientId: string;
  unitId: string;
  techIds: string[];
  noTech: boolean;
  requesterName: string;
  type: ServiceType;
  typeOther: string;
  priority: ServicePriority;
};

export type WizardValidationIssue = {
  field: "title" | "clientId" | "requesterName" | "technician" | "typeOther";
  message: string;
};

export function getWizardValidationIssues(draft: ServiceOrderWizardDraft) {
  const issues: WizardValidationIssue[][] = [[], [], [], [], []];

  if (draft.title.trim().length < 3) {
    issues[0].push({
      field: "title",
      message: "Informe um título com pelo menos 3 caracteres.",
    });
  }
  if (!draft.clientId) {
    issues[1].push({ field: "clientId", message: "Selecione ou cadastre um cliente." });
  }
  if (draft.requesterName.trim().length < 2) {
    issues[2].push({
      field: "requesterName",
      message: "Informe o nome do solicitante com pelo menos 2 caracteres.",
    });
  }
  if (draft.techIds.length === 0 && !draft.noTech) {
    issues[2].push({
      field: "technician",
      message: "Selecione um técnico ou marque “Sem técnico definido” para continuar.",
    });
  }
  if (draft.type === "outro" && draft.typeOther.trim().length < 3) {
    issues[3].push({
      field: "typeOther",
      message: "Descreva o tipo de serviço com pelo menos 3 caracteres.",
    });
  }

  return issues;
}

export function getWizardValidity(draft: ServiceOrderWizardDraft) {
  return getWizardValidationIssues(draft).map((stepIssues) => stepIssues.length === 0);
}

export function getNextWizardStep(current: number, valid: boolean) {
  if (!valid) return current;
  return Math.min(current + 1, SERVICE_ORDER_STEPS.length - 1);
}

export function getPreviousWizardStep(current: number) {
  return Math.max(current - 1, 0);
}

export function getWizardStepState(index: number, current: number, valid: boolean) {
  if (index < current) return valid ? "complete" : "invalid";
  if (index === current) return "current";
  return "future";
}

export function getWizardActionLabel(isLast: boolean, pending: boolean) {
  if (pending) return "Criando OS...";
  return isLast ? "Criar ordem de serviço" : "Continuar";
}

export function canSubmitServiceOrder(valid: boolean, pending: boolean) {
  return valid && !pending;
}
