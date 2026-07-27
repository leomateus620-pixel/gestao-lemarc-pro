# Leitos Aramados — arquitetura e impacto

## Auditoria da base existente

- **Rotas:** TanStack Router por arquivos. O layout pathless `/_app` protege as rotas atuais de OS e injeta `AuthProvider`, `RoleProvider` e `BottomNav`. As URLs consolidadas (`/dashboard`, `/ordens`, `/clientes`, `/colaboradores`, `/relatorios` e `/configuracoes`) permanecem inalteradas.
- **Autenticação:** a sessão é única e vem do Supabase. `AuthContext` observa a sessão; o middleware `requireSupabaseAuth` valida o bearer token nas TanStack server functions. O login Google continua restrito a administradores pela regra já existente.
- **Autorização OS:** `user_roles` e `useUserRole` continuam responsáveis apenas pelo sistema de OS. O módulo novo não altera o enum `app_role` nem reutiliza essa tabela para papéis industriais.
- **Dados e queries:** os hooks usam React Query, chaves estáveis e TanStack server functions. As funções autenticadas usam o cliente Supabase do usuário, mantendo RLS ativa.
- **Clientes:** `clients` e `client_units` são a fonte única para os dois módulos. Nenhum cadastro paralelo de cliente é criado.
- **UI:** Archivo é usada em títulos, Inter em texto e controles. `AppShell` e `BottomNav` permanecem reconhecíveis no módulo OS. O CSS já trata safe areas e navegação fixa.
- **Banco:** migrations são aditivas, UUIDs usam `gen_random_uuid()`, timestamps usam `timestamptz` e `updated_at` usa `update_updated_at_column()`.
- **Arquivos:** os buckets atuais são privados, mas suas policies não vinculam de forma suficiente cada objeto ao registro de negócio. O novo bucket usa metadado persistido, visibilidade e papel do módulo.

## Decisões de extensão

1. `/leitos` é um namespace protegido próprio, fora de `/_app`, para não herdar o BottomNav de OS.
2. `user_module_access` é aditiva e guarda somente autorização de módulo. Usuários OS continuam autorizados pelo fluxo atual; administradores ativos recebem acesso inicial a Leitos pela migration.
3. Papéis industriais são `admin`, `gestor`, `comercial`, `producao`, `estoque`, `faturamento` e `consulta`. O contexto de acesso é carregado de dados persistidos e validado novamente nas server functions e no banco.
4. Valores ficam em tabelas financeiras separadas. Produção não recebe `SELECT` nessas tabelas; a proteção não depende de CSS nem de omissão no componente.
5. Saldos têm quantidade física, reservada e disponível persistidas com constraints. Movimentos críticos acontecem somente por RPC transacional com lock de linha, ordem determinística e chave de idempotência.
6. Movimentos, eventos de produção, eventos de separação e auditoria são append-only.
7. Pedidos são salvos como rascunho antes da confirmação. A confirmação reserva o disponível e cria a produção do déficit na mesma transação.
8. Produção para pedido entra fisicamente já comprometida com a reserva correspondente; produção para estoque aumenta o disponível.
9. Separação e conferência são eventos distintos. Divergência aberta bloqueia o faturamento.
10. Notificações de faturamento são persistidas e criadas apenas quando todos os itens foram separados, conferidos e não têm divergência pendente.

## Contratos principais

### Estoque

`disponível = físico - reservado`

`projetado = disponível + produção aberta destinada ao estoque`

As constraints impedem `físico < 0`, `reservado < 0` e `reservado > físico`.

### Confirmação do pedido

1. Bloqueia pedido, itens e saldos em ordem de produto/local.
2. Valida que o pedido ainda é rascunho.
3. Reserva até o limite realmente disponível.
4. Cria reservas explícitas e movimentos de reserva.
5. Cria uma ordem de produção para cada déficit.
6. Atualiza o estágio operacional e grava auditoria.

### Conclusão de produção

- **Destino pedido:** aumenta físico e reservado juntos, vincula a reserva ao item e mantém o material indisponível para outros pedidos.
- **Destino estoque:** aumenta físico e disponível e registra o movimento.

### Expedição

Bloqueia pedido, reservas e saldos, consome somente o saldo reservado do pedido, baixa físico e reservado na mesma operação e registra movimentos e auditoria.

## Rotas

- `/leitos`
- `/leitos/pedidos`, `/leitos/pedidos/novo`, `/leitos/pedidos/:id`
- `/leitos/producao`, `/leitos/producao/nova`, `/leitos/producao/:id`
- `/leitos/estoque`, `/leitos/estoque/:productId`
- `/leitos/separacao`, `/leitos/faturamento`
- `/leitos/produtos`, `/leitos/produtos/novo`, `/leitos/produtos/:id`, `/leitos/produtos/:id/editar`
- `/leitos/movimentacoes`, `/leitos/relatorios`, `/leitos/mais`
- `/leitos/configuracoes`, `/leitos/configuracoes/acessos`

## Limites de publicação

A PR entrega migrations, aplicação e testes. Ela não executa migrations no projeto Supabase remoto e não cria registros operacionais artificiais. A validação integrada com dados reais depende da aplicação das migrations no ambiente de homologação/produção autorizado.

## Diagnóstico da implantação de 27/07/2026

A inspeção do endpoint PostgREST conectado confirmou `user_module_access`, mas retornou
`PGRST205` para todas as relações operacionais de Leitos. Os tipos gerados do ambiente também
continham apenas `app_module`, `wire_tray_module_role` e `user_module_access`. Isso comprova que a
migration mínima `20260722010529_a314a04d-1425-4fa6-b9fc-25b71f02840d.sql` foi aplicada, enquanto o
grupo operacional anterior, datado de 21/07, não foi executado. O erro de faturamento não era uma
falha isolada: dashboard, pedidos, produção, estoque, separação, produtos, movimentos e relatórios
dependiam da mesma implantação incompleta.

A correção está em `20260727123000_wire_tray_schema_reconciliation.sql`. Ela parte do estado mínimo,
usa lock transacional, cria somente objetos ausentes, substitui funções e policies de forma
determinística, mantém RLS, valida o contrato final e solicita a recarga do cache do PostgREST. A
migration aborta sem alterar registros caso encontre uma quantidade intermediária de tabelas
operacionais; esse estado exige inspeção manual porque não é seguro inferir constraints de tabelas
parcialmente criadas.

## Mapa de dependências por tela

| Área           | Relações e views lidas                                                                                                                                                                                                                                                                                     | Comandos persistentes                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Acesso e shell | `user_module_access`, `wire_tray_notifications`                                                                                                                                                                                                                                                            | `wire_tray_mark_notification_read`                                                    |
| Visão geral    | `wire_tray_orders`, `wire_tray_production_orders`, `wire_tray_inventory_catalog`, `wire_tray_separation_entries`, `wire_tray_audit_events`                                                                                                                                                                 | nenhum                                                                                |
| Pedidos        | `clients`, `client_units`, `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_order_financials`, `wire_tray_order_item_financials`, `wire_tray_reservations`, `wire_tray_production_orders`, `wire_tray_stock_balances`, `wire_tray_stock_locations`, `wire_tray_documents`, `wire_tray_audit_events` | `wire_tray_save_order_draft`, `wire_tray_confirm_order`, `wire_tray_cancel_order`     |
| Produção       | `wire_tray_production_orders`, `wire_tray_production_entries`, `wire_tray_products`, `wire_tray_stock_locations`, `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_documents`, `wire_tray_audit_events`                                                                                             | `wire_tray_create_production_order`, `wire_tray_record_production_entry`              |
| Estoque        | `wire_tray_inventory_catalog`, `wire_tray_projected_inventory`, `wire_tray_stock_balances`, `wire_tray_stock_locations`, `wire_tray_stock_movements`, `wire_tray_production_orders`                                                                                                                        | `wire_tray_record_stock_movement`, `wire_tray_trigger_replenishment`                  |
| Separação      | `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_reservations`, `wire_tray_separation_entries`, `wire_tray_stock_locations`                                                                                                                                                                         | `wire_tray_record_separation`                                                         |
| Faturamento    | `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_order_financials`, `wire_tray_documents`                                                                                                                                                                                                           | `wire_tray_mark_billed`, `wire_tray_release_for_dispatch`, `wire_tray_dispatch_order` |
| Produtos       | `wire_tray_products`, `wire_tray_stock_locations`, `wire_tray_projected_inventory`, `wire_tray_order_items`, `wire_tray_orders`, `wire_tray_production_orders`, `wire_tray_stock_movements`, `wire_tray_documents`, `wire_tray_audit_events`                                                               | gravação protegida por RLS; reposição usa `wire_tray_trigger_replenishment`           |
| Movimentações  | `wire_tray_stock_movements`, `wire_tray_products`, `wire_tray_stock_locations`, `wire_tray_orders`, `wire_tray_production_orders`                                                                                                                                                                          | nenhum; o livro-razão é imutável                                                      |
| Relatórios     | mesmas consultas consolidadas de dashboard, estoque e pedidos                                                                                                                                                                                                                                              | nenhum                                                                                |
| Configurações  | `wire_tray_stock_locations`, usuários retornados por `wire_tray_list_access_users`                                                                                                                                                                                                                         | `wire_tray_set_module_access`; gravação de locais protegida por RLS                   |
| Documentos     | `wire_tray_documents`, bucket privado `wire-tray-documents`                                                                                                                                                                                                                                                | preparação/finalização autenticada de upload e URL assinada                           |

Todas as server functions passam por `requireSupabaseAuth` e `requireWireTrayAccess`. Os comandos
críticos também repetem a autorização no PostgreSQL e retornam o registro ou saldo persistido; a UI
não calcula um novo saldo otimista.

## Ordem segura de implantação

1. Conferir no projeto alvo que o estado corresponde à fundação mínima ou ao contrato operacional completo.
2. Aplicar apenas as migrations pendentes, incluindo a reconciliação de 27/07; não reproduzir manualmente as quatro migrations originais.
3. Confirmar o `COMMIT` e a emissão de `NOTIFY pgrst, 'reload schema'` e `NOTIFY pgrst, 'reload config'`.
4. Gerar novamente os tipos com o CLI conectado ao projeto real e comparar com `src/integrations/supabase/types.ts`.
5. Executar consultas vazias autenticadas para todas as relações e testar cada papel do módulo antes de liberar escrita operacional.

Se o histórico remoto ainda listar `20260721133000`, `20260721133100`, `20260721133200` e
`20260721133300` como pendentes, não executar `db push` diretamente: ele tentaria aplicar os arquivos
antigos antes da reconciliação e colidiria com a fundação mínima. Nesse caso, um administrador deve
executar a reconciliação em transação, validar o contrato e então reparar o histórico dessas quatro
versões e de `20260727123000` como aplicadas. Essa decisão depende da inspeção de
`supabase_migrations.schema_migrations` no projeto alvo e não pode ser inferida apenas pelos arquivos
locais.
