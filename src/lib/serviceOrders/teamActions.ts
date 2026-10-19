import type { ServiceOrderStatus } from "@/types/serviceOrder";

/** Estado de tempo de um técnico na OS (vem de `getTechnicianState`). */
export type TeamTechState = "idle" | "running" | "paused" | "finished";

export type TeamRowAction = "start" | "pause" | "resume" | "finish" | "restart";

const CLOSED_STATUSES: ServiceOrderStatus[] = ["finished", "review", "approved", "cancelled"];
const PRE_START_STATUSES: ServiceOrderStatus[] = ["pending", "dispatched", "transit"];

/** Rótulo do estado exibido no card da equipe. */
export function teamStateLabel(state: TeamTechState): string {
  switch (state) {
    case "running":
      return "Ativo";
    case "paused":
      return "Em pausa";
    case "finished":
      return "Encerrado";
    default:
      return "Aguardando início";
  }
}

/** O que o diálogo "Adicionar técnico" oferece conforme o status da OS. */
export function linkDialogOptions(status: ServiceOrderStatus): { canLink: boolean; canStart: boolean } {
  if (status === "cancelled") return { canLink: false, canStart: false };
  if (status === "running") return { canLink: true, canStart: true };
  if (PRE_START_STATUSES.includes(status)) return { canLink: true, canStart: false };
  // finished / review / approved: só vínculo, para a revisão administrativa.
  return { canLink: true, canStart: false };
}

/**
 * Ações disponíveis numa linha do card. Admin age em qualquer linha; o técnico
 * só na própria linha e só se tiver usuário (o servidor confere de novo).
 * Cronômetro individual só com a OS em execução.
 */
export function teamRowActions(input: {
  state: TeamTechState;
  orderStatus: ServiceOrderStatus;
  isAdmin: boolean;
  isOwnRow: boolean;
}): TeamRowAction[] {
  const { state, orderStatus, isAdmin, isOwnRow } = input;
  if (!isAdmin && !isOwnRow) return [];
  if (CLOSED_STATUSES.includes(orderStatus)) return [];
  if (orderStatus !== "running") return [];
  switch (state) {
    case "idle":
      return ["start"];
    case "running":
      return ["pause", "finish"];
    case "paused":
      return ["resume", "finish"];
    case "finished":
      return ["restart"];
  }
}

/**
 * "Iniciar para a equipe" só atinge quem nunca começou. Quem encerrou não é
 * reiniciado automaticamente (volta só por ação deliberada na própria linha).
 */
export function teamStartableIds(states: { id: string; state: TeamTechState }[]): string[] {
  return states.filter((s) => s.state === "idle").map((s) => s.id);
}

/** Seleção explícita obrigatória nas ações novas: vazio nunca vira "equipe toda". */
export function assertExplicitScope(ids: string[] | null | undefined): string[] {
  const unique = Array.from(new Set((ids ?? []).filter(Boolean)));
  if (unique.length === 0) throw new Error("Selecione ao menos um técnico.");
  return unique;
}
