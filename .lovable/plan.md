# Filtro de Unidade na lista de OS: sempre listar todas as unidades

## O que encontrei no código

O filtro fica em `src/routes/_app.ordens.index.tsx`. As opções de Empresa, Unidade e Técnico são montadas pela função `buildFilterOptions(periodOrders, client)`, que percorre **as ordens já carregadas e filtradas pelo período** e coleta as unidades que aparecem nelas.

Consequências confirmadas na leitura do código:

- A lista de Unidade só mostra unidades que **têm alguma OS no período selecionado**. Unidades cadastradas sem OS (ou fora do período) simplesmente não aparecem — é o que dá a sensação de "a lista encolheu / só sobrou o que já escolhi".
- O controle de Unidade hoje é um `select` de **seleção única** (valor `unit` na URL, `"all"` = todas). Ele não guarda várias unidades.
- Não há trecho que remova opções por já estarem selecionadas — ou seja, a diagnose exata do relato ("passa a exibir somente as selecionadas") ainda **não está confirmada**; o efeito mais provável vem da fonte das opções (ordens do período) e não de um filtro sobre as selecionadas.

Premissa que estou assumindo: o filtro continua de seleção única. Se você quiser marcar **várias unidades ao mesmo tempo**, me diga — isso é uma mudança maior (multi-seleção + URL) e faço em seguida.

## Passo 1 — Reproduzir e fechar o diagnóstico

Abrir a lista de OS com sessão de administrador e registrar, antes de mudar código: quantas unidades aparecem no filtro com "Todas as empresas", quantas após escolher uma empresa, e o que muda ao escolher uma unidade. Com isso confirmo se o encolhimento vem da origem das opções (esperado) ou de outro ponto.

## Passo 2 — Correção

Trocar a fonte das opções de Unidade: em vez de derivar das ordens, usar o cadastro de unidades (`listAllUnits` / `useAllUnitsQuery`, já usado em outras telas), aplicando somente:

- filtro pela empresa selecionada (quando houver);
- unidades ativas, mais a unidade atualmente selecionada mesmo que inativa;
- ordenação alfabética; rótulo "Empresa · Unidade" quando nenhuma empresa está selecionada;
- manter a opção "Sem unidade" quando existirem OS sem unidade.

A seleção atual nunca é removida da lista, e a lista **não** depende de período, status ou das unidades já escolhidas. O filtro das OS em si (`matchesUnit`) não muda.

A lista de Empresa passa pelo mesmo ajuste de fonte (cadastro de clientes) para ficar coerente; Técnico, Status, Prioridade, Período e ordenação ficam intactos.

## Detalhes técnicos

- `src/routes/_app.ordens.index.tsx`: `buildFilterOptions` deixa de gerar `units` (e `clients`) a partir de `periodOrders`; passa a receber as listas do cadastro. Carregamento via `useServerFn` + React Query com `staleTime`, no mesmo padrão de `src/hooks/useClients.ts`.
- Nada muda em `matchesUnit`, `matchesClient`, KPIs, ordenação ou `ServiceOrderIslandRow`.
- Sem mudança de layout: os mesmos controles, apenas com mais opções disponíveis.

## Como validar

1. Selecionar 1 unidade: a lista de OS filtra certo e, ao reabrir o seletor, todas as unidades da empresa continuam lá.
2. Selecionar outra unidade em seguida: troca sem precisar limpar nada.
3. "Limpar filtros": volta para "Unidade = todas" e a lista completa.
4. Trocar a empresa: a lista de unidades passa a ser só daquela empresa e a unidade selecionada é zerada (comportamento atual preservado).
5. Empresa = todas: unidades aparecem com o nome da empresa na frente.
6. Conferir que unidade sem nenhuma OS agora aparece no filtro e resulta em lista vazia (e não em opção escondida).

## Riscos de regressão

- Muitas unidades cadastradas deixam o seletor longo; mitigado pela ordenação e pelo recorte por empresa.
- Uma requisição adicional para carregar o cadastro; com cache, sem impacto perceptível.
- Empresa/unidade inativas: incluo a selecionada para nunca "perder" um filtro já aplicado via link.
