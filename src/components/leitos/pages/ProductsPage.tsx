import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Boxes,
  Edit3,
  PackagePlus,
  Plus,
  Save,
  Search,
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
  WireRestrictedState,
  WireStatus,
  formatWireDate,
  formatWireQuantity,
  inventoryTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayProductQuery,
  useWireTrayProductsQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import { saveWireTrayProduct } from "@/lib/api/wireTrayProducts.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import { wireTrayErrorDescription } from "@/lib/wireTrays/errors";
import { wireTrayProductInputSchema, type WireTrayProductInput } from "@/lib/wireTrays/schemas";
import {
  wireTrayCategoryLabel,
  wireTrayUnitLabel,
  type WireTrayCategory,
  type WireTrayProduct,
  type WireTrayUnit,
} from "@/types/wireTray";

const categories = Object.entries(wireTrayCategoryLabel) as Array<[WireTrayCategory, string]>;

export function WireTrayProductsPage() {
  const access = useWireTrayAccess();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const filters = {
    search,
    category: category || undefined,
    active: active === "all" ? undefined : active === "active",
    page,
    pageSize: 25,
  };
  const query = useWireTrayProductsQuery(filters);
  const canManage = hasWireTrayPermission(access.role, "manage_products", access.financialAccess);
  useEffect(() => setPage(1), [search, category, active]);

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Dados mestres"
        title="Produtos"
        description="Catálogo técnico, parâmetros de estoque e regras de reposição usados em toda a operação."
        action={
          canManage ? (
            <Link to="/leitos/produtos/novo" className="wire-button-primary">
              <Plus size={16} /> Novo produto
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className="wire-input pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou material"
              />
            </span>
          </label>
          <label className="wire-field">
            <span className="wire-label">Categoria</span>
            <select
              className="wire-select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="wire-field">
            <span className="wire-label">Situação</span>
            <select
              className="wire-select"
              value={active}
              onChange={(event) => setActive(event.target.value as typeof active)}
            >
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
        {query.isLoading ? (
          <WireLoadingState label="Consultando o catálogo..." />
        ) : query.isError ? (
          <WireErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length ? (
          <>
            <div className="wire-product-toolbar">
              <div className="wire-product-chips">
                <span className="wire-product-chip">
                  <strong>{query.data!.count}</strong> no filtro
                </span>
                <span className="wire-product-chip">
                  <strong>{query.data!.rows.filter((row) => row.active).length}</strong> ativos
                  listados
                </span>
                <span className="wire-product-chip">
                  <strong>
                    {query.data!.rows.filter((row) => row.automaticReplenishment).length}
                  </strong>{" "}
                  com reposição automática
                </span>
              </div>
              {filtersDirty ? (
                <button
                  type="button"
                  className="wire-button-ghost"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setActive("active");
                  }}
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
            <div className="wire-product-head" aria-hidden="true">
              <span>Produto</span>
              <span>Dimensões</span>
              <span>Estoque mínimo</span>
              <span>Situação</span>
              <span />
            </div>
            <div className="wire-product-list">
              {query.data!.rows.map((product) => (
                <ProductListRow key={product.id} product={product} />
              ))}
            </div>
            <WirePager page={page} pageSize={25} count={query.data!.count} onPage={setPage} />
          </>
        ) : (
          <WireEmptyState
            title="Nenhum produto encontrado"
            description="Ajuste os filtros ou cadastre o primeiro produto técnico do módulo."
            action={
              canManage ? (
                <Link to="/leitos/produtos/novo" className="wire-button-secondary">
                  <PackagePlus size={16} /> Cadastrar produto
                </Link>
              ) : undefined
            }
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

function ProductListRow({ product }: { product: WireTrayProduct }) {
  return (
    <Link to={`/leitos/produtos/${product.id}` as never} className="wire-product-row">
      <div className="min-w-0">
        <p className="wire-product-name truncate">{product.name}</p>
        <p className="wire-product-meta">{wireTrayCategoryLabel[product.category]}</p>
      </div>
      <div className="wire-product-facts">
        <dl className="wire-product-metric">
          <dt>Dimensões</dt>
          <dd>{dimensions(product)}</dd>
        </dl>
        <dl className="wire-product-metric">
          <dt>Estoque mínimo</dt>
          <dd>{formatWireQuantity(product.minimumStock, wireTrayUnitLabel[product.unit])}</dd>
        </dl>
        <div className="wire-product-badges">
          <WireStatus tone={product.active ? "success" : "neutral"}>
            {product.active ? "Ativo" : "Inativo"}
          </WireStatus>
          <WireStatus tone={product.automaticReplenishment ? "info" : "neutral"}>
            {product.automaticReplenishment ? "Reposição automática" : "Reposição manual"}
          </WireStatus>
        </div>
      </div>
      <ArrowRight size={16} className="wire-product-chevron" />
    </Link>
  );
}

export function WireTrayProductFormPage({ productId }: { productId?: string }) {
  const navigate = useNavigate();
  const access = useWireTrayAccess();
  const canManage = hasWireTrayPermission(access.role, "manage_products", access.financialAccess);
  const productQuery = useWireTrayProductQuery(productId ?? "");
  const queryClient = useQueryClient();
  const save = useServerFn(saveWireTrayProduct);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<WireTrayProductInput>(() => emptyProduct(productId));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!productQuery.data?.product) return;
    const product = productQuery.data.product;
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      unit: product.unit,
      active: product.active,
      shortDescription: product.shortDescription,
      widthMm: product.widthMm,
      heightMm: product.heightMm,
      lengthMm: product.lengthMm,
      material: product.material,
      finish: product.finish,
      technicalNotes: product.technicalNotes,
      defaultLocationId: product.defaultLocationId,
      minimumStock: product.minimumStock,
      targetStock: product.targetStock,
      minimumProductionBatch: product.minimumProductionBatch,
      automaticReplenishment: product.automaticReplenishment,
      replenishmentNotes: product.replenishmentNotes,
    });
    setDirty(false);
  }, [productQuery.data]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const mutation = useMutation({
    mutationFn: () => save({ data: wireTrayProductInputSchema.parse(form) }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.productLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.product(saved.id) });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.inventoryLists });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.orderOptions });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.productionOptions });
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.dashboard });
      toast.success(
        productId ? "Produto atualizado com segurança." : "Produto cadastrado com segurança.",
      );
      setDirty(false);
      navigate({ to: "/leitos/produtos/$productId", params: { productId: saved.id } });
    },
    onError: (error) =>
      toast.error(wireTrayErrorDescription(error, "Não foi possível salvar o produto.")),
  });

  if (!canManage)
    return (
      <WireRestrictedState description="Seu perfil pode consultar produtos, mas não alterar o cadastro técnico." />
    );
  if (productId && productQuery.isLoading)
    return <WireLoadingState label="Carregando produto..." variant="form" />;
  if (productId && productQuery.isError)
    return <WireErrorState error={productQuery.error} onRetry={() => productQuery.refetch()} />;
  if (productId && productQuery.data === null)
    return (
      <WireEmptyState
        title="Produto não encontrado"
        description="O cadastro pode ter sido removido ou não está disponível para sua sessão."
      />
    );

  function set<K extends keyof WireTrayProductInput>(key: K, value: WireTrayProductInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function submit() {
    const result = wireTrayProductInputSchema.safeParse(form);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      const firstKey = Object.keys(next)[0];
      if (firstKey) {
        const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.error("Revise os campos destacados antes de salvar.");
      return;
    }
    mutation.mutate();
  }

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Cadastro industrial"
        title={productId ? "Editar produto" : "Novo produto"}
        description="Atributos técnicos e parâmetros que alimentam pedidos, estoque e produção."
        backTo={productId ? `/leitos/produtos/${productId}` : "/leitos/produtos"}
        action={
          productId ? (
            <WireStatus tone={form.active ? "success" : "neutral"}>
              {form.active ? "Ativo" : "Inativo"}
            </WireStatus>
          ) : undefined
        }
      />
      <form
        className="mx-auto grid w-full max-w-4xl gap-5 pb-28 sm:pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormSection
          title="Identificação"
          description="Como o produto aparece no catálogo e nos pedidos."
        >
          <div className="wire-form-grid">
            <Field label="Nome do produto" error={errors.name} span required>
              <input
                data-field="name"
                className="wire-input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex.: Leito aramado 100 × 50 mm"
                autoFocus
                maxLength={180}
              />
            </Field>
            <Field label="Categoria" error={errors.category} required>
              <select
                data-field="category"
                className="wire-select"
                value={form.category}
                onChange={(e) => set("category", e.target.value as WireTrayCategory)}
              >
                {categories.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Situação">
              <select
                className="wire-select"
                value={form.active ? "active" : "inactive"}
                onChange={(e) => set("active", e.target.value === "active")}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </Field>
            <Field label="Descrição curta" span>
              <textarea
                className="wire-textarea"
                value={form.shortDescription ?? ""}
                onChange={(e) => set("shortDescription", e.target.value || null)}
                placeholder="Descrição objetiva para consulta operacional."
                maxLength={500}
                rows={3}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Especificações físicas"
          description="Dimensões e acabamento usados em fabricação."
        >
          <div className="wire-form-grid">
            <NumberField
              label="Largura (mm)"
              value={form.widthMm}
              onChange={(v) => set("widthMm", v)}
              error={errors.widthMm}
              fieldKey="widthMm"
            />
            <NumberField
              label="Altura (mm)"
              value={form.heightMm}
              onChange={(v) => set("heightMm", v)}
              error={errors.heightMm}
              fieldKey="heightMm"
            />
            <NumberField
              label="Comprimento (mm)"
              value={form.lengthMm}
              onChange={(v) => set("lengthMm", v)}
              error={errors.lengthMm}
              fieldKey="lengthMm"
            />
            <Field label="Material">
              <input
                className="wire-input"
                value={form.material ?? ""}
                onChange={(e) => set("material", e.target.value || null)}
                placeholder="Aço carbono, inox..."
                maxLength={120}
              />
            </Field>
            <Field label="Acabamento" span>
              <input
                className="wire-input"
                value={form.finish ?? ""}
                onChange={(e) => set("finish", e.target.value || null)}
                placeholder="Galvanizado, pintura..."
                maxLength={120}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Estoque e produção"
          description="Parâmetros que orientam reposição e ordens de produção."
        >
          <div className="wire-form-grid">
            <NumberField
              label="Estoque mínimo"
              value={form.minimumStock}
              onChange={(v) => set("minimumStock", (v ?? null) as unknown as number)}
              error={errors.minimumStock}
              required
              fieldKey="minimumStock"
            />
            <NumberField
              label="Lote mínimo de produção"
              value={form.minimumProductionBatch}
              onChange={(v) => set("minimumProductionBatch", (v ?? null) as unknown as number)}
              error={errors.minimumProductionBatch}
              required
              fieldKey="minimumProductionBatch"
            />
            <Field label="Reposição automática" span>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.automaticReplenishment}
                  onChange={(e) => set("automaticReplenishment", e.target.checked)}
                  className="size-4 accent-orange-600"
                />
                Criar ordem de produção quando o projetado atingir o mínimo
              </label>
            </Field>
          </div>
        </FormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-2xl sm:border sm:px-6">
          <button
            type="button"
            className="wire-button-secondary"
            disabled={mutation.isPending}
            onClick={() =>
              navigate({
                to: productId ? `/leitos/produtos/${productId}` : "/leitos/produtos",
              } as never)
            }
          >
            Cancelar
          </button>
          <button type="submit" className="wire-button-primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              "Salvando..."
            ) : (
              <>
                <Save size={16} />
                {productId ? "Salvar alterações" : "Cadastrar produto"}
              </>
            )}
          </button>
        </div>
      </form>
    </WirePage>
  );
}

export function WireTrayProductDetailPage({ productId }: { productId: string }) {
  const query = useWireTrayProductQuery(productId);
  const access = useWireTrayAccess();
  const canManage = hasWireTrayPermission(access.role, "manage_products", access.financialAccess);
  if (query.isLoading)
    return <WireLoadingState label="Consolidando produto e estoque..." variant="detail" />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data)
    return (
      <WireEmptyState
        title="Produto não encontrado"
        description="O cadastro não existe ou não está disponível para sua sessão."
      />
    );
  const { product, inventory, openOrders, production, movements, documents, audit } = query.data;
  return (
    <WirePage>
      <WirePageHeader
        eyebrow={product.sku ?? "Sem SKU"}
        title={product.name}
        description={`${wireTrayCategoryLabel[product.category]} · ${dimensions(product)} · atualizado em ${formatWireDate(product.updatedAt, true)}`}
        backTo="/leitos/produtos"
        action={
          canManage ? (
            <Link
              to="/leitos/produtos/$productId/editar"
              params={{ productId }}
              className="wire-button-secondary"
            >
              <Edit3 size={16} /> Editar
            </Link>
          ) : undefined
        }
      />
      <div className="wire-metric-grid">
        <WireInventoryMetric
          label="Físico"
          value={inventory.physical}
          unit={product.unit}
          minimum={product.minimumStock}
        />
        <WireInventoryMetric
          label="Reservado"
          value={inventory.reserved}
          unit={product.unit}
          minimum={0}
        />
        <WireInventoryMetric
          label="Disponível"
          value={inventory.available}
          unit={product.unit}
          minimum={product.minimumStock}
        />
        <WireInventoryMetric
          label="Em produção"
          value={inventory.inProduction}
          unit={product.unit}
          minimum={0}
        />
        <WireInventoryMetric
          label="Projetado"
          value={inventory.projected}
          unit={product.unit}
          minimum={product.minimumStock}
        />
        <WireInventoryMetric
          label="Mínimo"
          value={product.minimumStock}
          unit={product.unit}
          minimum={0}
        />
      </div>
      <div className="wire-detail-grid">
        <div className="grid gap-4">
          <WirePanel title="Especificação técnica">
            <div className="wire-summary-list">
              <Summary label="Categoria" value={wireTrayCategoryLabel[product.category]} />
              <Summary label="Unidade" value={wireTrayUnitLabel[product.unit]} />
              <Summary label="Dimensões" value={dimensions(product)} />
              <Summary label="Material" value={product.material ?? "Não informado"} />
              <Summary label="Acabamento" value={product.finish ?? "Não informado"} />
              <Summary label="Local padrão" value={inventory.location?.name ?? "Não definido"} />
            </div>
            {product.technicalNotes ? (
              <p className="border-t border-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">
                {product.technicalNotes}
              </p>
            ) : null}
          </WirePanel>
          <WirePanel title="Demanda aberta" description="Pedidos e produção vinculados ao produto.">
            {openOrders.length || production.length ? (
              <div className="divide-y divide-slate-100">
                {openOrders.map((order) => (
                  <Link
                    to={`/leitos/pedidos/${order.id}` as never}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    key={order.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Pedido #{order.number} · {order.clientName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {order.itemCount} item(ns) · {formatWireDate(order.expectedDeliveryDate)}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                  </Link>
                ))}
                {production.map((op) => (
                  <Link
                    to={`/leitos/producao/${op.id}` as never}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    key={op.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">OP #{op.number}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatWireQuantity(op.remaining)} restante(s)
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-slate-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem demanda aberta"
                description="Não há pedidos ou ordens de produção ativos para este produto."
              />
            )}
          </WirePanel>
          <WirePanel
            title="Documentos técnicos"
            description="Arquivos privados com acesso definido por função."
          >
            <WireTrayDocuments
              entityType="product"
              entityId={product.id}
              documents={documents}
              defaultType="technical_drawing"
            />
          </WirePanel>
        </div>
        <div className="grid content-start gap-4">
          <WirePanel title="Política de reposição">
            <div className="wire-summary-list">
              <Summary
                label="Modo"
                value={product.automaticReplenishment ? "Automático" : "Manual"}
              />
              <Summary
                label="Estoque-alvo"
                value={
                  product.targetStock === null
                    ? "Não definido"
                    : formatWireQuantity(product.targetStock, wireTrayUnitLabel[product.unit])
                }
              />
              <Summary
                label="Lote mínimo"
                value={formatWireQuantity(
                  product.minimumProductionBatch,
                  wireTrayUnitLabel[product.unit],
                )}
              />
              <Summary label="Situação" value={product.active ? "Ativo" : "Inativo"} />
            </div>
          </WirePanel>
          <WirePanel title="Últimos movimentos">
            {movements.length ? (
              <div className="divide-y divide-slate-100">
                {movements.slice(0, 8).map((movement) => (
                  <div className="px-4 py-3" key={movement.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{movement.reason}</p>
                      <WireStatus tone={movement.physicalDelta < 0 ? "warning" : "success"}>
                        {movement.physicalDelta > 0 ? "+" : ""}
                        {formatWireQuantity(movement.physicalDelta)}
                      </WireStatus>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {movement.locationName} · {formatWireDate(movement.createdAt, true)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <WireEmptyState
                title="Sem movimentos"
                description="O livro de estoque ainda não possui lançamentos para este produto."
              />
            )}
          </WirePanel>
          <WirePanel title="Auditoria">
            <p className="px-4 py-4 text-sm text-slate-600">
              {audit.length} evento(s) imutável(is) vinculado(s) ao cadastro.
            </p>
          </WirePanel>
        </div>
      </div>
    </WirePage>
  );
}

function emptyProduct(id?: string): WireTrayProductInput {
  return {
    id,
    sku: null,
    name: "",
    category: "straight_tray",
    unit: "piece",
    active: true,
    shortDescription: null,
    widthMm: null,
    heightMm: null,
    lengthMm: null,
    material: null,
    finish: null,
    technicalNotes: null,
    defaultLocationId: null,
    minimumStock: null as unknown as number,
    targetStock: null,
    minimumProductionBatch: null as unknown as number,
    automaticReplenishment: false,
    replenishmentNotes: null,
  };
}
function dimensions(product: Pick<WireTrayProductInput, "widthMm" | "heightMm" | "lengthMm">) {
  const values = [product.widthMm, product.heightMm, product.lengthMm];
  return values.every((value) => value === null || value === undefined)
    ? "Dimensões não informadas"
    : values.map((value) => value ?? "—").join(" × ") + " mm";
}
function Field({
  label,
  error,
  span,
  required,
  children,
}: {
  label: string;
  error?: string;
  span?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`wire-field ${span ? "wire-form-span-2" : ""}`}>
      <span className="wire-label">
        {label}
        {required ? <span className="ml-1 text-orange-600">*</span> : null}
      </span>
      {children}
      {error ? <span className="wire-field-error">{error}</span> : null}
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  error,
  required,
  fieldKey,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  error?: string;
  required?: boolean;
  fieldKey?: string;
}) {
  const [draft, setDraft] = useState<string>(value == null ? "" : String(value));
  const externalRef = useRef(value);
  useEffect(() => {
    if (value !== externalRef.current) {
      externalRef.current = value;
      setDraft(value == null ? "" : String(value));
    }
  }, [value]);
  return (
    <Field label={label} error={error} required={required}>
      <input
        data-field={fieldKey}
        className="wire-input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw !== "" && !/^\d*[.,]?\d*$/.test(raw)) return;
          setDraft(raw);
          if (raw === "" || raw === "." || raw === ",") {
            onChange(null);
            return;
          }
          const parsed = Number(raw.replace(",", "."));
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        onBlur={() => {
          if (draft === "" || draft === "." || draft === ",") return;
          const parsed = Number(draft.replace(",", "."));
          if (Number.isNaN(parsed)) {
            setDraft("");
            onChange(null);
          } else {
            setDraft(String(parsed));
          }
        }}
      />
    </Field>
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
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
        <h2 className="font-display text-base font-extrabold uppercase tracking-wide text-slate-950 sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
function WireInventoryMetric({
  label,
  value,
  unit,
  minimum,
}: {
  label: string;
  value: number;
  unit: WireTrayUnit;
  minimum: number;
}) {
  return (
    <article className="wire-metric">
      <div className="flex items-start justify-between gap-2">
        <p className="wire-metric-label">{label}</p>
        <Boxes size={16} className="text-slate-500" />
      </div>
      <p className="wire-metric-value text-[1.35rem]">
        {formatWireQuantity(value, wireTrayUnitLabel[unit])}
      </p>
      <WireStatus tone={inventoryTone(value, minimum)}>
        {minimum > 0 && value <= minimum ? "Atenção" : "Atual"}
      </WireStatus>
    </article>
  );
}
