## Problema
No mobile a lista de OS quebra: o nome do cliente ("Camera Tuparendi") aparece uma letra por linha, empurrando o cartão para uma altura enorme e provocando expansão visual involuntária.

## Causa raiz
Em `src/components/ordens/ServiceOrderIslandRow.tsx`, linha 170, o layout colapsado mobile usa:

```tsx
<span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
  <span className="flex min-w-0 items-center gap-1.5">
    <OrderIdentity number={...} />        // badge shrink-0
    <span className="min-w-0 break-words ...">{clientName}</span>
  </span>
  <OrderStatusCluster ... />              // pills AGUARDANDO REVISÃO + MÉDIA
</span>
```

A segunda coluna `auto` mede a largura pela max-content dos pills (`AGUARDANDO REVISÃO` é uma pílula uppercase com letter-spacing, tracking-[0.04em] e whitespace nowrap implícito). Em telas ≤ ~380 px o max-content do cluster consome quase toda a largura, deixando ~8–10 px para a coluna do cliente. Como o span tem `break-words`, "Camera" > 10 px e o navegador cai em quebra caractere-a-caractere. Efeito colateral: o card fica enorme, aparenta estar "expandido" mesmo colapsado, e a linha do título abaixo também sofre o mesmo problema pontualmente ("Manutenção Elétrica"/"DOUGLAS FLORES" continuam ok porque estão em spans com `truncate`/flex-wrap na próxima linha, mas o overflow da linha superior arrasta a UI).

## Correções

### A. Reorganizar o header colapsado mobile (`ServiceOrderIslandRow.tsx`)
Trocar o grid `1fr auto` por uma pilha em duas linhas no mobile:

1. Linha 1: `flex min-w-0 items-center gap-1.5` — badge `OS #1058` + `<span className="min-w-0 flex-1 truncate">` com o nome do cliente. `truncate` (não `break-words`) garante que nomes longos são reticenciados em vez de quebrarem caractere-a-caractere. `title={clientName}` para acessibilidade.
2. Linha 2: `<OrderStatusCluster>` ocupa uma linha inteira, com `flex flex-wrap gap-1` e pills mantendo `w-fit`.

Em `lg:` (≥1024 px) permanece o layout desktop existente (`.lemarc-order-desktop-summary`), que já usa `truncate` — sem regressão.

### B. Guardas de min-w-0 / truncate em conteúdos irmãos
- Linha 180 (título): trocar `break-words` por `truncate` em uma linha (título) — no mobile o card fica com uma linha por métrica, coerente com o restante. O texto completo já aparece expandido ao abrir a OS.
- Linhas 184 e 189 (InlineMeta rows: Unidade/Técnico e Tempo/Valor): mantêm `flex-wrap` mas cada `InlineMeta` fica com `max-w-full truncate` (já usa `truncate` internamente — verificar que `min-w-0` está propagando).
- `InlineMeta` (linha 398): garantir `block max-w-full` para que o `truncate` funcione mesmo dentro de flex wrap.

### C. Pílulas Status/Prioridade não estouram
- `StatusPill` e `PriorityPill` recebem `max-w-full truncate` no texto interno para telas ≤ 340 px (Galaxy Fold / navegador com barra), com `whitespace-nowrap` mantido no chip padrão.

### D. Ação colapsada (grid 3 col)
`OrderCollapsedActionBar` (linha 466) usa `grid-cols-3` no mobile: já ok, mas garantir que `ActionLink`/`OrderCollapsedPdfButton`/Expandir tenham `min-w-0` e texto `truncate` para telas muito estreitas — evita que o card cresça se um dos rótulos vazar.

## Verificação
- `tsgo` typecheck.
- Playwright mobile (375×812 e 360×740): abrir `/ordens`, checar via screenshot do card #1058 que:
  - Nome do cliente aparece em uma linha, reticenciado se necessário.
  - Pills de status e prioridade ocupam uma segunda linha coerente.
  - Card colapsado permanece com altura compacta (< ~180 px).
  - Título "Instalação de sensores..." abaixo continua legível em 1 linha reticenciada.
- Regressão desktop (≥1024 px): layout `lemarc-order-desktop-summary` inalterado.

## Escopo
Só `src/components/ordens/ServiceOrderIslandRow.tsx`. Nenhuma mudança em dados, filtros, PDF, ou rotas.
