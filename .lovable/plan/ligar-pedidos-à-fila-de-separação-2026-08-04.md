# Ligar Pedidos à fila de Separação

## O que está errado hoje
Os dois pedidos existentes estão salvos como **rascunho**, e por isso não chegam à Separação. Três causas confirmadas:

1. Não existe nenhum **local de estoque** cadastrado e o produto não tem local padrão. A confirmação do pedido exige local padrão e falha com "Configure o local padrão do produto".
2. Quando não há saldo, a confirmação joga o pedido para "produção pendente", e a fila de Separação hoje só lista pedidos com estoque reservado / em separação / aguardando conferência — o pedido desaparece.
3. No formulário de novo pedido, salvar rascunho e confirmar ficam no mesmo nível, então é fácil salvar sem confirmar.

## O que vai ser feito

### 1. Base de estoque funcional (banco)
- Criar um local de estoque padrão ("ALMOX-01 — Almoxarifado principal") caso não exista.
- Definir esse local como padrão para os produtos que estão sem local.
- Ajustar a confirmação do pedido: em vez de dar erro, usar automaticamente o local padrão ativo quando o produto não tiver um.
- Reconfirmar os dois pedidos existentes para que passem a aparecer na fila.

### 2. Separação passa a mostrar tudo que precisa de ação
- Incluir na fila os pedidos em "produção pendente" e "em produção", com etiqueta **A produzir** e a quantidade a produzir por item (já que o menu Produção está oculto).
- Cada pedido na fila mostra: empresa, número do pedido, produto, quantidade pedida, quantidade reservada, quantidade a produzir, previsão de entrega e situação.
- Etiquetas de prazo: **Atrasado** (entrega vencida), **Entrega hoje**, **No prazo**.
- Valor unitário e total aparecem apenas para quem tem acesso financeiro (admin/gestor/faturamento); estoque e produção veem só produto/quantidade/entrega.

### 3. Novo pedido: confirmar como caminho principal
- Botão principal passa a ser "Salvar e enviar para separação"; "Salvar rascunho" fica como ação secundária discreta.
- Após confirmar, mensagem informando que o pedido foi para a fila de separação, com atalho para a tela de Separação.
- Rascunhos ganham, na lista de Pedidos e no detalhe, um aviso "Ainda não enviado para separação" com botão de confirmar.

### 4. Histórico e rastreio das movimentações
- No card da fila, exibir o histórico já registrado (separação, conferência, divergência, resolução) com data e quantidade — os registros já são gravados de forma imutável no banco.
- Nenhuma movimentação passa a ser apagável; correções continuam sendo lançadas como novo registro de resolução.

## Detalhes técnicos
- Migração: insert do local padrão + backfill de `wire_tray_products.default_location_id` + `CREATE OR REPLACE` de `wire_tray_confirm_order` com fallback de local; re-confirmação dos rascunhos via atualização de dados.
- `listWireTraySeparationQueue` (`src/lib/api/wireTrayOperations.functions.ts`): ampliar o filtro de status, devolver `canViewFinancials`, valores unitários por item e as entradas de histórico.
- `src/components/leitos/pages/OperationsPage.tsx`: novo layout do card da fila com etiquetas de prazo, quantidades e histórico.
- `src/components/leitos/pages/OrdersPage.tsx`: hierarquia dos botões do rodapé, mensagem de sucesso com atalho e aviso de rascunho.