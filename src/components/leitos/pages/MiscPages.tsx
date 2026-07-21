import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardList,
  Download,
  FileBox,
  KeyRound,
  MapPin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { useWireTrayAccess } from "@/components/leitos/WireTrayAccessContext";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WireMetric,
  WirePage,
  WirePageHeader,
  WirePager,
  WirePanel,
  WireRestrictedState,
  WireStatus,
  formatWireDate,
  formatWireQuantity,
} from "@/components/leitos/WireTrayUi";
import {
  useWireTrayAccessUsersQuery,
  useWireTrayDashboardQuery,
  useWireTrayInventoryQuery,
  useWireTrayLocationsQuery,
  useWireTrayMovementsQuery,
  useWireTrayOrdersQuery,
  wireTrayKeys,
} from "@/hooks/useWireTray";
import { saveWireTrayLocation } from "@/lib/api/wireTrayProducts.functions";
import { setWireTrayAccess } from "@/lib/api/moduleAccess.functions";
import { hasWireTrayPermission } from "@/lib/wireTrays/domain";
import {
  wireTrayMovementLabel,
  wireTrayOrderStatusLabel,
  wireTrayRoleLabel,
  wireTrayUnitLabel,
  type WireTrayAccessUser,
  type WireTrayModuleRole,
  type WireTrayMovementType,
} from "@/types/wireTray";

const movementTypes = Object.entries(wireTrayMovementLabel) as Array<
  [WireTrayMovementType, string]
>;

export function WireTrayMovementsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const query = useWireTrayMovementsQuery({ search, type: type || undefined, page, pageSize: 25 });
  useEffect(() => setPage(1), [search, type]);
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Livro-razão imutável"
        title="Movimentações"
        description="Entradas, saídas, reservas, transferências, produção e expedição com saldo anterior e posterior."
      />
      <WirePanel>
        <div className="wire-filterbar">
          <label className="wire-field">
            <span className="wire-label">Buscar motivo</span>
            <span className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="wire-input pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Documento, ocorrência ou justificativa"
              />
            </span>
          </label>
          <label className="wire-field">
            <span className="wire-label">Tipo</span>
            <select className="wire-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos</option>
              {movementTypes.map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="wire-field">
            <span className="wire-label">Estoque</span>
            <Link to="/leitos/estoque" className="wire-button-secondary">
              Abrir posição atual <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        {query.isLoading ? (
          <WireLoadingState label="Consultando livro de estoque..." />
        ) : query.isError ? (
          <WireErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length ? (
          <>
            <div className="wire-table-wrap">
              <table className="wire-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Produto</th>
                    <th>Local</th>
                    <th>Quantidade</th>
                    <th>Físico</th>
                    <th>Reservado</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data!.rows.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatWireDate(movement.createdAt, true)}</td>
                      <td>
                        <WireStatus
                          tone={
                            movement.physicalDelta < 0 || movement.reservedDelta < 0
                              ? "warning"
                              : "info"
                          }
                        >
                          {wireTrayMovementLabel[movement.type]}
                        </WireStatus>
                      </td>
                      <td>
                        <a
                          href={`/leitos/estoque/${movement.productId}`}
                          className="wire-table-link"
                        >
                          {movement.productName}
                        </a>
                        <p className="mt-1 text-xs text-slate-500">
                          {movement.productSku ?? "Sem SKU"}
                        </p>
                      </td>
                      <td>{movement.locationName}</td>
                      <td className="font-bold text-slate-900">
                        {formatWireQuantity(movement.quantity)}
                      </td>
                      <td>
                        {formatWireQuantity(movement.previousPhysical)} →{" "}
                        <strong>{formatWireQuantity(movement.newPhysical)}</strong>
                      </td>
                      <td>
                        {formatWireQuantity(movement.previousReserved)} →{" "}
                        <strong>{formatWireQuantity(movement.newReserved)}</strong>
                      </td>
                      <td className="max-w-xs">
                        <p className="line-clamp-2">{movement.reason}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <WirePager page={page} pageSize={25} count={query.data!.count} onPage={setPage} />
          </>
        ) : (
          <WireEmptyState
            title="Nenhuma movimentação"
            description="Os movimentos transacionais serão exibidos aqui sem possibilidade de edição ou exclusão."
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

export function WireTrayReportsPage() {
  const dashboard = useWireTrayDashboardQuery();
  const inventory = useWireTrayInventoryQuery({
    search: "",
    health: "all",
    page: 1,
    pageSize: 100,
  });
  const orders = useWireTrayOrdersQuery({ search: "", page: 1, pageSize: 100 });
  const loading = dashboard.isLoading || inventory.isLoading || orders.isLoading;
  const error = dashboard.error ?? inventory.error ?? orders.error;
  if (loading) return <WireLoadingState label="Consolidando indicadores reais..." />;
  if (error)
    return (
      <WireErrorState
        error={error}
        onRetry={() => {
          dashboard.refetch();
          inventory.refetch();
          orders.refetch();
        }}
      />
    );
  const data = dashboard.data!;
  const inventoryRows = inventory.data!.rows;
  const totalPhysical = inventoryRows.reduce((sum, row) => sum + row.physical, 0);
  const totalReserved = inventoryRows.reduce((sum, row) => sum + row.reserved, 0);
  function exportInventory() {
    const lines = [
      [
        "SKU",
        "Produto",
        "Unidade",
        "Fisico",
        "Reservado",
        "Disponivel",
        "Em producao",
        "Projetado",
      ],
      ...inventoryRows.map((row) => [
        row.product.sku ?? "",
        row.product.name,
        wireTrayUnitLabel[row.product.unit],
        row.physical,
        row.reserved,
        row.available,
        row.inProduction,
        row.projected,
      ]),
    ];
    downloadCsv("leitos-estoque.csv", lines);
  }
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Análise operacional"
        title="Relatórios"
        description="Indicadores e exportações derivados exclusivamente dos pedidos, saldos e eventos persistidos."
        action={
          <button type="button" className="wire-button-secondary" onClick={exportInventory}>
            <Download size={16} /> Exportar estoque CSV
          </button>
        }
      />
      <div className="wire-metric-grid">
        <WireMetric
          label="Pedidos ativos"
          value={data.metrics.activeOrders}
          icon={<ClipboardList size={17} />}
          tone="info"
        />
        <WireMetric
          label="Produção aberta"
          value={data.metrics.productionOrders}
          icon={<Settings size={17} />}
        />
        <WireMetric
          label="Físico (até 100 itens)"
          value={formatWireQuantity(totalPhysical)}
          icon={<Warehouse size={17} />}
        />
        <WireMetric
          label="Reservado (até 100 itens)"
          value={formatWireQuantity(totalReserved)}
          icon={<Boxes size={17} />}
          tone="warning"
        />
        <WireMetric
          label="Produtos críticos"
          value={data.metrics.lowStock}
          icon={<BarChart3 size={17} />}
          tone={data.metrics.lowStock ? "warning" : "success"}
        />
        <WireMetric
          label="Riscos"
          value={data.metrics.atRisk}
          icon={<ShieldCheck size={17} />}
          tone={data.metrics.atRisk ? "danger" : "success"}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <WirePanel title="Pedidos por etapa" description="Amostra dos 100 pedidos mais recentes.">
          <div className="divide-y divide-slate-100">
            {groupCount(orders.data!.rows.map((row) => row.status)).map(([status, count]) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3" key={status}>
                <WireStatus>
                  {wireTrayOrderStatusLabel[status as keyof typeof wireTrayOrderStatusLabel] ??
                    status}
                </WireStatus>
                <strong className="text-slate-900">{count}</strong>
              </div>
            ))}
          </div>
        </WirePanel>
        <WirePanel
          title="Itens com menor disponibilidade"
          description="Prioridade de reposição conforme estoque mínimo."
        >
          <div className="divide-y divide-slate-100">
            {[...inventoryRows]
              .sort(
                (a, b) =>
                  a.available - a.product.minimumStock - (b.available - b.product.minimumStock),
              )
              .slice(0, 10)
              .map((row) => (
                <a
                  href={`/leitos/estoque/${row.product.id}`}
                  key={row.product.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Mínimo{" "}
                      {formatWireQuantity(
                        row.product.minimumStock,
                        wireTrayUnitLabel[row.product.unit],
                      )}
                    </p>
                  </div>
                  <strong className="text-sm text-slate-900">
                    {formatWireQuantity(row.available, wireTrayUnitLabel[row.product.unit])}
                  </strong>
                </a>
              ))}
          </div>
        </WirePanel>
      </div>
      <WirePanel title="Nota de escopo">
        <p className="px-4 py-4 text-sm leading-6 text-slate-600">
          Os cartões globais vêm da consolidação do servidor. Tabelas e exportação usam até 100
          registros por consulta para preservar desempenho; filtros e relatórios fiscais detalhados
          devem ser tratados por políticas financeiras próprias.
        </p>
      </WirePanel>
    </WirePage>
  );
}

export function WireTraySettingsPage() {
  const access = useWireTrayAccess();
  const locations = useWireTrayLocationsQuery();
  const save = useServerFn(saveWireTrayLocation);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: null as string | null,
    active: true,
  });
  const canManage =
    hasWireTrayPermission(access.role, "manage_products", access.financialAccess) ||
    hasWireTrayPermission(access.role, "adjust_inventory", access.financialAccess);
  const mutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Local de estoque salvo.");
      setForm({ code: "", name: "", description: null, active: true });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.locations });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o local."),
  });
  if (locations.isLoading) return <WireLoadingState label="Carregando parâmetros do módulo..." />;
  if (locations.isError)
    return <WireErrorState error={locations.error} onRetry={() => locations.refetch()} />;
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Administração do módulo"
        title="Configurações"
        description="Locais de estoque, acessos e políticas operacionais do módulo industrial."
        action={
          canManage ? (
            <button
              type="button"
              className="wire-button-primary"
              onClick={() => setShowForm((value) => !value)}
            >
              <Plus size={16} /> Novo local
            </button>
          ) : undefined
        }
      />
      {showForm ? (
        <WirePanel title="Cadastrar local">
          <div className="wire-form-grid">
            <label className="wire-field">
              <span className="wire-label">Código</span>
              <input
                className="wire-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="ALM-01"
              />
            </label>
            <label className="wire-field">
              <span className="wire-label">Nome</span>
              <input
                className="wire-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Almoxarifado principal"
              />
            </label>
            <label className="wire-field wire-form-span-2">
              <span className="wire-label">Descrição</span>
              <textarea
                className="wire-textarea"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
            <button
              type="button"
              className="wire-button-secondary"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="wire-button-primary"
              disabled={
                form.code.trim().length < 1 || form.name.trim().length < 2 || mutation.isPending
              }
              onClick={() => mutation.mutate()}
            >
              Salvar local
            </button>
          </div>
        </WirePanel>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
        <WirePanel
          title="Locais de estoque"
          description="Endereços válidos para saldo, transferência e destino de produção."
        >
          {locations.data!.length ? (
            <div className="divide-y divide-slate-100">
              {locations.data!.map((location) => (
                <div className="flex items-center gap-3 px-4 py-3" key={location.id}>
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {location.code} · {location.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {location.description ?? "Sem descrição"}
                    </p>
                  </div>
                  <WireStatus tone={location.active ? "success" : "neutral"}>
                    {location.active ? "Ativo" : "Inativo"}
                  </WireStatus>
                </div>
              ))}
            </div>
          ) : (
            <WireEmptyState
              title="Nenhum local cadastrado"
              description="Cadastre um endereço antes de registrar o primeiro saldo ou OP."
            />
          )}
        </WirePanel>
        <div className="grid content-start gap-4">
          <WirePanel title="Acessos e perfis">
            <div className="p-4">
              <KeyRound className="text-orange-700" size={22} />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Papéis são exclusivos deste módulo e não alteram os acessos das Ordens de Serviço.
              </p>
              {access.role === "admin" ? (
                <Link to="/leitos/configuracoes/acessos" className="wire-button-secondary mt-4">
                  Gerenciar acessos <ArrowRight size={15} />
                </Link>
              ) : (
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Somente administradores podem alterar acessos.
                </p>
              )}
            </div>
          </WirePanel>
          <WirePanel title="Garantias ativas">
            <div className="space-y-3 p-4 text-sm text-slate-600">
              <p className="flex gap-2">
                <ShieldCheck size={17} className="shrink-0 text-emerald-700" /> RLS por módulo,
                função e visibilidade documental.
              </p>
              <p className="flex gap-2">
                <ShieldCheck size={17} className="shrink-0 text-emerald-700" /> Operações críticas
                transacionais e idempotentes.
              </p>
              <p className="flex gap-2">
                <ShieldCheck size={17} className="shrink-0 text-emerald-700" /> Livros de movimento
                e auditoria imutáveis.
              </p>
            </div>
          </WirePanel>
        </div>
      </div>
    </WirePage>
  );
}

export function WireTrayAccessPage() {
  const access = useWireTrayAccess();
  const query = useWireTrayAccessUsersQuery(access.role === "admin");
  if (access.role !== "admin")
    return (
      <WireRestrictedState description="A gestão de acessos do módulo é exclusiva de administradores." />
    );
  if (query.isLoading) return <WireLoadingState label="Carregando usuários autorizáveis..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Segregação de funções"
        title="Acessos do módulo"
        description="Ative usuários já existentes e atribua o menor papel necessário. O módulo mantém ao menos um administrador ativo."
        backTo="/leitos/configuracoes"
      />
      <WirePanel>
        {query.data!.length ? (
          <div className="divide-y divide-slate-100">
            {query.data!.map((user) => (
              <AccessRow key={user.userId} user={user} />
            ))}
          </div>
        ) : (
          <WireEmptyState
            title="Nenhum usuário disponível"
            description="Não há contas autenticadas aptas para configuração."
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

function AccessRow({ user }: { user: WireTrayAccessUser }) {
  const save = useServerFn(setWireTrayAccess);
  const queryClient = useQueryClient();
  const [role, setRole] = useState<WireTrayModuleRole>(user.role ?? "consulta");
  const [active, setActive] = useState(user.active);
  const [financial, setFinancial] = useState(user.financialAccess);
  const dirty =
    role !== (user.role ?? "consulta") ||
    active !== user.active ||
    financial !== user.financialAccess;
  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          userId: user.userId,
          role,
          active,
          financialAccess:
            role === "gestor" ? financial : ["admin", "comercial", "faturamento"].includes(role),
        },
      }),
    onSuccess: () => {
      toast.success("Acesso atualizado e auditado.");
      queryClient.invalidateQueries({ queryKey: wireTrayKeys.accessUsers });
      queryClient.invalidateQueries({ queryKey: ["module-access"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o acesso."),
  });
  return (
    <div className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_180px_150px_auto] lg:items-end">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-950">
          {user.fullName ?? user.email ?? user.userId}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">
          {user.email ?? "E-mail não disponível"}
        </p>
      </div>
      <label className="wire-field">
        <span className="wire-label">Papel</span>
        <select
          className="wire-select"
          value={role}
          onChange={(e) => setRole(e.target.value as WireTrayModuleRole)}
        >
          {Object.entries(wireTrayRoleLabel).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            className="size-4 accent-orange-600"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />{" "}
          Acesso ativo
        </label>
        {role === "gestor" ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              className="size-4 accent-orange-600"
              checked={financial}
              onChange={(e) => setFinancial(e.target.checked)}
            />{" "}
            Acesso financeiro
          </label>
        ) : (
          <span className="text-[11px] text-slate-500">Financeiro definido pelo papel</span>
        )}
      </div>
      <button
        type="button"
        className="wire-button-primary"
        disabled={!dirty || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Salvando..." : "Aplicar"}
      </button>
    </div>
  );
}

export function WireTrayMorePage() {
  const access = useWireTrayAccess();
  const links = [
    {
      to: "/leitos/separacao",
      label: "Separação e conferência",
      description: "Fila reservada e dupla checagem",
      icon: ClipboardList,
      show: hasWireTrayPermission(access.role, "separate", access.financialAccess),
    },
    {
      to: "/leitos/faturamento",
      label: "Faturamento e expedição",
      description: "Notas e liberação de despacho",
      icon: FileBox,
      show: hasWireTrayPermission(access.role, "bill", access.financialAccess),
    },
    {
      to: "/leitos/produtos",
      label: "Produtos",
      description: "Catálogo e parâmetros técnicos",
      icon: Boxes,
      show: true,
    },
    {
      to: "/leitos/movimentacoes",
      label: "Movimentações",
      description: "Livro-razão de estoque",
      icon: ClipboardList,
      show: true,
    },
    {
      to: "/leitos/relatorios",
      label: "Relatórios",
      description: "Indicadores e exportações",
      icon: BarChart3,
      show: true,
    },
    {
      to: "/leitos/configuracoes",
      label: "Configurações",
      description: "Locais, acessos e garantias",
      icon: Settings,
      show:
        hasWireTrayPermission(access.role, "manage_products", access.financialAccess) ||
        hasWireTrayPermission(access.role, "adjust_inventory", access.financialAccess),
    },
  ].filter((item) => item.show);
  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Navegação complementar"
        title="Mais"
        description="Ferramentas administrativas e etapas especializadas do módulo."
      />
      <WirePanel>
        <div className="divide-y divide-slate-100">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <a
                href={item.to}
                key={item.to}
                className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                </span>
                <ArrowRight size={17} className="text-slate-400" />
              </a>
            );
          })}
        </div>
      </WirePanel>
      <Link to="/dashboard" className="wire-panel flex items-center gap-3 p-4 hover:bg-slate-50">
        <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
          <ArrowRight size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950">Ordens de Serviço</span>
          <span className="mt-1 block text-xs text-slate-500">
            Trocar para o módulo original sem encerrar a sessão.
          </span>
        </span>
      </Link>
    </WirePage>
  );
}

function groupCount(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((value) => map.set(value, (map.get(value) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
function downloadCsv(fileName: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
