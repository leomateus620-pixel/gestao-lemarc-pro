import type { ServiceOrderStatus } from "@/types/serviceOrder";
import type { TeamTechState } from "./teamActions";

/**
 * Valida os técnicos-alvo de uma ação de tempo. Vazio só é aceito no modo
 * legado (devolve a equipe vinculada); alvos precisam estar vinculados e ativos.
 */
export function validateTeamScope(input: {
  requested: (string | null | undefined)[];
  assigned: string[];
  activeIds: string[];
  requireExplicit: boolean;
}): string[] {
  const unique = Array.from(
    new Set(input.requested.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
  if (unique.length === 0) {
    if (input.requireExplicit) throw new Error("Selecione ao menos um técnico.");
    return input.assigned;
  }
  if (unique.some((id) => !input.assigned.includes(id))) {
    throw new Error("Técnico não vinculado a esta OS.");
  }
  if (unique.some((id) => !input.activeIds.includes(id))) {
    throw new Error("Técnico inativo.");
  }
  return unique;
}

/** Ações do card da equipe só valem com a OS em execução. */
export function assertTeamOrderRunning(status: string | null | undefined): void {
  if ((status as ServiceOrderStatus) !== "running") {
    throw new Error("O tempo só pode ser controlado com a OS em execução.");
  }
}

/**
 * "Voltar a trabalhar com a equipe": separa os marcados em quem retoma
 * (pausado) e quem reabre (encerrado). Em andamento e nunca iniciados nunca entram.
 */
export function resumeTeamSelection(
  states: { id: string; state: TeamTechState }[],
  selected: string[],
): { resumeIds: string[]; restartIds: string[] } {
  const sel = new Set(selected);
  return {
    resumeIds: states.filter((s) => s.state === "paused" && sel.has(s.id)).map((s) => s.id),
    restartIds: states.filter((s) => s.state === "finished" && sel.has(s.id)).map((s) => s.id),
  };
}
