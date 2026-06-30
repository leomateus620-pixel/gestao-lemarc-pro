/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, randomUUID } from "crypto";

export type SaveSignatureInput = {
  orderId: string;
  signedByName: string;
  signedByRole?: string | null;
  /** PNG data URL (data:image/png;base64,...). */
  signatureDataUrl: string;
  geoLat?: number | null;
  geoLng?: number | null;
  deviceInfo?: Record<string, unknown> | null;
  /** If true, revoke previous active signature before inserting. */
  replace?: boolean;
};

function bytesFromDataUrl(dataUrl: string): Uint8Array | null {
  const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  try {
    return Uint8Array.from(Buffer.from(m[2], "base64"));
  } catch {
    return null;
  }
}

export const saveServiceOrderSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SaveSignatureInput) => {
    if (!data?.orderId) throw new Error("orderId obrigatório");
    if (!data?.signedByName?.trim()) throw new Error("Nome do responsável obrigatório");
    if (data.signedByName.length > 160) throw new Error("Nome muito longo");
    if (!data?.signatureDataUrl?.startsWith("data:image/")) throw new Error("Assinatura inválida");
    if (data.signatureDataUrl.length > 1_500_000) throw new Error("Assinatura muito grande");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    // Check existing active signature
    const { data: existing } = await sb
      .from("service_order_signatures")
      .select("id")
      .eq("service_order_id", data.orderId)
      .is("revoked_at", null)
      .maybeSingle();
    if (existing && !data.replace) {
      throw new Error("Já existe uma assinatura registrada para esta OS.");
    }
    if (existing && data.replace) {
      const { error: revErr } = await sb
        .from("service_order_signatures")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: context.userId,
          revoke_reason: "Substituída por nova assinatura",
        })
        .eq("id", existing.id);
      if (revErr) throw new Error(revErr.message);
    }

    const signedAt = new Date().toISOString();
    const name = data.signedByName.trim();
    const hash = createHash("sha256")
      .update(`${data.orderId}|${name}|${signedAt}|${data.signatureDataUrl}`)
      .digest("hex")
      .slice(0, 16);

    // Try storage upload (best-effort).
    let storagePath: string | null = null;
    const bytes = bytesFromDataUrl(data.signatureDataUrl);
    if (bytes) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${data.orderId}/${randomUUID()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("service-order-signatures")
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (!upErr) storagePath = path;
      } catch (e) {
        // ignore — fall back to inline data url
        console.warn("[signature] storage upload failed", e);
      }
    }

    const userAgent = getRequestHeader("user-agent") ?? null;
    let ip: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      ip = null;
    }

    const { data: row, error } = await sb
      .from("service_order_signatures")
      .insert({
        service_order_id: data.orderId,
        signed_by_name: name,
        signed_by_role: data.signedByRole?.trim() || null,
        signature_data_url: data.signatureDataUrl,
        signature_path: storagePath,
        signed_at: signedAt,
        collected_by: context.userId,
        user_agent: userAgent,
        ip_address: ip,
        device_info: data.deviceInfo ?? null,
        geo_lat: data.geoLat ?? null,
        geo_lng: data.geoLng ?? null,
        signature_hash: hash,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const waiveServiceOrderSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason: string }) => {
    if (!data?.orderId) throw new Error("orderId obrigatório");
    if (!data?.reason?.trim() || data.reason.trim().length < 6)
      throw new Error("Informe uma justificativa (mín. 6 caracteres).");
    if (data.reason.length > 500) throw new Error("Justificativa muito longa.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem dispensar a assinatura.");
    const { error } = await sb
      .from("service_orders")
      .update({
        signature_waiver_reason: data.reason.trim(),
        signature_waived_by: context.userId,
        signature_waived_at: new Date().toISOString(),
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeServiceOrderSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { signatureId: string; reason: string }) => {
    if (!data?.signatureId) throw new Error("signatureId obrigatório");
    if (!data?.reason?.trim()) throw new Error("Justificativa obrigatória");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: isAdmin } = await sb.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem revogar a assinatura.");
    const { error } = await sb
      .from("service_order_signatures")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: context.userId,
        revoke_reason: data.reason.trim(),
      })
      .eq("id", data.signatureId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
