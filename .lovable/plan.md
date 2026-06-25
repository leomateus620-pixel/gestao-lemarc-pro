## Objetivo

Permitir vincular **vários técnicos** por OS, mantendo a OS única, com cálculo de horas distribuído por técnico em Relatórios, sem quebrar OS antigas (`technician_id` único) nem rotas existentes.

## 1. Banco de dados (migration)

Nova tabela `public.service_order_technicians`:

```
id uuid pk default gen_random_uuid()
service_order_id uuid not null references service_orders(id) on delete cascade
technician_id uuid not null references technicians(id) on delete cascade
assigned_at timestamptz default now()
assigned_by uuid null
is_primary boolean default false
created_at timestamptz default now()
unique (service_order_id, technician_id)
index (service_order_id), index (technician_id)
```

GRANT `SELECT, INSERT, UPDATE, DELETE` para `authenticated`, `ALL` para `service_role`. RLS habilitada com policies que reaproveitam a permissão da OS pai (EXISTS em `service_orders` com o mesmo critério já usado lá — ver policies existentes via `supabase--read_query` antes de escrever).

Backfill: para cada `service_orders` com `technician_id not null`, inserir vínculo com `is_primary = true`. `technician_id` é mantido por enquanto como compatibilidade (a aplicação passa a tratar a nova tabela como fonte primária).

## 2. Server functions (`reports.functions.ts`, `serviceOrders.functions.ts`)

- Ampliar `ORDER_SELECT` / `ROW_SELECT` para incluir:
  `assigned_technicians:service_order_technicians(technician_id, is_primary, technician:technicians(id, full_name, role))`
- `normalize()` expõe `technicians: TechnicianLite[]` (fallback: se vazio e `technician_id` existir, derivar do join legado).
- `createServiceOrder` recebe `technician_ids: string[]` (mantém `technician_id` opcional para compatibilidade) e, após inserir a OS, faz `insert` em lote em `service_order_technicians` (primeiro = `is_primary`). Mantém `technician_id` preenchido com o primário para legado.
- Nova `setServiceOrderTechnicians({ id, technician_ids })` para edição: diff + insert/delete.
- Filtro de técnico no relatório: trocar `query.eq("technician_id", id)` por filtro via `service_order_technicians` — usar `.in("id", subselect)` ou alterar o select para `service_order_technicians!inner(...).eq("technician_id", id)` e remover o filtro legado.

## 3. Types (`src/types/serviceOrder.ts`, `src/types/reports.ts`)

- `ServiceOrder.technicians: TechnicianLite[]` (substitui uso primário de `technician` único, que permanece para legado).
- `ReportOrderRow.technicians: { id; name; is_primary }[]`; manter `technician_id`/`technician_name` para compatibilidade até remover usos.
- Sem `any`. Types do Supabase serão regenerados após a migration.

## 4. Cálculo de horas

Helpers em `src/lib/serviceOrders/metrics.ts`:
- `getServiceOrderWorkedMinutes(order)` — já existe lógica equivalente em `computeOrderRow`; consolidar como função pura única reutilizada em ambos os módulos (reports/metrics e serviceOrders/metrics).
- `groupMinutesByTechnician(rows)` — para cada OS, somar `worked_minutes_effective` em cada técnico vinculado (fallback: se sem vínculos, usar `technician_id` legado; se nenhum, ignorar para esse grupo).

Regra clara:
- **KPI "Horas totais"**: soma única por OS (não multiplica por técnicos).
- **"Horas por técnico"**: soma da duração da OS para cada técnico vinculado (pode exceder o total — nota explicativa no card e no PDF).

## 5. Wizard de criação (`ServiceOrderWizard.tsx`)

Etapa "Técnico" passa de seleção única para múltipla:
- Estado `selectedTechnicianIds: string[]` em vez de `technicianId`.
- Lista com checkbox/chip selecionável, busca, "Cadastrar novo" auto-adiciona o recém-criado.
- Área superior "Técnicos selecionados (N)" com chips removíveis.
- Permite zero técnicos ("Sem técnico definido").
- Impede duplicidade na UI (Set).
- Revisão final lista todos os técnicos; fallback "Sem técnico definido".
- Submit envia `technician_ids` ao server fn.

## 6. Edição da OS

Adicionar diálogo/seção em `_app.ordens.$id.tsx` para editar técnicos vinculados via `setServiceOrderTechnicians` (mutation + invalidate). Mantém o restante do fluxo.

## 7. Detalhe, cards e listagem

- `_app.ordens.$id.tsx`: substituir bloco "Técnico" único por "Técnicos responsáveis" (lista com cargo, destaque do primário; vazio = "Sem técnico definido"). Fallback para `technician` legado quando `technicians` vazio.
- `ServiceOrderCard.tsx`, `_app.ordens.index.tsx`, `_app.dashboard.tsx`: renderizar `technicians` como `"Nome1, Nome2 +N"` (helper `formatTechnicianList(technicians, max=2)`).

## 8. Menu Relatórios

- `ReportCharts.tsx`: gráfico/card "Horas por técnico" usa `groupMinutesByTechnician`; adicionar legenda discreta explicando a regra.
- `ReportOrdersTable.tsx`: coluna "Técnico" → "Técnicos", lista compacta.
- `ReportsFilters.tsx`: filtro por técnico continua igual no UI; backend já adaptado para usar a M2M.
- `managerial.ts`: seção "Produtividade por técnico" usa a nova agregação (OS, horas distribuídas, OS concluídas, tempo médio). Nota: *"Horas por técnico consideram a duração total da OS para cada técnico vinculado."*
- `ManagerialReportDocument.tsx`: mostrar nomes concatenados na tabela de OS.
- `export.ts` (CSV): coluna `Técnicos` = `"Ricardo; Eduardo; Juan"`.
- `getClientReport`: idem (lista todos os técnicos por OS).

## 9. Compatibilidade

Helper `getOrderTechnicians(order)`:
1. `order.technicians` (M2M) se houver itens
2. `order.technician` (legado) embrulhado em array
3. `[]`

Usado em todos os pontos de leitura (cards, detalhe, relatórios). Garante que OS antigas continuem visíveis.

## 10. RLS e segurança

Policies do `service_order_technicians` espelham `service_orders` via EXISTS no pai (sem service role no frontend, todas as fns usam `requireSupabaseAuth`).

## 11. Validação

- `bun run build` + lint dos arquivos alterados.
- Teste manual via Playwright: criar OS com 0/1/3 técnicos; abrir detalhe; conferir card/lista; abrir `/relatorios`, validar "Horas por técnico" distribuídas, filtro por técnico, CSV e PDF.
- Conferir OS antiga (apenas `technician_id`) ainda aparece e contabiliza.

## Arquivos afetados

**Migration nova:** `supabase/migrations/<ts>_service_order_technicians.sql`

**Backend:**
- `src/lib/api/serviceOrders.functions.ts`
- `src/lib/api/reports.functions.ts`

**Domínio/helpers:**
- `src/types/serviceOrder.ts`, `src/types/reports.ts`
- `src/lib/serviceOrders/metrics.ts` (novo helper consolidado)
- `src/lib/reports/metrics.ts`, `src/lib/reports/managerial.ts`, `src/lib/reports/export.ts`
- novo `src/lib/serviceOrders/technicians.ts` (helpers `getOrderTechnicians`, `formatTechnicianList`, `groupMinutesByTechnician`)

**UI:**
- `src/components/ordens/ServiceOrderWizard.tsx` (etapa Técnico + revisão + submit)
- `src/components/app/ServiceOrderCard.tsx`
- `src/routes/_app.ordens.$id.tsx` (detalhe + edição de técnicos)
- `src/routes/_app.ordens.index.tsx`, `src/routes/_app.dashboard.tsx`
- `src/components/reports/ReportOrdersTable.tsx`, `ReportCharts.tsx`, `ReportsFilters.tsx`, `ReportGenerateDialog.tsx`, `print/ManagerialReportDocument.tsx`

**Não tocar:** rotas públicas, `client.ts`, types auto-gerados (regenerados pós-migration), `routeTree.gen.ts`.
