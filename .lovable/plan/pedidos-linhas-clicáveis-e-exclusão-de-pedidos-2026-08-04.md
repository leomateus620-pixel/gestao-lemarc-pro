# Pedidos: linhas clicáveis e exclusão de pedidos

## Situação atual (verificada)
- Os dois pedidos de R$ 6.750 (#1 e #2, "Lemarc industrial") estão com status **rascunho** no banco.
- Na lista de Pedidos, só o número "#1" é clicável no desktop; o resto da linha não abre nada (no mobile o card inteiro já é link).
- Existe apenas cancelamento (`wire_tray_cancel_order`), que marca o pedido como cancelado — ele continua aparecendo na lista. Não existe exclusão.

## O que será feito

### 1. Lista de Pedidos mais intuitiva
- Linha inteira clicável no desktop (cursor de mão, destaque no hover) abrindo o detalhe do pedido.
- Nova coluna de ações à direita, com botão "Abrir" e menu de ações (ícone de três pontos) contendo:
  - "Confirmar e enviar para separação" (só para rascunhos)
  - "Excluir pedido" (rascunhos) / "Cancelar pedido" (pedidos já confirmados)
- No mobile, as mesmas ações aparecem no rodapé do card, sem quebrar o toque de abrir o pedido.

### 2. Exclusão de pedidos
- **Rascunho**: exclusão definitiva. Como o rascunho não gera reserva, produção nem movimentação de estoque, ele é removido de fato (itens e valores incluídos), com registro no histórico de auditoria.
- **Pedido já confirmado**: não é excluído — abre o diálogo de cancelamento existente (exige motivo), que libera reservas e mantém o rastro. Pedidos expedidos/concluídos continuam bloqueados.
- Diálogo de confirmação antes de excluir, com o número e o cliente do pedido em destaque, para evitar exclusão acidental.
- Permissão: apenas perfis admin, gestor e comercial (mesma regra do cancelamento). Perfis de estoque/produção/consulta não veem as ações destrutivas.

### 3. Detalhe do pedido
- O mesmo botão "Excluir pedido" aparece no cabeçalho do detalhe quando o pedido é rascunho, redirecionando para a lista após excluir.

## Detalhes técnicos
- Nova migração: função `public.wire_tray_delete_order(_order_id uuid)` com `SECURITY DEFINER`, que valida papel via `wire_tray_assert_role(admin/gestor/comercial)`, exige `status = 'draft'`, checa ausência de reservas/produção/movimentações, grava evento em `wire_tray_audit_events` e apaga o pedido (itens e financeiros em cascata). `GRANT EXECUTE` para `authenticated` e `service_role`.
- `src/lib/api/wireTrayOrders.functions.ts`: novo server fn `deleteWireTrayOrder` (POST, `requireSupabaseAuth`, validação zod do uuid) chamando a RPC.
- `src/hooks/useWireTray.ts`: mutation `useDeleteWireTrayOrder`, invalidando as queries de pedidos, separação e painel.
- `src/components/leitos/pages/OrdersPage.tsx`: linha clicável, coluna de ações, diálogo de confirmação e integração das mutations na lista e no detalhe.
- Estilos das novas ações/hover em `src/styles.css`, seguindo o padrão `wire-*` existente.

## Depois de aplicado
Você abre Pedidos, clica em qualquer ponto da linha para ver o pedido, e usa o menu de ações para excluir os dois pedidos de teste.
