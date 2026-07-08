## Problema

Na Home do técnico (`src/routes/_app.dashboard.tsx` → `TechnicianHome`), a lista `technicianOrders` inclui todos os status visíveis (`pending`, `dispatched`, `transit`, `running`, `finished`, `review`) sem limite de data. Como ordena por `technicianStatusRank` primeiro, OS antigas em `finished`/`review` ficam empilhadas junto com as recentes, empurrando OS novas para baixo e poluindo a tela.

## Correção (escopo: apenas Home do técnico)

Criar um helper isolado `src/lib/serviceOrders/technicianHomeOrders.ts` com:

- `filterTechnicianVisibleOrders(orders, { now })`: mantém OS do técnico que atendem a QUALQUER regra:
  - status ativo (`pending`, `dispatched`, `transit`, `running`) — sempre relevante;
  - `finished`/`review` com `finished_at` (ou fallback `updated_at`) dentro das últimas 48h;
  - `approved` apenas se `opened_at`/`created_at` for de hoje ou ontem;
  - descarta `cancelled` e tudo que caia fora dessas janelas.
- `sortTechnicianOrders(orders)`: ordena da mais recente para a mais antiga usando `opened_at → created_at → updated_at`.
- `TECHNICIAN_HOME_LIMIT = 20`.
- `splitTechnicianHomeOrders(orders)`: aplica filtro + ordenação, retorna `{ primary, older }` onde `primary` tem até 20 e `older` são as OS do técnico que sobraram (para expansão opcional).

## Alterações em `_app.dashboard.tsx` (função `TechnicianHome` apenas)

1. Substituir o `.filter(...).sort(compareTechnicianOrders)` atual por:
   - filtrar primeiro por "OS do técnico logado" (mantendo a checagem atual via `getOrderTechnicians` + legacy `technician_id`);
   - passar por `splitTechnicianHomeOrders` → obter `primary` (até 20) e `older`.
2. `technicianOrders = primary` alimenta `TechnicianOrderList` e o contador `actionCount` (calculado só sobre `primary`, evitando contar OS ocultas).
3. Se `older.length > 0`, renderizar abaixo da lista um botão discreto "Ver OS anteriores (N)" que revela um `<details>`/estado local expandido com essas OS antigas (usando o mesmo `TechnicianOrderCard`), ordenadas por mais recente. Sem nova rota, sem redesign.
4. Empty state quando `primary.length === 0`: manter card existente mas atualizar texto para "Nenhuma OS recente atribuída a você."
5. Remover/limpar `compareTechnicianOrders`, `technicianStatusRank`, `technicianPriorityRank`, `dateValueForSort` que passam a viver dentro do novo helper (mantendo apenas o que a função admin `Dashboard` ainda usa — nenhum é usado lá).

## Fora de escopo (não tocar)

- `Dashboard` (admin/gestor), `useOperationalDashboard`, métricas, cards operacionais.
- `useServiceOrdersQuery` (compartilhado) — continua trazendo tudo; filtro é client-side só no ramo técnico.
- Criação/execução/pausa/finalização/notificações/PDF/relatórios.
- `TechnicianOrderCard`, `TechnicianOrderList` (apenas recebe outra lista; sem mudanças estruturais).

## Testes de aceitação (manuais na preview)

1. OS nova no topo; OS mais nova ainda acima.
2. OS aprovada/finalizada há +48h não aparece na lista principal.
3. OS de ontem em execução aparece.
4. Máximo 20 na principal; "Ver OS anteriores" mostra o restante.
5. Contador "Abertas" reflete só a principal.
6. Admin/gestor inalterado (dashboard admin não usa o novo helper).
7. Abrir OS a partir do card continua navegando para `/ordens/$id`.

Arquivos alterados:
- novo: `src/lib/serviceOrders/technicianHomeOrders.ts`
- edit: `src/routes/_app.dashboard.tsx` (apenas `TechnicianHome` e helpers locais dela)
