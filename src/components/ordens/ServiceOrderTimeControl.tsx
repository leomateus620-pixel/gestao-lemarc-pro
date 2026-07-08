import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import {
  listTimeSessions,
  startWork,
  pauseWork,
  resumeWork,
  finishWork,
} from "@/lib/api/timeSessions.functions";
import {
  computeTechnicianWorkedMinutes,
  getOrderLiveState,
  getTechnicianState,
  pauseReasonLabel,
  formatHm,
  type TimeSession,
} from "@/lib/serviceOrders/timeSessions";
import { formatHHmm } from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import type { ServiceOrder } from "@/types/serviceOrder";
import { PauseServiceOrderDialog } from "./PauseServiceOrderDialog";
import { ServiceOrderTimeHistory } from "./ServiceOrderTimeHistory";
import { useAuth } from "@/components/app/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

type Props = { order: ServiceOrder };

export function ServiceOrderTimeControl({ order }: Props) {
  const technicians = useMemo(() => getOrderTechnicians(order), [order]);
  const { user } = useAuth();
  const { isTecnico } = useUserRole();
  const myTechId = useMemo(
    () => (user ? technicians.find((t) => t.user_id === user.id)?.id ?? null : null),
    [technicians, user],
  );
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTimeSessions);
  const startFn = useServerFn(startWork);
  const pauseFn = useServerFn(pauseWork);
  const resumeFn = useServerFn(resumeWork);
  const finishFn = useServerFn(finishWork);

  const { data: sessions = [] as TimeSession[] } = useQuery({
    queryKey: ["order-time-sessions", order.id],
    queryFn: () => listFn({ data: { orderId: order.id } }),
    refetchOnWindowFocus: true,
  });

  const [selectedTech, setSelectedTech] = useState<string>("");
  useEffect(() => {
    if (technicians.length === 0) return;
    // Técnico logado sempre opera o próprio cartão.
    if (isTecnico && myTechId && selectedTech !== myTechId) {
      setSelectedTech(myTechId);
      return;
    }
    if (!selectedTech) {
      const preferred =
        myTechId ?? technicians.find((t) => t.is_primary)?.id ?? technicians[0].id;
      setSelectedTech(preferred);
    }
  }, [selectedTech, technicians, isTecnico, myTechId]);

  // Live tick to keep chronometer moving.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const anyOpen = sessions.some((s: TimeSession) => s.kind === "work" && !s.ended_at);
    if (!anyOpen) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [sessions]);
  void tick;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order-time-sessions", order.id] });
    queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
  };

  const startMut = useMutation({
    mutationFn: (technicianId: string) =>
      startFn({ data: { orderId: order.id, technicianId } }),
    onSuccess: () => {
      toast.success("Serviço iniciado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao iniciar"),
  });

  const bulkStartMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((technicianId) => startFn({ data: { orderId: order.id, technicianId } })),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === ids.length) {
        const first = failed[0] as PromiseRejectedResult;
        throw first.reason instanceof Error
          ? first.reason
          : new Error("Falha ao iniciar o serviço.");
      }
      return { started: ids.length - failed.length };
    },
    onSuccess: ({ started }) => {
      toast.success(
        started > 1
          ? `Serviço iniciado para ${started} técnicos.`
          : "Serviço iniciado.",
      );
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao iniciar"),
  });

  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseTech, setPauseTech] = useState<string | null>(null);
  const pauseMut = useMutation({
    mutationFn: (input: { technicianId: string; reason: string; notes: string | null }) =>
      pauseFn({
        data: {
          orderId: order.id,
          technicianId: input.technicianId,
          reason: input.reason,
          notes: input.notes,
        },
      }),
    onSuccess: () => {
      toast.success("Serviço pausado");
      setPauseOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao pausar"),
  });

  const resumeMut = useMutation({
    mutationFn: (technicianId: string) =>
      resumeFn({ data: { orderId: order.id, technicianId } }),
    onSuccess: () => {
      toast.success("Serviço retomado");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao retomar"),
  });

  const finishMut = useMutation({
    mutationFn: (technicianId?: string) =>
      finishFn({ data: { orderId: order.id, technicianId: technicianId ?? null } }),
    onSuccess: () => {
      toast.success("Sessão encerrada");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao encerrar"),
  });

  if (technicians.length === 0) {
    return (
      <GlassCard className="mt-4 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          Controle de tempo
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vincule ao menos um técnico à OS para controlar o tempo.
        </p>
      </GlassCard>
    );
  }

  const liveState = getOrderLiveState(sessions, technicians);
  const totalWorked = technicians.reduce(
    (acc, t) => acc + computeTechnicianWorkedMinutes(sessions, t.id),
    0,
  );

  const stateBadge =
    liveState === "running"
      ? { label: "Em execução", cls: "border-status-done/40 bg-status-done/12 text-status-done" }
      : liveState === "partially_paused"
        ? { label: "Parcialmente pausada", cls: "border-amber-400/40 bg-amber-500/10 text-amber-200" }
        : liveState === "fully_paused"
          ? { label: "Pausada", cls: "border-amber-400/50 bg-amber-500/15 text-amber-200" }
          : liveState === "finished"
            ? { label: "Sessões encerradas", cls: "border-primary/40 bg-primary/10 text-primary" }
            : { label: "Não iniciada", cls: "border-border bg-secondary/40 text-muted-foreground" };

  const pauseTechName =
    pauseTech ? technicians.find((t) => t.id === pauseTech)?.full_name ?? null : null;

  const lockToSelf = isTecnico && !!myTechId;

  // Regra: 1–2 técnicos → botão único inicia para toda a equipe.
  //        3+ técnicos  → cada técnico inicia individualmente (fluxo atual).
  const allIdle = technicians.every((t) => getTechnicianState(sessions, t.id).state === "idle");
  const showBulkStart = technicians.length >= 1 && technicians.length <= 2 && allIdle;

  return (
    <GlassCard className="mt-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Controle de tempo da OS
          </p>
          <h2 className="mt-0.5 font-display text-base font-black text-foreground">
            Total trabalhado: {formatHHmm(totalWorked)}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${stateBadge.cls}`}
        >
          {stateBadge.label}
        </span>
      </div>

      {showBulkStart && (
        <div className="mt-3">
          <Button
            className="min-h-12 w-full gap-2"
            onClick={() => bulkStartMut.mutate(technicians.map((t) => t.id))}
            disabled={bulkStartMut.isPending}
          >
            <Play size={16} />
            {bulkStartMut.isPending
              ? "Iniciando..."
              : technicians.length === 1
                ? "Iniciar serviço"
                : "Iniciar serviço para toda a equipe"}
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {technicians.length === 1
              ? "Inicia o cronômetro para o técnico responsável."
              : "Inicia o cronômetro para os dois técnicos ao mesmo tempo."}
          </p>
        </div>
      )}

      {technicians.length > 1 && !lockToSelf && (
        <div className="mt-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Técnico
          </label>
          <select
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {technicians.map((t) => {
          const st = getTechnicianState(sessions, t.id);
          const isSelected = lockToSelf
            ? t.id === myTechId
            : t.id === selectedTech || technicians.length === 1;
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 ${isSelected ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/[0.04]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">{t.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <Clock size={10} className="mr-1 inline" />
                    Trabalhadas: {formatHHmm(st.workedMinutes)}
                    {st.state === "running" && st.currentStartedAt && (
                      <>
                        {" · "}Iniciada agora às {formatHm(st.currentStartedAt)}
                      </>
                    )}
                    {st.state === "paused" && (
                      <>
                        {" · "}
                        <span className="text-amber-300">
                          Pausada
                          {st.lastPauseReason
                            ? ` (${pauseReasonLabel(st.lastPauseReason)})`
                            : ""}
                          {st.lastPauseAt ? ` às ${formatHm(st.lastPauseAt)}` : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                    st.state === "running"
                      ? "border-status-done/40 bg-status-done/12 text-status-done"
                      : st.state === "paused"
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                        : st.state === "finished"
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  {st.state === "running"
                    ? "Ativo"
                    : st.state === "paused"
                      ? "Pausado"
                      : st.state === "finished"
                        ? "Encerrado"
                        : "Aguardando"}
                </span>
              </div>

              {isSelected && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {st.state === "idle" && (
                    <Button
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => startMut.mutate(t.id)}
                      disabled={startMut.isPending}
                    >
                      <Play size={16} /> Iniciar serviço
                    </Button>
                  )}
                  {st.state === "running" && (
                    <>
                      <Button
                        variant="secondary"
                        className="min-h-11 flex-1 gap-2"
                        onClick={() => {
                          setPauseTech(t.id);
                          setPauseOpen(true);
                        }}
                      >
                        <Pause size={16} /> Pausar
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 flex-1 gap-2"
                        onClick={() => finishMut.mutate(t.id)}
                        disabled={finishMut.isPending}
                      >
                        <Square size={16} /> Encerrar meu tempo
                      </Button>
                    </>
                  )}
                  {st.state === "paused" && (
                    <Button
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => resumeMut.mutate(t.id)}
                      disabled={resumeMut.isPending}
                    >
                      <Play size={16} /> Retomar serviço
                    </Button>
                  )}
                  {st.state === "finished" && (
                    <Button
                      variant="secondary"
                      className="min-h-11 flex-1 gap-2"
                      onClick={() => startMut.mutate(t.id)}
                      disabled={startMut.isPending}
                    >
                      <Play size={16} /> Reabrir serviço
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sessions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Histórico
          </p>
          <ServiceOrderTimeHistory sessions={sessions} technicians={technicians} />
        </div>
      )}

      <PauseServiceOrderDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        orderNumber={order.number}
        technicianName={pauseTechName}
        pending={pauseMut.isPending}
        onConfirm={({ reason, notes }) =>
          pauseTech && pauseMut.mutate({ technicianId: pauseTech, reason, notes })
        }
      />
    </GlassCard>
  );
}