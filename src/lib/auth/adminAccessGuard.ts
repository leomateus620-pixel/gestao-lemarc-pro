export type AccessAction = "password_reset" | "sessions_revoked" | "password_reset_and_sessions_revoked";

/** Regras do servidor para o admin gerenciar o acesso de outra pessoa. Retorna mensagem de erro ou null. */
export function checkCanManageAccess(input: {
  actorIsAdmin: boolean;
  actorUserId: string;
  targetUserId: string | null | undefined;
  targetIsAdmin: boolean;
}): string | null {
  if (!input.actorIsAdmin) return "Apenas administradores podem fazer isso.";
  if (!input.targetUserId) return "Este colaborador não tem login vinculado.";
  if (input.targetUserId === input.actorUserId) return "Você não pode fazer isso na sua própria conta por aqui.";
  if (input.targetIsAdmin) return "Não é permitido para contas de administrador.";
  return null;
}

export function auditActionFor(resetPassword: boolean, revokeSessions: boolean): AccessAction | null {
  if (resetPassword && revokeSessions) return "password_reset_and_sessions_revoked";
  if (resetPassword) return "password_reset";
  if (revokeSessions) return "sessions_revoked";
  return null;
}
