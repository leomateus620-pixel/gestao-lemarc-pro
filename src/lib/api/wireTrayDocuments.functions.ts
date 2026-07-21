/* eslint-disable @typescript-eslint/no-explicit-any -- Storage metadata is validated at runtime. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireWireTrayAccess } from "./wireTrayShared";

const BUCKET = "wire-tray-documents";
const allowedMimes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const extensionByMime: Record<string, readonly string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

const prepareSchema = z.object({
  entityType: z.enum(["product", "order", "production_order", "movement", "dispatch"]),
  entityId: z.string().uuid(),
  documentType: z.enum([
    "quotation",
    "customer_order",
    "technical_drawing",
    "production_instruction",
    "invoice",
    "dispatch_receipt",
    "photo",
    "other",
  ]),
  visibility: z.enum(["operational", "commercial", "financial", "admin_only"]),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(100),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(15 * 1024 * 1024),
  caption: z.string().trim().max(500).nullable().optional(),
});

async function ensureEntityExists(sb: any, entityType: string, entityId: string) {
  const tableByType: Record<string, string> = {
    product: "wire_tray_products",
    order: "wire_tray_orders",
    production_order: "wire_tray_production_orders",
    movement: "wire_tray_stock_movements",
    dispatch: "wire_tray_orders",
  };
  const { data, error } = await sb
    .from(tableByType[entityType])
    .select("id")
    .eq("id", entityId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("O registro vinculado ao documento não foi encontrado.");
}

function safeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-120);
}

export const prepareWireTrayDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => prepareSchema.parse(input))
  .handler(async ({ data, context }) => {
    const access = await requireWireTrayAccess(context, [
      "admin",
      "gestor",
      "comercial",
      "producao",
      "estoque",
      "faturamento",
    ]);
    if (!allowedMimes.has(data.mimeType)) throw new Error("Formato de arquivo não permitido.");
    const extension = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!extensionByMime[data.mimeType]?.includes(extension)) {
      throw new Error("A extensão do arquivo não corresponde ao formato informado.");
    }
    if (data.visibility === "financial" && !access.canViewFinancials) {
      throw new Error("Seu perfil não permite anexar documentos financeiros.");
    }
    if (data.visibility === "admin_only" && access.role !== "admin") {
      throw new Error("Documento restrito a administradores.");
    }
    if (
      data.documentType === "invoice" &&
      data.visibility !== "financial" &&
      data.visibility !== "admin_only"
    ) {
      throw new Error("Notas fiscais devem usar visibilidade financeira ou administrativa.");
    }
    const sb = context.supabase as any;
    await ensureEntityExists(sb, data.entityType, data.entityId);
    const normalized = safeFileName(data.fileName) || `documento.${extension}`;
    const path = `${context.userId}/${data.entityType}/${data.entityId}/${crypto.randomUUID()}-${normalized}`;
    const { data: document, error: documentError } = await sb
      .from("wire_tray_documents")
      .insert({
        entity_type: data.entityType,
        entity_id: data.entityId,
        document_type: data.documentType,
        visibility: data.visibility,
        storage_path: path,
        file_name: data.fileName,
        mime_type: data.mimeType,
        file_size: data.fileSize,
        caption: data.caption ?? null,
        status: "pending",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (documentError) throw new Error(documentError.message);
    const { data: signed, error: signedError } = await sb.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (signedError || !signed?.token) {
      await sb.from("wire_tray_documents").update({ status: "rejected" }).eq("id", document.id);
      throw new Error(signedError?.message ?? "Não foi possível preparar o envio do arquivo.");
    }
    return { documentId: document.id as string, path, token: signed.token as string };
  });

export const finalizeWireTrayDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context, [
      "admin",
      "gestor",
      "comercial",
      "producao",
      "estoque",
      "faturamento",
    ]);
    const { data: document, error } = await (context.supabase as any)
      .from("wire_tray_documents")
      .update({ status: "ready" })
      .eq("id", data.documentId)
      .eq("created_by", context.userId)
      .eq("status", "pending")
      .select("id, file_name, document_type, visibility, entity_type, entity_id, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!document) throw new Error("Documento pendente não encontrado.");
    return document;
  });

export const getWireTrayDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireWireTrayAccess(context);
    const sb = context.supabase as any;
    const { data: document, error } = await sb
      .from("wire_tray_documents")
      .select("storage_path, file_name")
      .eq("id", data.documentId)
      .eq("status", "ready")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!document) throw new Error("Documento não encontrado ou acesso restrito.");
    const { data: signed, error: signedError } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(document.storage_path, 300, { download: false });
    if (signedError || !signed?.signedUrl)
      throw new Error(signedError?.message ?? "Não foi possível abrir o documento.");
    return {
      url: signed.signedUrl as string,
      fileName: document.file_name as string,
      expiresIn: 300,
    };
  });
