declare const __APP_BUILD_ID__: string | undefined;

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const VERSION_URL = "/version.json";

export function currentBuildId(): string {
  return typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
}

export type ReloadDecision = "none" | "reload" | "defer";

/** Decide se recarrega ao ver outra versão publicada. */
export function decideReload(input: {
  current: string;
  remote: string | null | undefined;
  onLogin: boolean;
  busy: boolean;
}): ReloadDecision {
  const { current, remote, onLogin, busy } = input;
  if (!remote || remote === current || current === "dev") return "none";
  if (onLogin) return "reload";
  return busy ? "defer" : "reload";
}

/** Há algo em edição na tela? (formulário em tela cheia, diálogo aberto ou campo focado com texto) */
export function isScreenBusy(doc: Document = document): boolean {
  if (doc.documentElement.dataset.fullscreenForm === "true") return true;
  if (doc.querySelector('[role="dialog"], [role="alertdialog"]')) return true;
  const el = doc.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.length > 0;
  return el instanceof HTMLSelectElement;
}

/** Busca a versão publicada. Erro de rede devolve null (nunca recarrega nem mexe na sessão). */
export async function fetchRemoteBuildId(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetcher(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { buildId?: unknown };
    return typeof body.buildId === "string" && body.buildId ? body.buildId : null;
  } catch {
    return null;
  }
}
