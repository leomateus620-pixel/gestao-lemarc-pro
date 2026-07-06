## Objetivo
Adicionar o perfil `tecnico` com acesso restrito ao fluxo operacional da OS (Início, criar OS, executar, assinar, fotografar, finalizar), bloqueando menus administrativos, valores financeiros e a etapa de revisão/cobrança. Manter `admin` intacto.

## 1. Modelo de papéis (Supabase)
Migration:
- Adicionar valor `'tecnico'` ao enum `public.app_role` (`ALTER TYPE ... ADD VALUE IF NOT EXISTS 'tecnico'`).
- Criar função `public.current_user_is_admin()` e `public.current_user_is_tecnico()` (SECURITY DEFINER, usam `has_role(auth.uid(), ...)`).
- Ajustar `handle_new_user` (ou trigger de bootstrap) para atribuir `'tecnico'` por padrão em `user_roles` quando um novo usuário for criado e não houver admin ainda existente / regra: primeiro usuário do sistema = admin; demais novos = `tecnico`. Nunca rebaixar admins existentes (INSERT ... ON CONFLICT DO NOTHING).
- RLS: adicionar policies restritivas para o papel técnico:
  - `service_order_financials`, `service_order_labor_entries`: SELECT/UPDATE apenas para `admin` (bloqueia técnico).
  - `service_orders`: técnico só lê OS onde é `created_by` ou está vinculado em `service_order_technicians`.
  - `clients` / `client_units`: técnico apenas SELECT (necessário para o wizard) e INSERT (para criar cliente/unidade dentro do fluxo da OS). UPDATE/DELETE apenas admin.
  - `technicians`, `technician_rate_history`: SELECT admin-only; técnico só lê seu próprio registro (via `user_id = auth.uid()`).
  - `service_order_signatures`, `service_order_attachments`, `service_order_time_sessions`: técnico pode CRUD apenas em OS que lhe pertence.
- Manter `service_role` com GRANT ALL onde já existe.

## 2. Server functions
- `src/lib/api/serviceOrders.functions.ts`: em `listServiceOrders` / `getServiceOrder`, quando o usuário for técnico, filtrar apenas OS onde ele é técnico atribuído ou `created_by`, e remover `hour_rate` do payload retornado.
- `src/lib/api/financials.functions.ts`: adicionar guard `if (!isAdmin) throw` em todas as leituras/escritas financeiras (`getOrderFinancials`, updates de displacement/materials, aprovações).
- `updateServiceOrderStatus`: para técnico, permitir transições até `review` (finalizar → review), bloquear `approved` e edições após.
- `updateTechnician`, `createClient` administrativos: bloquear se não-admin (exceto `createClient` mínimo usado pelo wizard, mantido acessível para técnico).
- Adicionar helper `assertAdmin(context)` reutilizável.

## 3. Hook de papel
- Substituir `RoleContext` mockado por leitura real de `useUserRole()` (já existente). Expor `role: 'admin' | 'tecnico'`, `isAdmin`, `isTecnico`.
- `RoleSwitcher` só aparece para admin (para QA); técnico não pode alternar.

## 4. Route guards
- Criar `src/lib/auth/requireAdminRoute.ts` com helper `beforeLoad` que redireciona não-admin para `/dashboard`.
- Aplicar em `_app.ordens.index`, `_app.ordens.$id.imprimir`, `_app.clientes.*`, `_app.colaboradores.*`, `_app.relatorios*`, `_app.mais`.
- Em `_app.ordens.$id.tsx`: permitir acesso a técnico apenas se ele for atribuído/criador; caso contrário redirect.
- `_app.ordens.nova.tsx`: permitido para ambos.

## 5. UI — navegação e telas
- `BottomNav.tsx`: filtrar itens pelo papel. Técnico vê apenas `Início` + `Sair` (ícone LogOut à direita). Layout responsivo mantido.
- `_app.dashboard.tsx`: renderizar variante `TechnicianHome` quando `isTecnico`, com:
  - Botão grande "Nova OS" → `/ordens/nova`.
  - Lista "Minhas OS ativas" (pendentes/em execução/em pausa atribuídas ao técnico).
  - Sem cards financeiros, sem KPIs administrativos, sem métricas de faturamento.
  - Empty states pt-BR: "Nenhuma OS atribuída a você.", "Crie uma nova OS para iniciar um atendimento."
- `_app.ordens.$id.tsx`:
  - Ocultar bloco `FinancialSummary` (linhas ~490+), coluna de `hourly_rate_cents` na tabela de labor, "Aprovar para cobrança" e a transição `review → approved` quando técnico.
  - Em `ServiceOrderTimeHistory` passar prop `hideMoney` para técnico.
- `FinalizeServiceOrderDialog.tsx`: variante enxuta para técnico — apenas notas de execução + confirmar finalização; sem revisar valores. Após submit, exibir toast "OS finalizada e enviada para revisão." e navegar para `/dashboard`.
- `ServiceOrderWizard.tsx`: manter todos campos operacionais; se houver campo financeiro exposto (tarifa/horas), esconder para técnico.

## 6. Localização e UX
Todo texto novo em pt-BR. Mobile-first, botões grandes, sem menções a "valores", "faturamento", "cobrança" em telas de técnico.

## 7. Validação
- `bunx tsgo` para tipo.
- Playwright: login (usar sessão injetada), rota `/dashboard` como técnico (simular alterando role via SQL de teste), tentar `/clientes` → redirecionado, criar OS, iniciar/pausar/finalizar, conferir ausência de valores.
- Admin: percorrer `/relatorios`, `/ordens/$id` (ver financeiro), aprovar cobrança.

## Detalhes técnicos
- Não editar `types.ts` manualmente — será regenerado após a migration.
- `assertAdmin` chama `context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' })`.
- Rotas técnicas usam `beforeLoad` async chamando um `getMyRole` serverFn cacheável em `queryClient` para evitar flash.
- Manter todas policies existentes; adicionar restritivas (`AS RESTRICTIVE`) somente onde necessário para não quebrar admin.

## Entregáveis
Migration + serverFn guards + hooks + guards de rota + variante TechnicianHome + BottomNav filtrado + finalize dialog reduzido + ocultação de financeiro na OS. Admin sem regressão.