import { useEffect, useState } from "react";
import { Bell, Download, Loader2, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { enableWebPush } from "@/lib/push/firebaseClient";
import { canInstall, getPushStatus, onInstallAvailable, promptInstall, type PushStatus } from "@/lib/push/pushStatus";

const SNOOZE_KEY = "lemarc:push-snoozed";
let silentDone = false;

export function PushPermissionGate() {
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const s = getPushStatus();
    setStatus(s);
    setInstallable(canInstall());
    const off = onInstallAvailable(() => setInstallable(canInstall()));
    if (s === "granted" && !silentDone) {
      silentDone = true;
      void enableWebPush();
    }
    const snoozed = sessionStorage.getItem(SNOOZE_KEY) === "1";
    if ((s === "default" || s === "needs-install") && !snoozed) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => { clearTimeout(t); off(); };
    }
    return off;
  }, []);

  function snooze() {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setOpen(false);
  }

  async function allow() {
    setPending(true);
    const result = await enableWebPush();
    setPending(false);
    setStatus(getPushStatus());
    if (result.status === "registered") {
      toast.success("Notificações ativadas neste aparelho.");
      setOpen(false);
      return;
    }
    toast.error(result.message);
    if (result.status === "denied") setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : snooze())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Bell size={22} />
          </span>
          <DialogTitle className="text-center">Receba avisos das suas OS</DialogTitle>
          <DialogDescription className="text-center">
            Seja avisado na hora quando uma OS for enviada para você ou finalizada.
          </DialogDescription>
        </DialogHeader>
        {status === "needs-install" ? (
          <ol className="space-y-2 rounded-xl bg-white/5 p-3 text-sm text-foreground">
            <li className="flex items-center gap-2">1. Toque em <Share size={14} className="text-primary" /> Compartilhar no Safari</li>
            <li>2. Escolha "Adicionar à Tela de Início"</li>
            <li>3. Abra o Lemarc pelo ícone e toque em "Permitir"</li>
          </ol>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {status === "default" && (
            <Button onClick={allow} disabled={pending} className="w-full font-bold">
              {pending ? <Loader2 className="animate-spin" /> : <Bell />} Permitir notificações
            </Button>
          )}
          {installable && (
            <Button variant="secondary" onClick={() => void promptInstall()} className="w-full">
              <Download /> Instalar app
            </Button>
          )}
          <Button variant="ghost" onClick={snooze} className="w-full">Agora não</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
