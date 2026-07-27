export type WireTrayErrorKind =
  | "schema"
  | "permission"
  | "network"
  | "validation"
  | "conflict"
  | "not_found"
  | "operation";

export type WireTrayErrorFeedback = {
  kind: WireTrayErrorKind;
  title: string;
  description: string;
  retryable: boolean;
};

const prefixToKind: Record<string, WireTrayErrorKind> = {
  SCHEMA: "schema",
  FORBIDDEN: "permission",
  CONNECTION: "network",
  VALIDATION: "validation",
  CONFLICT: "conflict",
  NOT_FOUND: "not_found",
  OPERATION: "operation",
};

const feedbackByKind: Record<WireTrayErrorKind, WireTrayErrorFeedback> = {
  schema: {
    kind: "schema",
    title: "Estrutura do módulo indisponível",
    description: "A estrutura deste módulo ainda não está disponível no banco de dados.",
    retryable: true,
  },
  permission: {
    kind: "permission",
    title: "Acesso não autorizado",
    description: "Seu perfil não possui permissão para visualizar esta área.",
    retryable: false,
  },
  network: {
    kind: "network",
    title: "Falha de conexão",
    description: "Não foi possível consultar os dados. Verifique a conexão e tente novamente.",
    retryable: true,
  },
  validation: {
    kind: "validation",
    title: "Dados inválidos",
    description: "Revise os dados informados e tente novamente.",
    retryable: false,
  },
  conflict: {
    kind: "conflict",
    title: "Operação em conflito",
    description:
      "Os dados foram alterados por outra operação. Atualize a página e tente novamente.",
    retryable: true,
  },
  not_found: {
    kind: "not_found",
    title: "Registro não encontrado",
    description: "O registro solicitado não existe ou não está mais disponível.",
    retryable: false,
  },
  operation: {
    kind: "operation",
    title: "Não foi possível carregar esta operação",
    description: "Ocorreu uma falha operacional. Tente novamente em instantes.",
    retryable: true,
  },
};

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

export function normalizeWireTrayError(error: unknown): WireTrayErrorFeedback {
  const message = errorMessage(error);
  const prefixed = message.match(/WIRE_TRAY_([A-Z_]+):(.+)$/s);
  if (prefixed) {
    const kind = prefixToKind[prefixed[1]] ?? "operation";
    const base = feedbackByKind[kind];
    const safeDomainMessage = prefixed[2].trim();
    return {
      ...base,
      description: safeDomainMessage || base.description,
    };
  }

  const normalized = message.toLowerCase();
  if (
    /pgrst205|42p01|schema cache|relation .* does not exist|could not find the table/.test(
      normalized,
    )
  ) {
    return feedbackByKind.schema;
  }
  if (/42501|permission denied|row-level security|not authorized|jwt|forbidden/.test(normalized)) {
    return feedbackByKind.permission;
  }
  if (/failed to fetch|network|econn|timeout|timed out|connection|offline/.test(normalized)) {
    return feedbackByKind.network;
  }
  if (/23505|duplicate key|already exists|já existe/.test(normalized)) {
    return feedbackByKind.conflict;
  }
  if (/23503|23514|22p02|validation|invalid input|dados inválidos/.test(normalized)) {
    return feedbackByKind.validation;
  }
  return feedbackByKind.operation;
}

export function shouldRetryWireTrayQuery(failureCount: number, error: unknown) {
  return normalizeWireTrayError(error).kind === "network" && failureCount < 2;
}

export function wireTrayErrorDescription(error: unknown, fallback?: string) {
  const feedback = normalizeWireTrayError(error);
  return feedback.kind === "operation" && fallback ? fallback : feedback.description;
}

export function wireTrayRetryDelay(attemptIndex: number) {
  return Math.min(1_000 * 2 ** attemptIndex, 4_000);
}
