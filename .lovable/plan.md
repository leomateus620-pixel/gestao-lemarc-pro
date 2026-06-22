
## Objetivo

Tornar a home (`/dashboard`) uma central operacional 100% real: dados vêm de tabelas no Lovable Cloud, métricas calculadas por período (hoje/semana/mês), cards clicáveis levam a listas filtradas das OS reais. Sem mocks, sem números fixos.

Hoje o sistema só tem `profiles`. Não existem tabelas de Ordens de Serviço, Clientes ou Técnicos no banco — então parte do trabalho é criar essa base mínima para sustentar a dashboard.

## 1. Banco de dados (migration)

Criar no schema `public` (com GRANTs + RLS):

- `clients` — `id`, `name`, `unit`, `created_by`, `created_at`. RLS: usuário autenticado lê/insere/edita os próprios (`created_by = auth.uid()`).
- `technicians` — `id`, `full_name`, `role` (mecânico/elétrico/etc.), `created_by`, `created_at`. Mesma RLS.
- `service_orders` — campos cobrindo tudo que o card/listagem precisa:
  - `id`, `number` (serial humano), `title`, `description`
  - `client_id` (FK clients), `technician_id` (FK technicians, nullable), `created_by` (FK auth.users)
  - `service_type` (enum: mecanica, eletrica, automacao, montagem, instalacao, visita, emergencia)
  - `priority` (enum: baixa, media, alta, urgente)
  - `status` (enum: pending, dispatched, transit, running, finished, review, approved, cancelled)
  - `scheduled_for` (timestamptz, nullable — previsão)
  - `opened_at`, `started_at`, `finished_at`, `approved_at`, `closed_at` (timestamptz, nullable)
  - `created_at`, `updated_at`
  - Trigger `updated_at`.
  - RLS: leitura por usuário autenticado (toda a empresa vê suas OS — `auth.uid() is not null`); insert/update apenas pelo `created_by` ou técnico responsável.

> Papéis (gestor/colaborador) continuam mockados via `RoleContext` nesta etapa. Quando virar regra de negócio real, criamos `user_roles` + `has_role`.

## 2. Camada de dados no frontend

Centralizar regras para evitar duplicação entre dashboard, listagem e detalhe:

```
src/types/serviceOrder.ts            // tipos + enums espelhando o banco
src/lib/serviceOrders/status.ts      // mapeamento status -> bucket (pending/running/finished/alert)
src/lib/serviceOrders/period.ts      // helpers de período (today/week/month) + isInPeriod()
src/lib/serviceOrders/metrics.ts     // computeMetrics(orders, period) — pura, memoizável
src/lib/serviceOrders/incomplete.ts  // detecta OS sem cliente/técnico/descrição/etc. (Prioridades)
src/lib/api/serviceOrders.functions.ts  // createServerFn com requireSupabaseAuth: list/get/create/update
src/hooks/useServiceOrders.ts        // useSuspenseQuery(list) — fonte única
src/hooks/useOperationalDashboard.ts // deriva métricas por período da lista única
```

Regras-chave:
- **Uma única query** para a lista de OS no contexto da dashboard; métricas calculadas em memória (`useMemo`) para evitar N queries.
- Buckets de status:
  - `pending`: `pending`, `dispatched`
  - `inProgress`: `transit`, `running`
  - `done`: `finished`, `approved`
  - `alert`: prioridade `urgente`/`alta` + atrasada (passou de `scheduled_for` sem `finished_at`)
  - `incomplete`: faltando cliente, técnico, descrição, tipo, prioridade ou prazo
- Períodos baseados em `opened_at` (criação) e `updated_at` (movimentação) — uma OS "do dia" é aberta OU movimentada hoje.

## 3. Refatoração da Dashboard

Substituir `src/routes/_app.dashboard.tsx` para consumir só `useOperationalDashboard`. Componentes novos:

```
src/components/dashboard/OperationTodayCard.tsx   // hero "Operação de hoje"
src/components/dashboard/MetricCard.tsx           // card métrica genérico (substitui LemarcMetricCard no dash)
src/components/dashboard/MetricPeriodFilter.tsx   // chips Hoje / Semana / Mês
src/components/dashboard/DashboardSkeleton.tsx    // loading
src/components/dashboard/EmptyOperations.tsx      // estado vazio elegante
```

### Card "Operação de Hoje" (largura total)
- Saudação com nome do usuário logado (`useAuth().displayName`).
- Filtro Hoje/Semana/Mês embutido (controla apenas este card).
- 4 números grandes com badges: **abertas**, **em execução**, **aguardando revisão**, **concluídas**.
- Linha-resumo dinâmica:
  - todas fechadas → "Todas as OS do dia foram fechadas corretamente"
  - pendências → "2 OS ainda precisam de fechamento"
  - vazio → "Nenhuma OS no período"
- CTA laranja "Nova OS" mantido proeminente.
- Visual: gradiente azul profundo + glow laranja sutil, mantém liquid glass.

### Cards operacionais (grid)
Remover **Relatórios** da home (já existe `/relatorios` no menu). Manter:

| Card | Métrica | Rota ao clicar |
|---|---|---|
| Ordens Pendentes | count(bucket pending) | `/ordens?status=pendente` |
| Em Andamento | count(bucket inProgress) | `/ordens?status=andamento` |
| Clientes Ativos | distinct client_id com OS no período | `/clientes?ativos=1` |
| Técnicos em Campo | distinct technician_id em OS bucket inProgress | `/colaboradores?campo=1` |
| Alertas | count(bucket alert) — borda vermelha mais forte | `/ordens?filtro=alertas` |
| Prioridades | count(incomplete) | `/ordens?filtro=incompletas` |
| Serviços Concluídos | count(bucket done) com filtro próprio Hoje/Semana/Mês | `/ordens?status=concluida&period=...` |

Layout: `OperationTodayCard` full-width; abaixo grid `sm:2 / xl:4` com 7 cards.

## 4. Listagens filtradas (usar rota existente `/ordens`)

Estender `_app.ordens.index.tsx` para ler `validateSearch` (zod) com:
- `status`: pendente | andamento | concluida | todas
- `period`: day | week | month | all
- `filtro`: alertas | incompletas (opcional)

Lista renderiza as mesmas OS reais via `useServiceOrders`; cards de OS abrem `/ordens/$id` real. Sem rotas paralelas — não criamos `/operacao/*`.

Estados: loading skeleton, empty state ("Nenhuma OS encontrada para este filtro"), erro com retry via `router.invalidate()`.

## 5. Tela de detalhe da OS

Reescrever `_app.ordens.$id.tsx` para buscar a OS real (server fn `getServiceOrder`) e exibir cliente, técnico, timeline derivada dos timestamps reais (`opened_at`, `started_at`, `finished_at`, `approved_at`).

## 6. Tela "Nova OS"

Ajustar `_app.ordens.nova.tsx` para gravar de verdade via `createServiceOrder` server fn. Select de cliente/técnico vem do banco. Ao criar com sucesso → `router.invalidate()` faz a dashboard refletir imediatamente.

> Listagens de Clientes e Colaboradores continuam mock nesta etapa, mas o **dropdown** de criação de OS já busca do banco (mesmo que vazio). Quando o usuário cadastrar via essas telas (próximo passo), tudo já se conecta sozinho.

## 7. Remoção de mocks na home

- `src/routes/_app.dashboard.tsx`: zero import de `@/lib/mock/*`.
- Mocks ficam preservados em `src/lib/mock/` apenas para as outras telas (clientes, colaboradores, relatórios) que ainda não foram migradas — fora do escopo desta etapa.

## 8. Verificações finais

- Build TypeScript limpo.
- Lint sem novos avisos.
- Linter Supabase verde (RLS + GRANTs em toda tabela nova).
- Conferir manualmente: dashboard vazia renderiza "0 OS" elegante; após criar 1 OS, métricas refletem.

## Fora do escopo

- Substituir mocks de Clientes/Colaboradores/Relatórios (próxima etapa).
- Upload de fotos das OS.
- Sistema real de papéis (gestor vs colaborador) com `user_roles`.
- Notificações/realtime.

## Resultado

Dashboard mostra exatamente o que existe no banco da empresa. Criar uma OS na tela "Nova OS" faz os números subirem. Clicar em qualquer card abre a listagem real filtrada. Identidade visual industrial mantida; "Operação de hoje" mais clara e útil; "Relatórios" sai da home.
