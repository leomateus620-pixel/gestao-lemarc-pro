import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { registerPushDevice } from "@/lib/api/push.functions";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID ?? "1:862951876555:web:0bc9902c61dd44b9ee784e";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY ?? "AIzaSyBxVJpQnoTZtAPnsxfQS88wObMYe6ZnGJQ",
  authDomain: "lemarc-7dc31.firebaseapp.com",
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID ?? "lemarc-7dc31",
  appId,
  messagingSenderId: appId.split(":")[1] ?? "862951876555",
};
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY ?? "BBsxDtbig5dGoqI-65Kd8BjIb-ke7E0ePx1w9IlyfNj8yGHbCSlq3h74RJ7MjBYoF4OU9AdrsZDzx3Wj5aa67xQ";

export type PushEnableResult =
  | { status: "registered" }
  | { status: "open-in-new-tab" | "denied" | "unsupported" | "not-configured"; message: string };

let inflight: Promise<PushEnableResult> | null = null;

// Uma única ativação por vez: chamadas simultâneas reaproveitam a mesma promessa.
export function enableWebPush(): Promise<PushEnableResult> {
  if (!inflight) {
    inflight = doEnableWebPush().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

const TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Não foi possível ativar agora. Tente de novo.")), TIMEOUT_MS),
    ),
  ]);
}

function waitActive(reg: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> {
  if (reg.active) return Promise.resolve(reg);
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return navigator.serviceWorker.ready.then(() => reg);
  return new Promise((resolve) => {
    const onChange = () => {
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", onChange);
        resolve(reg);
      }
    };
    sw.addEventListener("statechange", onChange);
  });
}

async function doEnableWebPush(): Promise<PushEnableResult> {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !appId || !vapidKey) {
    return { status: "not-configured", message: "Atualize a conexão Firebase com a opção de web push." };
  }
  if (!("Notification" in window) || !(await isSupported())) {
    return { status: "unsupported", message: "Este navegador não oferece notificações web." };
  }
  if (window.top !== window.self) {
    return { status: "open-in-new-tab", message: "Abra o app em uma aba própria do navegador para ativar." };
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied", message: "Permissão bloqueada. Libere notificações nas configurações do navegador." };
  }
  try {
    return await withTimeout(
      (async (): Promise<PushEnableResult> => {
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const registration = await waitActive(
          await navigator.serviceWorker.register(`/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}&projectId=${encodeURIComponent(firebaseConfig.projectId)}&appId=${encodeURIComponent(appId)}&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId)}`),
        );
        const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
        if (!token) return { status: "denied", message: "O navegador não retornou um token de notificação." };
        await registerPushDevice({ data: { token, platform: "web", userAgent: navigator.userAgent } });
        void registration.update().catch(() => undefined);
        return { status: "registered" };
      })(),
    );
  } catch (error) {
    return { status: "denied", message: error instanceof Error ? error.message : "Não foi possível ativar notificações." };
  }
}
