## Problema

No card **"Controle de tempo da OS"** (arquivo `src/components/ordens/ServiceOrderTimeControl.tsx`), o técnico selecionado por padrão é o `is_primary` (Douglas). Como as ações (Iniciar / Pausar / Retomar / Encerrar meu tempo) só aparecem para o técnico marcado como `selectedTech`, quando o **Juan** entra no perfil dele e abre a mesma OS, ele vê o cartão do Douglas selecionado e não consegue mexer no próprio cronômetro sem trocar o dropdown manualmente. No perfil do Douglas funciona por coincidência (ele é o primary).

Já validei também que o botão **"Iniciar serviço"** do card **"Próxima ação"** (em `src/routes/_app.ordens.$id.tsx`, `startServiceMutation`) já dispara `startWork` para **todos** os técnicos vinculados via `Promise.allSettled` — então esse fluxo em si está correto, só precisa que cada perfil enxergue o próprio cronômetro rodando.

## Correção (frontend apenas, sem tocar rota/DB/fluxos)

Editar somente `src/components/ordens/ServiceOrderTimeControl.tsx`:

1. Importar `useAuth` (`@/components/app/AuthContext`) e `useUserRole` (`@/hooks/useUserRole`).
2. Calcular `myTechId = technicians.find(t => t.user_id === user?.id)?.id ?? null`.
3. Ajustar o `useEffect` de auto-seleção do `selectedTech` com esta ordem de preferência:
   - `myTechId` (o técnico do usuário logado), se existir;
   - senão, o `is_primary`;
   - senão, `technicians[0]`.
4. Para papel **técnico** (`isTecnico && myTechId`):
   - Forçar `selectedTech = myTechId` (ignorar troca) e **ocultar o `<select>` de Técnico**, já que o técnico só opera o próprio tempo.
   - Trocar a regra atual `isSelected = t.id === selectedTech || technicians.length === 1` para `isSelected = t.id === myTechId` — garante que os botões de ação apareçam sempre na linha do próprio técnico, independente do padrão de dropdown.
5. Admin/operador continuam com o comportamento atual (dropdown livre, podendo alternar entre técnicos).

Nada disso muda:
- Rotas (`_app.ordens.$id.tsx`, `_app.colaboradores.*`, etc.).
- Schema, RLS, políticas ou server functions (`timeSessions.functions.ts` permanece igual).
- Fluxo do card "Próxima ação" (o loop de `startWork` para todos os técnicos já está correto).
- Botão de exclusão de OS, wizard de edição de colaborador, ou qualquer outro fluxo já consolidado.

## Como validar

1. Como **Juan**, abrir a OS `/ordens/<id>` → o cartão "Juan Husch" já aparece como selecionado, com **"Iniciar serviço" / "Pausar" / "Retomar"** habilitados; o dropdown de técnico não aparece.
2. Clicar em "Iniciar serviço" no card **"Próxima ação"** → cronômetros de Juan **e** Douglas ficam ativos no banco (`service_order_time_sessions`).
3. Como **Douglas**, abrir a mesma OS → cartão do Douglas selecionado, ele controla apenas o próprio tempo; vê o cartão do Juan com badge "Ativo/Pausado" mas sem botões.
4. Como **admin**, abrir a OS → dropdown de técnico visível, mantém comportamento atual.
