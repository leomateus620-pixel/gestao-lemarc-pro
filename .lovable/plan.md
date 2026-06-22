## Problema

A tela `/clientes/:id` está lenta e às vezes mostra erro porque ela:

1. Faz **3 RPCs** sequenciais via Suspense: detalhe do cliente (`getClientDetail`) **e** a lista **completa** de OS (`listServiceOrders`) para depois filtrar no front por `client_id`. Com o crescimento das OS, esse fetch fica grande e lento, e qualquer falha na junção pesada (`clients`, `technicians`, `client_units`) derruba a página inteira.
2. Não tem **loader** na rota — só Suspense — então nada é pré-carregado quando o usuário passa o mouse no card de "Visualizar" na listagem. Cada clique espera tudo do zero.
3. Reusa a query global `["service-orders"]` (sem `staleTime` real para o detalhe), então mesmo voltar e abrir outro cliente refaz toda a lista.

## Solução estrutural

Buscar **apenas o necessário para a tela**, em **uma única chamada paralela**, com **prefetch no hover** da listagem.

### 1. Novo server function `getClientPage` (`src/lib/api/clients.functions.ts`)

Retorna num único round-trip:

```text
{
  client,                 // 1 row (clients)
  units,                  // N rows (client_units do cliente)
  orders: [               // só OS deste client_id, colunas enxutas
    id, number, title, status, priority,
    opened_at, scheduled_for, finished_at,
    client_unit:client_units(id, name)
  ],
  counts: { open, running, pending, done, total } // computado server-side
}
```

Implementação: `Promise.all` de 3 selects no Supabase (`clients` por id, `client_units` por `client_id`, `service_orders` por `client_id` ordenado por `opened_at desc`). Sem o join pesado com `technicians` (não é usado nessa tela). `counts` agregado no handler para não enviar arrays redundantes ao cliente.

### 2. Hook + loader

- `useClientPageQuery(id)` em `src/hooks/useClients.ts` com `queryKey: ["client-page", id]`, `staleTime: 30_000`.
- Loader da rota `_app.clientes.$id.tsx` chama `context.queryClient.ensureQueryData(...)` para o id — TanStack Router já pré-carrega no `mouseenter` do `<Link>`, então abrir o cliente fica instantâneo após hover.
- Mantém `errorComponent` e `notFoundComponent` (já existem) e adiciona `pendingComponent` mais leve.

### 3. Refatorar `_app.clientes.$id.tsx`

- Remover `useClientDetailQuery` + `useServiceOrdersQuery`; usar somente `useClientPageQuery`.
- Usar `data.counts` direto nos mini-cards (sem filtrar arrays no render).
- Tab "OS" itera `data.orders` (já filtrado e ordenado pelo servidor).
- Manter mutações de unidade invalidando `["client-page", id]` (em vez de `["client", id]`).

### 4. Lista de clientes (`_app.clientes.index.tsx`)

- No `<Link to="/clientes/$id">`: deixar o `preload="intent"` padrão do TanStack ativo (é o default; confirmar que nada o desabilita). Como a rota agora tem loader, hover já dispara o fetch.

### 5. Limpeza

- Manter `getClientDetail` por compat ou removê-lo se não houver outro consumidor (a rota `editar` continua usando — preservar).
- Não alterar schema do banco, RLS, rotas existentes ou outras telas.

## Resultado esperado

- 1 RPC pequena no lugar de 2 (uma delas full-table).
- Página aparece praticamente instantânea após hover na listagem.
- Erro de carga deixa de derrubar a tela inteira porque a query é escopo-único e a junção pesada com `technicians` é eliminada.

## Validação

- `bun run build` limpo.
- Playwright: listar clientes → hover no card → abrir → confirmar que as 4 métricas, tabs Unidades e OS aparecem com dados reais e sem erro no console; medir tempo do clique até render.
