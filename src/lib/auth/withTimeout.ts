export class AuthTimeoutError extends Error {
  readonly stage: string;
  constructor(stage: string, ms: number) {
    super(`Tempo limite excedido em ${stage} (${ms} ms)`);
    this.name = "AuthTimeoutError";
    this.stage = stage;
  }
}

export const AUTH_TIMEOUT_MESSAGE =
  "A conexão demorou demais. Verifique a internet e tente de novo.";

/** Rejeita com AuthTimeoutError se a promise não resolver em `ms`. Não cancela a requisição. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthTimeoutError(stage, ms)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function isAuthTimeout(error: unknown): error is AuthTimeoutError {
  return error instanceof AuthTimeoutError;
}

const AUTH_KEY_RE = /^sb-.+-auth-token(\..*|-code-verifier)?$/;

/** Remove apenas a sessão de login guardada neste aparelho (sem chamar o servidor). */
export function clearLocalAuthSession(): number {
  let removed = 0;
  for (const storage of safeStorages()) {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && AUTH_KEY_RE.test(key)) keys.push(key);
    }
    for (const key of keys) {
      storage.removeItem(key);
      removed++;
    }
  }
  return removed;
}

function safeStorages(): Storage[] {
  const out: Storage[] = [];
  try {
    if (typeof localStorage !== "undefined") out.push(localStorage);
  } catch {
    /* indisponível */
  }
  try {
    if (typeof sessionStorage !== "undefined") out.push(sessionStorage);
  } catch {
    /* indisponível */
  }
  return out;
}

/** Garante que `fn` rode uma vez por chave até `reset()`. */
export function createOnceGuard() {
  let current: string | null = null;
  return {
    tryAcquire(key: string): boolean {
      if (current === key) return false;
      current = key;
      return true;
    },
    reset() {
      current = null;
    },
  };
}

/** Registro leve, sem senha, token ou e-mail completo. */
export function logAuthIssue(stage: string, info: { error?: unknown; durationMs?: number } = {}) {
  const err = info.error as { name?: string; code?: string; status?: number; message?: string } | undefined;
  const payload = {
    stage,
    durationMs: info.durationMs,
    name: err?.name,
    code: err?.code,
    status: err?.status,
    timeout: isAuthTimeout(info.error),
    online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
  };
  console.warn("[auth]", payload);
  if (typeof window === "undefined") return;
  try {
    window.__lovableEvents?.captureException?.(
      new Error(`auth:${stage}${payload.timeout ? ":timeout" : ""}`),
      { source: "auth", route: window.location.pathname, ...payload },
      { mechanism: "manual", handled: true, severity: "warning" },
    );
  } catch {
    /* ignora */
  }
}
