import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, FileImage, FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "./WireTrayAccessContext";
import { WireEmptyState, WireStatus, formatWireDate } from "./WireTrayUi";
import {
  finalizeWireTrayDocumentUpload,
  getWireTrayDocumentUrl,
  prepareWireTrayDocumentUpload,
} from "@/lib/api/wireTrayDocuments.functions";
import { supabase } from "@/integrations/supabase/client";
import { wireTrayKeys } from "@/hooks/useWireTray";
import type {
  WireTrayDocument,
  WireTrayDocumentType,
  WireTrayDocumentVisibility,
} from "@/types/wireTray";

const documentLabels: Record<WireTrayDocumentType, string> = {
  quotation: "Cotação",
  customer_order: "Pedido do cliente",
  technical_drawing: "Desenho técnico",
  production_instruction: "Instrução de produção",
  invoice: "Nota fiscal",
  dispatch_receipt: "Comprovante de expedição",
  photo: "Foto",
  other: "Outro",
};
const visibilityLabels: Record<WireTrayDocumentVisibility, string> = {
  operational: "Operacional",
  commercial: "Comercial",
  financial: "Financeiro",
  admin_only: "Somente administradores",
};

export function WireTrayDocuments({
  entityType,
  entityId,
  documents,
  defaultType = "other",
}: {
  entityType: "product" | "order" | "production_order" | "movement" | "dispatch";
  entityId: string;
  documents: WireTrayDocument[];
  defaultType?: WireTrayDocumentType;
}) {
  const access = useWireTrayAccess();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const prepare = useServerFn(prepareWireTrayDocumentUpload);
  const finalize = useServerFn(finalizeWireTrayDocumentUpload);
  const getUrl = useServerFn(getWireTrayDocumentUrl);
  const [documentType, setDocumentType] = useState<WireTrayDocumentType>(defaultType);
  const [visibility, setVisibility] = useState<WireTrayDocumentVisibility>(
    defaultVisibility(defaultType),
  );
  const canUpload = access.role !== "consulta";

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepare({
        data: {
          entityType,
          entityId,
          documentType,
          visibility,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          caption: null,
        },
      });
      const { error } = await supabase.storage
        .from("wire-tray-documents")
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      return finalize({ data: { documentId: prepared.documentId } });
    },
    onSuccess: () => {
      toast.success("Documento enviado e protegido pelas regras do módulo.");
      if (inputRef.current) inputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o documento."),
  });
  const open = useMutation({
    mutationFn: (documentId: string) => getUrl({ data: { documentId } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o documento."),
  });

  function changeType(next: WireTrayDocumentType) {
    setDocumentType(next);
    if (next === "invoice") setVisibility("financial");
  }
  return (
    <div>
      {canUpload ? (
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="wire-field">
            <span className="wire-label">Tipo de documento</span>
            <select
              className="wire-select"
              value={documentType}
              onChange={(e) => changeType(e.target.value as WireTrayDocumentType)}
            >
              {Object.entries(documentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Visibilidade</span>
            <select
              className="wire-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as WireTrayDocumentVisibility)}
            >
              <option value="operational">Operacional</option>
              <option value="commercial">Comercial</option>
              {access.canViewFinancials ? <option value="financial">Financeiro</option> : null}
              {access.role === "admin" ? (
                <option value="admin_only">Somente administradores</option>
              ) : null}
            </select>
          </label>
          <label className="wire-button-secondary cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
            {upload.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {upload.isPending ? "Enviando..." : "Anexar arquivo"}
          </label>
        </div>
      ) : null}
      {documents.length ? (
        <div className="divide-y divide-slate-100">
          {documents.map((document) => (
            <button
              type="button"
              key={document.id}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => open.mutate(document.id)}
              disabled={open.isPending}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                {document.mimeType.startsWith("image/") ? (
                  <FileImage size={19} />
                ) : (
                  <FileText size={19} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {document.fileName}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {documentLabels[document.type]} · {formatWireDate(document.createdAt, true)}
                </span>
              </span>
              <WireStatus
                tone={
                  document.visibility === "financial" || document.visibility === "admin_only"
                    ? "warning"
                    : "neutral"
                }
              >
                {visibilityLabels[document.visibility]}
              </WireStatus>
              <ExternalLink size={16} className="shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      ) : (
        <WireEmptyState
          title="Nenhum documento"
          description="PDFs, desenhos e imagens autorizados aparecerão aqui após o envio."
          action={
            canUpload ? (
              <button
                type="button"
                className="wire-button-ghost"
                onClick={() => inputRef.current?.click()}
              >
                <Paperclip size={16} /> Selecionar arquivo
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

function defaultVisibility(type: WireTrayDocumentType): WireTrayDocumentVisibility {
  if (type === "invoice") return "financial";
  if (type === "quotation" || type === "customer_order") return "commercial";
  return "operational";
}
