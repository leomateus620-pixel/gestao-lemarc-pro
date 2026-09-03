import { useState } from "react";
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableWebPush } from "@/lib/push/firebaseClient";

export function PushOptIn() {
  const [pending, setPending] = useState(false);
  const [enabled, setEnabled] = useState(() =>
    typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const [hidden, setHidden] = useState(false);

  if (enabled || hidden || typeof Notification === "undefined" || Notification.permission === "denied") {
    return null;
  }

  async function handleEnable() {
    setPending(true);
    const result = await enableWebPush();
    setPending(false);
    if (result.status === "registered") {
      setEnabled(true);
      toast.success("Notificações ativadas neste navegador.");
      return;
    }
    if (result.status === "open-in-new-tab") {
      toast.info(result.message, { duration: 6000 });
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-primary/25 bg-slate-950/95 p-3 shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Bell size={17} />
      </span>
      <p className="min-w-0 flex-1 text-xs font-semibold text-slate-200">Receba avisos importantes das suas OS.</p>
      <Button type="button" size="sm" onClick={handleEnable} disabled={pending} className="shrink-0 rounded-xl font-bold">
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        Ativar
      </Button>
      <button type="button" aria-label="Fechar aviso de notificações" onClick={() => setHidden(true)} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
        <ExternalLink size={14} className="rotate-45" />
      </button>
    </div>
  );
}
