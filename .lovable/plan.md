## Diagnóstico

Todo o código do PR #24 já está presente no workspace Lovable e conectado corretamente:

- `src/lib/api/notifications.functions.ts` — `syncServiceOrderAssignmentNotifications`, `listTechnicianAssignedOrderNotifications`, `markServiceOrderNotificationRead`, `dismissServiceOrderNotification` (todas com `requireSupabaseAuth`, filtragem por `user_id`, dedupe por unique key, dispensa técnicos removidos).
- `src/hooks/useTechnicianNotifications.ts` — hook com `staleTime: 15s` e `queryKey` própria.
- `src/components/dashboard/TechnicianAssignedOrderNotification.tsx` — modal com "Abrir OS agora" / "Ver depois".
- `src/routes/_app.dashboard.tsx` — consome o hook e renderiza a notificação dentro de `TechnicianHome`.
- `src/lib/api/serviceOrders.functions.ts` — `createServiceOrder` e `setServiceOrderTechnicians` chamam `syncAssignmentNotificationsSafely` (falha silenciosa com `console.warn`, não quebra a criação da OS).
- Arquivo `supabase/migrations/20260707033000_service_order_notifications.sql` existe com tabela, índices, GRANTs, RLS e 3 políticas (SELECT/INSERT/UPDATE) corretas.

**Problema único encontrado:** a migration **não foi aplicada** ao banco do Lovable. Verifiquei com `to_regclass('public.service_order_notifications')` → `NULL`. Como consequência:

- `src/integrations/supabase/types.ts` não contém `service_order_notifications` (o arquivo é regenerado só após rodar a migration).
- Toda chamada ao fluxo de notificação hoje falha em runtime (`relation does not exist`) — mas graças ao wrapper `syncAssignmentNotificationsSafely`, a criação/edição da OS continua funcionando; apenas nenhuma notificação é gerada e o `useQuery` do técnico vem vazio.

## Correção

Aplicar exatamente a migration `20260707033000_service_order_notifications.sql` já versionada, sem alterações — ela contém:

1. `CREATE OR REPLACE FUNCTION public.user_is_order_technician` (versão ampliada que também considera `service_orders.technician_id` legado).
2. `CREATE TABLE public.service_order_notifications` com todos os campos exigidos + `UNIQUE (service_order_id, technician_id, type)`.
3. Índices `idx_son_user_unread`, `idx_son_service_order`, `idx_son_technician`.
4. `GRANT SELECT, INSERT, UPDATE ... TO authenticated` + `GRANT ALL ... TO service_role`.
5. `ENABLE ROW LEVEL SECURITY` + 3 policies:
   - **SELECT**: `user_id = auth.uid() OR is_admin() OR user_owns_order(service_order_id)`.
   - **INSERT**: exige `user_id` e `technician_id` consistentes com `technicians.user_id`, e caller admin ou dono da OS.
   - **UPDATE**: mesmo escopo, com `WITH CHECK` mantendo consistência técnico↔user.

Após a migration ser aprovada e executada, o gerador do Supabase atualiza `src/integrations/supabase/types.ts` automaticamente. Nenhum outro arquivo precisa ser tocado.

## Validação pós-migration

1. Confirmar via `supabase--read_query` que `service_order_notifications` existe e traz as 3 policies.
2. Rodar `supabase--linter` para garantir zero avisos novos.
3. Rodar `tsgo` (o typecheck automático do build) — sem mudanças de código, deve permanecer verde.
4. Fluxo funcional (a executar depois no preview, por conta do usuário ou via Playwright se solicitado):
   - Admin cria OS vinculada a técnico com `user_id` → linha em `service_order_notifications` com `read_at` e `dismissed_at` nulos.
   - Técnico entra em `/dashboard` → modal aparece uma vez.
   - "Abrir OS agora" → grava `read_at` e navega para `/ordens/$id`.
   - "Ver depois" → grava `dismissed_at`; reload não reabre.
   - Remover técnico da OS via `setServiceOrderTechnicians` → notificação pendente do técnico removido é marcada como `dismissed_at` com `metadata.cancel_reason = "technician_removed"`.

## Fora de escopo (não será alterado)

- Nenhuma mudança de UI, tipografia, layout, cores, animação.
- Nenhuma mudança em rotas existentes, criação/finalização de OS, PDF, relatórios, autenticação ou navegação do admin.
- Nenhum arquivo `.ts/.tsx` será editado — apenas a migration já existente será aplicada.
