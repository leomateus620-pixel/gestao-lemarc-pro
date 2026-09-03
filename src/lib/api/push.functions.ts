import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export type PushEventType = "service_order_assigned" | "service_order_finished";

type DeliveryInput = {
  userIds: string[];
  eventType: PushEventType;
  title: string;
  body: string;
  serviceOrderId?: string | null;
  data?: Record<string, string>;
};

type FcmServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

function tokenSuffix(token: string) {
  return token.slice(-8);
}

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function createGoogleAccessToken(account: FcmServiceAccount) {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const input = `${header}.${claim}`;
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(pem);
  const keyData = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyData.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${input}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  if (!response.ok) throw new Error(`FCM OAuth [${response.status}]: ${await response.text()}`);
  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) throw new Error("FCM OAuth não retornou um token de acesso.");
  return result.access_token;
}

function readServiceAccount(): FcmServiceAccount {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não configurado.");
  const account = JSON.parse(raw) as FcmServiceAccount;
  if (!account.client_email || !account.private_key || !account.project_id) throw new Error("Credencial FCM incompleta.");
  return account;
}

async function getServerClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function insertLog(sb: any, row: Record<string, unknown>) {
  const { error } = await sb.from("notification_delivery_log").insert(row);
  if (error) console.error("[push] Falha ao gravar log", error.message);
}

export async function deliverPush({ userIds, eventType, title, body, serviceOrderId = null, data = {} }: DeliveryInput) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return;
  const sb = await getServerClient();
  const { data: devices, error } = await sb.from("push_devices").select("id, user_id, token").in("user_id", ids).is("revoked_at", null);
  if (error) {
    console.error("[push] Falha ao buscar dispositivos", error.message);
    return;
  }
  const targets = (devices ?? []) as { id: string; user_id: string; token: string }[];
  if (targets.length === 0) {
    await Promise.all(ids.map((userId) => insertLog(sb, {
      event_type: eventType, channel: "fcm", user_id: userId, service_order_id: serviceOrderId,
      title, body, status: "skipped_no_token", metadata: data,
    })));
    return;
  }

  let accessToken: string;
  let account: FcmServiceAccount;
  try {
    account = readServiceAccount();
    accessToken = await createGoogleAccessToken(account);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Falha de autenticação FCM";
    await Promise.all(targets.map((target) => insertLog(sb, {
      event_type: eventType, channel: "fcm", user_id: target.user_id, service_order_id: serviceOrderId,
      title, body, fcm_token_suffix: tokenSuffix(target.token), status: "failed", error: message, metadata: data,
    })));
    return;
  }

  await Promise.all(targets.map(async (target) => {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ message: {
          token: target.token,
          notification: { title, body },
          data: { ...data, service_order_id: serviceOrderId ?? "" },
          webpush: { fcm_options: { link: serviceOrderId ? `/ordens/${serviceOrderId}` : "/dashboard" } },
        } }),
      });
      const responseText = await response.text();
      if (response.ok) {
        const result = JSON.parse(responseText) as { name?: string };
        await insertLog(sb, {
          event_type: eventType, channel: "fcm", user_id: target.user_id, service_order_id: serviceOrderId,
          title, body, fcm_token_suffix: tokenSuffix(target.token), fcm_message_id: result.name ?? null,
          status: "sent", metadata: data,
        });
        await sb.from("push_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", target.id);
        return;
      }
      const unregistered = responseText.includes("UNREGISTERED") || responseText.includes("registration-token-not-registered");
      await insertLog(sb, {
        event_type: eventType, channel: "fcm", user_id: target.user_id, service_order_id: serviceOrderId,
        title, body, fcm_token_suffix: tokenSuffix(target.token), status: unregistered ? "unregistered" : "failed",
        error: `FCM [${response.status}]: ${responseText}`, metadata: data,
      });
      if (unregistered) await sb.from("push_devices").update({ revoked_at: new Date().toISOString() }).eq("id", target.id);
    } catch (cause) {
      await insertLog(sb, {
        event_type: eventType, channel: "fcm", user_id: target.user_id, service_order_id: serviceOrderId,
        title, body, fcm_token_suffix: tokenSuffix(target.token), status: "failed",
        error: cause instanceof Error ? cause.message : "Falha ao enviar push", metadata: data,
      });
    }
  }));
}

export async function notifyAdminsOfFinishedOrder(input: {
  serviceOrderId: string;
  orderNumber: number;
  body: string;
}) {
  const sb = await getServerClient();
  const { data, error } = await sb.from("user_roles").select("user_id").eq("role", "admin");
  if (error) {
    console.error("[push] Falha ao buscar administradores", error.message);
    return;
  }
  await deliverPush({
    userIds: ((data ?? []) as { user_id: string }[]).map((row) => row.user_id),
    eventType: "service_order_finished",
    title: `OS #${input.orderNumber} finalizada`,
    body: input.body,
    serviceOrderId: input.serviceOrderId,
    data: { type: "service_order_finished", service_order_id: input.serviceOrderId },
  });
}

export const registerPushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string; platform?: string; userAgent?: string }) => data)
  .handler(async ({ data, context }) => {
    const token = data.token.trim();
    if (!token || token.length < 20 || token.length > 4096) throw new Error("Token de notificação inválido.");
    const { error } = await (context.supabase.from("push_devices") as any).upsert({
      token, user_id: context.userId, platform: data.platform ?? "web", user_agent: data.userAgent ?? null,
      last_seen_at: new Date().toISOString(), revoked_at: null,
    }, { onConflict: "token" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const revokePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").update({ revoked_at: new Date().toISOString() }).eq("token", data.token).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listNotificationDeliveryLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { eventType?: PushEventType | "all"; status?: string | "all" }) => data)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: isAdmin, error: roleError } = await sb.rpc("is_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Ação restrita ao administrador.");
    let query = sb.from("notification_delivery_log").select("id, created_at, event_type, user_id, service_order_id, title, body, fcm_token_suffix, fcm_message_id, status, error, metadata").order("created_at", { ascending: false }).limit(300);
    if (data.eventType && data.eventType !== "all") query = query.eq("event_type", data.eventType);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<Record<string, Json>>;
  });
