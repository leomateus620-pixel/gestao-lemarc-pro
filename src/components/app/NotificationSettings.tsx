import { useEffect, useState } from "react";
import { Bell, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { enableWebPush } from "@/lib/push/firebaseClient";
import { sendTestPush } from "@/lib/api/push.functions";
import { canInstall, getPushStatus, onInstallAvailable, promptInstall, pushStatusLabels, showAndroidInstallGuide, type PushStatus } from "@/lib/push/pushStatus";

export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [installable, setInstallable] = useState(false);
  const testFn = useServerFn(sendTestPush);

  useEffect(() => {
    setStatus(getPushStatus());
    setInstallable(canInstall());
    return onInstallAvailable(() => setInstallable(canInstall()));
  }, []);

  async function activate() {
    setPending(true);
    const r = await enableWebPush();
    setPending(false);
    setStatus(getPushStatus());
    if (r.status === "registered") toast.success("Notificações ativadas neste aparelho.");
    else toast.error(r.message);
  }

  async function test() {
    setTesting(true);
    try {
      const r = await testFn();
      if (r.sent > 0) toast.success(`Notificação de teste enviada para ${r.sent} aparelho(s).`);
      else toast.error("Nenhum aparelho ativado encontrado. Ative as notificações primeiro.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar teste.");
    } finally {
      setTesting(false);
    }
  }

  const info = pushStatusLabels[status];
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><Bell size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-black text-foreground">Notificações</p>
          <p className="text-xs font-bold text-primary">{info.text}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{info.hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(status === "default" || status === "granted" || status === "denied") && (
          <Button size="sm" onClick={activate} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Bell />} {status === "granted" ? "Reativar" : status === "denied" ? "Já liberei, tentar de novo" : "Ativar notificações"}
          </Button>
        )}
        {installable && (
          <Button size="sm" variant="secondary" onClick={() => void promptInstall()}><Download /> Instalar app</Button>
        )}
        {showAndroidInstallGuide() && (
          <p className="w-full rounded-xl bg-white/5 p-2 text-xs text-muted-foreground">
            Para instalar: toque nos <span className="font-bold text-foreground">3 pontinhos (⋮)</span> do Chrome → <span className="font-bold text-foreground">"Instalar app"</span> ou <span className="font-bold text-foreground">"Adicionar à tela inicial"</span>.
          </p>
        )}
        <Button size="sm" variant="secondary" onClick={test} disabled={testing}>
          {testing ? <Loader2 className="animate-spin" /> : <Send />} Enviar notificação de teste
        </Button>
      </div>
    </GlassCard>
  );
}
