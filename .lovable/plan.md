## Diagnóstico

O BottomNav (Início/Ordens/Clientes/Colaboradores/Relatórios/Mais) é fixo no rodapé (`fixed inset-x-0 bottom-0`) e é renderizado pelo layout `_app` em `src/routes/_app.tsx` para toda rota que **não** declara `staticData: { hideBottomNav: true }`.

As rotas de formulário do sistema seguem um padrão consistente — `AppShell fullscreenForm` + `FormFlowActions` no rodapé do form + `staticData.hideBottomNav = true` para liberar a faixa inferior — como já fazem:

- `src/routes/_app.ordens.nova.tsx`
- `src/routes/_app.clientes.novo.tsx`
- `src/routes/_app.clientes.$id.editar.tsx`
- `src/routes/_app.ordens.$id.imprimir.tsx`
- `src/routes/_app.relatorios_.imprimir.tsx`

Mas as duas rotas de colaborador **quebram esse contrato**: usam `fullscreenForm`, porém não declaram `hideBottomNav`. Resultado: o BottomNav continua fixo por cima da `FormFlowActions`, cobrindo o botão "Continuar" (visível na tela do admin porque só ele enxerga a versão completa do menu).

Arquivos afetados:

- `src/routes/_app.colaboradores.$id.editar.tsx` — falta `staticData`.
- `src/routes/_app.colaboradores.novo.tsx` — mesmo bug latente (mesma tela em modo criação).

## Correção

1. Adicionar `staticData: { hideBottomNav: true }` no `createFileRoute` das duas rotas:
   - `src/routes/_app.colaboradores.$id.editar.tsx`
   - `src/routes/_app.colaboradores.novo.tsx`

   Isso é a solução idiomática do projeto (`FormFlowActions` documenta expressamente o uso conjunto com essa flag).

## Prevenção do bug voltar (responsividade + guarda-corpo)

Um simples `hideBottomNav` sozinho depende de o desenvolvedor lembrar de declarar. Para blindar:

2. **Reforço no `FormFlowActions`**: manter o container fixo em mobile e `md:static` (comportamento atual), mas garantir que o wrapper aplique um `padding-bottom` no `<main>` equivalente à altura da barra fixa, para que em qualquer viewport (mobile/tablet/desktop compacto onde a barra volta a ser fixed) o último campo/botão do form nunca fique atrás dela. Isto já é resolvido em CSS por `lemarc-shell-main--form` — vou revisar `src/styles.css` para confirmar que essa classe já reserva `padding-bottom` proporcional ao `FormFlowActions` e ajustar se estiver curto.

3. **Sanidade defensiva no `AppShell`**: quando `fullscreenForm` é true, o AppShell já promete "sem BottomNav". Vou aproveitar essa promessa colocando o BottomNav em um contexto (`FullscreenFormContext`) definido pelo AppShell — o `BottomNavSlot` em `src/routes/_app.tsx` passa a consultar **também** esse contexto e não renderiza o BottomNav quando alguma matched route usa `fullscreenForm`. Assim, mesmo esquecendo a `staticData`, o menu não sobrepõe o formulário.

   Escopo mínimo: expor uma flag global via um `useSyncExternalStore` simples ou usar um `data-fullscreen-form` no `<body>` gerenciado pelo `AppShell` (via `useEffect`), e no `BottomNavSlot` ler esse atributo. A implementação exata será via `document.documentElement.dataset.fullscreenForm` + `useSyncExternalStore` para permanecer SSR-safe.

## Passos

1. Editar `src/routes/_app.colaboradores.$id.editar.tsx` e `src/routes/_app.colaboradores.novo.tsx` adicionando `staticData: { hideBottomNav: true }`.
2. Ajustar `AppShell` para marcar `document.documentElement.dataset.fullscreenForm` quando `fullscreenForm` for true (limpa ao desmontar).
3. Ajustar `BottomNavSlot` em `src/routes/_app.tsx` para ocultar o menu quando `staticData.hideBottomNav` **ou** o marcador `fullscreenForm` estiver ativo.
4. Revisar `src/styles.css` (`.lemarc-shell-main--form`) para garantir `padding-bottom` suficiente cobrindo a altura de `FormFlowActions` em breakpoints < md.
5. Verificar visualmente na tela `/colaboradores/{id}/editar` (admin) que:
   - O menu inferior não aparece.
   - Botão "Continuar" fica clicável em desktop 1268px e mobile 375px.
   - Os demais formulários (Nova OS, Novo/Editar cliente) continuam funcionando idênticos.

Sem alterações de banco, de rotas ou de lógica de submit — apenas layout/roteamento defensivo.