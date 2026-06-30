import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Eraser, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveServiceOrderSignature } from "@/lib/api/signatures.functions";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

type Props = {
  orderId: string;
  orderNumber: number | string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replace?: boolean;
};

export function SignatureCaptureDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  replace,
}: Props) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveServiceOrderSignature);
  const mutation = useMutation({
    mutationFn: (payload: { dataUrl: string }) =>
      saveFn({
        data: {
          orderId,
          signedByName: name,
          signedByRole: role || null,
          signatureDataUrl: payload.dataUrl,
          geoLat: geo?.lat ?? null,
          geoLng: geo?.lng ?? null,
          deviceInfo: {
            platform: navigator.platform,
            language: navigator.language,
            viewport: { w: window.innerWidth, h: window.innerHeight },
          },
          replace: Boolean(replace),
        },
      }),
    onSuccess: () => {
      toast.success("Assinatura registrada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["service-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      onOpenChange(false);
      reset();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Falha ao salvar assinatura"),
  });

  function reset() {
    setName("");
    setRole("");
    setIsEmpty(true);
    padRef.current?.clear();
  }

  function requestGeo() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeo(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4_000 },
    );
  }

  function handleConfirm() {
    if (!name.trim()) {
      toast.error("Informe o nome do responsável.");
      return;
    }
    if (padRef.current?.isEmpty()) {
      toast.error("A assinatura está vazia.");
      return;
    }
    const dataUrl = padRef.current?.toDataURL() ?? "";
    if (!dataUrl) {
      toast.error("Não foi possível ler a assinatura.");
      return;
    }
    mutation.mutate({ dataUrl });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-gradient-to-br from-slate-50 to-slate-100 p-0 text-slate-900 sm:h-[100dvh] sm:max-w-none"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestGeo();
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
          {/* Header fixo */}
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur sm:px-8 sm:py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">
                OS #{orderNumber} · Validação
              </p>
              <h2 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl">
                Assinatura do responsável
              </h2>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block sm:text-sm">
                Peça para o responsável da empresa assinar com o dedo confirmando que validou o
                serviço executado.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 sm:inline-flex">
                <ShieldCheck size={12} /> Registro rastreável
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:hidden"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Conteúdo scrollável */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-[260px,1fr]">
              <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div>
                  <Label htmlFor="sig-name" className="text-[11px] font-bold text-slate-700">
                    Nome do responsável *
                  </Label>
                  <Input
                    id="sig-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: João Silva"
                    maxLength={160}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="sig-role" className="text-[11px] font-bold text-slate-700">
                    Cargo / documento (opcional)
                  </Label>
                  <Input
                    id="sig-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex.: Encarregado de manutenção"
                    maxLength={160}
                    autoComplete="off"
                  />
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600 sm:p-3">
                  <p className="font-semibold text-slate-800">Declaração</p>
                  <p className="mt-1">
                    Ao confirmar, o responsável declara que acompanhou e validou as informações
                    desta Ordem de Serviço.
                  </p>
                </div>
                {geo && (
                  <p className="text-[10px] text-slate-400">
                    Geo capturada: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                  </p>
                )}
              </aside>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="relative">
                  <SignaturePad
                    ref={padRef}
                    onChange={setIsEmpty}
                    className="relative h-[44vh] min-h-[220px] w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-inner sm:h-[56vh]"
                  />
                  <button
                    type="button"
                    onClick={() => padRef.current?.clear()}
                    disabled={isEmpty}
                    aria-label="Limpar assinatura"
                    className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Eraser size={13} /> Limpar
                  </button>
                </div>
                {name.trim() && (
                  <p className="mt-2 text-center text-sm font-black uppercase tracking-[0.18em] text-teal-700">
                    {name.trim()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer sticky */}
          <footer
            className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8 sm:py-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-stretch gap-2 sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="shrink-0 gap-2 border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50 sm:px-4"
                size="lg"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="flex flex-1 items-stretch gap-2 sm:flex-none">
                <Button
                  variant="secondary"
                  onClick={() => padRef.current?.clear()}
                  disabled={isEmpty}
                  className="hidden gap-2 sm:inline-flex"
                  size="lg"
                >
                  <Eraser size={16} /> Limpar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={mutation.isPending || isEmpty || !name.trim()}
                  size="lg"
                  className="flex-1 gap-2 bg-teal-600 text-white hover:bg-teal-700 sm:flex-none sm:px-8"
                >
                  <Check size={16} />
                  {mutation.isPending ? "Salvando…" : "Confirmar assinatura"}
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
