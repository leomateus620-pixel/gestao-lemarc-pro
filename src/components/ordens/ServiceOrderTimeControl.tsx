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

  const [selectedTech, setSelectedTech] = useState<string>("");
  useEffect(() => {
    if (technicians.length === 0) return;
    // Técnico logado sempre opera o próprio cartão.
    if (isTecnico && myTechId && selectedTech !== myTechId) {
      setSelectedTech(myTechId);
      return;
    }
    if (!selectedTech) {
      const preferred = myTechId ?? technicians.find((t) => t.is_primary)?.id ?? technicians[0].id;
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

  const pauseTechName = pauseTech
    ? (technicians.find((t) => t.id === pauseTech)?.full_name ?? null)
    : null;

  const lockToSelf = isTecnico && !!myTechId;

  // Regra: 1–2 técnicos → botão único inicia para toda a equipe.
  //        3+ técnicos  → cada técnico inicia individualmente (fluxo atual).
  const allIdle = technicians.every((t) => getTechnicianState(sessions, t.id).state === "idle");
  const showBulkStart = technicians.length >= 1 && technicians.length <= 2 && allIdle;

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
        technicianName={pauseTechName}
        pending={pauseMut.isPending}
        onConfirm={({ reason, notes }) =>
          pauseTech && pauseMut.mutate({ technicianId: pauseTech, reason, notes })
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
