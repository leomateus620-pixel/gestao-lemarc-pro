import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Eye, PenLine, ShieldCheck, ShieldOff } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceOrder } from "@/types/serviceOrder";
import { useUserRole } from "@/hooks/useUserRole";
import { waiveServiceOrderSignature } from "@/lib/api/signatures.functions";
import { SignatureCaptureDialog } from "./SignatureCaptureDialog";

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export function SignatureBlock({ order }: { order: ServiceOrder }) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [waiveOpen, setWaiveOpen] = useState(false);
  const sig = order.signature ?? null;
  const hasWaiver = Boolean(order.signature_waiver_reason);
  const { isAdmin } = useUserRole();

  return (
    <section className="mt-5">
      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Validação do cliente
            </p>
            <h3 className="font-display text-base font-black text-foreground">
              Assinatura do responsável
            </h3>
          </div>
          {sig ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
              <ShieldCheck size={12} /> Registrada
            </span>
          ) : hasWaiver ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
              <ShieldOff size={12} /> Finalizada sem assinatura
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-300">
              <AlertCircle size={12} /> Pendente
            </span>
          )}
        </div>

        {sig ? (
          <div className="mt-3 flex items-start gap-3">
            <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white">
              {sig.signature_data_url ? (
                <img
                  src={sig.signature_data_url}
                  alt={`Assinatura de ${sig.signed_by_name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <PenLine size={18} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{sig.signed_by_name}</p>
              {sig.signed_by_role && (
                <p className="truncate text-[11px] text-muted-foreground">{sig.signed_by_role}</p>
              )}
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtDateTime(sig.signed_at)}
                {sig.signature_hash ? ` · SIG-${sig.signature_hash}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye size={13} /> Ver
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-[11px]"
                  onClick={() => setCaptureOpen(true)}
                >
                  <PenLine size={13} /> Substituir
                </Button>
              )}
            </div>
          </div>
        ) : hasWaiver ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-foreground">{order.signature_waiver_reason}</p>
            {order.signature_waived_at && (
              <p className="text-[11px] text-muted-foreground">
                Justificada em {fmtDateTime(order.signature_waived_at)}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Antes de finalizar a OS, colete a assinatura do responsável da empresa diretamente no
              celular. A assinatura fica vinculada à OS e aparece no relatório final.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setCaptureOpen(true)}
                className="gap-2 bg-primary text-primary-foreground"
              >
                <PenLine size={15} /> Coletar assinatura
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => setWaiveOpen(true)}>
                  Finalizar sem assinatura
                </Button>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      <SignatureCaptureDialog
        orderId={order.id}
        orderNumber={order.number}
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        replace={Boolean(sig)}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinatura registrada</DialogTitle>
          </DialogHeader>
          {sig && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                {sig.signature_data_url ? (
                  <img
                    src={sig.signature_data_url}
                    alt="Assinatura"
                    className="mx-auto max-h-56 w-full object-contain"
                  />
                ) : (
                  <p className="text-center text-sm text-slate-500">Imagem indisponível</p>
                )}
                <p className="mt-2 text-center text-sm font-black uppercase tracking-[0.18em] text-teal-700">
                  {sig.signed_by_name}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Info k="Cargo" v={sig.signed_by_role ?? "—"} />
                <Info k="Assinado em" v={fmtDateTime(sig.signed_at)} />
                <Info k="Registro" v={sig.signature_hash ? `SIG-${sig.signature_hash}` : "—"} />
                <Info
                  k="Geo"
                  v={
                    sig.geo_lat != null && sig.geo_lng != null
                      ? `${sig.geo_lat.toFixed(4)}, ${sig.geo_lng.toFixed(4)}`
                      : "—"
                  }
                />
              </dl>
              <p className="text-[10px] text-muted-foreground">
                Este registro tem fins de rastreabilidade operacional e não substitui assinatura
                jurídica formal.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WaiveDialog orderId={order.id} open={waiveOpen} onOpenChange={setWaiveOpen} />
    </section>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
      <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {k}
      </dt>
      <dd className="mt-0.5 truncate text-foreground">{v}</dd>
    </div>
  );
}

function WaiveDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const waiveFn = useServerFn(waiveServiceOrderSignature);
  const mutation = useMutation({
    mutationFn: () => waiveFn({ data: { orderId, reason } }),
    onSuccess: () => {
      toast.success("Justificativa registrada");
      queryClient.invalidateQueries({ queryKey: ["service-order", orderId] });
      onOpenChange(false);
      setReason("");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao registrar justificativa"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar sem assinatura</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Apenas administradores podem dispensar a coleta da assinatura. Esta ação fica registrada
          na OS e aparece no relatório.
        </p>
        <div>
          <Label htmlFor="waive-reason" className="text-[11px] font-bold">
            Justificativa *
          </Label>
          <Textarea
            id="waive-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: Responsável da empresa ausente no encerramento do serviço."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || reason.trim().length < 6}
          >
            {mutation.isPending ? "Salvando…" : "Registrar justificativa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
