# Apuração financeira ao finalizar OS — Plano

## Objetivo
Ao finalizar uma OS, abrir uma etapa de **Apuração de horas e valores** que:
- Lista cada técnico vinculado, com horas trabalhadas, valor/hora editável e subtotal.
- Permite lançar deslocamento (sem / por km / valor fixo).
- Calcula total de mão de obra, deslocamento e total geral da OS.
- Persiste tudo no banco (sem mock).
- Alimenta o detalhe da OS e o PDF/relatório final no padrão Lemarc (refinado).

## Modelo de dados (migration nova, sem quebrar o atual)

1. `technicians.hourly_rate_cents int null` — valor/hora padrão do cadastro.
2. `service_order_technicians.role text null` — função na OS (técnico, auxiliar, responsável, apoio).
3. **`service_order_labor_entries`** — apontamentos de horas por técnico por dia:
   - `id, service_order_id, technician_id, role, work_date date, start_time time, end_time time, duration_minutes int, hourly_rate_cents int, subtotal_cents int, description text, created_by, created_at, updated_at`.
   - Check: `end_time > start_time` (sem virada de dia por enquanto).
   - RLS: leitura/escrita por usuários autenticados que enxergam a OS (mesma política das demais tabelas da OS).
4. **`service_order_financials`** (1:1 com OS):
   - `service_order_id PK, total_labor_minutes, total_labor_cents, displacement_type ('none'|'per_km'|'fixed'), displacement_count, displacement_km_total, displacement_rate_cents, displacement_total_cents, materials_total_cents, grand_total_cents, notes, finalized_at, finalized_by`.
5. GRANTs + RLS em todas as novas tabelas seguindo o padrão do projeto (authenticated CRUD, service_role ALL).
6. Backfill: nada obrigatório — OSs antigas continuam sem `financials`; o detalhe trata `null` como "ainda não apurado".

Valores monetários sempre em **centavos inteiros** no banco; conversão BRL apenas em UI/PDF.

## Backend (server functions, `src/lib/api/serviceOrders.functions.ts` + novo `financials.functions.ts`)

- `listLaborEntries({ orderId })` — lista apontamentos da OS.
- `upsertLaborEntry({ orderId, entry })` / `deleteLaborEntry({ id })` — manuseio individual durante a apuração.
- `getOrderFinancials({ orderId })` — retorna financials + entries agrupados por técnico.
- `finalizeServiceOrder({ orderId, entries[], displacement, materialsCents, notes })`:
  1. Valida que cada técnico vinculado tem ≥1 apontamento com `hourly_rate_cents` definido (>0).
  2. Recalcula `duration_minutes` e `subtotal_cents` server-side a partir de `start_time`/`end_time`.
  3. Substitui as labor entries da OS pelas novas (transação).
  4. Calcula totais e grava `service_order_financials`.
  5. Atualiza `service_orders.status='finished'`, `finished_at`, `closed_at`, `worked_minutes` (= total_labor_minutes), `hour_rate` legado = média ponderada (compat).
  6. Retorna OS + financials.
- `reopenServiceOrder` mantém financials como histórico; permite recalcular com confirmação.
- Autorização via `requireSupabaseAuth`; RLS garante isolamento.

## Cálculo (`src/lib/serviceOrders/finance.ts` — novo, com testes)

- `computeDurationMinutes(start, end)` — HH:mm → minutos; lança erro se `end <= start`.
- `minutesToDecimalHours(min)` — `min/60` arredondado a 4 casas.
- `computeSubtotalCents(min, rateCents)` — `Math.round(min * rateCents / 60)` (evita float).
- `computeDisplacementCents({type, count, kmTotal, rateCents, fixedCents})`.
- `computeTotals(entries, displacement, materialsCents)` → `{ totalLaborMinutes, totalLaborCents, displacementCents, materialsCents, grandTotalCents }`.
- Formatadores: `formatBRL(cents)`, `formatHHmm(min)`, `formatDecimalHours(min)`.
- Timezone: trabalhar com `date`/`time` puros (sem timestamp) para evitar surpresa de TZ; conversões UI usam America/Sao_Paulo.

Testes (vitest) cobrindo todos os exemplos do spec (9h30, 7h18, 9,5×R$85, múltiplos dias, múltiplos técnicos, deslocamento km/fixo, bloqueio sem rate).

## UI — Finalização

Novo componente `FinalizeServiceOrderDialog` (Sheet em mobile, Dialog largo em desktop), aberto pelo botão **Finalizar OS** no detalhe (`src/routes/_app.ordens.$id.tsx`) substituindo o atual `updateServiceOrderStatus('finished')`.

Etapas (steps internos):
1. **Apontamentos** — para cada técnico vinculado, lista de linhas (data, entrada, saída, função, descrição). Pré-popula com 1 linha por técnico usando `started_at`/`finished_at` se existirem. Botão "+ adicionar lançamento" por técnico. Validação inline de horário inválido.
2. **Valor/hora** — card por técnico com nome, função, total de horas calculado, input `Valor/hora` (máscara BRL, aceita vírgula/ponto), subtotal ao vivo. Default do `technicians.hourly_rate_cents`. Bloqueia avanço se algum estiver vazio/0 com mensagem clara.
3. **Deslocamento** — radio do tipo (`Sem` / `Por km` / `Valor fixo`) revelando os campos relevantes (qtd deslocamentos, km, R$/km, valor fixo, observação). Total calculado ao vivo.
4. **Revisão** — resumo financeiro (mão de obra, deslocamento, materiais opcional, **Total geral** destacado), preview do que vai no PDF. Botão **Confirmar finalização** chama `finalizeServiceOrder`.

Mobile: cards compactos, botão principal "sticky" próximo ao último campo via `FormFlowActions`. Desktop: tabela com colunas Técnico/Função/Horas/Valor-hora/Subtotal + resumo lateral.

## Detalhe da OS

Em `_app.ordens.$id.tsx`, quando existir `financials`:
- Nova seção **Resumo financeiro** (Total horas, Total mão de obra, Deslocamento, Materiais, **Total geral**).
- Nova seção **Apuração de horas** (tabela com técnico/data/entrada/saída/horas/R$ hora/subtotal).
- Botão "Editar apuração" reabre o dialog (apenas se status permitir).

## Relatório / PDF (`src/components/reports/print/ManagerialReportDocument.tsx` e nova rota `/relatorios/os/$id/imprimir`)

Refinar o documento de impressão da OS individual com identidade Lemarc:
- Cabeçalho com logo, título **RELATÓRIO DE ATIVIDADES**, número da OS.
- Bloco de metadados: Cliente, Unidade/local, Abertura, Fechamento, Responsável, Técnicos envolvidos.
- Seção **Trabalhos executados** (descrição da OS + descrições dos apontamentos).
- Seção **Apuração de horas** — tabela: Item, Funcionário, Data, Entrada, Saída, Total horas, R$/h, Subtotal, Descrição. Uma linha por profissional/dia (opção 1 do spec — mais segura para cálculo).
- Seção **Deslocamento** no padrão `DESLOCAMENTO (qtd) (km) ... (R$ x/km) — R$ total`.
- Seção **Resumo financeiro** em card destacado: Total horas, Mão de obra, Deslocamento, Materiais, **Total geral OS**.
- Tipografia maior, valores alinhados à direita, A4, sem sobreposição. Quando OS não estiver finalizada, esconder valores financeiros e mostrar aviso "Apuração financeira pendente".

Botão "Gerar relatório" existente passa a usar o novo template para OS finalizada.

## Segurança / persistência
- Sem mocks no fluxo. Tudo via Supabase + server functions autenticadas.
- RLS por OS (mesma política já existente em `service_orders`); novas tabelas seguem o mesmo modelo.
- `finalized_by`/`finalized_at` registrados a partir de `context.userId`.
- Reabertura preserva `service_order_financials` (histórico); recalcular requer nova confirmação no dialog.

## Validações antes de concluir
- `bun run lint` focado nos arquivos editados.
- `bunx vitest run` para `src/lib/serviceOrders/finance.test.ts`.
- Build automático.
- Smoke via Playwright: finalizar uma OS com 2 técnicos + deslocamento por km, conferir resumo no detalhe e PDF.

## Arquivos principais a criar/editar
- **Novo:** migration `…_service_order_financials.sql`.
- **Novo:** `src/lib/serviceOrders/finance.ts` + `finance.test.ts`.
- **Novo:** `src/lib/api/financials.functions.ts`.
- **Novo:** `src/components/ordens/FinalizeServiceOrderDialog.tsx` (+ subcomponentes por step).
- **Novo:** `src/components/ordens/OrderFinancialSummary.tsx`.
- **Novo:** `src/components/reports/print/ServiceOrderReportDocument.tsx` + rota `src/routes/_app.ordens.$id.imprimir.tsx`.
- **Editar:** `src/routes/_app.ordens.$id.tsx` (botão Finalizar, seções novas), `src/lib/api/serviceOrders.functions.ts` (parar de mover direto para `finished` sem apuração), `src/types/serviceOrder.ts` (tipos novos), `src/integrations/supabase/types.ts` (regenerado após migration).

## Fora de escopo (não mexe)
- Filtros do menu Relatórios (já corrigidos).
- Autenticação / rotas existentes / RLS de outras tabelas.
- Módulo de materiais — apenas reservamos campo `materials_total_cents` para futura integração.
