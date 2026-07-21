## Objetivo
Adicionar um campo de busca dedicado à lista de **unidades (filiais)** na Etapa 2 do wizard de Nova OS, focado em **nome** e **endereço** (com cobertura extra para cidade/UF e CNPJ), para agilizar a seleção quando o cliente tem muitas filiais (ex.: CAMERA Agroindustrial com 63 unidades).

## Escopo
- Somente UI da Etapa 2 em `src/components/ordens/ServiceOrderWizard.tsx`.
- Não altera schema, rotas, cálculos, PDF ou fluxo de submissão.
- Não afeta o buscador existente de clientes (topo da etapa) — este novo é um segundo campo, exclusivo para unidades, exibido só depois que um cliente é selecionado.

## Mudanças
1. Novo estado local `unitQuery` (string) dentro do componente da Etapa 2.
2. Renderizar um `Input` com ícone de busca logo abaixo do título "Unidade do cliente" e antes do grid de botões, com placeholder "Buscar filial por nome, endereço ou cidade…".
3. Filtrar `selectedUnits` por match case-insensitive em: `name`, `address`, `city`, `state`, `sector`, `cnpj` (dígitos crus). O botão "Sem unidade específica" continua sempre visível.
4. Exibir contador discreto ("N de M unidades") e um estado vazio ("Nenhuma filial encontrada") quando o filtro não retornar resultados.
5. Só renderizar o campo quando `selectedUnits.length > 6` (evita ruído para clientes com poucas filiais); abaixo disso o grid atual já é suficiente.
6. Se o `draft.unitId` selecionado sair do filtro, mantê-lo visível como um card fixo acima do grid filtrado para não perder o contexto do que já foi escolhido.

## Verificação
- `bun run build` para confirmar tipos.
- Conferência visual no preview em `/ordens/nova` etapa 2 com o cliente CAMERA: digitar "Santa Rosa", "Buriti", "Cacequi" e um CNPJ parcial.

## Observação técnica
Reaproveita o componente `Input` do design system e o ícone `Search` já importado no arquivo. Nenhuma dependência nova.