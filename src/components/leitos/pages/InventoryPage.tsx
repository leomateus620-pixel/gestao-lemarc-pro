import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, ArrowRight, Boxes, Factory, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "@/components/leitos/WireTrayAccessContext";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WirePage,
  WirePageHeader,
  WirePager,
  WirePanel,
  WireStatus,
  formatWireDate,
  formatWireQuantity,
  inventoryTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayInventoryQuery,
  useWireTrayLocationsQuery,
  useWireTrayProductQuery,
  useWireTrayProductsQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import {
  recordWireTrayMovement,
  triggerWireTrayReplenishment,
} from "@/lib/api/wireTrayInventory.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import {
  wireTrayUnitLabel,
  type WireTrayInventoryRow,
  type WireTrayMovementType,
} from "@/types/wireTray";

type InventoryHealth = "all" | "healthy" | "attention" | "low" | "empty";
type MovementInput = {
  productId: string;
  locationId: string;
  type: "stock_entry" | "stock_exit" | "transfer_out" | "return" | "loss" | "adjustment";
  quantity: number;
  reason: string;
  destinationLocationId: string | null;
};

export function WireTrayInventoryPage() {
  const access = useWireTrayAccess();
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<InventoryHealth>("all");
  const [page, setPage] = useState(1);
  const [movementProductId, setMovementProductId] = useState<string | null>(null);
  const query = useWireTrayInventoryQuery({ search, health, page, pageSize: 25 });
  const canAdjust = hasWireTrayPermission(access.role, "adjust_inventory", access.financialAccess);
  useEffect(() => setPage(1), [health, search]);
  const pageTotals = useMemo(
    () =>
      (query.data?.rows ?? []).reduce(
        (totals, row) => ({
          physical: totals.physical + row.physical,
          reserved: totals.reserved + row.reserved,
          available: totals.available + row.available,
          inProduction: totals.inProduction + row.inProduction,
        }),
        { physical: 0, reserved: 0, available: 0, inProduction: 0 },
      ),
    [query.data],
  );

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Saldo transacional"
        title="Estoque"
        description="Saldos físicos, reservas, disponibilidade e projeção sem cálculos sensíveis no cliente."
        action={
          canAdjust ? (
            <button
              type="button"
              className="wire-button-primary"
              onClick={() => setMovementProductId("")}
            >
              <ArrowDownToLine size={16} /> Registrar movimento
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(pageTotals).map(([key, value]) => (
          <article className="wire-metric" key={key}>
            <p className="wire-metric-label">
              {
                {
                  physical: "Físico nesta página",
                  reserved: "Reservado nesta página",
                  available: "Disponível nesta página",
                  inProduction: "Em produção nesta página",
                }[key as keyof typeof pageTotals]
              }
            </p>
            <p className="wire-metric-value text-[1.45rem]">{formatWireQuantity(value)}</p>
          </article>
        ))}
      </div>
      <WirePanel>
        <div className="wire-filterbar">
          <label className="wire-field">
            <span className="wire-label">Buscar produto</span>
            <span className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className="wire-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou SKU"
              />
            </span>
          </label>
          <label className="wire-field">
            <span className="wire-label">Saúde do estoque</span>
            <select
              className="wire-select"
              value={health}
              onChange={(e) => setHealth(e.target.value as InventoryHealth)}
            >
              <option value="all">Todos</option>
              <option value="healthy">Saudável</option>
              <option value="attention">No mínimo</option>
              <option value="low">Abaixo do mínimo</option>
              <option value="empty">Sem saldo físico</option>
            </select>
          </label>
          <div className="wire-field">
            <span className="wire-label">Livro-razão</span>
            <Link to="/leitos/movimentacoes" className="wire-button-secondary">
              Ver movimentações <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        {query.isLoading ? (
          <WireLoadingState label="Consolidando saldos..." />
        ) : query.isError ? (
          <WireErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length ? (
          <>
            <div className="wire-table-wrap hidden md:block">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Local padrão</th>
                    <th>Físico</th>
                    <th>Reservado</th>
                    <th>Disponível</th>
                    <th>Em produção</th>
                    <th>Projetado</th>
                    <th>Saúde</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((row) => (
                    <InventoryRow
                      row={row}
                      canAdjust={canAdjust}
                      onMove={() => setMovementProductId(row.product.id)}
                      key={row.product.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wire-mobile-list md:hidden">
              {query.data!.rows.map((row) => (
                <InventoryCard
                  row={row}
                  canAdjust={canAdjust}
                  onMove={() => setMovementProductId(row.product.id)}
                  key={row.product.id}
                />
              ))}
            </div>
            <WirePager page={page} pageSize={25} count={query.data!.count} onPage={setPage} />
          </>
        ) : (
          <WireEmptyState
            title="Nenhum saldo encontrado"
            description="Não há produto ativo compatível com os filtros informados."
          />
        )}
      </WirePanel>
      {movementProductId !== null ? (
        <MovementDialog
          initialProductId={movementProductId || undefined}
          onClose={() => setMovementProductId(null)}
        />
      ) : null}
    </WirePage>
  );
}

function InventoryRow({
  row,
  canAdjust,
  onMove,
}: {
  row: WireTrayInventoryRow;
  canAdjust: boolean;
  onMove: () => void;
}) {
  const unit = wireTrayUnitLabel[row.product.unit];
  return (
    <tr>
      <td>
        <a href={`/leitos/estoque/${row.product.id}`} className="wire-table-link">
          {row.product.name}
        </a>
        <p className="mt-1 text-xs text-slate-500">{row.product.sku ?? "Sem SKU"}</p>
      </td>
      <td>{row.location?.name ?? "Não definido"}</td>
      <td>{formatWireQuantity(row.physical, unit)}</td>
      <td>{formatWireQuantity(row.reserved, unit)}</td>
      <td className="font-bold text-slate-950">{formatWireQuantity(row.available, unit)}</td>
      <td>{formatWireQuantity(row.inProduction, unit)}</td>
      <td>{formatWireQuantity(row.projected, unit)}</td>
      <td>
        <WireStatus tone={inventoryTone(row.available, row.product.minimumStock)}>
          {healthLabel(row)}
        </WireStatus>
      </td>
      <td>
        {canAdjust ? (
          <button type="button" className="wire-button-ghost min-h-9 px-2" onClick={onMove}>
            Movimentar
          </button>
        ) : null}
      </td>
    </tr>
  );
}
function InventoryCard({
  row,
  canAdjust,
  onMove,
}: {
  row: WireTrayInventoryRow;
  canAdjust: boolean;
  onMove: () => void;
}) {
  const unit = wireTrayUnitLabel[row.product.unit];
  return (
    <article className="wire-mobile-card">
      <a
        href={`/leitos/estoque/${row.product.id}`}
        className="flex items-start justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="font-bold text-slate-950">{row.product.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {row.product.sku ?? "Sem SKU"} · {row.location?.name ?? "Sem local padrão"}
          </p>
        </div>
        <WireStatus tone={inventoryTone(row.available, row.product.minimumStock)}>
          {healthLabel(row)}
        </WireStatus>
      </a>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <StockValue label="Físico" value={formatWireQuantity(row.physical, unit)} />
        <StockValue label="Reservado" value={formatWireQuantity(row.reserved, unit)} />
        <StockValue label="Disponível" value={formatWireQuantity(row.available, unit)} />
      </div>
      {canAdjust ? (
        <button type="button" className="wire-button-secondary" onClick={onMove}>
          Registrar movimento
        </button>
      ) : null}
    </article>
  );
}

export function WireTrayInventoryDetailPage({ productId }: { productId: string }) {
  const access = useWireTrayAccess();
  const query = useWireTrayProductQuery(productId);
  const [movementOpen, setMovementOpen] = useState(false);
  const canAdjust = hasWireTrayPermission(access.role, "adjust_inventory", access.financialAccess);
  const trigger = useServerFn(triggerWireTrayReplenishment);
  const queryClient = useQueryClient();
  const replenishment = useMutation({
    mutationFn: () => trigger({ data: { productId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
      if (result.productionId) toast.success("Ordem de reposição criada.");
      else toast.info("O estoque projetado não exige nova reposição.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível avaliar a reposição."),
  });
  if (query.isLoading) return <WireLoadingState label="Carregando posição de estoque..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data)
    return (
      <WireEmptyState
        title="Produto não encontrado"
        description="Não existe posição de estoque disponível para este produto."
      />
    );
  const { product, inventory, balances, movements, production } = query.data;
  const unit = wireTrayUnitLabel[product.unit];
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Posição consolidada"
        title={product.name}
        description={`${product.sku ?? "Sem SKU"} · atualizado em ${formatWireDate(inventory.updatedAt, true)}`}
        backTo="/leitos/estoque"
        action={
          <>
            {canAdjust ? (
              <button
                type="button"
                className="wire-button-secondary"
                onClick={() => setMovementOpen(true)}
              >
                <ArrowDownToLine size={16} /> Movimentar
              </button>
            ) : null}
            {canAdjust && product.automaticReplenishment ? (
              <button
                type="button"
                disabled={replenishment.isPending}
                className="wire-button-primary"
                onClick={() => replenishment.mutate()}
              >
                <RefreshCcw size={16} /> Avaliar reposição
              </button>
            ) : null}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Físico", inventory.physical],
          ["Reservado", inventory.reserved],
          ["Disponível", inventory.available],
          ["Em produção", inventory.inProduction],
          ["Projetado", inventory.projected],
        ].map(([label, value]) => (
          <article className="wire-metric" key={String(label)}>
            <p className="wire-metric-label">{label}</p>
            <p className="wire-metric-value text-[1.35rem]">
              {formatWireQuantity(Number(value), unit)}
            </p>
            {label === "Disponível" ? (
              <WireStatus tone={inventoryTone(Number(value), product.minimumStock)}>
                {healthLabel(inventory)}
              </WireStatus>
            ) : null}
          </article>
        ))}
      </div>
      <div className="wire-detail-grid">
        <div className="grid content-start gap-4">
          <WirePanel
            title="Saldos por local"
            description="Posição materializada por endereço de estoque."
          >
            {balances.length ? (
              <div className="wire-table-wrap">
                <table className="wire-table">
                  <thead>
                    <tr>
                      <th>Local</th>
                      <th>Físico</th>
                      <th>Reservado</th>
                      <th>Disponível</th>
                      <th>Atualização</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((row) => (
                      <tr key={String(row.id ?? row.balance_id)}>
                        <td>{row.location_id}</td>
                        <td>{formatWireQuantity(Number(row.physical_quantity), unit)}</td>
                        <td>{formatWireQuantity(Number(row.reserved_quantity), unit)}</td>
                        <td className="font-bold">
                          {formatWireQuantity(Number(row.available_quantity), unit)}
                        </td>
                        <td>{formatWireDate(row.updated_at, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <WireEmptyState
                title="Sem saldo materializado"
                description="O primeiro movimento criará a posição do produto no local escolhido."
              />
            )}
          </WirePanel>
          <WirePanel title="Movimentações recentes">
            {movements.length ? (
              <div className="divide-y divide-slate-100">
                {movements.map((movement) => (
                  <div className="flex items-center gap-3 px-4 py-3" key={movement.id}>
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${movement.physicalDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                    >
                      <Boxes size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{movement.reason}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.locationName} · {formatWireDate(movement.createdAt, true)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {movement.physicalDelta > 0 ? "+" : ""}
                      {formatWireQuantity(movement.physicalDelta, unit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem movimentações"
                description="Nenhum lançamento foi registrado para este produto."
              />
            )}
          </WirePanel>
        </div>
        <WirePanel
          title="Produção prevista"
          description="Entradas futuras consideradas na projeção."
        >
          {production.length ? (
            <div className="divide-y divide-slate-100">
              {production.map((op) => (
                <a
                  href={`/leitos/producao/${op.id}`}
                  key={op.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <Factory size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">OP #{op.number}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatWireQuantity(op.remaining, unit)} restante(s)
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-slate-400" />
                </a>
              ))}
            </div>
          ) : (
            <WireEmptyState
              title="Sem entrada prevista"
              description="Não existem ordens de produção abertas para este produto."
            />
          )}
        </WirePanel>
      </div>
      {movementOpen ? (
        <MovementDialog initialProductId={productId} onClose={() => setMovementOpen(false)} />
      ) : null}
    </WirePage>
  );
}

function MovementDialog({
  initialProductId,
  onClose,
}: {
  initialProductId?: string;
  onClose: () => void;
}) {
  const products = useWireTrayProductsQuery({ search: "", active: true, page: 1, pageSize: 100 });
  const locations = useWireTrayLocationsQuery();
  const queryClient = useQueryClient();
  const record = useServerFn(recordWireTrayMovement);
  const [form, setForm] = useState<MovementInput>({
    productId: initialProductId ?? "",
    locationId: "",
    type: "stock_entry",
    quantity: 1,
    reason: "",
    destinationLocationId: null,
  });
  useEffect(() => {
    if (!form.locationId && locations.data?.length)
      setForm((current) => ({
        ...current,
        locationId: locations.data!.find((item) => item.active)?.id ?? "",
      }));
  }, [form.locationId, locations.data]);
  const mutation = useMutation({
    mutationFn: () =>
      record({ data: { ...form, evidenceDocumentId: null, idempotencyKey: crypto.randomUUID() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
      toast.success("Movimentação registrada no livro de estoque.");
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Movimentação recusada."),
  });
  const selectedProduct = products.data?.rows.find((item) => item.id === form.productId);
  const requiresDestination = form.type === "transfer_out";
  const valid =
    form.productId &&
    form.locationId &&
    form.reason.trim().length >= 3 &&
    form.quantity !== 0 &&
    (!requiresDestination || Boolean(form.destinationLocationId));
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <p className="wire-eyebrow">Movimento crítico</p>
            <h2
              className="mt-1 font-display text-xl font-extrabold text-slate-950"
              id="movement-title"
            >
              Registrar estoque
            </h2>
          </div>
          <button type="button" className="wire-icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="grid max-h-[70dvh] gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          <label className="wire-field wire-form-span-2">
            <span className="wire-label">Produto</span>
            <select
              className="wire-select"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Selecione</option>
              {products.data?.rows.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku ? `${product.sku} · ` : ""}
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Tipo</span>
            <select
              className="wire-select"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as MovementInput["type"] })}
            >
              <option value="stock_entry">Entrada</option>
              <option value="stock_exit">Saída</option>
              <option value="transfer_out">Transferência</option>
              <option value="return">Retorno</option>
              <option value="loss">Perda ou avaria</option>
              <option value="adjustment">Ajuste de inventário</option>
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">
              Quantidade {selectedProduct ? `(${wireTrayUnitLabel[selectedProduct.unit]})` : ""}
            </span>
            <input
              className="wire-input"
              type="number"
              step="0.001"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </label>
          <label className="wire-field">
            <span className="wire-label">Local de origem</span>
            <select
              className="wire-select"
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">Selecione</option>
              {locations.data
                ?.filter((item) => item.active)
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
            </select>
          </label>
          {requiresDestination ? (
            <label className="wire-field">
              <span className="wire-label">Local de destino</span>
              <select
                className="wire-select"
                value={form.destinationLocationId ?? ""}
                onChange={(e) =>
                  setForm({ ...form, destinationLocationId: e.target.value || null })
                }
              >
                <option value="">Selecione</option>
                {locations.data
                  ?.filter((item) => item.active && item.id !== form.locationId)
                  .map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <label className="wire-field wire-form-span-2">
            <span className="wire-label">Motivo obrigatório</span>
            <textarea
              className="wire-textarea"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Informe o documento, ocorrência ou justificativa operacional."
            />
            <span className="wire-help">
              A operação é atômica, idempotente e deixa trilha de auditoria.
            </span>
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button type="button" className="wire-button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="wire-button-primary"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Registrando..." : "Confirmar movimento"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function healthLabel(row: Pick<WireTrayInventoryRow, "available" | "physical" | "product">) {
  if (row.physical === 0) return "Sem saldo";
  if (row.available < row.product.minimumStock) return "Abaixo do mínimo";
  if (row.available === row.product.minimumStock) return "No mínimo";
  return "Saudável";
}
function StockValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-900">{value}</p>
    </div>
  );
}
