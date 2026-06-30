## Objetivo
Substituir os cards verticais pesados em `/clientes` por linhas horizontais expansíveis (Dynamic Island), mantendo toda a arquitetura de dados, rotas e vínculos atuais (clientes ↔ unidades ↔ OS ↔ relatórios).

## Escopo (somente UI/apresentação)
- Sem alterações em Supabase, RLS, server functions, schemas ou queries.
- Sem mudanças nas rotas existentes (`/clientes`, `/clientes/novo`, `/clientes/$id`, `/clientes/$id/editar`, `/ordens/nova?clientId=`).
- Reaproveita `useClientsFullQuery`, `useAllUnitsQuery`, `useServiceOrdersQuery` e helpers de status já existentes.

## Novos componentes
1. `src/components/clientes/ClientIslandRow.tsx`
   - Linha horizontal estilo Island (mesmo molde de `CollaboratorIslandRow` / `ServiceOrderIslandRow`).
   - **Estado retraído (desktop grid):** avatar (iniciais) · nome · status (Ativo/Inativo) · CNPJ ou pendência · unidades · OS abertas · OS concluídas · última OS · ícone expandir.
   - **Mobile:** 2–3 linhas compactas (nome + status, CNPJ/segmento, métricas resumidas) + chevron.
   - **Expandido:** grid de detalhes (responsável, telefone, e-mail, cidade/UF, segmento, observações, pendências), chips de unidades (até N + "ver todas"), resumo OS (abertas/concluídas/última), e barra horizontal de ações: Nova OS, Detalhes, Editar, Ver unidades, Última OS.
   - Anima expansão com `grid-rows-[0fr→1fr]` (mesmo padrão dos outros módulos).
   - Usa classes `lemarc-island-row` / `lemarc-island-row-expanded` já existentes no styles.css.

2. `src/components/clientes/ClientsKpiStrip.tsx` (opcional, inline na rota se ficar trivial)
   - Faixa horizontal compacta de KPIs (não cards gigantes): Empresas ativas · Unidades · OS ativas · Com pendência · CNPJ completo · Sem contato.

## Refatoração da rota
`src/routes/_app.clientes.index.tsx`
- Substitui o `PageHero` exagerado por cabeçalho compacto (título + subtítulo + botão "Nova empresa") no padrão de Ordens/Colaboradores.
- Substitui o grid de 4 `MetricCard` por `ClientsKpiStrip` (linha horizontal).
- Mantém busca atual; expande `FilterChips` para incluir: Status (Todos/Ativos/Inativos), Pendências (CNPJ/Contato/Sem unidade), Cidade/UF (derivada dos clientes carregados), Com OS ativa, Ordenação (Nome A–Z, Mais OS abertas, Atualizado recente).
- Substitui `<div className="grid ... sm:grid-cols-2 xl:grid-cols-3">` + `<ClientCard>` por lista vertical de `<ClientIslandRow>`.
- Mantém skeleton e empty-state atuais, adaptados para linhas horizontais.

## Derivação de dados (já disponível no client)
- `unitsByClient`: já calculado.
- `osByClient` (open/done/lastOrder): já calculado.
- Pendências derivadas no render: `!cnpj`, `!responsible_name && !phone && !email`, `unitCount === 0`.
- Cidades únicas: `useMemo` sobre `clients` (e units) para popular filtro UF.
- Nenhuma nova query, nenhum N+1.

## Arquivo legado
`src/components/clientes/ClientCard.tsx` permanece no projeto (sem referências após o swap) — pode ser removido em uma segunda passada se desejado. **Não removo nesta entrega** para zero risco de regressão se houver import oculto.

## Validação pós-implementação
- `bun run build` + lint nos arquivos alterados.
- Smoke manual via Playwright headless em `/clientes`:
  - Lista renderiza, expande/retrai, busca filtra, chips filtram.
  - Botões Nova OS → `/ordens/nova?clientId=...`, Detalhes → `/clientes/$id`, Editar → `/clientes/$id/editar` navegam corretamente.
  - Mobile 390px: sem overlap com bottom-nav, ações rolam horizontalmente.
- Confirmar contagem de OS abertas/concluídas idêntica à anterior (mesmas funções `isDone`/`isCancelled`).

## Fora de escopo
- Redesign das rotas `/clientes/$id` e `/clientes/novo` (mantidas como estão).
- Mudanças em Ordens, Relatórios, Colaboradores.
- Qualquer migração de banco.

## Entregáveis
Resumo final com: arquivos alterados, componentes criados, validações executadas, confirmação de zero regressão em rotas/queries, screenshots desktop + mobile.
