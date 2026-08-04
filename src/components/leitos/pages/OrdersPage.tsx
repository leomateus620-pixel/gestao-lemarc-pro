import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDollarSign,
  Factory,
  Plus,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "@/components/leitos/WireTrayAccessContext";
import { WireTrayDocuments } from "@/components/leitos/WireTrayDocuments";
import { QuickClientDialog } from "@/components/leitos/QuickClientDialog";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WirePage,
  WirePageHeader,
  WirePager,
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
  useWireTrayOrderOptionsQuery,
  useWireTrayOrderQuery,
  useWireTrayOrdersQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import {
  cancelWireTrayOrder,
  confirmWireTrayOrder,
  deleteWireTrayOrder,
  previewWireTrayOrderInventory,
  saveWireTrayOrderDraft,
} from "@/lib/api/wireTrayOrders.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import { wireTrayErrorDescription } from "@/lib/wireTrays/errors";
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

function invalidateOrderFlow(queryClient: ReturnType<typeof useQueryClient>, orderId: string) {
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.order(orderId) });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.orderLists });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.dashboard });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.inventoryLists });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.movementLists });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.productionLists });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.separation });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.billing });
  queryClient.invalidateQueries({ queryKey: wireTrayKeys.notifications });
}

export function WireTrayOrdersPage() {
  const access = useWireTrayAccess();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "delivery">("newest");
  const [page, setPage] = useState(1);
  const query = useWireTrayOrdersQuery({
    search,
    status: status || undefined,
    priority: priority || undefined,
    sort,
    page,
    pageSize: 25,
  });
  const canCreate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  const confirmFn = useServerFn(confirmWireTrayOrder);
  const deleteFn = useServerFn(deleteWireTrayOrder);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    number: number;
    clientName: string;
  } | null>(null);
  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmFn({ data: { id, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: (_result, id) => {
      toast.success("Pedido confirmado e enviado para a fila de separação.");
      invalidateOrderFlow(queryClient, id);
    },
    onError: (error) => toast.error(wireTrayErrorDescription(error, "Não foi possível confirmar.")),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_result, id) => {
      toast.success("Pedido excluído definitivamente.");
      setPendingDelete(null);
      invalidateOrderFlow(queryClient, id);
    },
    onError: (error) =>
      toast.error(wireTrayErrorDescription(error, "Não foi possível excluir o pedido.")),
  });
  const openOrder = (id: string) => navigate({ to: `/leitos/pedidos/${id}` as never });
  useEffect(() => setPage(1), [priority, search, sort, status]);
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
        <div className="wire-filterbar wire-filterbar-orders">
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
          <label className="wire-field">
            <span className="wire-label">Ordenação</span>
            <select
              className="wire-select"
              value={sort}
              onChange={(event) => setSort(event.target.value as "newest" | "oldest" | "delivery")}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
              <option value="delivery">Prazo mais próximo</option>
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
                    {canCreate ? <th className="text-right">Ações</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((order) => (
                    <tr
                      key={order.id}
                      className="wire-row-clickable"
                      tabIndex={0}
                      role="link"
                      aria-label={`Abrir pedido #${order.number}`}
                      onClick={() => openOrder(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openOrder(order.id);
                        }
                      }}
                    >
                      <td>
                        <span className="wire-table-link">#{order.number}</span>
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
                      {canCreate ? (
                        <td>
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {order.status === "draft" ? (
                              <>
                                <button
                                  type="button"
                                  className="wire-button-secondary wire-button-compact"
                                  disabled={confirmMutation.isPending}
                                  onClick={() => confirmMutation.mutate(order.id)}
                                  title="Confirmar e enviar para separação"
                                >
                                  <Check size={14} /> Confirmar
                                </button>
                                <button
                                  type="button"
                                  className="wire-button-secondary wire-button-compact text-red-700"
                                  onClick={() =>
                                    setPendingDelete({
                                      id: order.id,
                                      number: order.number,
                                      clientName: order.clientName,
                                    })
                                  }
                                  title="Excluir pedido"
                                >
                                  <Trash2 size={14} /> Excluir
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="wire-button-secondary wire-button-compact"
                              onClick={() => openOrder(order.id)}
                            >
                              Abrir <ArrowRight size={14} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wire-mobile-list md:hidden">
              {query.data!.rows.map((order) => (
                <div className="wire-mobile-card" key={order.id}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => openOrder(order.id)}
                  >
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
                  </button>
                  {canCreate ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                      {order.status === "draft" ? (
                        <>
                          <button
                            type="button"
                            className="wire-button-secondary wire-button-compact"
                            disabled={confirmMutation.isPending}
                            onClick={() => confirmMutation.mutate(order.id)}
                          >
                            <Check size={14} /> Confirmar
                          </button>
                          <button
                            type="button"
                            className="wire-button-secondary wire-button-compact text-red-700"
                            onClick={() =>
                              setPendingDelete({
                                id: order.id,
                                number: order.number,
                                clientName: order.clientName,
                              })
                            }
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="wire-button-secondary wire-button-compact ml-auto"
                        onClick={() => openOrder(order.id)}
                      >
                        Abrir <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
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
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-lg font-bold text-slate-950">Excluir pedido definitivamente?</p>
            <p className="mt-2 text-sm text-slate-600">
              Pedido <strong>#{pendingDelete.number}</strong> — {pendingDelete.clientName}. Esta
              ação não pode ser desfeita e só é possível porque o pedido está em rascunho.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="wire-button-secondary"
                onClick={() => setPendingDelete(null)}
              >
                Manter pedido
              </button>
              <button
                type="button"
                className="wire-button-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(pendingDelete.id)}
              >
                <Trash2 size={16} />{" "}
                {deleteMutation.isPending ? "Excluindo..." : "Excluir pedido"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WirePage>
  );
}

type DraftItem = WireTrayOrderDraftInput["items"][number] & {
  key: string;
  qtyText: string;
  priceText: string;
};

const SECTIONS = [
  { id: "cliente", index: "01", title: "Cliente", hint: "Quem recebe o pedido." },
  { id: "itens", index: "02", title: "Itens", hint: "Produtos, quantidades e valores." },
  { id: "entrega", index: "03", title: "Entrega", hint: "Prazo e instruções operacionais." },
  { id: "revisao", index: "04", title: "Revisão", hint: "Confira antes de confirmar." },
] as const;

function OrderSection({
  id,
  index,
  title,
  hint,
  children,
  action,
}: {
  id: string;
  index: string;
  title: string;
  hint: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      id={`novo-pedido-${id}`}
      className="scroll-mt-24 border-t border-slate-200 pt-6 first:border-0 first:pt-0"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="font-display text-3xl font-black leading-none tracking-tight text-slate-300">
            {index}
          </span>
          <div>
            <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">{hint}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatLongDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function WireTrayOrderWizardPage() {
  const navigate = useNavigate();
  const access = useWireTrayAccess();
  const canCreate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  const options = useWireTrayOrderOptionsQuery();
  const save = useServerFn(saveWireTrayOrderDraft);
  const confirm = useServerFn(confirmWireTrayOrder);
  const preview = useServerFn(previewWireTrayOrderInventory);
  const queryClient = useQueryClient();
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
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const draft = {
    ...form,
    items: items.map(({ key: _key, qtyText: _q, priceText: _p, ...item }) => item),
  } as WireTrayOrderDraftInput;
  const clientUnits =
    options.data?.units.filter((unit: { client_id: string }) => unit.client_id === form.clientId) ??
    [];
  const total = items.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0);
  const itemsValid = items.length > 0 && items.every((item) => item.productId && item.quantity > 0);
  const previewSignature = useMemo(
    () => (itemsValid ? JSON.stringify(items.map((item) => [item.productId, item.quantity])) : ""),
    [items, itemsValid],
  );

  const saveMutation = useMutation({
    mutationFn: async (shouldConfirm: boolean) => {
      const parsed = wireTrayOrderDraftSchema.parse(draft);
      const result = await save({ data: { draft: parsed, idempotencyKey: crypto.randomUUID() } });
      if (shouldConfirm)
        await confirm({ data: { id: result.id, idempotencyKey: crypto.randomUUID() } });
      return result;
    },
    onSuccess: (result, shouldConfirm) => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.orderLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.order(result.id) });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.inventoryLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.movementLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.productionLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.separation });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.billing });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.notifications });
      toast.success(
        shouldConfirm
          ? "Pedido confirmado e enviado para a fila de separação."
          : "Rascunho salvo. Ele só vai para a separação após a confirmação.",
      );
      navigate({ to: "/leitos/pedidos/$orderId", params: { orderId: result.id } });
    },
    onError: (cause) => {
      const message = wireTrayErrorDescription(cause, "Não foi possível salvar o pedido.");
      setError(message);
      toast.error(message);
    },
  });
  const previewMutation = useMutation({
    mutationFn: (payload: Array<{ productId: string; quantity: number }>) =>
      preview({ data: { items: payload } }),
    onSuccess: (rows) => setPreviewRows(rows),
  });
  const runPreview = previewMutation.mutate;

  useEffect(() => {
    if (!previewSignature) {
      setPreviewRows([]);
      return;
    }
    const payload = (JSON.parse(previewSignature) as Array<[string, number]>).map(
      ([productId, quantity]) => ({ productId, quantity }),
    );
    const timer = setTimeout(() => runPreview(payload), 450);
    return () => clearTimeout(timer);
  }, [previewSignature, runPreview]);

  if (!canCreate)
    return <WireRestrictedState description="Seu perfil não permite criar ou confirmar pedidos." />;
  if (options.isLoading)
    return <WireLoadingState label="Carregando clientes, produtos e saldos..." variant="form" />;
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
        qtyText: "1",
        notes: null,
        unitPriceCents: access.canViewFinancials ? 0 : null,
        priceText: "",
        sortOrder: current.length,
      },
    ]);
  }
  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }
  function focusSection(id: string) {
    document
      .getElementById(`novo-pedido-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function submit(shouldConfirm: boolean) {
    setError(null);
    if (!form.clientId) {
      setError("Selecione o cliente do pedido.");
      focusSection("cliente");
      return;
    }
    if (!itemsValid) {
      setError("Adicione ao menos um produto com quantidade válida.");
      focusSection("itens");
      return;
    }
    saveMutation.mutate(shouldConfirm);
  }

  const selectedClient = options.data!.clients.find(
    (client: { id: string }) => client.id === form.clientId,
  );
  const selectedUnit = clientUnits.find((unit: { id: string }) => unit.id === form.clientUnitId);
  const longDate = form.expectedDeliveryDate ? formatLongDate(form.expectedDeliveryDate) : null;
  const isPastDate = Boolean(
    form.expectedDeliveryDate && form.expectedDeliveryDate < toDateInput(new Date()),
  );
  const dateShortcuts: Array<{ label: string; days: number }> = [
    { label: "Hoje", days: 0 },
    { label: "+7 dias", days: 7 },
    { label: "+15 dias", days: 15 },
    { label: "+30 dias", days: 30 },
  ];

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Fluxo comercial seguro"
        title="Novo pedido"
        description="Preencha as seções abaixo. O rascunho não altera saldos; a confirmação reserva estoque e cria as OPs necessárias."
        backTo="/leitos/pedidos"
      />
      <WirePanel>
        <div className="grid gap-8 p-4 sm:p-6">
          {error ? (
            <div
              className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              role="alert"
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}

          <QuickClientDialog
            open={clientDialogOpen}
            onOpenChange={setClientDialogOpen}
            onCreated={async (clientId) => {
              await options.refetch();
              setForm((prev) => ({ ...prev, clientId, clientUnitId: null }));
            }}
          />

          <OrderSection {...SECTIONS[0]}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="wire-field sm:col-span-2">
                <span className="flex items-center justify-between gap-2">
                  <span className="wire-label">Cliente</span>
                  {canCreate ? (
                    <button
                      type="button"
                      className="wire-button-ghost"
                      onClick={() => setClientDialogOpen(true)}
                    >
                      <Plus size={15} /> Nova empresa
                    </button>
                  ) : null}
                </span>
                <select
                  className="wire-select text-base font-semibold"
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({ ...form, clientId: e.target.value, clientUnitId: null })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value as ServicePriority })
                  }
                >
                  {Object.entries(priorityLabel).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </OrderSection>

          <OrderSection
            {...SECTIONS[1]}
            action={
              <button className="wire-button-secondary" type="button" onClick={addItem}>
                <Plus size={15} /> Adicionar
              </button>
            }
          >
            {items.length ? (
              <div className="grid gap-3">
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
                          className="wire-select font-semibold"
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
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          value={item.qtyText}
                          onChange={(e) =>
                            updateItem(item.key, {
                              qtyText: e.target.value,
                              quantity: e.target.value === "" ? 0 : Number(e.target.value),
                            })
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
                            inputMode="decimal"
                            placeholder="0,00"
                            value={item.priceText}
                            onChange={(e) =>
                              updateItem(item.key, {
                                priceText: e.target.value,
                                unitPriceCents:
                                  e.target.value === ""
                                    ? 0
                                    : Math.round(Number(e.target.value) * 100),
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
          </OrderSection>

          <OrderSection {...SECTIONS[2]}>
            <div className="grid gap-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <span className="wire-label">Data prevista de entrega</span>
                <p className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-slate-950 first-letter:uppercase sm:text-3xl">
                  {longDate ?? "Sem data definida"}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    className="wire-input h-12 max-w-56 text-base font-semibold"
                    type="date"
                    value={form.expectedDeliveryDate ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, expectedDeliveryDate: e.target.value || null })
                    }
                  />
                  {dateShortcuts.map((shortcut) => {
                    const date = new Date();
                    date.setDate(date.getDate() + shortcut.days);
                    const value = toDateInput(date);
                    return (
                      <button
                        type="button"
                        key={shortcut.label}
                        className="wire-button-secondary h-10"
                        data-active={form.expectedDeliveryDate === value}
                        onClick={() => setForm({ ...form, expectedDeliveryDate: value })}
                      >
                        {shortcut.label}
                      </button>
                    );
                  })}
                  {form.expectedDeliveryDate ? (
                    <button
                      type="button"
                      className="h-10 px-2 text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
                      onClick={() => setForm({ ...form, expectedDeliveryDate: null })}
                    >
                      Limpar
                    </button>
                  ) : null}
                </div>
                {isPastDate ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertTriangle size={15} /> A data escolhida já passou.
                  </p>
                ) : null}
              </div>
              <label className="wire-field">
                <span className="wire-label">Observações operacionais</span>
                <textarea
                  className="wire-textarea min-h-32"
                  value={form.operationalNotes ?? ""}
                  onChange={(e) => setForm({ ...form, operationalNotes: e.target.value || null })}
                  placeholder="Instruções de fabricação, separação ou expedição."
                />
              </label>
            </div>
          </OrderSection>

          <OrderSection {...SECTIONS[3]}>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h4 className="font-display text-lg font-extrabold tracking-tight text-slate-950">
                  {selectedClient?.name ?? "Cliente não selecionado"}
                </h4>
                {selectedUnit ? (
                  <p className="mt-1 text-sm text-slate-500">{selectedUnit.name}</p>
                ) : null}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Summary label="Prioridade" value={priorityLabel[form.priority]} />
                  <Summary label="Entrega" value={formatWireDate(form.expectedDeliveryDate)} />
                  <Summary label="Itens" value={String(items.length)} />
                  {access.canViewFinancials ? (
                    <Summary label="Total" value={formatWireCurrency(total)} />
                  ) : null}
                </div>
                {form.operationalNotes ? (
                  <p className="mt-4 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">
                    {form.operationalNotes}
                  </p>
                ) : null}
              </div>
              {items.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const product = options.data!.products.find(
                        (entry: { product: { id: string } }) => entry.product.id === item.productId,
                      )?.product;
                      const row = previewRows.find((entry) => entry.productId === item.productId);
                      return (
                        <div className="flex items-center gap-3 px-4 py-3" key={item.key}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {product?.name ?? "Produto"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatWireQuantity(item.quantity)}
                              {access.canViewFinancials
                                ? ` · ${formatWireCurrency((item.unitPriceCents ?? 0) * item.quantity)}`
                                : ""}
                            </p>
                          </div>
                          {row ? (
                            <WireStatus
                              tone={Number(row.productionRequired) > 0 ? "warning" : "success"}
                            >
                              {Number(row.productionRequired) > 0
                                ? `Produzir ${formatWireQuantity(Number(row.productionRequired))}`
                                : "Reservável"}
                            </WireStatus>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </OrderSection>
        </div>
        <div className="wire-form-footer">
          <button
            type="button"
            className="wire-button-ghost"
            disabled={saveMutation.isPending}
            onClick={() => submit(false)}
          >
            <Save size={16} /> Salvar rascunho
          </button>
          <button
            type="button"
            className="wire-button-primary"
            disabled={saveMutation.isPending}
            onClick={() => submit(true)}
          >
            <Check size={16} /> Salvar e enviar para separação
          </button>
        </div>
      </WirePanel>
    </WirePage>
  );
}

export function WireTrayOrderDetailPage({ orderId }: { orderId: string }) {
  const access = useWireTrayAccess();
  const query = useWireTrayOrderQuery(orderId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const confirm = useServerFn(confirmWireTrayOrder);
  const cancel = useServerFn(cancelWireTrayOrder);
  const remove = useServerFn(deleteWireTrayOrder);
  const [cancelReason, setCancelReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canOperate = hasWireTrayPermission(access.role, "create_orders", access.financialAccess);
  const confirmMutation = useMutation({
    mutationFn: () => confirm({ data: { id: orderId, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: () => {
      toast.success("Pedido confirmado e enviado para a fila de separação.");
      invalidateOrderFlow(queryClient, orderId);
    },
    onError: (error) => toast.error(wireTrayErrorDescription(error, "Não foi possível confirmar.")),
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { id: orderId, reason: cancelReason } }),
    onSuccess: () => {
      toast.success("Pedido cancelado e reservas liberadas.");
      setCancelReason("");
      invalidateOrderFlow(queryClient, orderId);
    },
    onError: (error) => toast.error(wireTrayErrorDescription(error, "Cancelamento recusado.")),
  });
  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { id: orderId } }),
    onSuccess: () => {
      toast.success("Pedido excluído definitivamente.");
      setDeleteOpen(false);
      invalidateOrderFlow(queryClient, orderId);
      navigate({ to: "/leitos/pedidos" });
    },
    onError: (error) =>
      toast.error(wireTrayErrorDescription(error, "Não foi possível excluir o pedido.")),
  });
  if (query.isLoading)
    return (
      <WireLoadingState label="Consolidando pedido, reservas e produção..." variant="detail" />
    );
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
            {order.status === "draft" && canOperate ? (
              <button
                type="button"
                className="wire-button-secondary text-red-700"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={16} /> Excluir
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
      {order.status === "draft" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-950">Ainda não enviado para separação</p>
          <p className="mt-1 text-xs text-amber-900">
            Rascunhos não reservam estoque e não aparecem na fila de separação. Confirme o pedido
            para liberar a operação.
          </p>
          {canOperate ? (
            <button
              type="button"
              className="wire-button-primary mt-3"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              <Check size={16} />{" "}
              {confirmMutation.isPending ? "Confirmando..." : "Confirmar e enviar para separação"}
            </button>
          ) : null}
        </div>
      ) : null}
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
                  <div key={op.id} className="flex items-center gap-3 px-4 py-3">
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
                  </div>
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
      {deleteOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-lg font-bold text-slate-950">Excluir pedido definitivamente?</p>
            <p className="mt-2 text-sm text-slate-600">
              Pedido <strong>#{order.number}</strong> — {order.clientName}. Esta ação não pode ser
              desfeita e só é possível porque o pedido está em rascunho.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="wire-button-secondary"
                onClick={() => setDeleteOpen(false)}
              >
                Manter pedido
              </button>
              <button
                type="button"
                className="wire-button-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 size={16} /> {deleteMutation.isPending ? "Excluindo..." : "Excluir pedido"}
              </button>
            </div>
          </div>
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
