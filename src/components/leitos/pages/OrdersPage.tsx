import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDollarSign,
  ClipboardList,
  Factory,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "@/components/leitos/WireTrayAccessContext";
import { WireTrayDocuments } from "@/components/leitos/WireTrayDocuments";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WirePage,
  WirePageHeader,
  WirePager,
  WirePanel,
  WireProgress,
  WireStatus,
  formatWireCurrency,
  formatWireDate,
  formatWireQuantity,
  orderStatusTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayOrderOptionsQuery,
  useWireTrayOrderQuery,
  useWireTrayOrdersQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import {
  cancelWireTrayOrder,
  confirmWireTrayOrder,
  previewWireTrayOrderInventory,
  saveWireTrayOrderDraft,
} from "@/lib/api/wireTrayOrders.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import { wireTrayOrderDraftSchema, type WireTrayOrderDraftInput } from "@/lib/wireTrays/schemas";
import {
  wireTrayOrderStatusLabel,
  wireTrayProductionStatusLabel,
  wireTrayUnitLabel,
  type ServicePriority,
  type WireTrayOrderStatus,
} from "@/types/wireTray";

const orderStatuses = Object.entries(wireTrayOrderStatusLabel) as Array<
  [WireTrayOrderStatus, string]
>;
const priorityLabel: Record<ServicePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function WireTrayOrdersPage() {
  const access = useWireTrayAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const query = useWireTrayOrdersQuery({
    search,
    status: status || undefined,
    priority: priority || undefined,
    page,
    pageSize: 25,
  });
  const canCreate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  useEffect(() => setPage(1), [priority, search, status]);
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Demanda comercial e industrial"
        title="Pedidos"
        description="Fluxo único do rascunho à expedição, com reservas e produção vinculadas."
        action={
          canCreate ? (
            <Link to="/leitos/pedidos/novo" className="wire-button-primary">
              <Plus size={16} /> Novo pedido
            </Link>
          ) : undefined
        }
      />
      <WirePanel>
        <div className="wire-filterbar">
          <label className="wire-field">
            <span className="wire-label">Buscar</span>
            <span className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="wire-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Número, cliente ou referência"
              />
            </span>
          </label>
          <label className="wire-field">
            <span className="wire-label">Status</span>
            <select
              className="wire-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {orderStatuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Prioridade</span>
            <select
              className="wire-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">Todas</option>
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {query.isLoading ? (
          <WireLoadingState label="Consultando pedidos..." />
        ) : query.isError ? (
          <WireErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length ? (
          <>
            <div className="wire-table-wrap hidden md:block">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Prioridade / prazo</th>
                    <th>Itens</th>
                    <th>Progresso</th>
                    {access.canViewFinancials ? <th>Total</th> : null}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <a href={`/leitos/pedidos/${order.id}`} className="wire-table-link">
                          #{order.number}
                        </a>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.customerOrderReference ??
                            order.quotationReference ??
                            "Sem referência"}
                        </p>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900">{order.clientName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.clientUnitName ?? "Sem unidade"}
                        </p>
                      </td>
                      <td>
                        <WireStatus
                          tone={
                            order.priority === "urgente"
                              ? "danger"
                              : order.priority === "alta"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {priorityLabel[order.priority]}
                        </WireStatus>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatWireDate(order.expectedDeliveryDate)}
                        </p>
                      </td>
                      <td>{order.itemCount}</td>
                      <td>
                        <WireProgress value={order.progress} />
                      </td>
                      {access.canViewFinancials ? (
                        <td className="font-semibold text-slate-900">
                          {formatWireCurrency(order.totalCents)}
                        </td>
                      ) : null}
                      <td>
                        <WireStatus tone={orderStatusTone(order.status)}>
                          {wireTrayOrderStatusLabel[order.status]}
                        </WireStatus>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wire-mobile-list md:hidden">
              {query.data!.rows.map((order) => (
                <a href={`/leitos/pedidos/${order.id}`} className="wire-mobile-card" key={order.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">Pedido #{order.number}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.clientName} · {formatWireDate(order.expectedDeliveryDate)}
                      </p>
                    </div>
                    <WireStatus tone={orderStatusTone(order.status)}>
                      {wireTrayOrderStatusLabel[order.status]}
                    </WireStatus>
                  </div>
                  <WireProgress value={order.progress} />
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{order.itemCount} item(ns)</span>
                    {access.canViewFinancials ? (
                      <strong>{formatWireCurrency(order.totalCents)}</strong>
                    ) : (
                      <span>{priorityLabel[order.priority]}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
            <WirePager page={page} pageSize={25} count={query.data!.count} onPage={setPage} />
          </>
        ) : (
          <WireEmptyState
            title="Nenhum pedido encontrado"
            description="Ajuste os filtros ou inicie um novo pedido com dados reais de cliente e produto."
            action={
              canCreate ? (
                <Link to="/leitos/pedidos/novo" className="wire-button-secondary">
                  Criar pedido
                </Link>
              ) : undefined
            }
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

type DraftItem = WireTrayOrderDraftInput["items"][number] & { key: string };

export function WireTrayOrderWizardPage() {
  const access = useWireTrayAccess();
  const canCreate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  const options = useWireTrayOrderOptionsQuery();
  const save = useServerFn(saveWireTrayOrderDraft);
  const confirm = useServerFn(confirmWireTrayOrder);
  const preview = useServerFn(previewWireTrayOrderInventory);
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Omit<WireTrayOrderDraftInput, "items">>({
    id: null,
    clientId: "",
    clientUnitId: null,
    customerOrderReference: null,
    quotationReference: null,
    priority: "media",
    expectedDeliveryDate: null,
    operationalNotes: null,
  });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, number | string>>>([]);
  const [error, setError] = useState<string | null>(null);
  const draft = {
    ...form,
    items: items.map(({ key: _key, ...item }) => item),
  } as WireTrayOrderDraftInput;
  const clientUnits =
    options.data?.units.filter((unit: { client_id: string }) => unit.client_id === form.clientId) ??
    [];
  const total = items.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0);

  const saveMutation = useMutation({
    mutationFn: async (shouldConfirm: boolean) => {
      const parsed = wireTrayOrderDraftSchema.parse(draft);
      const result = await save({ data: { draft: parsed, idempotencyKey: crypto.randomUUID() } });
      if (shouldConfirm)
        await confirm({ data: { id: result.id, idempotencyKey: crypto.randomUUID() } });
      return result;
    },
    onSuccess: (result, shouldConfirm) => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
      toast.success(
        shouldConfirm
          ? "Pedido confirmado; reservas e faltas foram processadas."
          : "Rascunho salvo.",
      );
      window.location.assign(`/leitos/pedidos/${result.id}`);
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : "Não foi possível salvar o pedido.";
      setError(message);
      toast.error(message);
    },
  });
  const previewMutation = useMutation({
    mutationFn: () =>
      preview({
        data: {
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        },
      }),
    onSuccess: (rows) => {
      setPreviewRows(rows);
      setStep(3);
    },
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "Não foi possível validar a disponibilidade.",
      ),
  });

  if (!canCreate)
    return (
      <WireErrorState
        title="Acesso restrito"
        error={new Error("Seu perfil não permite criar ou confirmar pedidos.")}
      />
    );
  if (options.isLoading)
    return <WireLoadingState label="Carregando clientes, produtos e saldos..." />;
  if (options.isError)
    return <WireErrorState error={options.error} onRetry={() => options.refetch()} />;
  function addItem() {
    const product = options.data!.products[0]?.product;
    if (!product) return;
    setItems((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        quantity: 1,
        notes: null,
        unitPriceCents: access.canViewFinancials ? 0 : null,
        sortOrder: current.length,
      },
    ]);
  }
  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function next() {
    setError(null);
    if (step === 0 && !form.clientId) return setError("Selecione o cliente do pedido.");
    if (
      step === 1 &&
      (!items.length || items.some((item) => !item.productId || item.quantity <= 0))
    )
      return setError("Adicione ao menos um produto com quantidade válida.");
    if (step === 2) return previewMutation.mutate();
    setStep((current) => Math.min(3, current + 1));
  }

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Fluxo comercial seguro"
        title="Novo pedido"
        description="O rascunho não altera saldos. Somente a confirmação no servidor bloqueia o estoque e cria as OPs necessárias."
        backTo="/leitos/pedidos"
      />
      <WirePanel>
        <div className="wire-stepper">
          {["Cliente", "Itens", "Entrega", "Revisão"].map((label, index) => (
            <button
              type="button"
              key={label}
              className="wire-step"
              data-active={step === index}
              onClick={() => index < step && setStep(index)}
            >
              <span className="wire-step-index">
                {index < step ? <Check size={12} /> : index + 1}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        {error ? (
          <div
            className="mx-4 mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        ) : null}
        {step === 0 ? (
          <div className="wire-form-grid">
            <label className="wire-field wire-form-span-2">
              <span className="wire-label">Cliente</span>
              <select
                className="wire-select"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value, clientUnitId: null })}
              >
                <option value="">Selecione um cliente real</option>
                {options.data!.clients.map(
                  (client: { id: string; name: string; cnpj: string | null }) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.cnpj ? ` · ${client.cnpj}` : ""}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="wire-field">
              <span className="wire-label">Unidade do cliente</span>
              <select
                className="wire-select"
                value={form.clientUnitId ?? ""}
                onChange={(e) => setForm({ ...form, clientUnitId: e.target.value || null })}
              >
                <option value="">Sem unidade específica</option>
                {clientUnits.map(
                  (unit: {
                    id: string;
                    name: string;
                    city: string | null;
                    state: string | null;
                  }) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                      {unit.city ? ` · ${unit.city}/${unit.state ?? ""}` : ""}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="wire-field">
              <span className="wire-label">Prioridade</span>
              <select
                className="wire-select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as ServicePriority })}
              >
                {Object.entries(priorityLabel).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wire-field">
              <span className="wire-label">Referência do pedido do cliente</span>
              <input
                className="wire-input"
                value={form.customerOrderReference ?? ""}
                onChange={(e) =>
                  setForm({ ...form, customerOrderReference: e.target.value || null })
                }
              />
            </label>
            <label className="wire-field">
              <span className="wire-label">Referência da cotação</span>
              <input
                className="wire-input"
                value={form.quotationReference ?? ""}
                onChange={(e) => setForm({ ...form, quotationReference: e.target.value || null })}
              />
            </label>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-extrabold text-slate-950">Itens do pedido</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Produtos ativos do catálogo Leitos Aramados.
                </p>
              </div>
              <button className="wire-button-secondary" type="button" onClick={addItem}>
                <Plus size={15} /> Adicionar
              </button>
            </div>
            {items.length ? (
              <div className="mt-4 grid gap-3">
                {items.map((item, index) => {
                  const option = options.data!.products.find(
                    (entry: { product: { id: string } }) => entry.product.id === item.productId,
                  );
                  return (
                    <div
                      className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(220px,1fr)_120px_140px_42px]"
                      key={item.key}
                    >
                      <label className="wire-field">
                        <span className="wire-label">Produto</span>
                        <select
                          className="wire-select"
                          value={item.productId}
                          onChange={(e) => updateItem(item.key, { productId: e.target.value })}
                        >
                          {options.data!.products.map(
                            (entry: {
                              product: { id: string; sku: string | null; name: string };
                            }) => (
                              <option key={entry.product.id} value={entry.product.id}>
                                {entry.product.sku ? `${entry.product.sku} · ` : ""}
                                {entry.product.name}
                              </option>
                            ),
                          )}
                        </select>
                        {option ? (
                          <span className="wire-help">
                            Disponível agora:{" "}
                            {formatWireQuantity(
                              option.available,
                              wireTrayUnitLabel[option.product.unit],
                            )}
                          </span>
                        ) : null}
                      </label>
                      <label className="wire-field">
                        <span className="wire-label">Quantidade</span>
                        <input
                          className="wire-input"
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.key, { quantity: Number(e.target.value) })
                          }
                        />
                      </label>
                      {access.canViewFinancials ? (
                        <label className="wire-field">
                          <span className="wire-label">Valor unitário</span>
                          <input
                            className="wire-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={(item.unitPriceCents ?? 0) / 100}
                            onChange={(e) =>
                              updateItem(item.key, {
                                unitPriceCents: Math.round(Number(e.target.value) * 100),
                              })
                            }
                          />
                        </label>
                      ) : (
                        <div className="wire-field">
                          <span className="wire-label">Ordem</span>
                          <span className="grid min-h-11 place-items-center rounded-xl bg-white text-sm font-bold text-slate-700">
                            {index + 1}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="wire-icon-btn self-end text-red-700"
                        onClick={() =>
                          setItems((current) => current.filter((row) => row.key !== item.key))
                        }
                        aria-label="Remover item"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <WireEmptyState
                title="Pedido sem itens"
                description="Adicione produtos para avaliar reservas e necessidade de fabricação."
                action={
                  <button type="button" className="wire-button-secondary" onClick={addItem}>
                    <Plus size={16} /> Adicionar primeiro item
                  </button>
                }
              />
            )}
          </div>
        ) : null}
        {step === 2 ? (
          <div className="wire-form-grid">
            <label className="wire-field">
              <span className="wire-label">Data prevista de entrega</span>
              <input
                className="wire-input"
                type="date"
                value={form.expectedDeliveryDate ?? ""}
                onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value || null })}
              />
            </label>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
              <ShieldCheck size={18} className="mb-2" />
              <strong>Planejamento autoritativo</strong>
              <p className="text-blue-900/75">
                A disponibilidade exibida na revisão será recalculada no servidor. A confirmação usa
                bloqueio de linha para impedir dupla reserva.
              </p>
            </div>
            <label className="wire-field wire-form-span-2">
              <span className="wire-label">Observações operacionais</span>
              <textarea
                className="wire-textarea min-h-36"
                value={form.operationalNotes ?? ""}
                onChange={(e) => setForm({ ...form, operationalNotes: e.target.value || null })}
                placeholder="Instruções de fabricação, separação ou expedição."
              />
            </label>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_.8fr]">
            <div className="grid content-start gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="wire-eyebrow">Resumo do pedido</p>
                <h3 className="mt-2 font-display text-xl font-extrabold text-slate-950">
                  {
                    options.data!.clients.find(
                      (client: { id: string }) => client.id === form.clientId,
                    )?.name
                  }
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Summary label="Prioridade" value={priorityLabel[form.priority]} />
                  <Summary label="Entrega" value={formatWireDate(form.expectedDeliveryDate)} />
                  <Summary label="Itens" value={String(items.length)} />
                  {access.canViewFinancials ? (
                    <Summary label="Total" value={formatWireCurrency(total)} />
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-bold text-slate-950">Disponibilidade indicativa</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Uma nova leitura será feita no instante da confirmação.
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {previewRows.map((row) => {
                    const product = options.data!.products.find(
                      (entry: { product: { id: string } }) => entry.product.id === row.productId,
                    )?.product;
                    return (
                      <div
                        className="flex items-center gap-3 px-4 py-3"
                        key={String(row.productId)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {product?.name ?? "Produto"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Solicitado {formatWireQuantity(Number(row.requested))} · disponível{" "}
                            {formatWireQuantity(Number(row.available))}
                          </p>
                        </div>
                        <WireStatus
                          tone={Number(row.productionRequired) > 0 ? "warning" : "success"}
                        >
                          {Number(row.productionRequired) > 0
                            ? `Produzir ${formatWireQuantity(Number(row.productionRequired))}`
                            : "Reservável"}
                        </WireStatus>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid content-start gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <ClipboardList className="text-emerald-700" size={24} />
                <p className="mt-3 font-bold text-emerald-950">Salvar rascunho</p>
                <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                  Persiste o pedido, mas não movimenta nem reserva saldo.
                </p>
              </div>
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <Factory className="text-orange-700" size={24} />
                <p className="mt-3 font-bold text-orange-950">Confirmar agora</p>
                <p className="mt-1 text-sm leading-6 text-orange-900/75">
                  Reserva o disponível e cria produção somente para a falta real, em uma transação.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="wire-form-footer">
          <button
            type="button"
            className="wire-button-secondary"
            disabled={step === 0 || saveMutation.isPending || previewMutation.isPending}
            onClick={() => setStep((current) => current - 1)}
          >
            Voltar
          </button>
          {step < 3 ? (
            <button
              type="button"
              className="wire-button-primary"
              disabled={previewMutation.isPending}
              onClick={next}
            >
              {previewMutation.isPending ? (
                "Validando..."
              ) : (
                <>
                  Continuar <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="wire-button-secondary"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(false)}
              >
                <Save size={16} /> Salvar rascunho
              </button>
              <button
                type="button"
                className="wire-button-primary"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(true)}
              >
                <Check size={16} /> Confirmar pedido
              </button>
            </>
          )}
        </div>
      </WirePanel>
    </WirePage>
  );
}

export function WireTrayOrderDetailPage({ orderId }: { orderId: string }) {
  const access = useWireTrayAccess();
  const query = useWireTrayOrderQuery(orderId);
  const queryClient = useQueryClient();
  const confirm = useServerFn(confirmWireTrayOrder);
  const cancel = useServerFn(cancelWireTrayOrder);
  const [cancelReason, setCancelReason] = useState("");
  const canOperate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  const confirmMutation = useMutation({
    mutationFn: () => confirm({ data: { id: orderId, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: () => {
      toast.success("Pedido confirmado e disponibilidade processada.");
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível confirmar."),
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { id: orderId, reason: cancelReason } }),
    onSuccess: () => {
      toast.success("Pedido cancelado e reservas liberadas.");
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Cancelamento recusado."),
  });
  if (query.isLoading)
    return <WireLoadingState label="Consolidando pedido, reservas e produção..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data)
    return (
      <WireEmptyState
        title="Pedido não encontrado"
        description="O registro não existe ou não está acessível para sua sessão."
      />
    );
  const order = query.data;
  return (
    <WirePage>
      <WirePageHeader
        eyebrow={`Pedido #${order.number}`}
        title={order.clientName}
        description={`${order.clientUnitName ?? "Sem unidade"} · criado em ${formatWireDate(order.createdAt, true)}`}
        backTo="/leitos/pedidos"
        action={
          <>
            {order.status === "draft" && canOperate ? (
              <button
                type="button"
                className="wire-button-primary"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
              >
                <Check size={16} /> Confirmar
              </button>
            ) : null}
            {!["cancelled", "completed", "dispatched"].includes(order.status) && canOperate ? (
              <button
                type="button"
                className="wire-button-secondary text-red-700"
                onClick={() =>
                  document
                    .getElementById("wire-cancel-order")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <XCircle size={16} /> Cancelar
              </button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="wire-metric">
          <p className="wire-metric-label">Status</p>
          <div className="mt-3">
            <WireStatus tone={orderStatusTone(order.status)}>
              {wireTrayOrderStatusLabel[order.status]}
            </WireStatus>
          </div>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Progresso</p>
          <div className="mt-3">
            <WireProgress value={order.progress} />
          </div>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Entrega prevista</p>
          <p className="wire-metric-value text-[1.3rem]">
            {formatWireDate(order.expectedDeliveryDate)}
          </p>
        </article>
        {access.canViewFinancials ? (
          <article className="wire-metric">
            <p className="wire-metric-label">Total</p>
            <p className="wire-metric-value text-[1.3rem]">
              {formatWireCurrency(order.totalCents)}
            </p>
          </article>
        ) : (
          <article className="wire-metric">
            <p className="wire-metric-label">Itens</p>
            <p className="wire-metric-value text-[1.3rem]">{order.itemCount}</p>
          </article>
        )}
      </div>
      <div className="wire-detail-grid">
        <div className="grid content-start gap-4">
          <WirePanel title="Itens e atendimento">
            <div className="wire-table-wrap">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Solicitado</th>
                    <th>Reservado</th>
                    <th>A produzir</th>
                    <th>Produzido</th>
                    <th>Separado</th>
                    <th>Conferido</th>
                    {access.canViewFinancials ? <th>Total</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-semibold text-slate-900">{item.productName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.productSku ?? "Sem SKU"}
                        </p>
                      </td>
                      {[
                        item.requested,
                        item.reserved,
                        item.productionRequired,
                        item.produced,
                        item.separated,
                        item.checked,
                      ].map((value, index) => (
                        <td key={index}>
                          {formatWireQuantity(value, wireTrayUnitLabel[item.unit])}
                        </td>
                      ))}
                      {access.canViewFinancials ? (
                        <td>{formatWireCurrency(item.totalCents)}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WirePanel>
          <WirePanel title="Ordens de produção vinculadas">
            {order.production.length ? (
              <div className="divide-y divide-slate-100">
                {order.production.map((op) => (
                  <a
                    href={`/leitos/producao/${op.id}`}
                    key={op.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                      <Factory size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        OP #{op.number} · {op.productName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatWireQuantity(op.produced)} de {formatWireQuantity(op.planned)} ·{" "}
                        {wireTrayProductionStatusLabel[op.status]}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                  </a>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem produção vinculada"
                description="O estoque reservado atende o pedido ou ele ainda não foi confirmado."
              />
            )}
          </WirePanel>
          <WirePanel title="Documentos do pedido">
            <WireTrayDocuments
              entityType="order"
              entityId={order.id}
              documents={order.documents}
              defaultType="customer_order"
            />
          </WirePanel>
        </div>
        <div className="grid content-start gap-4">
          <WirePanel title="Dados do pedido">
            <div className="wire-summary-list">
              <Summary label="Prioridade" value={priorityLabel[order.priority]} />
              <Summary
                label="Pedido do cliente"
                value={order.customerOrderReference ?? "Não informado"}
              />
              <Summary label="Cotação" value={order.quotationReference ?? "Não informada"} />
              <Summary label="Confirmado" value={formatWireDate(order.confirmedAt, true)} />
              {access.canViewFinancials ? (
                <>
                  <Summary label="Fatura" value={order.invoiceReference ?? "Não informada"} />
                  <Summary label="Faturado" value={formatWireDate(order.billedAt, true)} />
                </>
              ) : null}
            </div>
            {order.operationalNotes ? (
              <p className="border-t border-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">
                {order.operationalNotes}
              </p>
            ) : null}
          </WirePanel>
          <WirePanel title="Reservas">
            <div className="px-4 py-4">
              <p className="text-2xl font-extrabold text-slate-950">
                {formatWireQuantity(
                  order.reservations.reduce((sum, row) => sum + row.remaining, 0),
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Quantidade ainda reservada em {order.reservations.length} registro(s).
              </p>
            </div>
          </WirePanel>
          <WirePanel title="Trilha de auditoria">
            {order.audit.length ? (
              <div className="wire-timeline">
                {order.audit.slice(0, 12).map((event) => (
                  <div className="wire-timeline-item" key={event.id}>
                    <span className="wire-timeline-dot" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {event.eventType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatWireDate(event.createdAt, true)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem eventos"
                description="A trilha será preenchida pelas operações críticas."
              />
            )}
          </WirePanel>
        </div>
      </div>
      {!["cancelled", "completed", "dispatched"].includes(order.status) && canOperate ? (
        <WirePanel
          title="Cancelamento controlado"
          description="Reservas são liberadas na mesma transação; produção iniciada bloqueia esta ação."
          className="border-red-200"
          action={undefined}
        >
          <div id="wire-cancel-order" className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
            <label className="wire-field">
              <span className="wire-label">Motivo obrigatório</span>
              <input
                className="wire-input"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Justifique o cancelamento"
              />
            </label>
            <button
              type="button"
              className="wire-button-danger self-end"
              disabled={cancelReason.trim().length < 3 || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              <XCircle size={16} /> Confirmar cancelamento
            </button>
          </div>
        </WirePanel>
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
