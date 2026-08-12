import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import {
  listTimeSessions,
  getOrderLaborOverride,
  startWork,
  pauseWork,
  resumeWork,
  finishWork,
  finishColleagueWork,
} from "@/lib/api/timeSessions.functions";
import {
  computeTechnicianWorkedMinutes,
  getOrderLiveState,
  getTechnicianState,
  pauseReasonLabel,
  formatHm,
  formatDateHm,
  type TimeSession,
} from "@/lib/serviceOrders/timeSessions";
import { formatHHmm } from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import type { ServiceOrder } from "@/types/serviceOrder";
import { PauseServiceOrderDialog } from "./PauseServiceOrderDialog";
import { ServiceOrderTimeHistory } from "./ServiceOrderTimeHistory";
import { EditTimeSessionSheet } from "./EditTimeSessionSheet";
import { useAuth } from "@/components/app/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { TechnicianOpenTimeNotification } from "@/components/dashboard/TechnicianOpenTimeNotification";
import type { OpenTimeAlertDetails } from "@/types/notifications";

type Props = { order: ServiceOrder };

export function ServiceOrderTimeControl({ order }: Props) {
  const technicians = useMemo(() => getOrderTechnicians(order), [order]);
  const { user } = useAuth();
  const { isTecnico, isAdmin } = useUserRole();
  const myTechId = useMemo(
    () => (user ? (technicians.find((t) => t.user_id === user.id)?.id ?? null) : null),
    [technicians, user],
  );
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTimeSessions);
  const overrideFn = useServerFn(getOrderLaborOverride);
  const startFn = useServerFn(startWork);
  const pauseFn = useServerFn(pauseWork);
  const resumeFn = useServerFn(resumeWork);
  const finishFn = useServerFn(finishWork);
  const finishColleagueFn = useServerFn(finishColleagueWork);

  const { data: sessions = [] as TimeSession[] } = useQuery({
    queryKey: ["order-time-sessions", order.id],
    queryFn: () => listFn({ data: { orderId: order.id } }),
    refetchOnWindowFocus: true,
  });

  // Horas oficiais apuradas pelo admin (só existem depois que ele salva a apuração).
  const { data: override } = useQuery({
    queryKey: ["order-labor-override", order.id],
    queryFn: () => overrideFn({ data: { orderId: order.id } }),
    refetchOnWindowFocus: true,
  });
  const adjustedAt = override?.adjustedAt ?? null;

  // Live tick to keep chronometer moving.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const anyOpen = sessions.some((s: TimeSession) => s.kind === "work" && !s.ended_at);
    if (!anyOpen) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [sessions]);
  void tick;

  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const editingTechName = useMemo(() => {
    if (!editingSession?.technician_id) return null;
    return technicians.find((t) => t.id === editingSession.technician_id)?.full_name ?? null;
  }, [editingSession, technicians]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order-time-sessions", order.id] });
    queryClient.invalidateQueries({ queryKey: ["order-labor-override", order.id] });
    queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
  };

  const techName = (id: string) => technicians.find((t) => t.id === id)?.full_name ?? "Técnico";

  /** Relata o resultado de uma ação em equipe: sucesso, parcial ou sem efeito. */
  const reportBatch = (
    result: { succeeded: string[]; skipped?: { technicianId: string }[]; failed?: { technicianId: string; message: string }[] },
    doneLabel: string,
  ) => {
    const failed = result.failed ?? [];
    const done = result.succeeded.length;
    if (done > 0) {
      const who = done === 1 ? techName(result.succeeded[0]) : `${done} técnicos`;
      toast.success(`${doneLabel}: ${who}.`);
    } else if (failed.length === 0) {
      toast.info("Nenhum técnico precisava dessa ação.");
    }
    if (failed.length > 0) {
      toast.error(
        `Falhou para ${failed.map((f) => techName(f.technicianId)).join(", ")}: ${failed[0].message}`,
      );
    }
    invalidate();
  };

  const startMut = useMutation({
    mutationFn: (technicianIds: string[]) =>
      startFn({ data: { orderId: order.id, technicianIds } }),
    onSuccess: (result: any) => reportBatch(result, "Serviço iniciado"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao iniciar"),
  });

  const [pauseOpen, setPauseOpen] = useState(false);
  const pauseMut = useMutation({
    mutationFn: (input: { technicianIds: string[]; reason: string; notes: string | null }) =>
      pauseFn({
        data: {
          orderId: order.id,
          technicianIds: input.technicianIds,
          reason: input.reason,
          notes: input.notes,
        },
      }),
    onSuccess: (result: any) => {
      setPauseOpen(false);
      reportBatch(result, "Serviço pausado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao pausar"),
  });

  const resumeMut = useMutation({
    mutationFn: (technicianIds: string[]) =>
      resumeFn({ data: { orderId: order.id, technicianIds } }),
    onSuccess: (result: any) => reportBatch(result, "Serviço retomado"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao retomar"),
  });

  const finishMut = useMutation({
    mutationFn: (technicianIds: string[]) =>
      finishFn({ data: { orderId: order.id, technicianIds } }),
    onSuccess: (result: any) => {
      reportBatch(result, "Tempo encerrado");
      const alert = (result?.openTimeAlert ?? null) as OpenTimeAlertDetails | null;
      if (alert) setOpenTimeAlert(alert);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao encerrar"),
  });

  const [openTimeAlert, setOpenTimeAlert] = useState<OpenTimeAlertDetails | null>(null);
  const finishColleagueMut = useMutation({
    mutationFn: (technicianId: string) =>
      finishColleagueFn({ data: { orderId: order.id, technicianId } }),
    onSuccess: () => {
      toast.success("Tempo do colega encerrado");
      setOpenTimeAlert(null);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao encerrar o tempo"),
  });

  if (technicians.length === 0) {
    return (
      <GlassCard className="lemarc-os-time-control mt-4 p-4">
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
  // Minutos exibidos: enquanto o admin não apurar, é o cronômetro puro.
  // Depois de apurado, vale a apuração + eventual sessão ainda aberta.
  const openMinutesFor = (technicianId: string) => {
    const nowIso = new Date().toISOString();
    return sessions
      .filter(
        (s: TimeSession) =>
          s.kind === "work" && s.technician_id === technicianId && !s.ended_at,
      )
      .reduce((acc: number, s: TimeSession) => {
        const ms = new Date(nowIso).getTime() - new Date(s.started_at).getTime();
        return acc + (ms > 0 ? Math.round(ms / 60000) : 0);
      }, 0);
  };
  const displayedMinutesFor = (technicianId: string) =>
    adjustedAt
      ? (override?.minutesByTechnician[technicianId] ?? 0) + openMinutesFor(technicianId)
      : computeTechnicianWorkedMinutes(sessions, technicianId);
  const totalWorked = technicians.reduce((acc, t) => acc + displayedMinutesFor(t.id), 0);

  const stateBadge =
    liveState === "running"
      ? { label: "Em execução", cls: "border-status-done/40 bg-status-done/12 text-status-done" }
      : liveState === "partially_paused"
        ? {
            label: "Parcialmente pausada",
            cls: "border-amber-400/40 bg-amber-500/10 text-amber-200",
          }
        : liveState === "fully_paused"
          ? { label: "Pausada", cls: "border-amber-400/50 bg-amber-500/15 text-amber-200" }
          : liveState === "finished"
            ? { label: "Sessões encerradas", cls: "border-primary/40 bg-primary/10 text-primary" }
            : { label: "Não iniciada", cls: "border-border bg-secondary/40 text-muted-foreground" };

  // Estado por técnico usado pela barra de ações unificada.
  const states = technicians.map((t) => ({ tech: t, st: getTechnicianState(sessions, t.id) }));
  const idsWhere = (fn: (s: (typeof states)[number]) => boolean) =>
    states.filter(fn).map((s) => s.tech.id);
  const startableIds = idsWhere(({ st }) => st.state === "idle" || st.state === "finished");
  const runningIds = idsWhere(({ st }) => st.state === "running");
  const pausedIds = idsWhere(({ st }) => st.state === "paused");
  const mine = myTechId ? states.find((s) => s.tech.id === myTechId) : null;
  const isTeam = technicians.length > 1;
  const anyPending =
    startMut.isPending || pauseMut.isPending || resumeMut.isPending || finishMut.isPending;
  void isTecnico;

  return (
    <GlassCard className="lemarc-os-time-control mt-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">Controle de tempo da OS</p>
          <h2 className="mt-1 font-display text-lg font-bold text-foreground tabular-nums">
            Total trabalhado: {formatHHmm(totalWorked)}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${stateBadge.cls}`}
        >
          {stateBadge.label}
        </span>
      </div>

      {adjustedAt && (
        <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200">
          Horas ajustadas pelo admin em {formatDateHm(adjustedAt)} — os valores abaixo seguem a
          apuração de horas. O histórico mostra os apontamentos originais.
        </p>
      )}

      {/* Barra de ações: equipe inteira ou apenas o próprio tempo. */}
      <div className="mt-3 space-y-2">
        {startableIds.length > 0 && (
          <Button
            className="min-h-12 w-full gap-2"
            onClick={() => startMut.mutate(startableIds)}
            disabled={anyPending}
          >
            <Play size={16} />
            {isTeam
              ? `Iniciar serviço para a equipe (${startableIds.length})`
              : "Iniciar serviço"}
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          {runningIds.length > 0 && (
            <Button
              variant="secondary"
              className="min-h-11 flex-1 gap-2"
              onClick={() => setPauseOpen(true)}
              disabled={anyPending}
            >
              <Pause size={16} /> Pausar{isTeam ? ` (${runningIds.length})` : ""}
            </Button>
          )}
          {pausedIds.length > 0 && (
            <Button
              className="min-h-11 flex-1 gap-2"
              onClick={() => resumeMut.mutate(pausedIds)}
              disabled={anyPending}
            >
              <Play size={16} /> Retomar{isTeam ? ` a equipe (${pausedIds.length})` : ""}
            </Button>
          )}
          {runningIds.length > 0 && (
            <Button
              variant="outline"
              className="min-h-11 flex-1 gap-2"
              onClick={() => finishMut.mutate(runningIds)}
              disabled={anyPending}
            >
              <Square size={16} /> Encerrar{isTeam ? ` a equipe (${runningIds.length})` : ""}
            </Button>
          )}
        </div>
        {isTeam && mine && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
            <span className="w-full text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Apenas o meu tempo
            </span>
            {(mine.st.state === "idle" || mine.st.state === "finished") && (
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 gap-2"
                onClick={() => startMut.mutate([mine.tech.id])}
                disabled={anyPending}
              >
                <Play size={14} /> Iniciar o meu
              </Button>
            )}
            {mine.st.state === "running" && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 gap-2"
                  onClick={() => setPauseOpen(true)}
                  disabled={anyPending}
                >
                  <Pause size={14} /> Pausar o meu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => finishMut.mutate([mine.tech.id])}
                  disabled={anyPending}
                >
                  <Square size={14} /> Encerrar o meu
                </Button>
              </>
            )}
            {mine.st.state === "paused" && (
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={() => resumeMut.mutate([mine.tech.id])}
                disabled={anyPending}
              >
                <Play size={14} /> Retomar o meu
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {technicians.map((t) => {
          const st = getTechnicianState(sessions, t.id);
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3 ${t.id === myTechId ? "border-primary/40 bg-primary/5" : "border-white/10 bg-white/[0.04]"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">{t.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    <Clock size={10} className="mr-1 inline" />
                    Trabalhadas: {formatHHmm(displayedMinutesFor(t.id))}
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
                          {st.lastPauseReason ? ` (${pauseReasonLabel(st.lastPauseReason)})` : ""}
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

            </div>
          );
        })}
      </div>

      {sessions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Histórico
          </p>
          <ServiceOrderTimeHistory
            sessions={sessions}
            technicians={technicians}
            editableTechnicianId={myTechId}
            allowAllEdits={isAdmin}
            onEditSession={setEditingSession}
          />
        </div>
      )}

      <PauseServiceOrderDialog
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        orderNumber={order.number}
        technicians={states
          .filter(({ st }) => st.state === "running")
          .map(({ tech }) => ({ id: tech.id, name: tech.full_name }))}
        defaultSelectedIds={runningIds}
        pending={pauseMut.isPending}
        onConfirm={({ technicianIds, reason, notes }) =>
          pauseMut.mutate({ technicianIds, reason, notes })
        }
      />

      <EditTimeSessionSheet
        open={!!editingSession}
        onOpenChange={(o) => !o && setEditingSession(null)}
        session={editingSession}
        orderId={order.id}
        technicianName={editingTechName}
      />

      <TechnicianOpenTimeNotification
        open={!!openTimeAlert}
        busy={finishColleagueMut.isPending}
        orderNumber={order.number ?? null}
        clientName={order.client?.name ?? null}
        details={openTimeAlert}
        onOpenChange={(next) => !next && setOpenTimeAlert(null)}
        onDismiss={() => setOpenTimeAlert(null)}
        onFinishTime={() =>
          openTimeAlert && finishColleagueMut.mutate(openTimeAlert.openTechnicianId)
        }
      />
    </GlassCard>
  );
}
