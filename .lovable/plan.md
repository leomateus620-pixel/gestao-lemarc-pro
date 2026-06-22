## Objetivo
Tornar oficial o registro e a exibição do horário de **abertura**, **fechamento** e **tempo total** das Ordens de Serviço, reaproveitando a arquitetura existente e adicionando UI consistente em Home, Ordens, Detalhe e Cliente. Sem mocks, sem quebra de rotas.

## Validação da arquitetura atual (já confirmada)
A tabela `public.service_orders` já possui todos os campos necessários:
- `opened_at timestamptz NOT NULL DEFAULT now()` → preenchido automaticamente na criação.
- `started_at`, `finished_at`, `approved_at`, `closed_at timestamptz` → já são atualizados pela server fn `updateServiceOrderStatus` (em `serviceOrders.functions.ts`): `running → started_at`, `finished → finished_at`, `approved → approved_at + closed_at`.
- `status service_order_status NOT NULL`, `updated_at` com trigger.

Conclusão: **nenhuma migração de schema é necessária**. A única lacuna é (a) o `closed_at` não ser gravado em outros encerramentos operacionais (cancelamento, finished sem aprovação) e (b) não existir formatação/UX de tempo total.

## Mudanças

### 1. Backend — `src/lib/api/serviceOrders.functions.ts`
Ajustar `updateServiceOrderStatus` para que `closed_at` reflita **qualquer encerramento operacional**:
- `finished` → também setar `closed_at = now()` (mantendo `finished_at`). Hoje só `approved` fecha; cards em "Concluída" ficariam sem fechamento.
- `cancelled` → setar `closed_at = now()` (para histórico), sem `approved_at`.
- `approved` → mantém comportamento atual.
- Reabertura (qualquer transição de status fechado para `pending`/`running`) → limpar `closed_at`, `finished_at`, `approved_at` conforme o destino, para não exibir tempo total falso.

Sem novas tabelas de eventos (escopo recomenda "apenas se fizer sentido"; o histórico já é derivável dos timestamps existentes — fica como dívida explícita).

### 2. Tipos — `src/types/serviceOrder.ts`
Helpers de classificação:
- `isClosedStatus(status)` → true para `finished | approved | cancelled`.
- `closureKind(order)` → `'concluida' | 'aprovada' | 'cancelada' | null`.

### 3. Utilidades de tempo — novo `src/lib/serviceOrders/time.ts`
Funções puras, timezone `America/Sao_Paulo` por padrão (sem mudar timezone global):
- `formatServiceOrderDateTime(iso)` → `"hoje, 11:46"`, `"ontem, 16:10"`, `"22/06, 10:29"`.
- `formatRelativeServiceOrderTime(iso)` → `"há 15min"`, `"há 2h"`, `"há 3d"`.
- `formatServiceOrderDuration(openedAt, closedAt)` → `"45min"`, `"1h34min"`, `"2d 3h"`.
- `getOpenedAt(order)` → `order.opened_at ?? order.created_at`.
- `getClosedAt(order)` → `approved_at ?? finished_at ?? closed_at` priorizando o mais relevante por status; retorna `null` se ainda aberta.
- `getDurationMinutes(order)` → calculado dinamicamente; `null` se aberta.

Substitui (consolidando) `formatShortDateTime`/`formatElapsed` que hoje vivem inline em `ServiceOrderCard.tsx`.

### 4. UI — `src/components/app/ServiceOrderCard.tsx`
Substituir o bloco "Aberta / Prevista" do `MetaLine` inferior por uma **mini-timeline compacta** (chips, mantendo navy + identidade atual):

- **OS aberta** (`pending | dispatched | transit | running | review`):
  - Chip 1: `Aberta hoje, 11:46` (ícone Clock3).
  - Chip 2 (se houver): `Prevista hoje, 12:00` (CalendarClock).
  - Chip 3: `há 15min` (tom neutro).
- **OS fechada** (`finished | approved`):
  - Chip 1: `Aberta hoje, 11:46`.
  - Chip 2: `Fechada hoje, 13:20` (CheckCircle2).
  - Chip 3 destacado: `Tempo total 1h34min` (tabular-nums, accent do status).
- **OS cancelada**:
  - Chip 1: `Aberta ...`.
  - Chip 2: `Cancelada hoje, 13:20` (XCircle, tom destructive).
  - Sem "Tempo total".
- **Fallbacks**: `Abertura não registrada` / `Fechamento não registrado` (tom muted, italic), sem quebrar layout.

O rodapé `SummaryChip` atual deixa de duplicar `formatElapsed` (passa a ser parte da timeline). As pendências (técnico/unidade/dados) seguem inalteradas.

### 5. Detalhe da OS — `src/routes/_app.ordens.$id.tsx`
Adicionar bloco "Linha do tempo" com as mesmas três informações em formato vertical (Aberta · Iniciada · Fechada · Tempo total), reusando as utilidades novas. Sem mexer em ações já existentes.

### 6. Home / Ordens / Cliente
Como todos consomem `ServiceOrderCard`, ganham o comportamento automaticamente. Verificar `_app.dashboard.tsx`, `_app.ordens.index.tsx` e `_app.clientes.$id.tsx` apenas para confirmar que nenhum exibe tempo por conta própria (substituir se sim).

### 7. Validação
- `bun tsc --noEmit` (executado pela harness no build).
- Playwright headless (1280x1800 e 390x844): criar OS, abrir card → confirmar "Aberta ..."; mover OS para `approved` via UI/server fn → confirmar "Fechada ..." + "Tempo total". Screenshots em `/tmp/browser/os-tempo/`.
- `psql` para conferir 1 linha real pós-fechamento (opened_at, closed_at, approved_at preenchidos).

## Fora de escopo (dívida sinalizada)
- Tabela `service_order_events` (histórico granular) — não criada; timestamps cobrem o caso de uso atual.
- `duration_minutes` persistido — calculado dinamicamente para evitar drift.
- `closed_by` — exige novo campo + ajustes RLS; pode ser feito numa próxima rodada se solicitado.

## Critérios de aceite
- `opened_at` salvo na criação (já é); aparece em todos os cards.
- `closed_at` salvo em `finished`/`approved`/`cancelled`; limpo em reabertura.
- Tempo total exibido **somente** quando há fechamento real.
- OS aberta mostra tempo decorrido (`há Xmin/h/d`), nunca "tempo total".
- Rotas existentes intactas, sem mocks, responsivo em desktop/mobile.
