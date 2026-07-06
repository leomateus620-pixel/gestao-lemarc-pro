## Diagnóstico

1. **Botão "Revisar e finalizar" continua ativo após revisão**: `finalizeServiceOrder` grava `service_order_financials.finalized_at` mas mantém `status = "finished"`. A UI usa apenas `order.status` para decidir se `adminReview` está ativo, então após salvar a apuração o card continua aparecendo.
2. **Técnico continua vendo o Controle de tempo após a finalização**: `<ServiceOrderTimeControl />` é renderizado incondicionalmente em `_app.ordens.$id.tsx`.
3. **Técnico vê OSs de outros**: `TechnicianHome` chama `useServiceOrdersQuery()` sem filtrar por técnico logado; qualquer OS que o RLS deixar passar aparece em "Últimas OS".
4. **Aba "Ordens" na bottom nav do técnico**: `/ordens` está listada em `TECNICO_ROUTES`, mas a rota tem `RequireAdmin` — o técnico vê a aba, clica e leva um bloqueio. Regra pedida: pós-finalização, o técnico só vê a OS no menu "Início".

## Correção

### 1. Esconder "Revisar e finalizar" após apuração salva (`src/routes/_app.ordens.$id.tsx`)

- Buscar `getOrderFinancials(order.id)` (já importado) com `useQuery` no admin. Definir `alreadyFinalized = Boolean(financials?.finalized_at)`.
- `adminReview = isAdmin && !alreadyFinalized && (status === "running" | "finished" | "review")`.
- Quando `alreadyFinalized` for verdadeiro, o card "Próxima ação" some para o admin. A OS mostra apenas os totais consolidados (o `FinancialBlock` já cobre isso e tem o botão "Editar" via `onEdit`, que continua permitindo reabrir a apuração se necessário).

### 2. Esconder Controle de tempo para técnico após finalização (`_app.ordens.$id.tsx`)

- Renderizar `<ServiceOrderTimeControl />` apenas quando `!(isTecnico && (status === "finished" || "review" || "approved" || "cancelled"))`. Admin continua vendo (pode reabrir se preciso).
- O card verde "OS finalizada e enviada para revisão." já existente permanece como única sinalização para o técnico.

### 3. Filtrar OSs por técnico logado (`src/routes/_app.dashboard.tsx` → `TechnicianHome`)

- Descobrir o `technician.id` correspondente ao `user.id` logado (via `useTechniciansQuery` + match por `user_id`).
- Filtrar `orders` para manter só as em que o técnico faz parte de `getOrderTechnicians(order)` (por id) ou é o `technician_id` legado.
- "OS em execução" segue mostrando só status ativos; "Últimas OS" passa a listar as OSs finalizadas/aprovadas/canceladas do próprio técnico — atendendo "uma vez finalizada, só aparece no menu Início".

### 4. Remover aba "Ordens" da navegação do técnico (`src/components/app/BottomNav.tsx`)

- `TECNICO_ROUTES` passa a conter apenas `/dashboard` e `/mais`. A rota `/ordens/:id` continua funcionando quando o técnico abre a OS a partir de "Início".

## Fora de escopo

- Alterações no `finalizeServiceOrder`, RLS, ou máquina de estados.
- Fluxo do admin em `approved`/`cancelled`.
- Listagem/relatórios do admin.

## Validação

- Admin abre OS finalizada pelo técnico → card "Revisar e finalizar OS" aparece → clica, edita valores/deslocamento, confirma → dialog fecha, card some, `FinancialBlock` mostra totais consolidados (com botão "Editar" para reabrir se preciso).
- Técnico abre OS já finalizada → vê hero + card verde "OS finalizada"; sem controle de tempo, sem botão de reabrir.
- Técnico no /dashboard vê só OSs em que está cadastrado, tanto em "OS em execução" quanto em "Últimas OS" (finalizadas inclusas).
- BottomNav do técnico mostra Início e Mais; toque em uma OS de "Últimas OS" abre `/ordens/{id}` normalmente.
