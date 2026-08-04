# Produtos: correção da duplicação e novo visual

## O problema

A tela lista cada produto duas vezes: existe uma tabela (desktop) e uma lista de cartões (mobile), e as regras de estilo do módulo forçam a lista de cartões a aparecer sempre, sobrepondo a regra que deveria escondê-la em telas grandes. Resultado: os dois blocos ficam visíveis ao mesmo tempo, com informações repetidas e desalinhadas.

## O que será feito

1. Uma única lista de produtos
   - Substituir tabela + cartões por uma única lista responsiva, que se adapta do desktop ao celular sem duplicar nada.
   - Garantir que a alternância de layout use classes próprias do módulo (sem depender de utilitários que perdem a disputa de estilo), para o bug não voltar.

2. Limpeza de conteúdo
   - Remover "Sem SKU" (o campo SKU já foi retirado do cadastro) e o filtro de busca passa a mencionar apenas nome e material.
   - Remover a coluna Unidade como coluna própria; a unidade aparece junto ao estoque mínimo (ex.: "20 un").

3. Melhor organização e controle
   - Cabeçalho com contagem de resultados e resumo rápido: total de produtos, ativos e quantos estão com reposição automática.
   - Barra de filtros reorganizada: busca ampla à esquerda, categoria e situação como seletores compactos, com botão de limpar filtros quando algum estiver aplicado.
   - Cada item mostra, em hierarquia clara: nome em destaque, categoria, dimensões, estoque mínimo, tipo de reposição e situação, com a linha inteira clicável e seta de navegação.
   - Paginação mantida, com texto de intervalo ("1–25 de 104").

4. Aspecto gráfico
   - Tipografia com pesos e tamanhos mais contrastantes entre nome do produto e metadados.
   - Linhas com altura confortável, separadores suaves, estado de hover e foco visíveis, cantos arredondados e etiquetas de situação/reposição em estilo consistente com o restante do módulo.
   - Estados vazio, carregando e erro mantidos e alinhados ao novo layout.

## Detalhes técnicos

- `src/components/leitos/pages/ProductsPage.tsx`: unificar `ProductRow`/`ProductCard` em um único componente de linha responsiva; ajustar o cabeçalho do painel, filtros e resumo.
- `src/styles.css`: adicionar as classes do novo layout (`wire-product-list`, `wire-product-row`, etc.) no mesmo bloco `wire-*` já existente, evitando o conflito de especificidade que causava a duplicação. Cores via tokens/paleta já usada no módulo.
- Nenhuma mudança em dados, consultas, permissões ou no cadastro de produto.
