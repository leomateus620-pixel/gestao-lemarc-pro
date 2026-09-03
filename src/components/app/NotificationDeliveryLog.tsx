import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotificationDeliveryLog, type PushEventType } from "@/lib/api/push.functions";

const statuses = ["all", "sent", "failed", "skipped_no_token", "unregistered"] as const;

function eventLabel(value: string) {
  return value === "service_order_assigned" ? "OS atribuída" : "OS finalizada";
}

function statusLabel(value: string) {
  return value === "skipped_no_token" ? "Sem dispositivo" : value === "unregistered" ? "Token revogado" : value === "sent" ? "Enviado" : "Falhou";
}

export function NotificationDeliveryLog() {
  const [eventType, setEventType] = useState<PushEventType | "all">("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("all");
  const listFn = useServerFn(listNotificationDeliveryLog);
  const { data = [], isLoading } = useQuery({
    queryKey: ["notification-delivery-log", eventType, status],
    queryFn: () => listFn({ data: { eventType, status } }),
  });

  return (
    <section className="lemarc-wizard-card space-y-4 p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Rastreabilidade</p>
        <h2 className="mt-1 font-display text-2xl font-black text-white">Log de notificações</h2>
        <p className="mt-1 text-sm font-medium text-slate-400">Tentativas de entrega sem exibir tokens completos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={eventType} onChange={(e) => setEventType(e.target.value as PushEventType | "all")} className="h-11 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white">
          <option value="all">Todos os eventos</option>
          <option value="service_order_assigned">OS atribuída</option>
          <option value="service_order_finished">OS finalizada</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as (typeof statuses)[number])} className="h-11 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white">
          {statuses.map((item) => <option key={item} value={item}>{item === "all" ? "Todos os status" : statusLabel(item)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-white/[0.05] text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">Evento</th><th className="px-3 py-3">OS</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Token</th><th className="px-3 py-3">Erro</th></tr></thead>
          <tbody className="divide-y divide-white/[0.07] text-slate-200">
            {isLoading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Carregando histórico...</td></tr> : data.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Nenhuma tentativa encontrada.</td></tr> : data.map((row) => <tr key={String(row.id)}><td className="whitespace-nowrap px-3 py-3">{new Date(String(row.created_at)).toLocaleString("pt-BR")}</td><td className="px-3 py-3">{eventLabel(String(row.event_type))}</td><td className="px-3 py-3 font-semibold">{row.service_order_id ? String(row.service_order_id).slice(0, 8) : "—"}</td><td className="px-3 py-3">{statusLabel(String(row.status))}</td><td className="px-3 py-3 font-mono text-slate-400">{row.fcm_token_suffix ? `…${String(row.fcm_token_suffix)}` : "—"}</td><td className="max-w-[260px] truncate px-3 py-3 text-rose-200">{row.error ? String(row.error) : "—"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
