## Objetivo

Permitir que técnicos editem, direto no bloco "Histórico" do "Controle de tempo da OS", **os próprios apontamentos de tempo** (início / fim / pausa / retomada), reutilizando o mesmo fluxo de recálculo já usado pela "Apuração de horas". Origem única da verdade: `service_order_time_sessions` → materializa `service_order_labor_entries` → recomputa `service_order_financials` e `service_orders.worked_minutes`.

## Fonte da verdade confirmada

- `service_order_time_sessions` (append-only, com `duration_minutes` GERADO pelo banco): registra `work`/`displacement`, `started_at`, `ended_at`, `end_reason` (`pause`|`finish`), `pause_reason/notes`.
- `service_order_labor_entries`: materializado a partir das sessões em `getOrderFinancials` quando `labor_entries_adjusted_at` é nulo; após primeiro ajuste, torna-se a cópia canônica editável.
- `service_order_financials` + `service_orders.worked_minutes/hour_rate`: recomputados por `recomputeOrderTotals()`.
- Já existe RLS na tabela de sessões: `UPDATE` permitido para `created_by = auth.uid()` OU admin. **Precisa ser fortalecido** para exigir também que o técnico seja o dono da sessão (ver §5).

## Escopo

**Alterar:** `service_order_time_sessions` (política RLS + coluna de auditoria), `timeSessions.functions.ts` (nova server fn), `financials.functions.ts` (helper reutilizável de recompute), `ServiceOrderTimeHistory.tsx`, `ServiceOrderTimeControl.tsx`, novo diálogo/bottom-sheet, testes.

**NÃO alterar:** autenticação, rotas, "Apuração de horas" (`LaborEntriesEditor`), fluxo start/pause/resume/finish, módulo Leitos Aramados, cadastros.

## 1. Backend — server function `updateOwnTimeSession`

Novo arquivo/adição em `src/lib/api/timeSessions.functions.ts`:

```ts
updateOwnTimeSession({
  sessionId, started_at, ended_at?, pause_reason?, pause_notes?, reason: string
})
```

Fluxo transacional:
1. `requireSupabaseAuth` (bearer obrigatório).
2. Resolver técnico pelo `user_id` autenticado (`technicians.user_id = auth.uid()`).
3. Carregar sessão; abortar se `technician_id !== meuTechId`.
4. Confirmar que o técnico está vinculado à OS via `service_order_technicians` OU `service_orders.technician_id`.
5. Bloquear se OS estiver `finished` / `approved` / `cancelled` ou se `service_order_financials.finalized_at IS NOT NULL` → retorna erro amigável "OS encerrada — solicite ao administrador".
6. Não permitir "fechar" uma sessão aberta pela edição (`ended_at` só editável se já existia); não permitir mudar `kind`.
7. Validar: `started_at < ended_at`; sem sobreposição com outra sessão `work` do mesmo técnico na mesma OS (excluindo a própria).
8. Persistir campos permitidos + `source='admin_adjustment'` (marca como ajuste) + nova coluna `adjusted_by`, `adjusted_at`, `adjustment_reason` (ver §2).
9. Chamar `syncLaborEntriesFromSessions(orderId)` (extraído da lógica existente em `getOrderFinancials`) — regrava `labor_entries` derivadas, **desde que** `financials.labor_entries_adjusted_at` seja `NULL` (mesma regra atual: se admin já ajustou manualmente, retorna erro pedindo para o admin editar via Apuração de horas).
10. `recomputeOrderTotals()` (já existente).
11. Retornar sessão normalizada.

Observações:
- A `duration_minutes` da sessão é **coluna gerada** — nada a persistir manualmente.
- Concorrência: `UPDATE ... WHERE id = ? AND updated_at = ?` para evitar overwrite silencioso; senão erro "O registro foi alterado por outro usuário. Atualize a tela e tente novamente."

## 2. Migração (mínima e aditiva)

```sql
ALTER TABLE public.service_order_time_sessions
  ADD COLUMN IF NOT EXISTS adjusted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS adjusted_at timestamptz,
  ADD COLUMN IF NOT EXISTS adjustment_reason text;
```

RLS reforçada (substitui a atual `"Authenticated can update own or admin"` — que autorizava qualquer criador; agora exige dono real da sessão OU admin):

```sql
DROP POLICY "Authenticated can update own or admin" ON service_order_time_sessions;
CREATE POLICY "Own technician or admin can update session"
ON service_order_time_sessions FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(),'admin')
  OR technician_id IN (SELECT id FROM technicians WHERE user_id = auth.uid())
);
```

Sem `DROP TABLE` / `TRUNCATE`. Nenhuma outra política/tabela impactada.

## 3. Frontend — UI

### `ServiceOrderTimeHistory.tsx`
- Cada linha do histórico ganha um botão discreto (ícone lápis) **só** quando:
  - `item.technicianId === myTechId` (ou usuário é admin), e
  - a OS não está travada, e
  - o evento corresponde a uma sessão editável (start/pause/finish — ou seja, tem `sessionId`).
- Passar `sessions` cruas (não só `timeline`) para o componente ou expandir `TimelineItem` com `sessionId`. Ajustar `buildTimeline()` para incluir `sessionId` sem quebrar consumidores atuais.
- Indicador visual "Horário ajustado" quando `source === 'admin_adjustment'` + `adjusted_at`.
- Mobile: linha reflow para 2 linhas, botão editar com alvo ≥44px alinhado à direita.

### Novo `EditTimeSessionSheet.tsx`
- Desktop: `Dialog` compacto. Mobile: `Sheet side="bottom"` full-height com safe-area.
- Campos: técnico (readonly), data + hora de início, data + hora de término (se `ended_at`), duração calculada em tempo real, motivo (obrigatório se registro histórico), Cancelar / Salvar ajuste.
- Estado local em string para permitir apagar (evita bug já visto em outros formulários).
- Validação client-side espelha a do servidor; foco no primeiro campo inválido; loading no botão salvar; evita duplo submit.

### `ServiceOrderTimeControl.tsx`
- Ao salvar: `invalidateQueries` em `["order-time-sessions", order.id]`, `["order-financials", order.id]`, `["service-order", order.id]`, `["service-orders"]`, `["report-orders"]`, `["client-report"]`, `["technician-labor-history"]` — mesmo conjunto usado pelo LaborEntriesEditor. Sem reload manual.

## 4. Reuso do pipeline "Apuração de horas"

Extrair de `getOrderFinancials` a função pura `syncLaborEntriesFromSessions(sb, orderId, userId)` que:
- Se `financials.labor_entries_adjusted_at IS NOT NULL` → **não sincroniza** (admin travou); retorna sem erro para o técnico, mas a server fn `updateOwnTimeSession` rejeita a edição com mensagem clara ("Este apontamento já foi consolidado pelo administrador. Solicite ajuste via Apuração de horas.").
- Caso contrário: regrava `service_order_labor_entries` a partir das sessões fechadas (mesmo algoritmo `deriveEntriesFromSessions` já existente).
- Chama `recomputeOrderTotals`.

Assim, PDF, relatórios e KPI/dashboard leem a mesma verdade.

## 5. Segurança em camadas

- Cliente: botão só aparece quando `myTechId === session.technician_id` e OS não travada.
- Server fn: verifica `technicians.user_id = auth.uid()`, propriedade da sessão, vínculo com OS, status permitido.
- RLS: política reforçada (§2) impede update mesmo que a server fn seja burlada.
- IDs de técnico **nunca** vêm do cliente; sempre derivados de `auth.uid()`.

## 6. Auditoria

- Colunas novas `adjusted_by / adjusted_at / adjustment_reason` na própria linha (a sessão original é mutada porque `duration_minutes` é gerada; para preservar histórico de valores, gravamos o antes/depois em `metadata` JSONB — já existente):
  ```json
  { "adjustments": [{ "at": "...", "by": "user-id", "reason": "...", "before": {"started_at":"...","ended_at":"..."}, "after": {...} }] }
  ```
- Histórico visual mostra "Horário ajustado" + data; detalhe (before/after) apenas para admin (já natural, já que só admin vê `metadata` via Apuração/relatórios).

## 7. Testes

- `timeSessions.functions.test.ts` (novo): dono edita própria sessão OK; outro técnico rejeitado; usuário não vinculado à OS rejeitado; OS finalizada rejeitada; sobreposição rejeitada; `ended_at <= started_at` rejeitado; concorrência (updated_at stale) rejeitada; sincroniza `labor_entries`; travamento por `labor_entries_adjusted_at` respeitado.
- Atualizar `dashboardTechnicianTime.test.ts` se necessário (não deve mudar).
- Teste visual manual conforme roteiro do usuário (browser via Playwright pós-implementação).

## 8. Aceite

- Técnico edita só as próprias linhas do histórico direto no card de Controle de Tempo.
- Duração recalcula automaticamente (coluna gerada) e labor_entries + financials + `worked_minutes` + PDF/relatórios refletem imediatamente.
- Nenhum mock, nenhuma alteração em autenticação/rotas/Apuração de horas.
- `bun typecheck`, `bun test` focados, e build passam.

## Detalhes técnicos

- `updateOwnTimeSession` fica em `timeSessions.functions.ts` para manter proximidade dos consumidores; `syncLaborEntriesFromSessions` é movido para `src/lib/serviceOrders/laborSync.server.ts` (importado inside handler para evitar leak SSR).
- `duration_minutes` da sessão continua vindo do banco; o backend só valida start/end antes do UPDATE.
- Nova coluna `adjustment_reason` é opcional em sessões abertas (correção em tempo real) e obrigatória em sessões fechadas.
- Nenhuma migração destrutiva; políticas antigas conflitantes removidas explicitamente (`DROP POLICY IF EXISTS`).