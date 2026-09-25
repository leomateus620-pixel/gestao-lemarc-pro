import { useEffect, useState } from "react";
import { Bell, Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { enableWebPush } from "@/lib/push/firebaseClient";
import { sendTestPush } from "@/lib/api/push.functions";
import { canInstall, getPushStatus, onInstallAvailable, promptInstall, type PushStatus } from "@/lib/push/pushStatus";

const labels: Record<PushStatus, { text: string; hint: string }> = {
  granted: { text: "Ativadas", hint: "Este aparelho recebe avisos das OS." },
  denied: { text: "Bloqueadas", hint: "Libere nas configurações do navegador: cadeado ao lado do endereço → Notificações → Permitir." },
  default: { text: "Não ativadas", hint: "Toque em Ativar para receber avisos das OS." },
  "needs-install": { text: "Precisa instalar", hint: "No iPhone: Compartilhar → \"Adicionar à Tela de Início\", abra pelo ícone e ative aqui." },
  unsupported: { text: "Indisponível", hint: "Este navegador não oferece notificações." },
  iframe: { text: "Abra em nova aba", hint: "Abra o sistema em uma aba própria ou no site publicado para ativar." },
};

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

  const info = labels[status];
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
        {(status === "default" || status === "granted") && (
          <Button size="sm" onClick={activate} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Bell />} {status === "granted" ? "Reativar" : "Ativar notificações"}
          </Button>
        )}
        {installable && (
          <Button size="sm" variant="secondary" onClick={() => void promptInstall()}><Download /> Instalar app</Button>
        )}
        <Button size="sm" variant="secondary" onClick={test} disabled={testing}>
          {testing ? <Loader2 className="animate-spin" /> : <Send />} Enviar notificação de teste
        </Button>
      </div>
    </GlassCard>
  );
}
