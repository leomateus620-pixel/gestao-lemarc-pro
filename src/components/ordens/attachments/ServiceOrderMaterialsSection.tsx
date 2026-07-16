import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createServiceOrderMaterialAttachment,
  deleteServiceOrderMaterialAttachment,
  listServiceOrderMaterialAttachments,
} from "@/lib/api/serviceOrderMaterialAttachments.functions";

const MAX_FILES = 6;
const MAX_BYTES = 10 * 1024 * 1024;

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function ServiceOrderMaterialsSection({ orderId }: { orderId: string }) {
  const listFn = useServerFn(listServiceOrderMaterialAttachments);
  const { data: attachments = [] } = useQuery({
    queryKey: ["service-order-materials", orderId],
    queryFn: () => listFn({ data: { orderId } }),
    staleTime: 30_000,
  });

  const [uploaderOpen, setUploaderOpen] = useState(false);
  const count = attachments.length;
  const limitReached = count >= MAX_FILES;

  return (
    <section className="mt-5">
      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Somente administradores
            </p>
            <h3 className="font-display text-base font-black text-foreground">
              Materiais (PDF)
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Anexe PDFs de materiais. Eles são incluídos no PDF baixado da OS a partir da
              segunda página. Não são exibidos para os técnicos.
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
              limitReached
                ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                : "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {count}/{MAX_FILES}
          </span>
        </div>

        {count === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
            <FileText size={22} className="mx-auto text-muted-foreground/70" />
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhum PDF de materiais anexado.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {attachments.map((att) => (
              <MaterialRow key={att.id} orderId={orderId} attachment={att} />
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {limitReached ? (
            <p className="text-[11px] font-bold text-amber-300">
              Limite de {MAX_FILES} PDFs por OS atingido.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Formato aceito: PDF (até 10 MB).
            </p>
          )}
          <Button
            onClick={() => setUploaderOpen(true)}
            disabled={limitReached}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus size={14} /> Adicionar PDF
          </Button>
        </div>
      </GlassCard>

      <UploaderDialog orderId={orderId} open={uploaderOpen} onOpenChange={setUploaderOpen} />
    </section>
  );
}

function MaterialRow({
  orderId,
  attachment,
}: {
  orderId: string;
  attachment: {
    id: string;
    file_name: string;
    file_size: number | null;
    caption: string | null;
    created_at: string;
    signed_url: string | null;
  };
}) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteServiceOrderMaterialAttachment);
  const mutation = useMutation({
    mutationFn: () => deleteFn({ data: { attachmentId: attachment.id } }),
    onSuccess: () => {
      toast.success("PDF removido.");
      queryClient.invalidateQueries({ queryKey: ["service-order-materials", orderId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao remover o PDF."),
  });

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        {attachment.signed_url ? (
          <a
            href={attachment.signed_url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-bold text-foreground hover:text-primary"
          >
            {attachment.file_name}
          </a>
        ) : (
          <span className="block truncate text-sm font-bold text-foreground">
            {attachment.file_name}
          </span>
        )}
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {fmtSize(attachment.file_size)} · {fmtDate(attachment.created_at)}
        </p>
        {attachment.caption && (
          <p className="mt-1 text-[11px] text-muted-foreground">{attachment.caption}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="shrink-0 text-red-300 hover:text-red-200"
        aria-label="Remover PDF"
      >
        {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </Button>
    </li>
  );
}

function UploaderDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  const queryClient = useQueryClient();
  const createFn = useServerFn(createServiceOrderMaterialAttachment);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um PDF.");
      const dataUrl = await readAsDataUrl(file);
      return createFn({
        data: {
          orderId,
          dataUrl,
          fileName: file.name,
          caption: caption.trim() || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("PDF adicionado à OS.");
      queryClient.invalidateQueries({ queryKey: ["service-order-materials", orderId] });
      reset();
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao anexar o PDF."),
  });

  function reset() {
    setFile(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("PDF muito grande (limite 10 MB).");
      return;
    }
    setFile(f);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar PDF de materiais</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <span className="truncate text-sm font-bold">{file.name}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{fmtSize(file.size)}</p>
              <button
                type="button"
                onClick={reset}
                className="mt-2 text-[11px] font-bold text-red-300 hover:text-red-200"
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-6 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Upload size={20} />
              Selecionar PDF
            </button>
          )}

          <div>
            <Label htmlFor="pdf-caption" className="text-[11px] font-bold">
              Descrição (opcional)
            </Label>
            <Input
              id="pdf-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={240}
              placeholder="Ex.: Lista de materiais utilizados."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando…
              </>
            ) : (
              "Salvar PDF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}