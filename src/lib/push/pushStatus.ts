export type PushStatus = "granted" | "denied" | "default" | "needs-install" | "unsupported" | "iframe" | "in-app-browser";

export const pushStatusLabels: Record<PushStatus, { text: string; hint: string }> = {
  granted: { text: "Ativadas", hint: "Este aparelho recebe avisos das OS." },
  denied: { text: "Bloqueadas", hint: "As notificações estão bloqueadas. Toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir. Depois toque em \"Já liberei, tentar de novo\"." },
  default: { text: "Não ativadas", hint: "Toque em Permitir para receber avisos das OS." },
  "needs-install": { text: "Precisa instalar", hint: "No iPhone: Compartilhar → \"Adicionar à Tela de Início\", abra pelo ícone e ative aqui." },
  unsupported: { text: "Indisponível", hint: "Este navegador não oferece notificações. Abra lemarcgestao.com pelo Google Chrome." },
  iframe: { text: "Abra em nova aba", hint: "Abra o sistema em uma aba própria ou no site publicado para ativar." },
  "in-app-browser": { text: "Abra no Chrome", hint: "O sistema foi aberto dentro de outro app, que não aceita notificações. Toque nos ⋮ e escolha \"Abrir no Chrome\", ou copie o link e cole no Chrome." },
};

export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /; wv\)|FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\//i.test(navigator.userAgent);
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
}

export function getPushStatus(): PushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (window.top !== window.self) return "iframe";
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as PushStatus;
}

type InstallEvent = Event & { prompt: () => Promise<void> };
let deferredInstall: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e as InstallEvent;
    listeners.forEach((l) => l());
  });
}
export function canInstall() { return deferredInstall !== null; }
export function onInstallAvailable(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
export async function promptInstall() {
  if (!deferredInstall) return;
  await deferredInstall.prompt();
  deferredInstall = null;
  listeners.forEach((l) => l());
}
