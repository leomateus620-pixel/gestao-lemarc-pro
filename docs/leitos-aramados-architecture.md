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
