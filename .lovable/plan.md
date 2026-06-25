## Causa raiz do 404 ao trocar filtros

Em `src/components/reports/ReportsFilters.tsx`, o `useRouteSetter` chama:

```ts
navigate({ to: routePath, ... })
```

com `routePath = "/_app/relatorios"` (ou `"/_app/relatorios/cliente/$clientId"`).

No TanStack Router, `to` é a **URL pública**, não o ID interno do arquivo de rota. O segmento `_app` é um layout sem segmento de URL — a URL real é `/relatorios`. Ao navegar para `/_app/relatorios?period=...`, o router não encontra rota correspondente e cai no `notFoundComponent` (tela 404 laranja). Isso acontece exatamente ao trocar período, abrir filtros, aplicar, limpar, etc., porque todos esses controles passam pelo mesmo `setSearch`.

## Correção

Trocar o `routePath` pelas URLs públicas em todos os pontos:

1. `src/components/reports/ReportsFilters.tsx`
   - Atualizar o tipo `routePath` para `"/relatorios" | "/relatorios/cliente/$clientId"`.
   - `useRouteSetter` continua usando `to: routePath`; agora resolverá para a URL correta.

2. `src/routes/_app.relatorios.tsx`
   - `<ReportsFilters routePath="/relatorios" />`.

3. `src/routes/_app.relatorios.cliente.$clientId.tsx`
   - `<ReportsFilters routePath="/relatorios/cliente/$clientId" />`.

Nenhuma outra alteração: schema de search, rotas, RLS, auth, dados e cálculos permanecem como estão. Filtros (período, custom, técnico, cliente, etc.) voltam a preservar a URL atual atualizando apenas os search params.

## Validação

- Abrir `/relatorios`, trocar entre Hoje / Semana / Mês / Trimestre / Ano / Tudo → URL permanece em `/relatorios` com `?period=...` e a página continua renderizando (sem 404).
- Alternar para Personalizado, escolher datas válidas e inválidas → URL atualizada, mensagem de erro aparece para intervalo inválido sem navegar.
- Abrir Filtros, aplicar e limpar cliente / unidade / técnico / status → continua na rota.
- Repetir o mesmo na rota `/relatorios/cliente/:id`.
- Rodar build/typecheck (já automatizados pelo harness).
