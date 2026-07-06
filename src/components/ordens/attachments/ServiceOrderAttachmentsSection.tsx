import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/components/app/AuthContext";
import {
  type AttachmentCategory,
  type ServiceOrderAttachment,
  createServiceOrderAttachment,
  deleteServiceOrderAttachment,
  listServiceOrderAttachments,
} from "@/lib/api/serviceOrderAttachments.functions";

const CATEGORY_LABEL: Record<AttachmentCategory, string> = {
  antes: "Antes",
  depois: "Depois",
  evidencia: "Evidência",
  peca_trocada: "Peça trocada",
  outro: "Outro",
};

const MAX_PHOTOS = 3;

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Imagem inválida."));
    el.src = dataUrl;
  });
  const MAX_SIDE = 1600;
  let { width, height } = img;
  if (width > MAX_SIDE || height > MAX_SIDE) {
    if (width >= height) {
      height = Math.round((height * MAX_SIDE) / width);
      width = MAX_SIDE;
    } else {
      width = Math.round((width * MAX_SIDE) / height);
      height = MAX_SIDE;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ServiceOrderAttachmentsSection({ orderId }: { orderId: string }) {
  const listFn = useServerFn(listServiceOrderAttachments);
  const { data: attachments = [] } = useQuery({
    queryKey: ["service-order-attachments", orderId],
    queryFn: () => listFn({ data: { orderId } }),
    staleTime: 30_000,
  });

  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [preview, setPreview] = useState<ServiceOrderAttachment | null>(null);

  const count = attachments.length;
  const limitReached = count >= MAX_PHOTOS;

  return (
    <section className="mt-5">
      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Evidências operacionais
            </p>
            <h3 className="font-display text-base font-black text-foreground">Fotos da OS</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Adicione até 3 fotos para registrar evidências do serviço. As imagens ficam salvas na
              OS e não entram no PDF principal.
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
            {count}/{MAX_PHOTOS}
          </span>
        </div>

        {count === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
            <ImageIcon size={22} className="mx-auto text-muted-foreground/70" />
            <p className="mt-2 text-xs text-muted-foreground">
              Nenhuma foto anexada a esta OS.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
            {attachments.map((att) => (
              <li key={att.id}>
                <button
                  type="button"
                  onClick={() => setPreview(att)}
                  className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-primary/40"
                >
                  {att.signed_url ? (
                    <img
                      src={att.signed_url}
                      alt={att.caption ?? "Foto da OS"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <ImageIcon size={18} />
                    </div>
                  )}
                  {att.category && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur">
                      {CATEGORY_LABEL[att.category]}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {limitReached ? (
            <p className="text-[11px] font-bold text-amber-300">
              Limite de 3 fotos por OS atingido.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Formatos aceitos: JPG, PNG ou WEBP.
            </p>
          )}
          <Button
            onClick={() => setUploaderOpen(true)}
            disabled={limitReached}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus size={14} /> Adicionar foto
          </Button>
        </div>
      </GlassCard>

      <UploaderDialog
        orderId={orderId}
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
      />
      <PreviewDialog
        attachment={preview}
        onOpenChange={(v) => !v && setPreview(null)}
        orderId={orderId}
      />
    </section>
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
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<AttachmentCategory>("evidencia");
  const [caption, setCaption] = useState("");
  const [processing, setProcessing] = useState(false);

  const queryClient = useQueryClient();
  const createFn = useServerFn(createServiceOrderAttachment);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma foto.");
      const dataUrl = await compressImage(file);
      return createFn({
        data: { orderId, dataUrl, caption: caption.trim() || null, category },
      });
    },
    onSuccess: () => {
      toast.success("Foto adicionada à OS.");
      queryClient.invalidateQueries({ queryKey: ["service-order-attachments", orderId] });
      reset();
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao salvar a foto."),
  });

  function reset() {
    setFile(null);
    setPreview(null);
    setCaption("");
    setCategory("evidencia");
    setProcessing(false);
  }

  async function handleFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Arquivo inválido. Selecione uma imagem.");
      return;
    }
    setProcessing(true);
    try {
      const url = URL.createObjectURL(f);
      setPreview(url);
      setFile(f);
    } finally {
      setProcessing(false);
    }
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
          <DialogTitle>Adicionar foto à OS</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <input
              id="os-photo-camera"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                <img
                  src={preview}
                  alt="Pré-visualização"
                  className="mx-auto max-h-64 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"
                  aria-label="Remover imagem"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-6 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <ImageIcon size={20} />
                  Galeria
                </button>
                <button
                  type="button"
                  onClick={() =>
                    (document.getElementById("os-photo-camera") as HTMLInputElement)?.click()
                  }
                  className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-6 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Camera size={20} />
                  Câmera
                </button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-[11px] font-bold">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as AttachmentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as AttachmentCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="os-photo-caption" className="text-[11px] font-bold">
              Legenda (opcional)
            </Label>
            <Input
              id="os-photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={240}
              placeholder="Ex.: Motor substituído após inspeção."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending || processing}
            className="gap-2"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Enviando…
              </>
            ) : (
              "Salvar foto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  attachment,
  onOpenChange,
  orderId,
}: {
  attachment: ServiceOrderAttachment | null;
  onOpenChange: (v: boolean) => void;
  orderId: string;
}) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteServiceOrderAttachment);
  const mutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { attachmentId: id } }),
    onSuccess: () => {
      toast.success("Foto removida.");
      queryClient.invalidateQueries({ queryKey: ["service-order-attachments", orderId] });
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao remover a foto."),
  });

  const canDelete = useMemo(() => {
    if (!attachment) return false;
    return isAdmin || (user?.id && attachment.created_by === user.id);
  }, [attachment, isAdmin, user?.id]);

  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {attachment?.category ? CATEGORY_LABEL[attachment.category] : "Foto da OS"}
          </DialogTitle>
        </DialogHeader>
        {attachment && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
              {attachment.signed_url ? (
                <img
                  src={attachment.signed_url}
                  alt={attachment.caption ?? "Foto da OS"}
                  className="mx-auto max-h-[70vh] w-full object-contain"
                />
              ) : (
                <div className="grid h-64 w-full place-items-center text-muted-foreground">
                  Imagem indisponível
                </div>
              )}
            </div>
            {attachment.caption && (
              <p className="text-sm text-foreground">{attachment.caption}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Enviada em {fmtDate(attachment.created_at)}
            </p>
          </div>
        )}
        <DialogFooter>
          {canDelete && attachment && (
            <Button
              variant="destructive"
              onClick={() => mutation.mutate(attachment.id)}
              disabled={mutation.isPending}
              className="gap-2"
            >
              <Trash2 size={14} />
              {mutation.isPending ? "Removendo…" : "Excluir foto"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}