
# Revisão do módulo Colaboradores

A causa raiz do bug em `/colaboradores/novo` é simples: `_app.colaboradores.tsx` é simultaneamente layout e tela cheia (não renderiza `<Outlet />`), então todas as rotas filhas batem no parent e mostram a lista. O padrão correto já está em `clientes`. A partir daí, encadeio correções de rotas, dados e visual.

## 1. Arquitetura de rotas (correção crítica)

- Reescrever `src/routes/_app.colaboradores.tsx` para ser **apenas layout**:
  ```tsx
  export const Route = createFileRoute("/_app/colaboradores")({
    component: () => <Outlet />,
  });
  ```
- Criar `src/routes/_app.colaboradores.index.tsx` com `createFileRoute("/_app/colaboradores/")` contendo a visão geral (todo conteúdo atual: KPIs, filtros, lista, error boundary, skeleton).
- Validar `/colaboradores`, `/colaboradores/novo`, `/colaboradores/$id`, `/colaboradores/$id/editar|horas|ordens` com refresh direto e botão voltar.
- `routeTree.gen.ts` é regenerado automaticamente — não tocar manualmente.

## 2. Submenus / abas (Opção B — simplificar)

Remover as 4 pseudo-abas que não navegam para lugar nenhum ("Perfis", "Horas trabalhadas", "Histórico de OS", "Valor/hora"). Manter apenas:

- **Visão geral** (link `/colaboradores`)
- **Novo colaborador** (link `/colaboradores/novo`)

Dentro do perfil do colaborador (`$id`), as abas reais já existem (Perfil, Horas, Ordens, Editar) — apenas conferir que estão como `<Link>` com `activeProps`. Não criar rotas gerais novas (`/colaboradores/horas`, `/colaboradores/valores`) nesta entrega; é escopo de produto separado.

## 3. Dados, cálculos e separação real vs. estimado

- **Fonte real**: `service_order_labor_entries` (horas, `hourly_rate_cents`, subtotal).
- **Fallback estimado**: vínculo via `service_order_technicians` ou legado `service_orders.technician_id` sem apontamento individual.

Regras a aplicar em `src/lib/serviceOrders/collaborators.ts` e `financials.functions.ts`:

- KPI "Mão de obra mês" do dashboard e do perfil = **somente** soma de `service_order_labor_entries` do colaborador no período. Nunca somar tempo total da OS para todos os técnicos.
- Expor separadamente `valueMonthCentsEstimated` e `hoursMonthEstimatedMinutes` quando houver OS vinculadas sem apontamento. UI mostra como segunda linha "Estimado: R$ X · Y h" ou badge "Sem apuração".
- Listagem de colaboradores deve sempre puxar: nome, função, especialidade, status ativo/inativo, valor/hora atual, telefone, e-mail, usuário vinculado, horas trabalhadas no mês (reais), OS abertas, OS finalizadas, último atendimento. Auditar o `CollaboratorSummary` e completar campos faltantes.
- Em `/colaboradores/$id/horas`: se entradas reais = 0 mas há OS vinculadas, mostrar mensagem explícita "Este colaborador possui OS vinculadas, mas ainda não possui apontamentos individuais finalizados." em vez de KPIs zerados sem contexto.
- Em `/colaboradores/$id/ordens`: deduplicar união de fontes (`service_order_technicians` ∪ `labor_entries` ∪ legado `technician_id`); ao expandir, mostrar descrição inicial, descrição executada pelo colaborador, horas dele, subtotal dele, outros técnicos.

## 4. Migration e regras de preço histórico

- Conferir se `supabase/migrations/20260629143000_colaboradores_module.sql` existe e foi aplicada (campos: `email, cpf, specialty, active, kind, default_availability, hourly_rate_50_cents, hourly_rate_100_cents, pricing_notes, internal_notes` + tabela `technician_rate_history`).
- Validar RLS por `has_role(auth.uid(),'admin')` para CRUD do gestor; validar GRANTs.
- Garantir trigger/insert em `technician_rate_history` ao alterar valor/hora.
- Em `createServiceOrderLaborEntry` (criação real), o `hourly_rate_cents` é **congelado** vindo do cadastro no momento da criação — alterações futuras no cadastro NÃO recalculam apontamentos antigos. OS novas usam o valor atual. Auditar o caminho em `serviceOrders.functions.ts` para confirmar isso.
- Se migration não estiver aplicada, falhar com erro claro ao salvar (não silenciar).

## 5. Cadastro `/colaboradores/novo`

Após corrigir rotas, o wizard já renderiza. Refinos no `CollaboratorForm`:

- Renomear o campo "ID do usuário" para seção avançada **"Vincular usuário do sistema (opcional)"** com texto explicativo.
- Aplicar máscara visual em telefone e CPF usando utilitários existentes (`src/lib/cnpj.ts` como referência; criar `mask/phone.ts` simples se necessário).
- Validar valor/hora > 0; permitir 0 apenas com confirmação ("Sem valor/hora cadastrado bloqueia a finalização da OS — confirmar?").
- Garantir `padding-bottom` com `env(safe-area-inset-bottom)` para o botão fixo não cobrir campos no mobile.

## 6. Uso de colaboradores em OS

Em `ServiceOrderWizard.tsx`, `FinalizeServiceOrderDialog.tsx`, `_app.ordens.$id.tsx`:

- Selector de técnicos filtra `active = true` por padrão; toggle "Mostrar inativos" como opção avançada.
- Busca por nome/função.
- Valor/hora exibido apenas para perfil admin (já há `useUserRole`).
- Ao selecionar, prefill da função e valor/hora atuais.
- Na finalização: valor/hora vem do cadastro, gestor pode ajustar, valor final salvo em `service_order_labor_entries.hourly_rate_cents` (congelado).

## 7-13. Refinamento visual

**`CollaboratorIslandRow`**:
- Linha horizontal com grid `[avatar 40px | nome+função | status pill | R$/h pill | horas mês tabular | OS abertas | última OS truncada | botão ⌄]` no desktop.
- Mobile: grid `[avatar | min-w-0 nome+meta | ⌄]` com função/status/horas em duas linhas internas, todas com `truncate` e `min-w-0`.
- Avatar sempre à esquerda, botão expandir sempre à direita (`grid-cols-[auto_minmax(0,1fr)_auto]`), nunca quebra abaixo do avatar.
- Status como pill com cor por status; "R$/h A definir" pill âmbar discreta.
- Tipografia: nomes em Title Case consistente (helper de normalização), funções abreviadas padronizadas ("Tec. Eletricista"). Remover `uppercase` + `tracking-[0.14em]` de textos pequenos sensíveis a leitura; manter apenas em labels técnicos.
- Números com `tabular-nums`.

**Linha expandida**: remover mini-cards quadrados. Trocar por uma régua horizontal:
`Valor mês · OS concluídas · Hoje · Especialidade`, separadores por `·`. Botões de ação (Perfil, Horas, Ordens, Editar, Última OS) em chips horizontais com `min-h-10` para mobile.

**Cabeçalho/KPIs do index**:
- Reduzir altura do bloco hero (`p-4 sm:p-5` mantido, mas sem `text-3xl`; usar `text-xl sm:text-2xl`).
- KPIs em linha compacta única; separar "Mão de obra mês" real de "Estimado".
- Botão "Novo colaborador" no topo do módulo (mantido), e remover a duplicação com tabs.

**AppShell / BottomNav**:
- Auditar `BottomNav.tsx` e `AppShell.tsx`: garantir `padding-bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))` no `<main>` das telas com listas longas.
- z-index da topbar acima do conteúdo; conteúdo com `padding-top` adequado.

## 14. Arquivos a editar

- `src/routes/_app.colaboradores.tsx` (vira layout)
- `src/routes/_app.colaboradores.index.tsx` (novo — conteúdo da lista)
- `src/components/colaboradores/CollaboratorIslandRow.tsx` (refino visual + tipografia + expansão)
- `src/components/colaboradores/CollaboratorForm.tsx` (máscara, valor/hora, seção avançada)
- `src/components/colaboradores/format.ts` (helpers Title Case, função abreviada, formatMoneyOrZero com badge "estimado")
- `src/lib/serviceOrders/collaborators.ts` (separar real/estimado)
- `src/lib/api/serviceOrders.functions.ts` e `financials.functions.ts` (auditar congelamento de rate; expor agregados separados)
- `src/hooks/useServiceOrders.ts` (se novos agregados precisarem de hook)
- `src/components/ordens/ServiceOrderWizard.tsx` + `FinalizeServiceOrderDialog.tsx` (filtro de ativos, rate do cadastro)
- `src/components/app/BottomNav.tsx` + `AppShell.tsx` + `src/styles.css` (safe-area + densidade)
- `src/lib/serviceOrders/collaborators.test.ts` (atualizar se mudar shape do summary)

NÃO mudar rotas de clientes, ordens e relatórios além de invalidações já existentes.

## 15-16. Validação

- `npm run build`
- `npx eslint` no escopo listado pelo usuário
- `npx vitest run src/lib/serviceOrders/collaborators.test.ts`
- Manualmente via Playwright (sandbox): visitar cada uma das 6 rotas, conferir refresh direto e bottom nav não cobrindo conteúdo em 1280/375.

## 17. Entrega

Resposta final com: rotas corrigidas, dados separados real/estimado, fallback identificado, abas reais, visual horizontal refinado, bottom nav OK, topbar OK, build/lint/teste verde, resumo das mudanças e quais dívidas preexistentes ficam fora do escopo (se houver).
