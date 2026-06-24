# Plano — Módulo Relatórios (produção real)

Reestrutura completa de `/relatorios` substituindo mocks por dados reais do Supabase, com filtros, KPIs, gráficos, tabela e exportação. Inclui sub-rota de relatório por cliente.

## 1. Migration — controle de cobrança
Adicionar em `service_orders` (única migration):
- `billing_status` enum `pending | ready | billed | cancelled` (default `pending`)
- `billed_at timestamptz null`
- `billing_notes text null`
- `invoice_reference text null`

Sem alterar RLS/grants existentes (a tabela já tem políticas).

## 2. Camada server (segura, com `requireSupabaseAuth`)
Novo `src/lib/api/reports.functions.ts`:
- `getReportsOverview({ filters })` → KPIs agregados
- `getReportSeries({ filters })` → séries para gráficos (por status, prioridade, cliente, técnico, tipo, evolução mensal)
- `getReportOrders({ filters })` → linhas da tabela/exportação
- `getClientReport({ clientId, filters })` → dados consolidados de 1 cliente
- `updateBillingStatus({ id, billing_status, invoice_reference?, billing_notes? })`

Cada função filtra OS no Postgres (período, cliente, unidade, técnico, status, prioridade, tipo, `billing_status`, "somente com hour_rate"), respeita RLS (admin vê tudo via `has_role`) e devolve DTOs planos.

## 3. Lógica pura (testável, sem React)
`src/lib/reports/`:
- `filters.ts` — schema Zod dos filtros + serialização para query params
- `metrics.ts` — `totalOrders`, `totalHours` (`worked_minutes/60`), `estimatedValue` (`min/60*hour_rate`), `avgLeadTime` (opened→closed), `completionRate`, `avgTicket`, agrupamentos (cliente, técnico, status, prioridade, tipo, mês)
- `formatters.ts` — BRL, horas (`3h42`), datas pt-BR
- `export.ts` — CSV (Blob + UTF-8 BOM) e HTML print-safe (`window.print`)

Tratamento de nulos: `worked_minutes`/`hour_rate` nulos = 0; entidades nulas viram "Sem cliente/técnico/unidade".

## 4. Hooks
`src/hooks/useReports.ts` — `useReportsOverviewQuery`, `useReportSeriesQuery`, `useReportOrdersQuery`, `useClientReportQuery`, `useUpdateBillingStatus` (com `invalidateQueries`). Todos via `useServerFn` + `useSuspenseQuery`.

## 5. Rotas
- `src/routes/_app.relatorios.tsx` — dashboard principal (filtros via `validateSearch` + `zodValidator`, loader faz `ensureQueryData`)
- `src/routes/_app.relatorios.cliente.$clientId.tsx` — relatório por cliente
- `errorComponent` e `notFoundComponent` em ambas

Search params: `period, from, to, clientId, unitId, technicianId, status, priority, serviceType, billingStatus, onlyWithRate`.

## 6. Componentes (`src/components/reports/`)
- `ReportsPageHeader` — título + ações (exportar, gerar por cliente)
- `ReportsFilters` — sheet/drawer no mobile, barra colapsável no desktop; chips de filtros ativos; "Limpar filtros"
- `ReportsKpiGrid` + `ReportKpiCard` — 6–8 KPIs compactos (label, valor, subtítulo, ícone, badge de alerta opcional)
- `ReportChartCard` — wrapper glass para gráficos
- `ReportBarChart`, `ReportStatusDonut`, `ReportTrendArea`, `ReportTopClients`, `ReportTopTechnicians` — Recharts (já no projeto)
- `ReportOrdersTable` (desktop) + `ReportOrdersMobileList` (mobile cards)
- `ReportExportActions` — Exportar CSV, Imprimir/PDF
- `ClientReportDrawer` — picker de cliente + período, redireciona para `/relatorios/cliente/$clientId`
- `BillingStatusBadge` + ação inline na tabela (marcar como `ready`/`billed`)
- Skeletons e `EmptyState` reutilizando componentes existentes

## 7. KPIs do dashboard
OS no período · Concluídas · Em execução · Horas trabalhadas · Valor estimado (pré-cobrança) · Tempo médio (abertura→fechamento) · Taxa de conclusão · Aguardando cobrança (`billing_status = ready` ou OS `finished/approved` sem `billed_at`).

## 8. Gráficos
Desktop: grid 2 colunas, principal em destaque (evolução mensal de OS). Mobile: 1 coluna, barras horizontais compactas.
Inclui: OS por status, por prioridade, por tipo de serviço, horas por técnico (top N), OS por cliente (top N), valor estimado por cliente, tempo médio por técnico, evolução mensal.

## 9. Tabela / lista operacional
Desktop: tabela com Nº, Cliente, Unidade, Técnico, Status, Prioridade, Tipo, Abertura, Fechamento, Tempo, Valor, Cobrança (badge + menu de ação).
Mobile: cards compactos com mesmos campos essenciais.
Paginação simples client-side (server já filtra).

## 10. Exportação real
- **CSV**: gera Blob com BOM, separador `;`, datas ISO, valores em BRL. Nome: `lemarc-relatorio-{periodo}-{timestamp}.csv`. Usa exatamente o conjunto filtrado.
- **PDF/Imprimir**: rota oculta `/relatorios/print` OU window com `document.write` de HTML print-safe (logo, filtros aplicados, KPIs, tabela). Botão chama `window.print()`. Sem nova dependência.

## 11. Relatório por cliente
Rota `_app.relatorios.cliente.$clientId.tsx`:
- Header com nome do cliente + período
- KPIs do cliente (total OS, horas, valor, abertas, concluídas, aguardando cobrança)
- Detalhamento por unidade (lista) e por técnico (barras)
- Tabela de OS do cliente no período
- Exportar CSV e Imprimir
- Botão "Voltar para relatórios"

## 12. Remoção de mocks
- Excluir `src/lib/mock/reports.ts` (uso apenas em `_app.relatorios.tsx`, confirmado)
- Nenhum botão com "mock"
- Sem dados estáticos no módulo

## 13. Identidade visual
Mantém glass industrial, fundo grafite/azul, laranja Lemarc como destaque (linhas/CTA), tipografia atual. Cards menores e mais densos; hierarquia clara; sem rodapés genéricos ("Resumo Lemarc"). Cores semânticas via tokens existentes (`status-*`, `primary`).

## 14. Responsividade
Validar 360/375/390/414 (mobile) e 1024/1280/1366/1440 (desktop). `pb-24` para BottomNav. Sem overflow horizontal. Gráficos com `ResponsiveContainer`.

## 15. Estados
Skeletons para KPIs/gráficos/tabela; `EmptyState` quando sem OS ou sem resultados de filtro; `errorComponent` com botão "Tentar novamente" (`router.invalidate()`); botão "Limpar filtros" sempre visível quando há filtros ativos.

## 16. Validação final
- `npm run build` passa
- `/relatorios` sem qualquer import de `mock/reports`
- Filtros refletem em KPIs, gráficos, tabela e exportação
- CSV abre no Excel com acentos corretos
- Relatório por cliente abre via drawer e via URL direta
- Admin vê todas as OS; não-admin vê apenas as suas (RLS atual)
- BottomNav, AppShell, rotas existentes intactos

## Ordem de implementação
1. Migration `billing_status` + campos
2. `reports.functions.ts` + `lib/reports/*` + types
3. `useReports.ts`
4. Componentes (`reports/*`)
5. Rota `_app.relatorios.tsx` reescrita + remoção do mock
6. Rota `_app.relatorios.cliente.$clientId.tsx`
7. Exportação CSV + print
8. Polimento visual + responsividade + build
