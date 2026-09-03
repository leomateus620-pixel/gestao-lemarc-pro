import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { registerPushDevice } from "@/lib/api/push.functions";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID ?? "1:862951876555:web:0bc9902c61dd44b9ee784e";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY ?? "AIzaSyBxJpQnoTZtAPnsxfQS88wObMYe6ZnGJQ",
  authDomain: "lemarc-7dc31.firebaseapp.com",
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID ?? "lemarc-7dc31",
  appId,
  messagingSenderId: appId.split(":")[1] ?? "862951876555",
};
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY ?? "BBsxDtbig5dGoqI-65Kd8BjIb-ke7E0ePx1w9IlyfNj8yGHbCSlq3h74RJ7MjBYoF4OU9AdrsZDzx3Wj5aa67xQ";

export type PushEnableResult =
  | { status: "registered" }
  | { status: "open-in-new-tab" | "denied" | "unsupported" | "not-configured"; message: string };

export async function enableWebPush(): Promise<PushEnableResult> {
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
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey)}&projectId=${encodeURIComponent(firebaseConfig.projectId)}&appId=${encodeURIComponent(appId)}&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId)}`);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { status: "denied", message: "O navegador não retornou um token de notificação." };
    await registerPushDevice({ data: { token, platform: "web", userAgent: navigator.userAgent } });
    return { status: "registered" };
  } catch (error) {
    return { status: "denied", message: error instanceof Error ? error.message : "Não foi possível ativar notificações." };
  }
}
