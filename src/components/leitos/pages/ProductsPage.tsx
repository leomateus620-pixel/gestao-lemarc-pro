import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Boxes,
  Check,
  Edit3,
  PackagePlus,
  Plus,
  Save,
  Search,
  ShieldCheck,
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
  WireStatus,
  formatWireDate,
  formatWireQuantity,
  inventoryTone,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayLocationsQuery,
  useWireTrayProductQuery,
  useWireTrayProductsQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import { saveWireTrayProduct } from "@/lib/api/wireTrayProducts.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import { wireTrayProductInputSchema, type WireTrayProductInput } from "@/lib/wireTrays/schemas";
import {
  wireTrayCategoryLabel,
  wireTrayUnitLabel,
  type WireTrayCategory,
  type WireTrayProduct,
  type WireTrayUnit,
} from "@/types/wireTray";

const categories = Object.entries(wireTrayCategoryLabel) as Array<[WireTrayCategory, string]>;
const units = Object.entries(wireTrayUnitLabel) as Array<[WireTrayUnit, string]>;

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
                placeholder="Nome, SKU ou material"
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
            <div className="wire-table-wrap hidden md:block">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Dimensões</th>
                    <th>Unidade</th>
                    <th>Estoque mínimo</th>
                    <th>Reposição</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((product) => (
                    <ProductRow key={product.id} product={product} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wire-mobile-list md:hidden">
              {query.data!.rows.map((product) => (
                <ProductCard key={product.id} product={product} />
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

function ProductRow({ product }: { product: WireTrayProduct }) {
  return (
    <tr>
      <td>
        <a href={`/leitos/produtos/${product.id}`} className="wire-table-link">
          {product.name}
        </a>
        <p className="mt-1 text-xs text-slate-500">{product.sku ?? "Sem SKU"}</p>
      </td>
      <td>{wireTrayCategoryLabel[product.category]}</td>
      <td>{dimensions(product)}</td>
      <td>{wireTrayUnitLabel[product.unit]}</td>
      <td>{formatWireQuantity(product.minimumStock, wireTrayUnitLabel[product.unit])}</td>
      <td>
        <WireStatus tone={product.automaticReplenishment ? "info" : "neutral"}>
          {product.automaticReplenishment ? "Automática" : "Manual"}
        </WireStatus>
      </td>
      <td>
        <WireStatus tone={product.active ? "success" : "neutral"}>
          {product.active ? "Ativo" : "Inativo"}
        </WireStatus>
      </td>
    </tr>
  );
}

function ProductCard({ product }: { product: WireTrayProduct }) {
  return (
    <a href={`/leitos/produtos/${product.id}`} className="wire-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-950">{product.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {product.sku ?? "Sem SKU"} · {wireTrayCategoryLabel[product.category]}
          </p>
        </div>
        <WireStatus tone={product.active ? "success" : "neutral"}>
          {product.active ? "Ativo" : "Inativo"}
        </WireStatus>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{dimensions(product)}</span>
        <span>
          Mín. {formatWireQuantity(product.minimumStock, wireTrayUnitLabel[product.unit])}
        </span>
      </div>
    </a>
  );
}

export function WireTrayProductFormPage({ productId }: { productId?: string }) {
  const access = useWireTrayAccess();
  const canManage = hasWireTrayPermission(access.role, "manage_products", access.financialAccess);
  const productQuery = useWireTrayProductQuery(productId ?? "");
  const locations = useWireTrayLocationsQuery();
  const queryClient = useQueryClient();
  const save = useServerFn(saveWireTrayProduct);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<WireTrayProductInput>(() => emptyProduct(productId));

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
  }, [productQuery.data]);

  const mutation = useMutation({
    mutationFn: () => save({ data: wireTrayProductInputSchema.parse(form) }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.all });
      toast.success(
        productId ? "Produto atualizado com segurança." : "Produto cadastrado com segurança.",
      );
      window.location.assign(`/leitos/produtos/${saved.id}`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o produto."),
  });

  if (!canManage)
    return (
      <WireErrorState
        title="Acesso restrito"
        error={new Error("Seu perfil pode consultar produtos, mas não alterar o cadastro técnico.")}
      />
    );
  if (productId && productQuery.isLoading)
    return <WireLoadingState label="Carregando produto..." />;
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
    setErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }
  function advance() {
    const result = wireTrayProductInputSchema.safeParse(form);
    if (!result.success) {
      const next = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(next);
      const stepFields = [
        ["name", "category", "unit"],
        ["widthMm", "heightMm", "lengthMm"],
        ["minimumStock", "targetStock", "minimumProductionBatch"],
      ];
      if (step < 3 && Object.keys(next).some((field) => stepFields[step]?.includes(field))) return;
    }
    setStep((current) => Math.min(3, current + 1));
  }

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Cadastro técnico"
        title={productId ? "Editar produto" : "Novo produto"}
        description="Atributos técnicos e parâmetros que alimentam pedidos, estoque e produção."
        backTo={productId ? `/leitos/produtos/${productId}` : "/leitos/produtos"}
      />
      <WirePanel>
        <div className="wire-stepper">
          {["Identificação", "Especificação", "Estoque", "Revisão"].map((label, index) => (
            <button
              key={label}
              type="button"
              className="wire-step"
              data-active={index === step}
              onClick={() => index < step && setStep(index)}
            >
              <span className="wire-step-index">
                {index < step ? <Check size={12} /> : index + 1}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        {step === 0 ? (
          <div className="wire-form-grid">
            <Field label="Nome do produto" error={errors.name} span>
              <input
                className="wire-input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex.: Leito aramado 100 x 50 mm"
                autoFocus
              />
            </Field>
            <Field label="SKU">
              <input
                className="wire-input"
                value={form.sku ?? ""}
                onChange={(e) => set("sku", e.target.value || null)}
                placeholder="Gerencial ou comercial"
              />
            </Field>
            <Field label="Categoria" error={errors.category}>
              <select
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
            <Field label="Unidade" error={errors.unit}>
              <select
                className="wire-select"
                value={form.unit}
                onChange={(e) => set("unit", e.target.value as WireTrayUnit)}
              >
                {units.map(([value, label]) => (
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
              />
            </Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="wire-form-grid">
            <NumberField
              label="Largura (mm)"
              value={form.widthMm}
              onChange={(v) => set("widthMm", v)}
              error={errors.widthMm}
            />
            <NumberField
              label="Altura (mm)"
              value={form.heightMm}
              onChange={(v) => set("heightMm", v)}
              error={errors.heightMm}
            />
            <NumberField
              label="Comprimento (mm)"
              value={form.lengthMm}
              onChange={(v) => set("lengthMm", v)}
              error={errors.lengthMm}
            />
            <Field label="Material">
              <input
                className="wire-input"
                value={form.material ?? ""}
                onChange={(e) => set("material", e.target.value || null)}
                placeholder="Aço carbono, inox..."
              />
            </Field>
            <Field label="Acabamento">
              <input
                className="wire-input"
                value={form.finish ?? ""}
                onChange={(e) => set("finish", e.target.value || null)}
                placeholder="Galvanizado, pintura..."
              />
            </Field>
            <Field label="Notas técnicas" span>
              <textarea
                className="wire-textarea"
                value={form.technicalNotes ?? ""}
                onChange={(e) => set("technicalNotes", e.target.value || null)}
                placeholder="Restrições, normas e orientações de fabricação."
              />
            </Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="wire-form-grid">
            <Field label="Local padrão">
              <select
                className="wire-select"
                value={form.defaultLocationId ?? ""}
                onChange={(e) => set("defaultLocationId", e.target.value || null)}
              >
                <option value="">Não definido</option>
                {locations.data
                  ?.filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
              </select>
            </Field>
            <NumberField
              label="Estoque mínimo"
              value={form.minimumStock}
              onChange={(v) => set("minimumStock", v ?? 0)}
              error={errors.minimumStock}
              required
            />
            <NumberField
              label="Estoque-alvo"
              value={form.targetStock}
              onChange={(v) => set("targetStock", v)}
              error={errors.targetStock}
            />
            <NumberField
              label="Lote mínimo de produção"
              value={form.minimumProductionBatch}
              onChange={(v) => set("minimumProductionBatch", v ?? 1)}
              error={errors.minimumProductionBatch}
              required
            />
            <Field label="Reposição automática">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.automaticReplenishment}
                  onChange={(e) => set("automaticReplenishment", e.target.checked)}
                  className="size-4 accent-orange-600"
                />{" "}
                Criar OP quando o projetado atingir o mínimo
              </label>
            </Field>
            <Field label="Observações de reposição" span>
              <textarea
                className="wire-textarea"
                value={form.replenishmentNotes ?? ""}
                onChange={(e) => set("replenishmentNotes", e.target.value || null)}
              />
            </Field>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="wire-eyebrow">Revisão</p>
                <h3 className="mt-2 font-display text-xl font-extrabold text-slate-950">
                  {form.name || "Produto sem nome"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {wireTrayCategoryLabel[form.category]} · {dimensions(form)} · unidade{" "}
                  {wireTrayUnitLabel[form.unit]}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <Summary
                    label="Mínimo"
                    value={formatWireQuantity(form.minimumStock, wireTrayUnitLabel[form.unit])}
                  />
                  <Summary
                    label="Alvo"
                    value={
                      form.targetStock === null
                        ? "Não definido"
                        : formatWireQuantity(form.targetStock, wireTrayUnitLabel[form.unit])
                    }
                  />
                  <Summary
                    label="Lote mínimo"
                    value={formatWireQuantity(
                      form.minimumProductionBatch,
                      wireTrayUnitLabel[form.unit],
                    )}
                  />
                  <Summary
                    label="Reposição"
                    value={form.automaticReplenishment ? "Automática" : "Manual"}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <ShieldCheck className="text-emerald-700" size={24} />
                <p className="mt-3 font-bold text-emerald-950">Pronto para persistir</p>
                <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                  A gravação respeita as permissões do módulo. Nenhum saldo de estoque é alterado
                  por este cadastro.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="wire-form-footer">
          <button
            type="button"
            className="wire-button-secondary"
            disabled={step === 0 || mutation.isPending}
            onClick={() => setStep((current) => current - 1)}
          >
            Voltar
          </button>
          {step < 3 ? (
            <button type="button" className="wire-button-primary" onClick={advance}>
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="wire-button-primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                "Salvando..."
              ) : (
                <>
                  <Save size={16} /> Salvar produto
                </>
              )}
            </button>
          )}
        </div>
      </WirePanel>
    </WirePage>
  );
}

export function WireTrayProductDetailPage({ productId }: { productId: string }) {
  const query = useWireTrayProductQuery(productId);
  const access = useWireTrayAccess();
  const canManage = hasWireTrayPermission(access.role, "manage_products", access.financialAccess);
  if (query.isLoading) return <WireLoadingState label="Consolidando produto e estoque..." />;
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
                  <a
                    href={`/leitos/pedidos/${order.id}`}
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
                  </a>
                ))}
                {production.map((op) => (
                  <a
                    href={`/leitos/producao/${op.id}`}
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
                  </a>
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
    minimumStock: 0,
    targetStock: null,
    minimumProductionBatch: 1,
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
  children,
}: {
  label: string;
  error?: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`wire-field ${span ? "wire-form-span-2" : ""}`}>
      <span className="wire-label">{label}</span>
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
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} error={error}>
      <input
        className="wire-input"
        type="number"
        min="0"
        step="0.001"
        required={required}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
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
