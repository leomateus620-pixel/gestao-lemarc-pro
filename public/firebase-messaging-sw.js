importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;
const config = {
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  appId: params.get("appId"),
  messagingSenderId: params.get("messagingSenderId"),
};

firebase.initializeApp(config);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification ?? {};
  const serviceOrderId = payload.data?.service_order_id;
  self.registration.showNotification(notification.title ?? "Gestão Lemarc", {
    body: notification.body ?? "Você recebeu uma nova notificação.",
    data: { serviceOrderId },
    icon: "/favicon.ico",
    badge: "/favicon.ico",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data?.serviceOrderId;
  const target = id ? `/ordens/${id}` : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const current = clients.find((client) => "focus" in client);
      if (current) {
        current.navigate(target);
        return current.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
