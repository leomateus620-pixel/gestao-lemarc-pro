# Data de abertura na visão reduzida da OS

Hoje o cartão recolhido da OS mostra cliente, chamado, tipo, unidade, técnico, tempo e valor — a data de abertura só aparece quando a OS é expandida. O plano adiciona essa data já na versão reduzida, com destaque visual e alinhamento consistente entre celular e desktop.

## O que muda

- Um selo (chip) de abertura passa a aparecer no cartão recolhido de cada OS, com ícone de calendário e a data/hora formatada no padrão já usado no sistema ("hoje, 11:46", "ontem, 16:10", "12/08, 08:47").
- Destaque visual: fundo translúcido, borda fina e texto em tom de destaque (tokens do tema), números tabulares para as datas ficarem alinhadas entre linhas.
- Celular: o selo entra na mesma linha do status/prioridade, alinhado à direita, sem empurrar o layout nem quebrar linha.
- Desktop: o selo entra na coluna de identificação, logo abaixo do nome do cliente/unidade, alinhado verticalmente com as demais colunas.
- Quando não houver data registrada, o selo não é exibido (nada de "Não informado" ocupando espaço).
- A área expandida continua exibindo abertura, início e encerramento como hoje — sem mudança.

## Detalhes técnicos

- `src/components/ordens/ServiceOrderIslandRow.tsx`: novo componente local `OrderOpenedChip` usando `getOpenedAt` + `formatServiceOrderDateTime` (`src/lib/serviceOrders/time.ts`), já disponíveis no arquivo. Inserido no bloco mobile (junto ao `OrderStatusCluster`) e no primeiro slot do `lemarc-order-desktop-summary`.
- `src/styles.css`: ajuste apenas do espaçamento/alinhamento do selo dentro do grid existente (`lemarc-order-collapsed-shell` / `lemarc-order-desktop-summary`); nenhuma coluna nova é criada, para não desalinhar as colunas atuais em 1024px e 1280px.
- Cores via tokens semânticos existentes (primary/muted), sem classes de cor fixas; `shrink-0` no ícone e `min-w-0`/`truncate` no texto, seguindo o padrão responsivo do projeto.
- Nenhuma alteração de dados, consultas ou regras de negócio.
