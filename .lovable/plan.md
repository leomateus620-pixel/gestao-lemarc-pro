## Área de Clientes — refator real + unidades + integração com OS

Substituir mocks por dados reais (Supabase), expandir o cadastro de cliente com campos completos, criar tabela de **unidades** vinculadas, e organizar rotas para reutilização em OS, dashboard e relatórios.

### Banco de dados (migration)

**Alterar `public.clients`** adicionando colunas:
- `cnpj text unique` (com índice; validado server-side)
- `segment text`, `address text`, `city text`, `state text`
- `phone text`, `email text`
- `responsible_name text`
- `active boolean not null default true`

> A coluna legada `unit text` será mantida por compatibilidade temporária (a wizard de OS atual usa `clients.unit` apenas como label). Nada será deletado.

**Criar `public.client_units`**:
- `id uuid pk`, `client_id uuid fk → clients(id) on delete cascade`
- `name text not null`, `is_primary boolean default false`
- `sector text`, `city text`, `state text`, `address text`
- `responsible_name text`, `phone text`, `notes text`
- `active boolean default true`, `created_by`, `created_at`, `updated_at`
- Índice por `client_id`; GRANTs `authenticated`+`service_role`; RLS por owner (mesmo padrão de `clients`).

**Alterar `public.service_orders`**:
- Adicionar `client_unit_id uuid references client_units(id) on delete set null` + índice.

### Server functions (`src/lib/api/`)

`clients.functions.ts` (novo) e expandir `serviceOrders.functions.ts`:
- `listClientsFull` — clientes + agregados (unit_count, os_open, os_done) via consultas com count.
- `getClient(id)` — detalhe + unidades + métricas.
- `createClient(input)` — empresa + array opcional de unidades (insere tudo numa transação lógica; primeira unidade marcada principal). Verifica CNPJ duplicado.
- `updateClient(id, patch)`, `deleteClient(id)`.
- `listClientUnits(clientId)`, `createClientUnit`, `updateClientUnit`, `deleteClientUnit`.
- `listServiceOrdersByClient(clientId)`.
- Ajustar `createServiceOrder` para aceitar `client_unit_id`.

Tipos em `src/types/client.ts`.

### Rotas (TanStack file-based, prefixo `_app`)

- `/clientes` — lista (`_app.clientes.index.tsx`, refator do atual).
- `/clientes/novo` — wizard de cadastro (`_app.clientes.novo.tsx`).
- `/clientes/$id` — detalhe com abas Visão geral / Unidades / OS / Contatos (`_app.clientes.$id.index.tsx`).
- `/clientes/$id/editar` — edição (`_app.clientes.$id.editar.tsx`).
- `/clientes/$id/unidades/nova` — nova unidade.
- `/clientes/$id/unidades/$unitId` — detalhe/edição da unidade.

A rota atual `_app.clientes.tsx` vira layout `_app.clientes.tsx` (só `<Outlet/>`) + `_app.clientes.index.tsx`.

### Tela `/clientes`

- Header com identidade Lemarc (eyebrow, título "Clientes industriais", subtítulo, CTA "Cadastrar empresa").
- 4 métricas reais: Empresas ativas, Unidades, OS ativas (status ≠ approved/cancelled), Com pendência.
- Busca por nome / CNPJ / cidade / segmento / responsável / unidade (client-side sobre dados carregados).
- Chips: Todos · Com OS ativa · Sem OS · Ativos · Inativos.
- `ClientCard` (novo) refinado: nome, CNPJ, segmento, cidade/UF, badges (X unidades · Y OS abertas · Z concluídas), responsável, telefone/e-mail, status, ações rápidas (Detalhes / Nova OS / Adicionar unidade / Editar).
- Empty state premium quando 0 clientes.

### Cadastro `/clientes/novo`

Wizard 4 etapas (mesmo padrão visual da wizard de OS já aprovada):
1. **Dados da empresa** — nome*, CNPJ* (máscara + validação 14 dígitos + checagem de duplicidade server-side), segmento.
2. **Localização & contato** — cidade*, UF*, endereço, telefone, e-mail, responsável.
3. **Unidades** — lista editável (add/remove inline). Permite zero unidades; primeira marcada como Matriz/principal.
4. **Revisão** — resumo + "Criar cliente".

Após salvar: redireciona para `/clientes/$id`.

### Detalhe `/clientes/$id`

- Header: nome, badge ativo/inativo, CNPJ, cidade/UF; botões "Nova OS", "Adicionar unidade", "Editar".
- 4 cards resumo: unidades, OS abertas, em andamento, concluídas + última OS aberta + técnico recente.
- Tabs (Tabs do shadcn já existem): Visão geral, Unidades, OS, Contatos, Histórico.
- Aba **Unidades**: cards com nome, local, responsável, contagem OS, status; ações editar/desativar.
- Aba **OS**: usa `listServiceOrdersByClient` com filtros (status, período, técnico, prioridade).

### Integração com OS

- `ClientStep` da wizard atual passa a buscar pelo novo `listClientsFull` (mantendo shape compatível).
- Adicionar `UnitStep` opcional dentro da etapa Cliente: após selecionar empresa com unidades, mostrar seletor de unidade (com opção "Sem unidade específica").
- Preencher `client_unit_id` no payload.
- Botão "Nova OS" do detalhe/unidade navega para `/ordens/nova?clientId=…&unitId=…`; wizard lê search params e pré-seleciona.
- Dashboard: substituir contagem de "clientes ativos" pela contagem real via OS reais (já existe hook — apenas confirmar consumo do agregado novo).

### Componentes a criar

`src/components/clientes/`:
- `ClientsHeader.tsx`, `ClientsMetrics.tsx`, `ClientMetricCard.tsx`
- `ClientsSearchAndFilters.tsx`, `ClientCard.tsx`, `ClientEmptyState.tsx`
- `wizard/ClientWizard.tsx` + steps + `UnitsEditor.tsx`
- `detail/ClientDetailHeader.tsx`, `ClientSummaryCards.tsx`, `ClientUnitsSection.tsx`, `ClientServiceOrdersSection.tsx`, `UnitCard.tsx`, `UnitForm.tsx`

Hooks: `useClients`, `useClient`, `useClientUnits`, `useClientServiceOrders`, `useClientMetrics`.

Utils: `src/lib/cnpj.ts` — máscara + validação de DV + normalizador.

### Visual / motion

Mantém tokens navy/laranja/cyan, glass cards, micro-spring no hover (mesmo padrão da home/wizard de OS). Sem framer-motion novo — usar transitions CSS + `usePhysicsCard` existente quando fizer sentido. Respeita `prefers-reduced-motion`.

### Remoção de mocks

- Apagar uso de `src/lib/mock/clients.ts` na tela; manter arquivo intocado (outros lugares podem referenciar — só remover import na nova `_app.clientes.index.tsx`).

### Fora do escopo

- Importação em lote de CNPJs / consulta Receita.
- Anexos por cliente / upload de logo.
- Permissões granulares por cliente.
- Refator visual de outras telas que não a área de clientes.

### Verificação final

- Migration aplicada, types regenerados.
- `bun run build` limpo.
- Playwright: criar empresa com 2 unidades → abrir detalhe → criar OS pré-vinculada → conferir em `/ordens` e dashboard.
