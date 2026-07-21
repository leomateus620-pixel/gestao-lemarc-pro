import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Factory,
  Gauge,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { useWireTrayDashboardQuery } from "@/hooks/useWireTray";
import {
  WireEmptyState,
  WireErrorState,
  WireLoadingState,
  WireMetric,
  WirePage,
  WirePageHeader,
  WirePanel,
  WireProgress,
  WireStatus,
  formatWireDate,
  formatWireQuantity,
  inventoryTone,
  orderStatusTone,
} from "@/components/leitos/WireTrayUi";
import {
  wireTrayProductionOriginLabel,
  wireTrayProductionStatusLabel,
  wireTrayUnitLabel,
} from "@/types/wireTray";

export function WireTrayDashboardPage() {
  const query = useWireTrayDashboardQuery();
  if (query.isLoading) return <WireLoadingState label="Carregando a visão operacional..." />;
  if (query.isError) return <WireErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data!;

  return (
    <WirePage>
      <WirePageHeader
        eyebrow="Controle industrial em tempo real"
        title="Visão geral"
        description="Pedidos, produção, reservas e estoque consolidados a partir da base operacional persistida."
        action={
          <Link to="/leitos/pedidos/novo" className="wire-button-primary">
            Novo pedido <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="wire-metric-grid">
        <WireMetric
          label="Pedidos ativos"
          value={data.metrics.activeOrders}
          detail="Em fluxo operacional"
          icon={<Boxes size={17} />}
          tone="info"
        />
        <WireMetric
          label="OPs em aberto"
          value={data.metrics.productionOrders}
          detail="Planejadas ou executando"
          icon={<Factory size={17} />}
        />
        <WireMetric
          label="A separar"
          value={data.metrics.awaitingSeparation}
          detail="Reserva ou conferência"
          icon={<ClipboardCheck size={17} />}
          tone="warning"
        />
        <WireMetric
          label="Prontos para faturar"
          value={data.metrics.readyForBilling}
          detail="Conferência finalizada"
          icon={<PackageCheck size={17} />}
          tone="success"
        />
        <WireMetric
          label="Estoque crítico"
          value={data.metrics.lowStock}
          detail="No mínimo ou abaixo"
          icon={<Gauge size={17} />}
          tone={data.metrics.lowStock ? "warning" : "success"}
        />
        <WireMetric
          label="Riscos abertos"
          value={data.metrics.atRisk}
          detail="Prazo ou divergência"
          icon={<ShieldAlert size={17} />}
          tone={data.metrics.atRisk ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <WirePanel title="Fila de atenção" description="Exceções que exigem decisão operacional.">
          {data.attention.length ? (
            <div className="divide-y divide-slate-100">
              {data.attention.map((item) => (
                <a
                  key={`${item.kind}-${item.id}`}
                  href={item.route}
                  className="group flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50"
                >
                  <span
                    className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${item.tone === "critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    <AlertTriangle size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                      {item.detail}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-2 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                    size={16}
                  />
                </a>
              ))}
            </div>
          ) : (
            <WireEmptyState
              title="Operação sem alertas"
              description="Nenhuma ruptura, divergência ou atraso foi identificado agora."
            />
          )}
        </WirePanel>

        <WirePanel
          title="Estoque crítico"
          description="Disponível versus mínimo configurado."
          action={
            <Link to="/leitos/estoque" className="wire-button-ghost">
              Ver estoque
            </Link>
          }
        >
          {data.criticalInventory.length ? (
            <div className="divide-y divide-slate-100">
              {data.criticalInventory.slice(0, 6).map((row) => (
                <a
                  key={row.product.id}
                  href={`/leitos/estoque/${row.product.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{row.product.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.product.sku ?? "Sem SKU"} · mínimo{" "}
                      {formatWireQuantity(
                        row.product.minimumStock,
                        wireTrayUnitLabel[row.product.unit],
                      )}
                    </p>
                  </div>
                  <WireStatus tone={inventoryTone(row.available, row.product.minimumStock)}>
                    {formatWireQuantity(row.available, wireTrayUnitLabel[row.product.unit])}
                  </WireStatus>
                </a>
              ))}
            </div>
          ) : (
            <WireEmptyState
              title="Estoque em equilíbrio"
              description="Nenhum produto ativo está no ponto crítico configurado."
            />
          )}
        </WirePanel>
      </div>

      <WirePanel
        title="Produção em andamento"
        description="Ordens liberadas e apontamentos consolidados."
        action={
          <Link to="/leitos/producao" className="wire-button-ghost">
            Abrir produção
          </Link>
        }
      >
        {data.production.length ? (
          <div className="wire-table-wrap">
            <table className="wire-table">
              <thead>
                <tr>
                  <th>OP</th>
                  <th>Produto / origem</th>
                  <th>Quantidade</th>
                  <th>Prazo</th>
                  <th>Progresso</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.production.map((row) => {
                  const progress = row.planned ? (row.produced / row.planned) * 100 : 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <a className="wire-table-link" href={`/leitos/producao/${row.id}`}>
                          #{row.number}
                        </a>
                      </td>
                      <td>
                        <p className="font-semibold text-slate-900">{row.productName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {wireTrayProductionOriginLabel[row.origin]}
                        </p>
                      </td>
                      <td>
                        {formatWireQuantity(row.produced)} / {formatWireQuantity(row.planned)}
                      </td>
                      <td>{formatWireDate(row.plannedCompletionDate)}</td>
                      <td>
                        <WireProgress value={progress} />
                      </td>
                      <td>
                        <WireStatus tone={orderStatusTone(row.status)}>
                          {wireTrayProductionStatusLabel[row.status]}
                        </WireStatus>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <WireEmptyState
            title="Nenhuma produção em execução"
            description="Ordens liberadas aparecerão aqui sem necessidade de atualização manual."
            action={
              <Link to="/leitos/producao/nova" className="wire-button-secondary">
                Planejar produção
              </Link>
            }
          />
        )}
      </WirePanel>

      <WirePanel
        title="Atividade auditada"
        description="Últimos eventos críticos registrados no servidor."
      >
        {data.recentActivity.length ? (
          <div className="wire-timeline">
            {data.recentActivity.map((event) => (
              <div className="wire-timeline-item" key={event.id}>
                <span className="wire-timeline-dot" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {humanizeEvent(event.eventType)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.entityType} · {formatWireDate(event.createdAt, true)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WireEmptyState
            title="Sem atividade registrada"
            description="Os eventos de criação e movimentos críticos aparecerão nesta linha do tempo."
          />
        )}
      </WirePanel>
    </WirePage>
  );
}

function humanizeEvent(value: string) {
  const labels: Record<string, string> = {
    order_created: "Pedido criado",
    order_updated: "Pedido atualizado",
    order_confirmed: "Pedido confirmado e estoque processado",
    production_created: "Ordem de produção criada",
    production_entry: "Apontamento de produção registrado",
    stock_movement: "Movimento de estoque registrado",
    separation_recorded: "Separação registrada",
    order_billed: "Faturamento registrado",
    order_dispatched: "Expedição concluída",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}
