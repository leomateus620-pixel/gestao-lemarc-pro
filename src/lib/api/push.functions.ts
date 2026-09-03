import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export type PushEventType = "service_order_assigned" | "service_order_finished";

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
    const userIds = Array.from(new Set(((rows ?? []) as { user_id: string | null }[]).map((row) => row.user_id).filter(Boolean))) as string[];
    const { data: profiles } = userIds.length > 0 ? await sb.from("profiles").select("user_id, email, full_name").in("user_id", userIds) : { data: [] };
    const profileMap = new Map(((profiles ?? []) as { user_id: string; email: string | null; full_name: string | null }[]).map((profile) => [profile.user_id, profile]));
    return ((rows ?? []) as Array<Record<string, Json>>).map((row) => ({ ...row, recipient: row.user_id ? profileMap.get(String(row.user_id))?.full_name ?? profileMap.get(String(row.user_id))?.email ?? "Usuário" : "—" }));
  });
