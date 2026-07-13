## Objetivo

Tornar a seção **"Apuração de Horas"** (na tela da OS) totalmente editável de forma inline e intuitiva, permitindo:

1. **Editar horário** de entrada/saída/data de cada linha.
2. **Excluir** uma linha de apontamento.
3. **Vincular/transferir** um horário para outro técnico (trocar o técnico dono da linha).
4. **Ajustar R$/h** por linha quando necessário.
5. **Adicionar** um novo apontamento manual.

Todas as alterações persistem no banco e refletem imediatamente no PDF, no resumo financeiro (Mão de obra, Total geral), no `worked_minutes`/`hour_rate` da OS e nos relatórios (gerenciais e por cliente/técnico).

---

## UX proposta

Na `Section "Apuração de horas"` de `src/routes/_app.ordens.$id.tsx` (admin apenas, mesma regra do resumo financeiro):

- Cada linha ganha um botão **"Editar"** (ícone lápis) e **"Excluir"** (ícone lixeira) no final.
- Botão **"+ Novo apontamento"** acima da tabela.
- Ao clicar em Editar, a linha vira modo edição com inputs inline: técnico (Select dos técnicos vinculados à OS), data, entrada, saída, R$/h. Ações: **Salvar** / **Cancelar**.
- Antes de excluir, `AlertDialog` de confirmação exibindo técnico + horário.
- Feedback via toast + recálculo automático dos KPIs.
- Estado de salvando: spinner no botão, linha desabilitada, sem duplicar cliques.
- Validações em tempo real: saída > entrada, R$/h > 0, técnico obrigatório; erros exibidos na própria linha.

Para não-admins a tabela continua somente-leitura (idêntica ao atual).

---

## Backend (server functions)

Novo arquivo/adições em `src/lib/api/financials.functions.ts`:

- `updateLaborEntry({ entryId, patch })` — patch com `technician_id?`, `role?`, `work_date?`, `start_time?`, `end_time?`, `hourly_rate_cents?`, `description?`. Recalcula `duration_minutes` e `subtotal_cents` via `computeDurationMinutes` / `computeSubtotalCents`. Valida `end > start`, `rate > 0`, técnico existente na tabela `technicians`. Rejeita IDs "derived:*" (força um self-heal antes: chama `getOrderFinancials` para persistir os derivados).
- `deleteLaborEntry({ entryId })` — remove a linha, exige ao menos uma linha remanescente ou permite zerar (bloqueia se OS `finished`/`closed` e sem substituição? — permitir; recalcula tudo).
- `createLaborEntry({ orderId, entry })` — insere manualmente. Usa a hora do técnico como fallback.
- Todas as três, ao final, **recalculam** `service_order_financials` (total_labor_minutes, total_labor_cents, grand_total_cents mantendo displacement + materials) e `service_orders` (`worked_minutes`, `hour_rate` ponderado). Reutiliza o helper interno de recomputação já existente na finalização — extrair para função `recomputeOrderTotals(sb, orderId)` para reuso.
- Middleware `requireSupabaseAuth` + `assertAdmin` (padrão do arquivo).
- Invalida caches no cliente: `["order-financials", orderId]`, `["service-orders"]`, `["reports"]`, `["technician-labor-history"]`.

Nenhuma migração de banco é necessária — a tabela `service_order_labor_entries` já tem todas as colunas.

---

## Componente

Novo componente `src/components/ordens/LaborEntriesEditor.tsx` que renderiza a tabela editável. `_app.ordens.$id.tsx` passa a usá-lo dentro da `Section "Apuração de horas"` quando `isAdmin`. Recebe `order`, `entries`, `techs` (via `getOrderTechnicians(order)` para o select de vínculo).

- Estado local por linha: `editingId`, `draft`, `saving`.
- `useMutation` para update/delete/create; `onSuccess` invalida `["order-financials", order.id]` para o `FinancialsSection` re-renderizar automaticamente.
- Reutiliza `computeDurationMinutes`, `computeSubtotalCents`, `formatBRL`, `formatHHmm`, `parseBRLToCents` de `serviceOrders/finance`.

---

## Reflexo no PDF e relatórios

- O PDF (`ServiceOrderReportDocument`) e o resumo financeiro já leem via `getOrderFinancials`, então basta invalidar o cache — nenhuma alteração de PDF necessária.
- Relatórios gerenciais (`listServiceOrderFinancialSummaries`, `listTechnicianLaborHistory`) leem direto da tabela — refletem automaticamente após update/delete/insert.
- `worked_minutes` e `hour_rate` da OS são atualizados por `recomputeOrderTotals`, mantendo dashboards e cards de OS consistentes.

---

## Cuidados / não-quebrar

- **Não** alterar a lógica de derivação de sessões existente (self-heal continua funcionando para OSes antigas). O editor só age sobre linhas já persistidas — se a OS ainda tem `id` "derived:*", forçamos um `getOrderFinancials` primeiro para materializar os registros reais.
- **Não** alterar rotas nem o dialog de finalização (continua funcionando em paralelo).
- **Não** tocar em `service_order_time_sessions` — o histórico bruto de pausas/retomadas permanece intacto como auditoria.
- Concorrência: usar `.eq("service_order_id", orderId).eq("id", entryId)` para garantir escopo.
- Permissão: `assertAdmin` em todas as mutations; UI só mostra controles se `isAdmin`.

---

## Passos de implementação

1. Adicionar `recomputeOrderTotals`, `updateLaborEntry`, `deleteLaborEntry`, `createLaborEntry` em `src/lib/api/financials.functions.ts`.
2. Criar `src/components/ordens/LaborEntriesEditor.tsx` com tabela + edição inline + AlertDialog de exclusão.
3. Ligar em `_app.ordens.$id.tsx` dentro da `Section "Apuração de horas"` (admin only).
4. Invalidar `["order-financials", order.id]` em cada mutation.
5. Teste manual: editar horário → conferir KPIs, PDF e Relatório do cliente.

Sem alterações em rotas, schema ou fluxo de finalização.