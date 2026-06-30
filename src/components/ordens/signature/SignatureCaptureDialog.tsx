import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Eraser, ShieldCheck } from "lucide-react";
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
        className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-gradient-to-br from-slate-50 to-slate-100 p-0 text-slate-900 sm:h-[100dvh] sm:max-w-none"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestGeo();
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col px-4 py-4 sm:px-8 sm:py-6">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">
                OS #{orderNumber} · Validação
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Assinatura do responsável
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Peça para o responsável da empresa assinar com o dedo confirmando que validou o
                serviço executado.
              </p>
            </div>
            <span className="hidden items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-700 sm:inline-flex">
              <ShieldCheck size={12} /> Registro rastreável
            </span>
          </header>

          <div className="mt-4 grid flex-1 min-h-0 grid-cols-1 gap-4 sm:grid-cols-[260px,1fr]">
            <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                <p className="font-semibold text-slate-800">Declaração</p>
                <p className="mt-1">
                  Ao confirmar, o responsável declara que acompanhou e validou as informações desta
                  Ordem de Serviço.
                </p>
              </div>
              {geo && (
                <p className="text-[10px] text-slate-400">
                  Geo capturada: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
                </p>
              )}
            </aside>

            <div className="flex min-h-0 flex-1 flex-col">
              <SignaturePad
                ref={padRef}
                onChange={setIsEmpty}
                className="relative h-full min-h-[260px] w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-inner"
              />
              {name.trim() && (
                <p className="mt-2 text-center text-sm font-black uppercase tracking-[0.18em] text-teal-700">
                  {name.trim()}
                </p>
              )}
            </div>
          </div>

          <footer className="mt-4 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              size="lg"
            >
              <ArrowLeft size={16} /> Voltar
            </Button>
            <div className="flex flex-1 items-stretch gap-2 sm:flex-none">
              <Button
                variant="secondary"
                onClick={() => padRef.current?.clear()}
                disabled={isEmpty}
                className="flex-1 gap-2 sm:flex-none"
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
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}