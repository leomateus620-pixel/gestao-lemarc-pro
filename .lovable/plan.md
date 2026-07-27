## Aplicar migração Fulfillment do Leitos Aramados

Aplicar `supabase/migrations/20260721133300_wire_tray_fulfillment.sql` (1066 linhas) via `supabase--migration` para completar a cadeia operacional do módulo.

### O que a migração entrega

Funções RPC de fulfillment (todas com `SECURITY DEFINER`, `search_path = ''`, checagem de papel via `wire_tray_assert_role` e idempotência via `wire_tray_operation_requests`):

- `wire_tray_create_production_order` — cria OP manual (para estoque ou vinculada a item de pedido), valida saldo de falta, atualiza status do pedido para `production_pending` e grava auditoria.
- `wire_tray_record_production_entry` — máquina de estados da produção (`start`, `progress`, `pause`, `resume`, `scrap`, `cancel`, `complete`). No `complete`, gera reserva (quando `customer_order`), atualiza saldos, insere movimento `production_entry` e reavalia status do pedido.
- Demais RPCs contidas no arquivo (separação, faturamento, expedição, notificações) seguem o mesmo padrão de asserção de papel + idempotência + auditoria + movimentos.

### Pré-condições já satisfeitas

- Foundation, Security e Commands já aplicadas (tabelas, enums, RLS, imutabilidade do ledger, bucket `wire-tray-documents` criado).
- Funções auxiliares usadas pela Fulfillment (`wire_tray_assert_role`, `wire_tray_write_audit`, `wire_tray_insert_movement`, `wire_tray_assert_evidence_document`, `wire_tray_trigger_replenishment_internal`) já existem no schema.

### Passos

1. Enviar o SQL completo do arquivo via `supabase--migration` com descrição em português.
2. Após aprovação e execução, rodar `supabase--linter` para capturar eventuais avisos de segurança/performance introduzidos pelas novas funções.
3. Se o linter apontar issues nas funções desta migração, aplicar migração corretiva pontual.
4. Confirmar ao usuário que a cadeia (Foundation → Security → Commands → Fulfillment) está completa e que o módulo Leitos Aramados pode ser exercitado no preview.

### Fora de escopo

- Nenhuma alteração em código do frontend nesta etapa — a migração é puramente SQL aditiva.
- Nenhum `DROP`/`TRUNCATE`; tudo é `CREATE OR REPLACE FUNCTION` idempotente.
