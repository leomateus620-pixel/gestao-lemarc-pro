/* eslint-disable @typescript-eslint/no-explicit-any -- Queue payloads are normalized at the server boundary. */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  PackageCheck,
  Send,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "@/components/leitos/WireTrayAccessContext";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WirePage,
  WirePageHeader,
  WirePanel,
  WireProgress,
  WireRestrictedState,
  WireStatus,
  formatWireCurrency,
  formatWireDate,
  formatWireQuantity,
  orderStatusTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayBillingQuery,
  useWireTraySeparationQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import {
  dispatchWireTrayOrder,
  markWireTrayOrderBilled,
  recordWireTraySeparation,
  releaseWireTrayOrderForDispatch,
} from "@/lib/api/wireTrayOperations.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import {
  wireTrayOrderStatusLabel,
  wireTrayUnitLabel,
  type WireTrayOrderStatus,
} from "@/types/wireTray";

type SeparationAction = {
  orderId: string;
  orderNumber: number;
  orderItemId: string;
  productName: string;
  type: "separation" | "checking" | "resolution";
  max: number;
  resolvesEntryId?: string;
};

export function WireTraySeparationPage() {
  const access = useWireTrayAccess();
  const query = useWireTraySeparationQuery();
  const record = useServerFn(recordWireTraySeparation);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<SeparationAction | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [difference, setDifference] = useState(0);
  const [reason, setReason] = useState("");
  const canSeparate = hasWireTrayPermission(access.role, "separate", access.financialAccess);
  const mutation = useMutation({
    mutationFn: () =>
      record({
        data: {
          orderId: action!.orderId,
          orderItemId: action!.orderItemId,
          type: action!.type === "checking" && difference > 0 ? "discrepancy" : action!.type,
          quantity: action!.type === "resolution" ? 0 : quantity,
          differenceQuantity: action!.type === "checking" ? difference : 0,
          reason: reason || null,
          resolvesEntryId: action!.resolvesEntryId ?? null,
          evidenceDocumentId: null,
          idempotencyKey: crypto.randomUUID(),
        },
      }),
    onSuccess: (result) => {
      toast.success(
        result.ready_for_billing
          ? "Conferência concluída; pedido liberado para faturamento."
          : "Registro operacional concluído.",
      );
      setAction(null);
      setReason("");
      setDifference(0);
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Registro recusado."),
  });
  if (!canSeparate)
    return (
      <WireRestrictedState description="A fila de separação exige perfil de estoque, gestão ou administração." />
    );
  if (query.isLoading) return <WireLoadingState label="Carregando fila de separação..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  function open(next: SeparationAction) {
    setAction(next);
    setQuantity(next.max);
    setDifference(0);
    setReason("");
  }
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Expedição controlada"
        title="Separação e conferência"
        description="A conferência só libera faturamento quando todos os itens estiverem íntegros e sem divergência aberta."
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.map((row: any) => {
            const unresolved = (row.entries ?? []).filter(
              (entry: any) =>
                Number(entry.difference_quantity) > 0 &&
                !(row.entries ?? []).some(
                  (candidate: any) =>
                    candidate.entry_type === "resolution" &&
                    candidate.resolves_entry_id === entry.id,
                ),
            );
            return (
              <WirePanel
                key={row.order.id}
                title={`Pedido #${row.order.number} · ${row.order.clientName}`}
                description={`${row.order.clientUnitName ?? "Sem unidade"} · entrega ${formatWireDate(row.order.expectedDeliveryDate)}`}
                action={
                  <a href={`/leitos/pedidos/${row.order.id}`} className="wire-button-ghost">
                    Abrir pedido <ArrowRight size={15} />
                  </a>
                }
              >
                {unresolved.length ? (
                  <div className="border-b border-red-200 bg-red-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 shrink-0 text-red-700" size={18} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-red-950">
                          {unresolved.length} divergência(s) aguardando resolução
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {unresolved.map((entry: any) => {
                            const item = row.items.find(
                              (candidate: any) => candidate.id === entry.order_item_id,
                            );
                            return (
                              <button
                                type="button"
                                className="wire-button-secondary min-h-9 border-red-200 text-red-800"
                                key={entry.id}
                                onClick={() =>
                                  open({
                                    orderId: row.order.id,
                                    orderNumber: row.order.number,
                                    orderItemId: entry.order_item_id,
                                    productName: item?.product_name_snapshot ?? "Item",
                                    type: "resolution",
                                    max: 0,
                                    resolvesEntryId: entry.id,
                                  })
                                }
                              >
                                Resolver {item?.product_name_snapshot ?? "item"} (
                                {formatWireQuantity(Number(entry.difference_quantity))})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="wire-table-wrap">
                  <table className="wire-table">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Reservado</th>
                        <th>Separado</th>
                        <th>Conferido</th>
                        <th>Progresso</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.items.map((item: any) => {
                        const unit =
                          wireTrayUnitLabel[item.unit_snapshot as keyof typeof wireTrayUnitLabel];
                        const separationRemaining = Math.max(
                          0,
                          Number(item.requested_quantity) - Number(item.separated_quantity),
                        );
                        const checkRemaining = Math.max(
                          0,
                          Number(item.separated_quantity) - Number(item.checked_quantity),
                        );
                        const progress = Number(item.requested_quantity)
                          ? (Number(item.checked_quantity) / Number(item.requested_quantity)) * 100
                          : 0;
                        return (
                          <tr key={item.id}>
                            <td>
                              <p className="font-semibold text-slate-900">
                                {item.product_name_snapshot}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.product_sku_snapshot ?? "Sem SKU"}
                              </p>
                            </td>
                            <td>{formatWireQuantity(Number(item.reserved_quantity), unit)}</td>
                            <td>{formatWireQuantity(Number(item.separated_quantity), unit)}</td>
                            <td>{formatWireQuantity(Number(item.checked_quantity), unit)}</td>
                            <td>
                              <WireProgress value={progress} />
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                {separationRemaining > 0 ? (
                                  <button
                                    type="button"
                                    className="wire-button-secondary min-h-9"
                                    onClick={() =>
                                      open({
                                        orderId: row.order.id,
                                        orderNumber: row.order.number,
                                        orderItemId: item.id,
                                        productName: item.product_name_snapshot,
                                        type: "separation",
                                        max: separationRemaining,
                                      })
                                    }
                                  >
                                    <ClipboardCheck size={15} /> Separar
                                  </button>
                                ) : checkRemaining > 0 ? (
                                  <button
                                    type="button"
                                    className="wire-button-primary min-h-9"
                                    onClick={() =>
                                      open({
                                        orderId: row.order.id,
                                        orderNumber: row.order.number,
                                        orderItemId: item.id,
                                        productName: item.product_name_snapshot,
                                        type: "checking",
                                        max: checkRemaining,
                                      })
                                    }
                                  >
                                    <CheckCheck size={15} /> Conferir
                                  </button>
                                ) : (
                                  <WireStatus tone="success">Conferido</WireStatus>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs text-slate-600">
                    {row.reservations.length} reserva(s) ativa(s)
                  </span>
                  <WireStatus tone={orderStatusTone(row.order.status)}>
                    {wireTrayOrderStatusLabel[row.order.status as WireTrayOrderStatus]}
                  </WireStatus>
                </div>
              </WirePanel>
            );
          })}
        </div>
      ) : (
        <WireEmptyState
          title="Fila de separação vazia"
          description="Pedidos integralmente reservados aparecerão aqui para separação e dupla conferência."
        />
      )}
      {action ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/60 backdrop-blur-sm sm:place-items-center sm:p-5"
          onMouseDown={() => setAction(null)}
        >
          <section
            className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <p className="wire-eyebrow">Pedido #{action.orderNumber}</p>
                <h2 className="mt-1 font-display text-xl font-extrabold text-slate-950">
                  {action.type === "separation"
                    ? "Registrar separação"
                    : action.type === "checking"
                      ? "Conferir item"
                      : "Resolver divergência"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{action.productName}</p>
              </div>
              <button
                type="button"
                className="wire-icon-btn"
                onClick={() => setAction(null)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </header>
            <div className="grid gap-4 p-5">
              {action.type !== "resolution" ? (
                <label className="wire-field">
                  <span className="wire-label">
                    Quantidade (máximo {formatWireQuantity(action.max)})
                  </span>
                  <input
                    className="wire-input"
                    type="number"
                    min="0.001"
                    max={action.max}
                    step="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
              ) : null}
              {action.type === "checking" ? (
                <label className="wire-field">
                  <span className="wire-label">Divergência encontrada</span>
                  <input
                    className="wire-input"
                    type="number"
                    min="0"
                    max={quantity}
                    step="0.001"
                    value={difference}
                    onChange={(e) => setDifference(Number(e.target.value))}
                  />
                  <span className="wire-help">
                    Use zero quando a quantidade e a integridade estiverem corretas.
                  </span>
                </label>
              ) : null}
              {action.type === "resolution" || difference > 0 ? (
                <label className="wire-field">
                  <span className="wire-label">
                    {action.type === "resolution"
                      ? "Decisão e justificativa"
                      : "Descrição da divergência"}
                  </span>
                  <textarea
                    className="wire-textarea"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Registre o que foi encontrado e a ação tomada."
                  />
                </label>
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <ShieldCheck size={16} className="mb-2" />A conferência e qualquer divergência ficam
                vinculadas ao usuário e à trilha imutável do pedido.
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                className="wire-button-secondary"
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="wire-button-primary"
                disabled={
                  mutation.isPending ||
                  (action.type !== "resolution" && (quantity <= 0 || quantity > action.max)) ||
                  ((action.type === "resolution" || difference > 0) && reason.trim().length < 3)
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Registrando..." : "Confirmar"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </WirePage>
  );
}

type BillingAction = {
  orderId: string;
  orderNumber: number;
  type: "bill" | "release" | "dispatch";
};

export function WireTrayBillingPage() {
  const access = useWireTrayAccess();
  const query = useWireTrayBillingQuery();
  const markBilled = useServerFn(markWireTrayOrderBilled);
  const release = useServerFn(releaseWireTrayOrderForDispatch);
  const dispatch = useServerFn(dispatchWireTrayOrder);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<BillingAction | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const canBill = hasWireTrayPermission(access.role, "bill", access.financialAccess);
  const mutation = useMutation({
    mutationFn: async () => {
      if (action!.type === "bill")
        return markBilled({
          data: {
            orderId: action!.orderId,
            invoiceReference: reference,
            billingNotes: notes || null,
          },
        });
      if (action!.type === "release") return release({ data: { orderId: action!.orderId } });
      return dispatch({
        data: {
          orderId: action!.orderId,
          transportNote: notes,
          receiptDocumentId: null,
          idempotencyKey: crypto.randomUUID(),
        },
      });
    },
    onSuccess: () => {
      toast.success(
        action?.type === "bill"
          ? "Faturamento registrado."
          : action?.type === "release"
            ? "Pedido liberado para expedição."
            : "Expedição concluída e estoque consumido.",
      );
      setAction(null);
      setReference("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Operação recusada."),
  });
  if (!canBill || !access.canViewFinancials)
    return (
      <WireRestrictedState description="O faturamento exige papel autorizado e acesso financeiro explícito." />
    );
  if (query.isLoading) return <WireLoadingState label="Carregando fila financeira..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  const rows = query.data ?? [];
  function open(next: BillingAction) {
    setAction(next);
    setReference("");
    setNotes("");
  }
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Financeiro segregado"
        title="Faturamento e expedição"
        description="Somente pedidos conferidos entram nesta fila. Valores e documentos seguem política financeira independente."
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.map((row: any) => (
            <WirePanel key={row.order.id}>
              <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/leitos/pedidos/${row.order.id}`}
                      className="text-base font-extrabold text-slate-950 hover:text-orange-700"
                    >
                      Pedido #{row.order.number} · {row.order.clientName}
                    </a>
                    <WireStatus tone={orderStatusTone(row.order.status)}>
                      {wireTrayOrderStatusLabel[row.order.status as WireTrayOrderStatus]}
                    </WireStatus>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Summary label="Total" value={formatWireCurrency(row.order.totalCents)} />
                    <Summary
                      label="Entrega"
                      value={formatWireDate(row.order.expectedDeliveryDate)}
                    />
                    <Summary label="Nota / referência" value={row.invoiceReference ?? "Pendente"} />
                    <Summary label="Documentos" value={String(row.documents.length)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.order.status === "ready_for_billing" ? (
                    <button
                      type="button"
                      className="wire-button-primary"
                      onClick={() =>
                        open({ orderId: row.order.id, orderNumber: row.order.number, type: "bill" })
                      }
                    >
                      <FileCheck2 size={16} /> Registrar faturamento
                    </button>
                  ) : row.order.status === "billed" ? (
                    <button
                      type="button"
                      className="wire-button-primary"
                      onClick={() =>
                        open({
                          orderId: row.order.id,
                          orderNumber: row.order.number,
                          type: "release",
                        })
                      }
                    >
                      <Send size={16} /> Liberar expedição
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="wire-button-primary"
                      onClick={() =>
                        open({
                          orderId: row.order.id,
                          orderNumber: row.order.number,
                          type: "dispatch",
                        })
                      }
                    >
                      <Truck size={16} /> Confirmar expedição
                    </button>
                  )}
                </div>
              </div>
            </WirePanel>
          ))}
        </div>
      ) : (
        <WireEmptyState
          title="Fila financeira vazia"
          description="Pedidos aparecem aqui após a conferência integral e a resolução de todas as divergências."
        />
      )}
      {action ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/60 backdrop-blur-sm sm:place-items-center sm:p-5"
          onMouseDown={() => setAction(null)}
        >
          <section
            className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="wire-eyebrow">Pedido #{action.orderNumber}</p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-slate-950">
              {action.type === "bill"
                ? "Registrar faturamento"
                : action.type === "release"
                  ? "Liberar para expedição"
                  : "Confirmar expedição"}
            </h2>
            <div className="mt-5 grid gap-4">
              {action.type === "bill" ? (
                <label className="wire-field">
                  <span className="wire-label">Número da nota ou referência</span>
                  <input
                    className="wire-input"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    autoFocus
                  />
                </label>
              ) : null}
              {action.type !== "release" ? (
                <label className="wire-field">
                  <span className="wire-label">
                    {action.type === "dispatch"
                      ? "Transportadora, placa, volumes ou comprovante"
                      : "Observações de faturamento"}
                  </span>
                  <textarea
                    className="wire-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              ) : (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
                  <PackageCheck size={19} className="mb-2" />
                  <strong>Confirme a liberação.</strong>
                  <p className="text-orange-900/75">
                    Esta ação muda o pedido para pronto para expedição, sem consumir o saldo.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="wire-button-secondary"
                onClick={() => setAction(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="wire-button-primary"
                disabled={
                  mutation.isPending ||
                  (action.type === "bill" && !reference.trim()) ||
                  (action.type === "dispatch" && notes.trim().length < 3)
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Processando..." : "Confirmar operação"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </WirePage>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="wire-summary-label">{label}</p>
      <p className="wire-summary-value">{value}</p>
    </div>
  );
}
