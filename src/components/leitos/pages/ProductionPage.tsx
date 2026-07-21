import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  CirclePause,
  Factory,
  PackageCheck,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
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
  formatWireDate,
  formatWireQuantity,
  orderStatusTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayProductionDetailQuery,
  useWireTrayProductionOptionsQuery,
  useWireTrayProductionQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import {
  createWireTrayProduction,
  recordWireTrayProductionEntry,
} from "@/lib/api/wireTrayProduction.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import {
  wireTrayProductionOriginLabel,
  wireTrayProductionStatusLabel,
  type ServicePriority,
  type WireTrayProductionEntryType,
  type WireTrayProductionOrigin,
  type WireTrayProductionStatus,
} from "@/types/wireTray";

const statuses = Object.entries(wireTrayProductionStatusLabel) as Array<
  [WireTrayProductionStatus, string]
>;
const origins = Object.entries(wireTrayProductionOriginLabel) as Array<
  [WireTrayProductionOrigin, string]
>;
const priorities: Record<ServicePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function WireTrayProductionPage() {
  const access = useWireTrayAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [page, setPage] = useState(1);
  const query = useWireTrayProductionQuery({
    search,
    status: status || undefined,
    origin: origin || undefined,
    page,
    pageSize: 25,
  });
  const canOperate = hasWireTrayPermission(
    access.role,
    "operate_production",
    access.financialAccess,
  );
  useEffect(() => setPage(1), [origin, search, status]);
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Planejamento e chão de fábrica"
        title="Produção"
        description="Ordens de fabricação, apontamentos, perdas e entradas de produto acabado."
        action={
          canOperate ? (
            <Link to="/leitos/producao/nova" className="wire-button-primary">
              <Plus size={16} /> Nova OP
            </Link>
          ) : undefined
        }
      />
      <WirePanel>
        <div className="wire-filterbar">
          <label className="wire-field">
            <span className="wire-label">Buscar OP</span>
            <span className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="wire-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Número da OP"
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
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Origem</span>
            <select
              className="wire-select"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            >
              <option value="">Todas</option>
              {origins.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {query.isLoading ? (
          <WireLoadingState label="Consultando ordens de produção..." />
        ) : query.isError ? (
          <WireErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length ? (
          <>
            <div className="wire-table-wrap hidden md:block">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>OP</th>
                    <th>Produto</th>
                    <th>Origem</th>
                    <th>Planejado / produzido</th>
                    <th>Prazo</th>
                    <th>Progresso</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((op) => (
                    <tr key={op.id}>
                      <td>
                        <a href={`/leitos/producao/${op.id}`} className="wire-table-link">
                          #{op.number}
                        </a>
                        <p className="mt-1 text-xs text-slate-500">{priorities[op.priority]}</p>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900">{op.productName}</p>
                        <p className="mt-1 text-xs text-slate-500">{op.productSku ?? "Sem SKU"}</p>
                      </td>
                      <td>
                        {wireTrayProductionOriginLabel[op.origin]}
                        {op.orderNumber ? (
                          <p className="mt-1 text-xs text-slate-500">Pedido #{op.orderNumber}</p>
                        ) : null}
                      </td>
                      <td>
                        {formatWireQuantity(op.produced)} / {formatWireQuantity(op.planned)}
                        {op.scrap > 0 ? (
                          <p className="mt-1 text-xs text-red-600">
                            Perda {formatWireQuantity(op.scrap)}
                          </p>
                        ) : null}
                      </td>
                      <td>{formatWireDate(op.plannedCompletionDate)}</td>
                      <td>
                        <WireProgress value={op.planned ? (op.produced / op.planned) * 100 : 0} />
                      </td>
                      <td>
                        <WireStatus tone={orderStatusTone(op.status)}>
                          {wireTrayProductionStatusLabel[op.status]}
                        </WireStatus>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wire-mobile-list md:hidden">
              {query.data!.rows.map((op) => (
                <a href={`/leitos/producao/${op.id}`} key={op.id} className="wire-mobile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        OP #{op.number} · {op.productName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {wireTrayProductionOriginLabel[op.origin]} ·{" "}
                        {formatWireDate(op.plannedCompletionDate)}
                      </p>
                    </div>
                    <WireStatus tone={orderStatusTone(op.status)}>
                      {wireTrayProductionStatusLabel[op.status]}
                    </WireStatus>
                  </div>
                  <WireProgress value={op.planned ? (op.produced / op.planned) * 100 : 0} />
                  <p className="text-xs text-slate-600">
                    {formatWireQuantity(op.produced)} produzido(s) de{" "}
                    {formatWireQuantity(op.planned)}
                  </p>
                </a>
              ))}
            </div>
            <WirePager page={page} pageSize={25} count={query.data!.count} onPage={setPage} />
          </>
        ) : (
          <WireEmptyState
            title="Nenhuma ordem de produção"
            description="As faltas de pedidos confirmados criam OPs automaticamente; reposições manuais podem ser planejadas aqui."
            action={
              canOperate ? (
                <Link to="/leitos/producao/nova" className="wire-button-secondary">
                  Planejar produção
                </Link>
              ) : undefined
            }
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

export function WireTrayProductionFormPage() {
  const access = useWireTrayAccess();
  const options = useWireTrayProductionOptionsQuery();
  const create = useServerFn(createWireTrayProduction);
  const [mode, setMode] = useState<"stock" | "order">("stock");
  const [form, setForm] = useState({
    productId: "",
    destinationLocationId: "",
    plannedQuantity: 1,
    orderItemId: null as string | null,
    priority: "media" as ServicePriority,
    plannedCompletionDate: null as string | null,
    technicalInstructions: null as string | null,
  });
  const canOperate = hasWireTrayPermission(
    access.role,
    "operate_production",
    access.financialAccess,
  );
  const mutation = useMutation({
    mutationFn: () =>
      create({ data: { ...form, responsibleUserId: null, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: (result) => {
      toast.success("Ordem de produção criada.");
      window.location.assign(`/leitos/producao/${result.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a OP."),
  });
  const selectedProduct = options.data?.products.find(
    (product: { id: string }) => product.id === form.productId,
  );
  useEffect(() => {
    if (!form.productId && options.data?.products[0]) {
      const product = options.data.products[0];
      setForm((current) => ({
        ...current,
        productId: product.id,
        destinationLocationId: product.defaultLocationId ?? options.data!.locations[0]?.id ?? "",
      }));
    }
  }, [form.productId, options.data]);
  if (!canOperate)
    return (
      <WireErrorState
        title="Acesso restrito"
        error={new Error("Seu perfil não permite planejar ordens de produção.")}
      />
    );
  if (options.isLoading) return <WireLoadingState label="Carregando opções de produção..." />;
  if (options.isError)
    return <WireErrorState error={options.error} onRetry={() => options.refetch()} />;
  function chooseShortage(value: string) {
    const row = options.data!.shortages.find((item: { id: string }) => item.id === value);
    if (!row) return setForm({ ...form, orderItemId: null });
    setForm({
      ...form,
      orderItemId: row.id,
      productId: row.product_id,
      plannedQuantity:
        Math.max(
          0,
          Number(row.production_required_quantity) - Number(row.produced_quantity ?? 0),
        ) || 1,
    });
  }
  const valid =
    form.productId &&
    form.destinationLocationId &&
    form.plannedQuantity > 0 &&
    (mode === "stock" || form.orderItemId);
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Planejamento fabril"
        title="Nova ordem de produção"
        description="Produza para estoque ou vincule a OP a uma falta real de pedido."
        backTo="/leitos/producao"
      />
      <WirePanel>
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-2">
          <button
            type="button"
            className={`rounded-xl px-3 py-3 text-sm font-bold ${mode === "stock" ? "bg-white text-orange-800 shadow-sm" : "text-slate-600"}`}
            onClick={() => {
              setMode("stock");
              setForm({ ...form, orderItemId: null });
            }}
          >
            Estoque Lemarc
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-3 text-sm font-bold ${mode === "order" ? "bg-white text-orange-800 shadow-sm" : "text-slate-600"}`}
            onClick={() => setMode("order")}
          >
            Falta de pedido
          </button>
        </div>
        <div className="wire-form-grid">
          {mode === "order" ? (
            <label className="wire-field wire-form-span-2">
              <span className="wire-label">Item com falta</span>
              <select
                className="wire-select"
                value={form.orderItemId ?? ""}
                onChange={(e) => chooseShortage(e.target.value)}
              >
                <option value="">Selecione</option>
                {options.data!.shortages.map(
                  (item: {
                    id: string;
                    product_name_snapshot: string;
                    production_required_quantity: number;
                    order:
                      | { number: number; client_name_snapshot: string }
                      | Array<{ number: number; client_name_snapshot: string }>;
                  }) => {
                    const order = Array.isArray(item.order) ? item.order[0] : item.order;
                    return (
                      <option value={item.id} key={item.id}>
                        Pedido #{order?.number} · {order?.client_name_snapshot} ·{" "}
                        {item.product_name_snapshot} (
                        {formatWireQuantity(Number(item.production_required_quantity))})
                      </option>
                    );
                  },
                )}
              </select>
            </label>
          ) : null}
          <label className="wire-field wire-form-span-2">
            <span className="wire-label">Produto</span>
            <select
              className="wire-select"
              disabled={mode === "order"}
              value={form.productId}
              onChange={(e) => {
                const product = options.data!.products.find(
                  (row: { id: string }) => row.id === e.target.value,
                );
                setForm({
                  ...form,
                  productId: e.target.value,
                  destinationLocationId: product?.defaultLocationId ?? form.destinationLocationId,
                });
              }}
            >
              {options.data!.products.map(
                (product: { id: string; sku: string | null; name: string }) => (
                  <option value={product.id} key={product.id}>
                    {product.sku ? `${product.sku} · ` : ""}
                    {product.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Quantidade planejada</span>
            <input
              className="wire-input"
              type="number"
              min="0.001"
              step="0.001"
              value={form.plannedQuantity}
              onChange={(e) => setForm({ ...form, plannedQuantity: Number(e.target.value) })}
            />
          </label>
          <label className="wire-field">
            <span className="wire-label">Destino da produção</span>
            <select
              className="wire-select"
              value={form.destinationLocationId}
              onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
            >
              <option value="">Selecione</option>
              {options.data!.locations.map(
                (location: { id: string; code: string; name: string }) => (
                  <option value={location.id} key={location.id}>
                    {location.code} · {location.name}
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
              {Object.entries(priorities).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Conclusão planejada</span>
            <input
              className="wire-input"
              type="date"
              value={form.plannedCompletionDate ?? ""}
              onChange={(e) => setForm({ ...form, plannedCompletionDate: e.target.value || null })}
            />
          </label>
          <label className="wire-field wire-form-span-2">
            <span className="wire-label">Instruções técnicas</span>
            <textarea
              className="wire-textarea min-h-32"
              value={form.technicalInstructions ?? ""}
              onChange={(e) => setForm({ ...form, technicalInstructions: e.target.value || null })}
              placeholder="Material, acabamento, desenho, ferramenta ou sequência operacional."
            />
          </label>
        </div>
        <div className="wire-form-footer">
          <Link to="/leitos/producao" className="wire-button-secondary">
            Cancelar
          </Link>
          <button
            type="button"
            className="wire-button-primary"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Factory size={16} /> {mutation.isPending ? "Criando..." : "Criar OP"}
          </button>
        </div>
      </WirePanel>
    </WirePage>
  );
}

type ProductionAction = {
  type: WireTrayProductionEntryType;
  label: string;
  icon: typeof Play;
  tone?: "primary" | "secondary" | "danger";
  needsQuantity?: boolean;
  needsNotes?: boolean;
};

export function WireTrayProductionDetailPage({ productionId }: { productionId: string }) {
  const access = useWireTrayAccess();
  const query = useWireTrayProductionDetailQuery(productionId);
  const record = useServerFn(recordWireTrayProductionEntry);
  const queryClient = useQueryClient();
  const [action, setAction] = useState<ProductionAction | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const canOperate = hasWireTrayPermission(
    access.role,
    "operate_production",
    access.financialAccess,
  );
  const mutation = useMutation({
    mutationFn: () =>
      record({
        data: {
          productionOrderId: productionId,
          type: action!.type,
          quantity,
          notes: notes || null,
          evidenceDocumentId: null,
          idempotencyKey: crypto.randomUUID(),
        },
      }),
    onSuccess: () => {
      toast.success("Apontamento registrado.");
      setAction(null);
      setQuantity(0);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Apontamento recusado."),
  });
  if (query.isLoading) return <WireLoadingState label="Consolidando ordem de produção..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data)
    return (
      <WireEmptyState
        title="Ordem de produção não encontrada"
        description="O registro não existe ou não está disponível."
      />
    );
  const { production, entries, documents, audit } = query.data;
  const progress = production.planned ? (production.produced / production.planned) * 100 : 0;
  const actions = canOperate
    ? availableActions(production.status, access.role, production.remaining)
    : [];
  function openAction(item: ProductionAction) {
    setAction(item);
    setQuantity(item.type === "progress" ? production.remaining : 0);
    setNotes("");
  }
  return (
    <WirePage>
      <WirePageHeader
        eyebrow={`Ordem de produção #${production.number}`}
        title={production.productName}
        description={`${wireTrayProductionOriginLabel[production.origin]} · destino ${production.locationName}`}
        backTo="/leitos/producao"
        action={
          <div className="flex flex-wrap gap-2">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.type}
                  className={
                    item.tone === "danger"
                      ? "wire-button-danger"
                      : item.tone === "primary"
                        ? "wire-button-primary"
                        : "wire-button-secondary"
                  }
                  onClick={() => openAction(item)}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <article className="wire-metric">
          <p className="wire-metric-label">Status</p>
          <div className="mt-3">
            <WireStatus tone={orderStatusTone(production.status)}>
              {wireTrayProductionStatusLabel[production.status]}
            </WireStatus>
          </div>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Planejado</p>
          <p className="wire-metric-value text-[1.35rem]">
            {formatWireQuantity(production.planned)}
          </p>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Produzido</p>
          <p className="wire-metric-value text-[1.35rem]">
            {formatWireQuantity(production.produced)}
          </p>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Perdas</p>
          <p className="wire-metric-value text-[1.35rem]">{formatWireQuantity(production.scrap)}</p>
        </article>
        <article className="wire-metric">
          <p className="wire-metric-label">Prazo</p>
          <p className="wire-metric-value text-[1.25rem]">
            {formatWireDate(production.plannedCompletionDate)}
          </p>
        </article>
      </div>
      <WirePanel title="Execução">
        <div className="p-4">
          <WireProgress
            value={progress}
            label={`${formatWireQuantity(production.produced)} de ${formatWireQuantity(production.planned)}`}
          />
          {production.pauseReason ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="shrink-0" size={18} />
              <span>
                <strong>Motivo da pausa:</strong> {production.pauseReason}
              </span>
            </div>
          ) : null}
        </div>
      </WirePanel>
      <div className="wire-detail-grid">
        <div className="grid content-start gap-4">
          <WirePanel title="Apontamentos" description="Histórico operacional persistido.">
            {entries.length ? (
              <div className="wire-timeline">
                {entries.map((entry) => (
                  <div className="wire-timeline-item" key={entry.id}>
                    <span className="wire-timeline-dot" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {entryLabel(entry.type)}
                        </p>
                        {entry.quantity > 0 ? (
                          <WireStatus tone={entry.type === "scrap" ? "danger" : "info"}>
                            {formatWireQuantity(entry.quantity)}
                          </WireStatus>
                        ) : null}
                      </div>
                      {entry.notes ? (
                        <p className="mt-1 text-sm leading-5 text-slate-600">{entry.notes}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        {formatWireDate(entry.createdAt, true)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem apontamentos"
                description="Inicie a produção para registrar a primeira ocorrência."
              />
            )}
          </WirePanel>
          <WirePanel title="Documentos de produção">
            <WireTrayDocuments
              entityType="production_order"
              entityId={production.id}
              documents={documents}
              defaultType="production_instruction"
            />
          </WirePanel>
        </div>
        <div className="grid content-start gap-4">
          <WirePanel title="Vínculos">
            <div className="wire-summary-list">
              <Summary label="Origem" value={wireTrayProductionOriginLabel[production.origin]} />
              <Summary
                label="Pedido"
                value={production.orderNumber ? `#${production.orderNumber}` : "Estoque Lemarc"}
              />
              <Summary
                label="Responsável"
                value={production.responsibleUserId ?? "Não atribuído"}
              />
              <Summary label="Prioridade" value={priorities[production.priority]} />
            </div>
            {production.orderId ? (
              <a
                href={`/leitos/pedidos/${production.orderId}`}
                className="wire-button-ghost mx-4 mb-4"
              >
                Abrir pedido <ArrowRight size={15} />
              </a>
            ) : null}
          </WirePanel>
          <WirePanel title="Auditoria">
            <p className="px-4 py-4 text-sm text-slate-600">
              {audit.length} evento(s) imutável(is) vinculado(s) à OP.
            </p>
          </WirePanel>
        </div>
      </div>
      {action ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/60 backdrop-blur-sm sm:place-items-center sm:p-5"
          onMouseDown={() => setAction(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-extrabold text-slate-950">{action.label}</h2>
            <p className="mt-1 text-sm text-slate-500">
              OP #{production.number} · {production.productName}
            </p>
            <div className="mt-5 grid gap-4">
              {action.needsQuantity ? (
                <label className="wire-field">
                  <span className="wire-label">Quantidade</span>
                  <input
                    className="wire-input"
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
              ) : null}
              {action.needsNotes || ["progress", "scrap"].includes(action.type) ? (
                <label className="wire-field">
                  <span className="wire-label">
                    {action.needsNotes ? "Motivo obrigatório" : "Observações"}
                  </span>
                  <textarea
                    className="wire-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                O servidor valida o estado atual da OP antes de registrar. Reenvios idênticos não
                duplicam o movimento.
              </div>
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
                className={action.tone === "danger" ? "wire-button-danger" : "wire-button-primary"}
                disabled={
                  mutation.isPending ||
                  (action.needsQuantity && quantity <= 0) ||
                  (action.needsNotes && notes.trim().length < 3)
                }
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Registrando..." : "Confirmar apontamento"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </WirePage>
  );
}

function availableActions(
  status: WireTrayProductionStatus,
  role: string,
  remaining: number,
): ProductionAction[] {
  if (status === "planned" || status === "released")
    return [
      { type: "start", label: "Iniciar", icon: Play, tone: "primary" },
      ...(role === "admin" || role === "gestor"
        ? [
            {
              type: "cancel" as const,
              label: "Cancelar",
              icon: Ban,
              tone: "danger" as const,
              needsNotes: true,
            },
          ]
        : []),
    ];
  if (status === "in_progress")
    return [
      {
        type: "progress",
        label: "Apontar produção",
        icon: Plus,
        tone: "primary",
        needsQuantity: true,
      },
      { type: "scrap", label: "Registrar perda", icon: Trash2, needsQuantity: true },
      { type: "pause", label: "Pausar", icon: CirclePause, needsNotes: true },
      ...(remaining === 0
        ? [
            {
              type: "complete" as const,
              label: "Concluir",
              icon: PackageCheck,
              tone: "primary" as const,
            },
          ]
        : []),
    ];
  if (status === "paused")
    return [
      { type: "resume", label: "Retomar", icon: RotateCcw, tone: "primary" },
      ...(role === "admin" || role === "gestor"
        ? [
            {
              type: "cancel" as const,
              label: "Cancelar",
              icon: Ban,
              tone: "danger" as const,
              needsNotes: true,
            },
          ]
        : []),
    ];
  if (status === "awaiting_check")
    return [{ type: "complete", label: "Concluir", icon: Check, tone: "primary" }];
  return [];
}
function entryLabel(type: WireTrayProductionEntryType) {
  return {
    start: "Produção iniciada",
    progress: "Avanço produzido",
    pause: "Produção pausada",
    resume: "Produção retomada",
    scrap: "Perda registrada",
    complete: "Produção concluída",
    cancel: "Produção cancelada",
  }[type];
}
function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="wire-summary-label">{label}</p>
      <p className="wire-summary-value">{value}</p>
    </div>
  );
}
