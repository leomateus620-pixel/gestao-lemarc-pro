## Situação atual (verificada)

- A tabela `user_module_access` hoje só tem 5 linhas, todas `wire_trays / admin / ativo`, todas de usuários com papel global `admin`. Nenhum técnico tem acesso ao módulo.
- Ou seja: hoje os técnicos estão fora do módulo **por ausência de dado**, não por regra. Se um administrador conceder acesso (tela Configurações → Acessos) ou se uma linha for criada por engano, um técnico passa a entrar normalmente — nada no banco impede isso.
- As funções que governam o módulo (`wire_tray_has_access`, `wire_tray_current_role`, `wire_tray_current_role_in`, `wire_tray_can_view_financials`, `wire_tray_assert_role`) apenas olham `user_module_access` + papel global `admin`. Nenhuma delas conhece o papel `tecnico`.
- O módulo de Ordens de Serviço não usa `user_module_access` (o servidor devolve `os: true` fixo), então a mudança não o afeta.

## O que será feito

Regra: **quem tem papel `tecnico` e não tem papel `admin` nunca acessa Leitos Aramados**, mesmo que exista linha de acesso.

### 1. Migração no banco (camada de verdade)

- Nova função `public.wire_tray_role_blocked()` (security definer, stable): retorna verdadeiro quando o usuário atual tem papel `tecnico` em `user_roles` e **não** tem papel `admin`.
- Aplicar esse bloqueio dentro das funções já existentes, sem mudar assinaturas:
  - `wire_tray_has_access()` → falso para técnico;
  - `wire_tray_current_role()` → nulo para técnico;
  - `wire_tray_current_role_in()` → falso para técnico;
  - `wire_tray_can_view_financials()` → falso para técnico;
  - `wire_tray_is_global_admin()` → falso para técnico sem papel admin (na prática já é, fica explícito);
  - `wire_tray_assert_role()` → erro claro "Seu perfil de técnico não tem acesso ao módulo Leitos Aramados".
- Como todas as políticas RLS das ~16 tabelas `wire_tray_*` e do bucket de documentos derivam dessas funções, o bloqueio passa a valer em leitura, escrita, RPCs e storage de uma só vez — sem reescrever política por política.
- Trigger de validação em `user_module_access` (antes de inserir/atualizar): recusa qualquer linha `wire_trays` para usuário com papel `tecnico`, evitando concessão indevida pela tela de acessos.
- Nada de `DROP TABLE`, `TRUNCATE` ou remoção de dados; migração aditiva e transacional.

### 2. Ajuste mínimo no aplicativo (apresentação)

- `getMyModuleAccess` passa a devolver `wireTrays: null` quando o bloqueio se aplica, para o técnico ver a mensagem de acesso restrito em vez de um erro de permissão cru.
- Nenhuma mudança no fluxo de login, no seletor de módulo (que já esconde a entrada quando não há acesso), no atalho do cabeçalho nem em qualquer parte do módulo de OS.

### 3. Verificação

- Consultar as políticas e funções após a migração.
- Simular as funções para um usuário técnico e para um administrador, confirmando: técnico bloqueado, admin inalterado.
- Conferir que os 5 administradores atuais continuam com acesso ativo ao módulo.

## Detalhes técnicos

- Migração via ferramenta de migração (uma transação), usando `CREATE OR REPLACE FUNCTION` nas funções já existentes — nenhuma política é recriada, então não há janela em que o módulo fica sem RLS.
- O bloqueio consulta `user_roles` (fonte oficial de papéis), nunca `profiles`, e usa `security definer` com `search_path` vazio para evitar recursão em RLS.
- Arquivo tocado no código: `src/lib/api/moduleAccess.functions.ts`.
