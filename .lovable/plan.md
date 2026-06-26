# Corrigir relatório em branco + adicionar "Hoje" no gerador

## Diagnóstico

Ao clicar em **Gerar PDF**, abre-se `/relatorios/imprimir?period=...` em nova aba. A página fica em branco porque, no roteamento por arquivos do TanStack Router, `src/routes/_app.relatorios.imprimir.tsx` é tratado como **rota filha** de `_app.relatorios.tsx`. O componente pai (`RelatoriosPage`) não renderiza `<Outlet />`, então a rota filha casa pela URL mas o componente `PrintPage` nunca é montado — daí a página em branco. O mesmo problema afeta `/relatorios/cliente/$clientId`.

## Correções

### 1. Tirar `imprimir` e `cliente/$clientId` do layout de `relatorios`

Renomear, mantendo as URLs públicas idênticas (convenção `nome_` = "não aninhar sob o pai"):

- `src/routes/_app.relatorios.imprimir.tsx` → `src/routes/_app.relatorios_.imprimir.tsx`
- `src/routes/_app.relatorios.cliente.$clientId.tsx` → `src/routes/_app.relatorios_.cliente.$clientId.tsx`

Atualizar nas duas o `createFileRoute("/_app/relatorios_/imprimir")` e `createFileRoute("/_app/relatorios_/cliente/$clientId")`. O `routeTree.gen.ts` é regenerado automaticamente; as URLs continuam `/relatorios/imprimir` e `/relatorios/cliente/:id`, então os links existentes (`buildPrintUrl`, drawer) seguem funcionando sem alteração.

Resultado: a rota de impressão passa a montar direto sob `_app` (com o `AuthGate`), sem precisar de `<Outlet />` no `RelatoriosPage`.

### 2. Garantir robustez do PDF

No `_app.relatorios_.imprimir.tsx`:

- Manter `Suspense` + `useReportOrdersQuery` (já correto).
- Adicionar `errorComponent` + `notFoundComponent` na rota (exigência do projeto para rotas com loader/queries).
- Ajustar o `setTimeout` que dispara `window.print()` para esperar `requestAnimationFrame` duplo após dados carregarem, evitando impressão antes de o DOM estar pronto.
- Pequeno `try/catch` no `print()` e botão visível de fallback (já existe) — manter.

### 3. Adicionar filtro "Hoje" no diálogo Gerar relatório

Em `src/components/reports/ReportGenerateDialog.tsx`, incluir o atalho **Hoje** no array `QUICK_PERIODS` (o schema `periodSchema` já aceita `"today"` e `resolvePeriodRange` já trata):

```ts
{ key: "today", label: "Hoje", hint: "OS do dia" },
{ key: "week",  label: "Semana atual", hint: "Últimos 7 dias" },
{ key: "month", label: "Mês atual",    hint: "Últimos 30 dias" },
{ key: "last30",label: "Últimos 30 dias", hint: "Janela móvel" },
{ key: "custom",label: "Personalizado", hint: "Escolha datas" },
```

Ajustar o grid para `sm:grid-cols-5` para acomodar a nova opção. Nenhuma mudança de tipos ou backend é necessária — o filtro `today` já flui até `getReportOrders` via `resolvePeriodRange`.

### 4. Validação

- `bun run lint` focado nos arquivos alterados.
- `tsgo` para checar tipos do `routeTree.gen.ts` regenerado.
- Playwright headless: navegar até `/relatorios/imprimir?period=today` autenticado, aguardar render do `ManagerialReportDocument`, screenshot da página confirmando que aparece "Relatório Gerencial de Ordens de Serviço" + KPIs (não mais branco).
- Smoke no diálogo: abrir, clicar em **Hoje**, ver prévia, clicar em **Gerar PDF**, conferir nova aba não-branca.

## Resultado esperado

- Botão **Gerar PDF** abre a página de impressão renderizada corretamente, com o relatório gerencial completo e prompt automático de "Imprimir / Salvar como PDF".
- Novo atalho **Hoje** no diálogo permite gerar e baixar o relatório gerencial do dia em um clique.
- Drawer por cliente (`/relatorios/cliente/:id`) volta a funcionar pelo mesmo motivo.
- Sem mudanças em banco, RLS ou contratos de API.
