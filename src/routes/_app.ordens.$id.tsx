import { Suspense, useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  MapPin,
  Pause,
  Pencil,
  Play,
  Printer,
  Receipt,
  Send,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { useUserRole } from "@/hooks/useUserRole";
import { toast as toastFn } from "sonner";
import { maskCNPJ } from "@/lib/cnpj";
import { GlassCard } from "@/components/app/GlassCard";
import { SectionHeader } from "@/components/app/SectionHeader";
import { PrimaryCTA } from "@/components/app/operations";
import {
  getServiceOrder,
  setServiceOrderTechnicians,
  updateServiceOrderStatus,
} from "@/lib/api/serviceOrders.functions";
import { getOrderFinancials } from "@/lib/api/financials.functions";
import { formatBRL, formatHHmm } from "@/lib/serviceOrders/finance";
import { displacementTypeLabel } from "@/types/financials";
import { FinalizeServiceOrderDialog } from "@/components/ordens/FinalizeServiceOrderDialog";
import { LaborEntriesEditor } from "@/components/ordens/LaborEntriesEditor";
import { ServiceOrderTimeControl } from "@/components/ordens/ServiceOrderTimeControl";
import { SignatureBlock } from "@/components/ordens/signature/SignatureBlock";
import { SignatureCaptureDialog } from "@/components/ordens/signature/SignatureCaptureDialog";
import { ServiceOrderAttachmentsSection } from "@/components/ordens/attachments/ServiceOrderAttachmentsSection";
import { ServiceOrderMaterialsSection } from "@/components/ordens/attachments/ServiceOrderMaterialsSection";
import { finishWork, startWork } from "@/lib/api/timeSessions.functions";
import { Link } from "@tanstack/react-router";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrder,
  type ServiceOrderStatus,
} from "@/types/serviceOrder";
import { missingFields } from "@/lib/serviceOrders/status";
import {
  formatServiceOrderDateTime,
  formatServiceOrderDuration,
  getClosedAt,
  getOpenedAt,
} from "@/lib/serviceOrders/time";

export const Route = createFileRoute("/_app/ordens/$id")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Gestão Lemarc` }] }),
  component: OrdemPage,
  notFoundComponent: () => (
    <AppShell title="OS não encontrada" back>
      <div className="mt-8 text-center text-sm text-muted-foreground">Esta ordem não existe.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Erro ao carregar OS" back>
      <div className="mt-8 text-center text-sm text-rose-300">{error.message}</div>
    </AppShell>
  ),
});

const flow: Record<
  ServiceOrderStatus,
  { label: string; next: ServiceOrderStatus | null; icon: typeof Truck }
> = {
  pending: { label: "Iniciar serviço", next: "running", icon: Play },
  dispatched: { label: "Iniciar serviço", next: "running", icon: Play },
  transit: { label: "Iniciar serviço", next: "running", icon: Play },
  running: { label: "Finalizar serviço", next: "finished", icon: Pause },
  finished: { label: "Enviar para revisão", next: "review", icon: Send },
  review: { label: "Aprovar para cobrança", next: "approved", icon: Receipt },
  approved: { label: "Aprovada para cobrança", next: null, icon: CheckCircle2 },
  cancelled: { label: "OS cancelada", next: null, icon: CheckCircle2 },
};

function OrdemPage() {
  return (
    <AppShell title="Ordem de serviço" back>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <OrdemDetalhe />
      </Suspense>
    </AppShell>
  );
}

function OrdemDetalhe() {
  const { id } = Route.useParams();
  const { isAdmin, isTecnico } = useUserRole();
  const fetcher = useServerFn(getServiceOrder);
  const { data: order } = useSuspenseQuery(
    queryOptions({
      queryKey: ["service-order", id],
      queryFn: () => fetcher({ data: { id } }),
    }),
  );
  if (!order) throw notFound();

  const queryClient = useQueryClient();
  const updateStatus = useServerFn(updateServiceOrderStatus);
  const finishWorkFn = useServerFn(finishWork);
  const startWorkFn = useServerFn(startWork);
  const mutation = useMutation({
    mutationFn: (status: ServiceOrderStatus) => updateStatus({ data: { id: order.id, status } }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["order-time-sessions", id] });
      if (isTecnico && status === "finished") {
        toastFn.success("OS finalizada e enviada para revisão.");
      }
    },
    onError: (e: unknown) =>
      toastFn.error(e instanceof Error ? e.message : "Não foi possível atualizar a OS."),
  });

  const action = flow[order.status];
  const missing = missingFields(order);
  const technicians = getOrderTechnicians(order);
  const isStartFlow =
    order.status === "pending" || order.status === "dispatched" || order.status === "transit";

  const startServiceMutation = useMutation({
    mutationFn: async () => {
      if (technicians.length === 0) {
        throw new Error("Vincule ao menos um técnico para iniciar o serviço.");
      }
      const results = await Promise.allSettled(
        technicians.map((t) => startWorkFn({ data: { orderId: order.id, technicianId: t.id } })),
      );
      let started = 0;
      let alreadyActive = 0;
      const otherErrors: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          started += 1;
        } else {
          const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
          if (/já existe uma sessão de trabalho ativa/i.test(msg)) alreadyActive += 1;
          else otherErrors.push(msg);
        }
      }
      if (started === 0 && alreadyActive === 0 && otherErrors.length > 0) {
        throw new Error(otherErrors[0]);
      }
      return { started, alreadyActive, total: technicians.length };
    },
    onSuccess: ({ started, alreadyActive, total }) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["service-order", id] });
      queryClient.invalidateQueries({ queryKey: ["order-time-sessions", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-technician-time"] });
      if (started === 0 && alreadyActive > 0) {
        toastFn.info("Alguns técnicos já estavam com tempo ativo.");
      } else if (alreadyActive > 0) {
        toastFn.success("Alguns técnicos já estavam com tempo ativo.");
      } else if (total > 1) {
        toastFn.success("Serviço iniciado para a equipe.");
      } else {
        toastFn.success("Serviço iniciado.");
      }
    },
    onError: (e: unknown) =>
      toastFn.error(e instanceof Error ? e.message : "Não foi possível iniciar o serviço."),
  });

  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const hasSignature =
    Boolean((order as unknown as { signature?: unknown }).signature) ||
    Boolean(order.signature_waiver_reason);

  // Admin: sabe se a apuração já foi finalizada (para esconder o CTA de revisão).
  const financialsFetcher = useServerFn(getOrderFinancials);
  const { data: financialsData } = useQuery({
    queryKey: ["order-financials", order.id],
    queryFn: () => financialsFetcher({ data: { orderId: order.id } }),
    enabled: isAdmin,
    staleTime: 15_000,
  });
  const alreadyFinalized = Boolean(financialsData?.financials?.finalized_at);

  async function handleTecnicoFinish() {
    const orderId = order!.id;
    if (!hasSignature) {
      toastFn.error("Colete a assinatura do responsável antes de finalizar a OS.");
      setSignOpen(true);
      return;
    }
    try {
      // Encerra qualquer cronômetro aberto antes de mudar o status.
      await finishWorkFn({ data: { orderId, technicianId: null } });
    } catch (e) {
      // Não bloqueia a finalização se não houver sessão aberta.
      void e;
    }
    mutation.mutate("finished");
  }

  // Técnico não avança além de "finished". Também não abre a apuração financeira.
  const tecnicoFinalize = isTecnico && order.status === "running";
  const adminReview =
    isAdmin &&
    !alreadyFinalized &&
    (order.status === "running" || order.status === "finished" || order.status === "review");
  const adminCanReviewFromLabor =
    isAdmin && (order.status === "running" || order.status === "finished" || order.status === "review");
  const tecnicoDone =
    isTecnico &&
    (order.status === "finished" ||
      order.status === "review" ||
      order.status === "approved" ||
      order.status === "cancelled");
  const showActionCard =
    adminReview ||
    (action.next !== null &&
      !(isTecnico && (order.status === "finished" || order.status === "review")));
  const adminReviewLabel = order.status === "running" ? "Finalizar OS" : "Revisar e finalizar OS";
  const adminReviewHint =
    order.status === "running"
      ? "Apure horas, deslocamento e feche a OS."
      : "Confira valores, adicione deslocamento e feche a OS.";
  const serviceType =
    order.service_type === "outro" && order.service_type_other
      ? order.service_type_other
      : order.service_type
        ? serviceTypeLabel[order.service_type]
        : "Sem tipo definido";
  const statusTone: Record<ServiceOrderStatus, string> = {
    pending: "lemarc-status-chip--neutral",
    dispatched: "lemarc-status-chip--info",
    transit: "lemarc-status-chip--info",
    running: "lemarc-status-chip--running",
    finished: "lemarc-status-chip--success",
    review: "lemarc-status-chip--warning",
    approved: "lemarc-status-chip--success",
    cancelled: "lemarc-status-chip--danger",
  };

  return (
    <div className="lemarc-os-detail mx-auto w-full max-w-7xl">
      <div
        className={cn(
          "lemarc-os-detail-primary mt-1",
          showActionCard && "lg:grid-cols-[1fr_20rem]",
        )}
      >
        <section className="lemarc-os-detail-summary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary">{serviceType}</p>
              <h1 className="mt-1 break-words font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">
                <span className="tabular-nums">OS #{order.number}</span>
                <span className="mx-1.5 text-muted-foreground" aria-hidden="true">
                  ·
                </span>
                {order.title}
              </h1>
            </div>
            <span className={cn("lemarc-status-chip", statusTone[order.status])}>
              {statusLabel[order.status]}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {order.priority && (
              <span className="lemarc-detail-chip">
                Prioridade <strong>{priorityLabel[order.priority]}</strong>
              </span>
            )}
            <span className="lemarc-detail-chip tabular-nums">
              Aberta {formatServiceOrderDateTime(getOpenedAt(order)) ?? "—"}
            </span>
            {(() => {
              const closed = getClosedAt(order);
              const closedLabel = formatServiceOrderDateTime(closed);
              if (!closedLabel) return null;
              const verb = order.status === "cancelled" ? "Cancelada" : "Fechada";
              return (
                <span className="lemarc-detail-chip tabular-nums">
                  {verb} {closedLabel}
                </span>
              );
            })()}
            {(() => {
              const dur = formatServiceOrderDuration(getOpenedAt(order), getClosedAt(order));
              if (!dur) return null;
              return <span className="lemarc-detail-chip tabular-nums">Tempo total {dur}</span>;
            })()}
          </div>

          <dl className="lemarc-os-summary-grid mt-4">
            <DetailField icon={Building2} label="Cliente">
              {order.client?.name ?? "Sem cliente"}
              {order.client?.cnpj ? ` · CNPJ ${maskCNPJ(order.client.cnpj)}` : ""}
            </DetailField>
            <DetailField icon={Building2} label="Unidade">
              {order.client_unit?.name ?? order.client?.unit ?? "Sem unidade específica"}
              {order.client_unit?.city || order.client_unit?.state
                ? ` · ${[order.client_unit?.city, order.client_unit?.state].filter(Boolean).join("/")}`
                : ""}
            </DetailField>
            <DetailField icon={HardHat} label="Técnico responsável">
              {technicians.length === 0
                ? "Sem técnico definido"
                : technicians.map((t) => t.full_name).join(", ")}
            </DetailField>
            <DetailField icon={UserRound} label="Solicitante">
              {order.requester_name || "Não informado"}
            </DetailField>
            <DetailField icon={Clock} label="Previsão de início">
              {order.scheduled_for
                ? new Date(order.scheduled_for).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "Sem previsão definida"}
            </DetailField>
            <DetailField icon={MapPin} label="Local / setor">
              {order.location || "Não informado"}
            </DetailField>
          </dl>
        </section>

        {showActionCard && (
          <aside className="lemarc-os-next-action" aria-labelledby="next-action-title">
            <p className="text-xs font-semibold text-primary">Próxima ação</p>
            <h2
              id="next-action-title"
              className="mt-1 font-display text-lg font-bold text-foreground"
            >
              {adminReview ? adminReviewLabel : action.label}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {adminReview ? adminReviewHint : "Avance a OS para a próxima etapa operacional."}
            </p>
            <div className="mt-4">
              {tecnicoFinalize ? (
                <PrimaryCTA
                  onClick={handleTecnicoFinish}
                  icon={Calculator}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Finalizando..." : "Finalizar OS"}
                </PrimaryCTA>
              ) : adminReview ? (
                <PrimaryCTA onClick={() => setFinalizeOpen(true)} icon={Calculator}>
                  {adminReviewLabel}
                </PrimaryCTA>
              ) : action.next ? (
                isStartFlow ? (
                  <PrimaryCTA
                    onClick={() => startServiceMutation.mutate()}
                    icon={action.icon}
                    disabled={startServiceMutation.isPending}
                  >
                    {startServiceMutation.isPending ? "Iniciando..." : action.label}
                  </PrimaryCTA>
                ) : (
                  <PrimaryCTA
                    onClick={() => action.next && mutation.mutate(action.next)}
                    icon={action.icon}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? "Atualizando..." : action.label}
                  </PrimaryCTA>
                )
              ) : null}
            </div>
          </aside>
        )}
      </div>

      {isTecnico &&
        (order.status === "finished" ||
          order.status === "review" ||
          order.status === "approved") && (
          <GlassCard className="mt-4 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Concluído
            </p>
            <h2 className="font-display text-lg font-black text-foreground">
              OS finalizada e enviada para revisão.
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A equipe administrativa fará a apuração e o fechamento.
            </p>
          </GlassCard>
        )}

      {isAdmin && (
        <FinalizeServiceOrderDialog
          order={order}
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
        />
      )}

      {isTecnico && (
        <SignatureCaptureDialog
          orderId={order.id}
          orderNumber={order.number}
          open={signOpen}
          onOpenChange={setSignOpen}
        />
      )}

      {!tecnicoDone && <ServiceOrderTimeControl order={order} />}

      <SignatureBlock order={order} />

      <ServiceOrderAttachmentsSection orderId={order.id} />

      {isAdmin && (
        <FinancialBlock
          order={order}
          onEdit={() => setFinalizeOpen(true)}
          canReview={adminCanReviewFromLabor}
        />
      )}

      {missing.length > 0 && (
        <Section title="Pendências de cadastro" icon={FileText}>
          <p className="text-xs text-muted-foreground">
            Esta OS está marcada como incompleta. Faltam:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missing.map((m) => (
              <span
                key={m}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300"
              >
                {m}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Descrição" icon={FileText}>
        <p className="text-sm leading-relaxed text-foreground">
          {order.description?.trim() || "Sem descrição cadastrada."}
        </p>
      </Section>

      <Section title="Técnicos responsáveis" icon={HardHat}>
        <TechniciansBlock order={order} />
      </Section>

      <Section title="Linha do tempo" icon={Clock}>
        <Timeline order={order} isTecnico={isTecnico} />
      </Section>
    </div>
  );
}

function TechniciansBlock({ order }: { order: ServiceOrder }) {
  const techs = getOrderTechnicians(order);
  return (
    <div className="space-y-3">
      {techs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem técnico definido.</p>
      ) : (
        <ul className="space-y-2">
          {techs.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{t.full_name}</div>
                {t.role && (
                  <div className="truncate text-[11px] text-muted-foreground">{t.role}</div>
                )}
              </div>
              {t.is_primary && (
                <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                  Principal
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <EditTechniciansDialog order={order} />
    </div>
  );
}

function EditTechniciansDialog({ order }: { order: ServiceOrder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const initial = useMemo(() => getOrderTechnicians(order).map((t) => t.id), [order]);
  const [selected, setSelected] = useState<string[]>(initial);
  const { data: technicians } = useTechniciansQuery();
  const fn = useServerFn(setServiceOrderTechnicians);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => fn({ data: { id: order.id, technician_ids: selected } }),
    onSuccess: () => {
      toast.success("Técnicos atualizados");
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["report-orders"] });
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const selectableTechnicians = useMemo(
    () => technicians.filter((t) => t.active !== false || selected.includes(t.id)),
    [selected, technicians],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectableTechnicians;
    return selectableTechnicians.filter(
      (t) => t.full_name.toLowerCase().includes(q) || (t.role ?? "").toLowerCase().includes(q),
    );
  }, [selectableTechnicians, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setSelected(initial);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2 rounded-xl">
          <Pencil size={14} /> Editar técnicos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Técnicos responsáveis</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((id) => {
                const t = technicians.find((x) => x.id === id);
                if (!t) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-bold"
                  >
                    {t.full_name}
                    <button
                      type="button"
                      aria-label={`Remover ${t.full_name}`}
                      onClick={() => setSelected(selected.filter((x) => x !== id))}
                      className="grid h-4 w-4 place-items-center rounded-full bg-primary/30 hover:bg-primary/50"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar técnico…"
          />
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {technicians.length > selectableTechnicians.length && (
              <p className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] font-bold text-amber-100">
                Colaboradores inativos ficam ocultos, exceto quando já estão vinculados a esta OS.
              </p>
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nenhum técnico encontrado.
              </p>
            )}
            {filtered.map((t) => {
              const active = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setSelected(
                      active
                        ? selected.filter((x) => x !== t.id)
                        : Array.from(new Set([...selected, t.id])),
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold">{t.full_name}</div>
                    {t.role && (
                      <div className="truncate text-[11px] text-muted-foreground">{t.role}</div>
                    )}
                  </div>
                  {active && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Building2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lemarc-os-summary-field">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon aria-hidden="true" size={13} className="shrink-0 text-primary" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-snug text-foreground">
        {children}
      </dd>
    </div>
  );
}

function FinancialBlock({
  order,
  onEdit,
  canReview,
}: {
  order: ServiceOrder;
  onEdit: () => void;
  canReview: boolean;
}) {
  const fetcher = useServerFn(getOrderFinancials);
  const { data } = useQuery({
    queryKey: ["order-financials", order.id],
    queryFn: () => fetcher({ data: { orderId: order.id } }),
    staleTime: 30_000,
  });
  if (!data || !data.financials) return null;
  const f = data.financials;
  const entries = data.entries;
  return (
    <>
      <Section title="Resumo financeiro" icon={Receipt}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Total horas" value={formatHHmm(f.total_labor_minutes)} />
          <Kpi label="Mão de obra" value={formatBRL(f.total_labor_cents)} />
          <Kpi
            label="Deslocamento"
            value={formatBRL(f.displacement_total_cents)}
            hint={displacementTypeLabel[f.displacement_type]}
          />
          <Kpi label="Total geral" value={formatBRL(f.grand_total_cents)} highlight />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={onEdit}>
            <Pencil size={13} /> Editar apuração
          </Button>
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link to="/ordens/$id/imprimir" params={{ id: order.id }}>
              <Printer size={13} /> Gerar relatório
            </Link>
          </Button>
        </div>
      </Section>
      <Section title="Apuração de horas" icon={Calculator}>
        <LaborEntriesEditor order={order} entries={entries} />
        {canReview && (
          <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
            <Button className="gap-2" onClick={onEdit}>
              <Calculator size={14} /> Revisar e finalizar OS
            </Button>
          </div>
        )}
      </Section>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-black tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <SectionHeader title={title} icon={icon} />
      <GlassCard className="p-4">{children}</GlassCard>
    </section>
  );
}

function Timeline({ order, isTecnico }: { order: ServiceOrder; isTecnico: boolean }) {
  const events: { label: string; iso: string | null }[] = [
    { label: "OS criada", iso: order.opened_at },
    { label: "Serviço iniciado", iso: order.started_at },
    { label: "Serviço finalizado", iso: order.finished_at },
    {
      label: isTecnico ? "Registro conferido" : "Aprovada para cobrança",
      iso: order.approved_at,
    },
    { label: isTecnico ? "Conclusão operacional" : "Fechada", iso: order.closed_at },
  ];
  return (
    <ol className="space-y-3">
      {events.map((e, i) => (
        <li
          key={e.label}
          className={`flex items-center gap-3 rounded-2xl border p-3 ${
            e.iso ? "border-primary/35 bg-primary/10" : "border-border bg-secondary/35"
          }`}
        >
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${
              e.iso ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{e.label}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatServiceOrderDateTime(e.iso) ?? "—"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
