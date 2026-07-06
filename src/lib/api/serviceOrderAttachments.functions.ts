/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomUUID } from "crypto";

export type AttachmentCategory = "antes" | "depois" | "evidencia" | "peca_trocada" | "outro";

export type ServiceOrderAttachment = {
  id: string;
  service_order_id: string;
  technician_id: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  caption: string | null;
  category: AttachmentCategory | null;
  created_by: string | null;
  created_at: string;
  signed_url: string | null;
};

const CATEGORIES = new Set(["antes", "depois", "evidencia", "peca_trocada", "outro"]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB pós-compressão
const SIGNED_URL_TTL = 60 * 60; // 1h

function bytesFromDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string; ext: string } | null {
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  try {
    const rawExt = m[1].toLowerCase();
    const ext = rawExt === "jpeg" ? "jpg" : rawExt;
    return {
      bytes: Uint8Array.from(Buffer.from(m[2], "base64")),
      mime: `image/${rawExt === "jpg" ? "jpeg" : rawExt}`,
      ext,
    };
  } catch {
    return null;
  }
}

async function signItems(sb: any, rows: any[]): Promise<ServiceOrderAttachment[]> {
  if (rows.length === 0) return [];
  const paths = rows.map((r) => r.file_path);
  const { data: signed } = await sb.storage
    .from("service-order-attachments")
    .createSignedUrls(paths, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  (signed ?? []).forEach((s: any) => {
    if (s?.path && s?.signedUrl) map.set(s.path, s.signedUrl);
  });
  return rows.map((r) => ({
    id: r.id,
    service_order_id: r.service_order_id,
    technician_id: r.technician_id,
    file_path: r.file_path,
    file_type: r.file_type,
    file_size: r.file_size,
    caption: r.caption,
    category: r.category,
    created_by: r.created_by,
    created_at: r.created_at,
    signed_url: map.get(r.file_path) ?? null,
  }));
}

export const listServiceOrderAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rows, error } = await sb
      .from("service_order_attachments")
      .select("*")
      .eq("service_order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return signItems(sb, rows ?? []);
  });

export const createServiceOrderAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      orderId: string;
      dataUrl: string;
      caption?: string | null;
      category?: AttachmentCategory | null;
    }) => {
      if (!data?.orderId) throw new Error("orderId obrigatório");
      if (!data?.dataUrl?.startsWith("data:image/")) throw new Error("Imagem inválida");
      if (data.dataUrl.length > MAX_BYTES * 1.4)
        throw new Error("Imagem muito grande (limite ~4 MB).");
      if (data.caption && data.caption.length > 240)
        throw new Error("Legenda muito longa (máx. 240 caracteres).");
      if (data.category && !CATEGORIES.has(data.category))
        throw new Error("Categoria inválida.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;

    const { count, error: cErr } = await sb
      .from("service_order_attachments")
      .select("id", { count: "exact", head: true })
      .eq("service_order_id", data.orderId);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) >= 3) throw new Error("Limite de 3 fotos por OS atingido.");

    const decoded = bytesFromDataUrl(data.dataUrl);
    if (!decoded) throw new Error("Formato de imagem não suportado.");
    if (decoded.bytes.byteLength > MAX_BYTES)
      throw new Error("Imagem muito grande (limite 4 MB).");

    const attachmentId = randomUUID();
    const filePath = `service-orders/${data.orderId}/${attachmentId}.${decoded.ext}`;

    const { error: upErr } = await sb.storage
      .from("service-order-attachments")
      .upload(filePath, decoded.bytes, { contentType: decoded.mime, upsert: false });
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);

    const { data: row, error } = await sb
      .from("service_order_attachments")
      .insert({
        id: attachmentId,
        service_order_id: data.orderId,
        file_path: filePath,
        file_type: decoded.mime,
        file_size: decoded.bytes.byteLength,
        caption: data.caption?.trim() || null,
        category: data.category ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      // Rollback storage
      await sb.storage.from("service-order-attachments").remove([filePath]);
      throw new Error(error.message);
    }
    const [signed] = await signItems(sb, [row]);
    return signed;
  });

export const deleteServiceOrderAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attachmentId: string }) => {
    if (!data?.attachmentId) throw new Error("attachmentId obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error: rErr } = await sb
      .from("service_order_attachments")
      .select("id, file_path")
      .eq("id", data.attachmentId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Anexo não encontrado.");

    const { error: dErr } = await sb
      .from("service_order_attachments")
      .delete()
      .eq("id", data.attachmentId);
    if (dErr) throw new Error(dErr.message);

    await sb.storage.from("service-order-attachments").remove([row.file_path]);
    return { ok: true };
  });