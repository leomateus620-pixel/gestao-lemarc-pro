# Etapa 5 · Revisão — reorganização visual

Objetivo: deixar a última etapa do "Nova OS" mais legível, hierarquizada e fácil de navegar, com tipografia que contrasta melhor com o fundo azul-escuro. Somente mudanças de apresentação — nenhuma regra de negócio, validação ou envio muda.

## O que muda

1. Cabeçalho de resumo (topo)
   - Card de destaque com o título da OS em tipografia display maior, e uma linha de "chips" (tipo de serviço, prioridade) com contraste reforçado (texto quase-branco, borda e fundo mais definidos).
   - Chips de prioridade ganham cor sólida por nível (baixa/média/alta/urgente) em vez de fundo translúcido apagado.
   - Ao lado do título, um resumo compacto: cliente, unidade e nº de técnicos — para o admin conferir o essencial sem varrer os cards.

2. Blocos de conferência
   - Quatro blocos passam a ser cards reais separados (superfície própria, borda sutil, canto arredondado) em vez de células divididas por linhas, com espaçamento consistente.
   - Cada card: ícone + título em caixa-alta discreta, e botão "Editar" como botão-pílula alinhado à direita, com alvo de toque adequado e foco visível.
   - Labels dos campos em caixa-alta pequena com tracking (cinza claro legível); valores em peso semibold e cor clara — hierarquia label/valor bem mais evidente que hoje.
   - Valores ausentes aparecem em estilo "vazio" (itálico/tom apagado + "Não informado"), diferenciando visualmente do dado preenchido.

3. Técnicos
   - Lista de técnicos vira chips/linhas com avatar-inicial, nome e função, e selo "Principal" no primeiro — alinhado e sem quebrar em telas estreitas.

4. Navegação
   - Cada bloco fica clicável (o card inteiro leva à etapa correspondente), mantendo o botão "Editar" acessível por teclado.
   - Aviso de campos opcionais faltantes é reposicionado como faixa discreta antes das ações finais, com contraste ajustado.

5. Responsividade
   - Mobile: coluna única, cards empilhados, cabeçalhos em grid `minmax(0,1fr) auto` com `min-w-0`/`truncate` para nomes longos de cliente/unidade.
   - Desktop: duas colunas equilibradas; o card de resumo ocupa largura total.

## Detalhes técnicos

- Arquivo principal: `src/components/ordens/ServiceOrderWizard.tsx` — reescrita de `ReviewStep`, `ReviewSection` e `ReviewField`.
- Ajustes de estilo em `src/styles.css` nas classes `lemarc-review-*` (superfície do card, borda, label de revisão), usando apenas tokens semânticos existentes — sem cores hardcoded novas.
- Sem alteração em `src/lib/serviceOrders/wizard.ts`, validações, mutations ou rotas.
