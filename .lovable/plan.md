## Objetivo
Implementar Pausar/Retomar em OS com contabilização de tempo líquido por técnico, sem quebrar fluxos existentes (`/ordens`, `/ordens/nova`, `/ordens/$id`, `/ordens/$id/imprimir`, finalização, assinatura, PDF, apuração, relatórios, auth).

## Estratégia de status
Manter o enum `ServiceOrderStatus` atual — **não** adicionar `paused`. O estado "pausada" é **derivado** da existência de uma sessão de trabalho aberta sem `ended_at` cujo técnico tem também um evento `work_pause` mais recente que o `work_start`/`work_resume`. Assim evitamos migração ampla em badges, filtros, relatórios e PDF. A UI mostra badge visual "Pausada" quando `status='running'` e não há sessão de trabalho ativa (todos os técnicos pausaram) ou uma badge amarela "Parcialmente pausada" quando ao menos um técnico está pausado. Motivo: fluxo com múltiplos técnicos exige controle por técnico, e o status global viraria ambíguo.

## Modelagem (migration única)
Tabela `public.service_order_time_sessions`:

```
id uuid pk default gen_random_uuid()
service_order_id uuid not null references service_orders(id) on delete cascade
technician_id uuid references technicians(id) on delete set null
kind text not null check (kind in ('work','displacement'))
started_at timestamptz not null default now()
ended_at timestamptz
duration_minutes integer generated always as
  (case when ended_at is null then null
        else greatest(0, extract(epoch from (ended_at - started_at))/60)::int end) stored
pause_reason text            -- só quando a sessão foi encerrada por pausa
pause_notes text
end_reason text check (end_reason in ('pause','finish','manual','resume_correction')) 
source text not null default 'mobile' check (source in ('mobile','desktop','admin_adjustment'))
notes text
metadata jsonb
created_by uuid references auth.users(id)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints & índices:
- Índice `(service_order_id, technician_id, ended_at)`.
- Índice parcial único: `unique (service_order_id, technician_id) where ended_at is null and kind='work'` — bloqueia duas sessões abertas do mesmo técnico.
- Trigger `updated_at`.
- GRANT SELECT/INSERT/UPDATE/DELETE ao `authenticated`; ALL ao `service_role`. RLS: leitura/escrita autenticada (mesmo padrão das outras tabelas de OS).

Sem alterar `service_order_labor_entries` — ela continua sendo o registro final consolidado.

## Server functions novas (`src/lib/api/timeSessions.functions.ts`)
Todas com `requireSupabaseAuth`:
- `listTimeSessions({ orderId })` — devolve sessões + eventos ordenados.
- `startWork({ orderId, technicianId })` — cria sessão `work` aberta; erra se já existe aberta desse técnico.
- `pauseWork({ orderId, technicianId, reason, notes })` — fecha sessão aberta, grava `end_reason='pause'`, `pause_reason`, `pause_notes`.
- `resumeWork({ orderId, technicianId, notes? })` — cria nova sessão `work` aberta.
- `finishWork({ orderId, technicianId? })` — fecha sessão(ões) aberta(s) com `end_reason='finish'`.
- `adjustSession({ id, started_at?, ended_at?, notes })` — apenas admin (checa `has_role(auth.uid(),'admin')`), `source='admin_adjustment'`.

Regras de integridade validadas server-side (não confiar no client): sessão aberta única por técnico, `ended_at >= started_at`, sem retomar sem pausa anterior, sem finalizar OS com sessão aberta (a finalização financeira encerra automaticamente e sinaliza aviso).

## Cálculo de tempo líquido
Helper `src/lib/serviceOrders/timeSessions.ts`:
- `computeTechnicianWorkedMinutes(sessions, technicianId)` — soma `duration_minutes` das sessões `work` fechadas + (agora - started_at) da aberta se for "live".
- `computeOrderWorkedMinutes(sessions)` — soma por técnico e total.
- `groupHistory(sessions)` — histórico cronológico "Iniciado / Pausado (motivo) / Retomado / Finalizado".

## Integração com finalização financeira
No `FinalizeServiceOrderDialog`:
- Ao abrir, se existirem sessões, **pré-preencher `entries`** com uma entry por técnico agregando tempo líquido (start_time = 1ª sessão do dia, end_time = start + duração líquida; work_date = data local). Gestor pode ajustar.
- Manter fluxo manual atual como fallback quando não há sessões.
- Nada muda em `service_order_labor_entries` (schema, cálculo `subtotal_cents = duração/60 * rate`).
- Aviso visual quando entry deriva de sessões: "Calculado automaticamente a partir do controle de tempo".

## UI — componentes novos em `src/components/ordens/`
- **`ServiceOrderTimeControl.tsx`** — bloco no detalhe da OS, mobile-first, com estados:
  - Não iniciado: botão grande "Iniciar serviço" (selector de técnico se >1 e o atual não é definido).
  - Em execução por técnico X: card com cronômetro live, botões grandes "Pausar" e "Finalizar meu serviço"; lista compacta dos demais técnicos ativos/pausados.
  - Pausado (todos): badge "Pausada" + motivo + horário + tempo trabalhado antes; botão "Retomar".
  - Finalizado: totais por técnico + histórico.
- **`PauseServiceOrderDialog.tsx`** — modal com select de motivo (Almoço, Aguardando cliente, Aguardando peça, Deslocamento externo, Fim do expediente, Hotel/retorno amanhã, Problema de acesso, Outro), textarea observação (obrigatória se "Outro"), select de técnico quando aplicável. Safe-area para bottom nav.
- **`ServiceOrderTimeHistory.tsx`** — timeline compacta reutilizável (OS aberta + PDF).

Integrado em `src/routes/_app.ordens.$id.tsx` — o bloco novo substitui/complementa os botões antigos "Iniciar/Pausar" já rascunhados (ícones `Pause`/`Play` já importados). Não altera outras seções.

## PDF
Em `src/components/reports/print/ServiceOrderReportDocument.tsx` e `src/lib/reports/serviceOrderDownload.ts`:
- Usar tempo líquido apurado (já vem via `service_order_labor_entries`, sem mudança estrutural).
- Adicionar uma linha compacta "Pausas registradas: Almoço 12:00–13:30; …" **apenas quando** houver sessões de pausa. Sem seção extra grande, sem quebra de página forçada.

## Permissões
- Técnico: iniciar / pausar / retomar / finalizar próprias sessões. Não edita histórico salvo, não altera financeiro.
- Gestor (`has_role('admin')`): `adjustSession`, finalizar com sessão aberta (registra `source='admin_adjustment'` + justificativa obrigatória).
- RLS reflete isso (política de UPDATE/DELETE só para admin em sessões já fechadas).

## Detecção "Pausada" visual (sem alterar enum)
Derivada em `src/lib/serviceOrders/timeSessions.ts` e exposta como helper `getOrderLiveState(order, sessions)` → `'idle'|'running'|'partially_paused'|'fully_paused'|'finished'`. Usada no `ServiceOrderIslandRow` para pintar uma sub-badge amarela sem tocar em `StatusBadge`.

## Arquivos afetados
- Novos: migration SQL, `src/lib/api/timeSessions.functions.ts`, `src/lib/serviceOrders/timeSessions.ts`, `src/components/ordens/ServiceOrderTimeControl.tsx`, `PauseServiceOrderDialog.tsx`, `ServiceOrderTimeHistory.tsx`.
- Editados: `src/routes/_app.ordens.$id.tsx` (insere bloco), `src/components/ordens/FinalizeServiceOrderDialog.tsx` (pré-preenche entries), `src/components/reports/print/ServiceOrderReportDocument.tsx` (linha de pausas), `src/lib/reports/serviceOrderDownload.ts` (idem), `src/components/ordens/ServiceOrderIslandRow.tsx` (sub-badge pausa).
- **Não** alterados: `serviceOrders.functions.ts` (status enum intacto), `financials.functions.ts` schema, `types/serviceOrder.ts` enum, `types/financials.ts`, `/ordens/nova`, assinatura, auth.

## Validação
1. `bunx tsgo --noEmit` limpo.
2. Fluxo simples: iniciar 08:00 → pausar 12:00 → retomar 13:30 → finalizar 17:00 → líquido 7h30, subtotal correto.
3. Múltiplas pausas: verificar soma.
4. Dois técnicos, um pausa: outro continua contando; totais separados.
5. Finalização gera `service_order_labor_entries` com valores corretos; PDF baixado mostra tempo líquido + linha de pausas.
6. Playwright mobile viewport: botões visíveis, modal não coberto pela bottom nav.
7. Constraint: tentar abrir 2 sessões do mesmo técnico deve falhar; retomar sem pausa deve falhar.

## Fora do escopo
- Login individual do técnico em campo (usa selector/primário como fallback).
- Alterar enum de status.
- Redesign de filtros/relatórios existentes.
- Cronômetro em push/realtime (usa refetch on focus).
