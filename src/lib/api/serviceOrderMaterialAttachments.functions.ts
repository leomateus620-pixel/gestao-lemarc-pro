/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomUUID } from "crypto";

export type ServiceOrderMaterialAttachment = {
  id: string;
  service_order_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  caption: string | null;
  created_by: string | null;
  created_at: string;
  signed_url: string | null;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PER_ORDER = 6;
const SIGNED_URL_TTL = 60 * 60;
const BUCKET = "service-order-materials";

async function ensureAdmin(sb: any, userId: string) {
  const { data, error } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito a administradores.");
}

function bytesFromPdfDataUrl(dataUrl: string): Uint8Array | null {
  const m = /^data:application\/pdf;base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  try {
    return Uint8Array.from(Buffer.from(m[1], "base64"));
  } catch {
    return null;
  }
}

async function signItems(sb: any, rows: any[]): Promise<ServiceOrderMaterialAttachment[]> {
  if (rows.length === 0) return [];
  const paths = rows.map((r) => r.file_path);
  const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const map = new Map<string, string>();
  (signed ?? []).forEach((s: any) => {
    if (s?.path && s?.signedUrl) map.set(s.path, s.signedUrl);
  });
  return rows.map((r) => ({
    id: r.id,
    service_order_id: r.service_order_id,
    file_path: r.file_path,
    file_name: r.file_name,
    file_size: r.file_size,
    caption: r.caption,
    created_by: r.created_by,
    created_at: r.created_at,
    signed_url: map.get(r.file_path) ?? null,
  }));
}

export const listServiceOrderMaterialAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { data: rows, error } = await sb
      .from("service_order_material_attachments")
      .select("*")
      .eq("service_order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return signItems(sb, rows ?? []);
  });

export const createServiceOrderMaterialAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { orderId: string; dataUrl: string; fileName: string; caption?: string | null }) => {
      if (!data?.orderId) throw new Error("orderId obrigatório");
      if (!data?.dataUrl?.startsWith("data:application/pdf")) throw new Error("Envie um PDF válido.");
      if (!data?.fileName?.trim()) throw new Error("Informe o nome do arquivo.");
      if (data.dataUrl.length > MAX_BYTES * 1.4)
        throw new Error("PDF muito grande (limite 10 MB).");
      if (data.caption && data.caption.length > 240)
        throw new Error("Legenda muito longa (máx. 240 caracteres).");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);

    const { count, error: cErr } = await sb
      .from("service_order_material_attachments")
      .select("id", { count: "exact", head: true })
      .eq("service_order_id", data.orderId);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) >= MAX_PER_ORDER)
      throw new Error(`Limite de ${MAX_PER_ORDER} PDFs por OS atingido.`);

    const bytes = bytesFromPdfDataUrl(data.dataUrl);
    if (!bytes) throw new Error("Formato inválido: envie um PDF.");
    if (bytes.byteLength > MAX_BYTES) throw new Error("PDF muito grande (limite 10 MB).");

    const attachmentId = randomUUID();
    const filePath = `service-orders/${data.orderId}/${attachmentId}.pdf`;

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: "application/pdf", upsert: false });
    if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);

    const safeName = data.fileName.trim().slice(0, 160);
    const { data: row, error } = await sb
      .from("service_order_material_attachments")
      .insert({
        id: attachmentId,
        service_order_id: data.orderId,
        file_path: filePath,
        file_name: safeName,
        file_size: bytes.byteLength,
        caption: data.caption?.trim() || null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) {
      await sb.storage.from(BUCKET).remove([filePath]);
      throw new Error(error.message);
    }
    const [signed] = await signItems(sb, [row]);
    return signed;
  });

export const deleteServiceOrderMaterialAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { attachmentId: string }) => {
    if (!data?.attachmentId) throw new Error("attachmentId obrigatório");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await ensureAdmin(sb, context.userId);
    const { data: row, error: rErr } = await sb
      .from("service_order_material_attachments")
      .select("id, file_path")
      .eq("id", data.attachmentId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Anexo não encontrado.");

    const { error: dErr } = await sb
      .from("service_order_material_attachments")
      .delete()
      .eq("id", data.attachmentId);
    if (dErr) throw new Error(dErr.message);

    await sb.storage.from(BUCKET).remove([row.file_path]);
    return { ok: true };
  });