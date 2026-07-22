## Causa raiz

O login falha em ambos os módulos ("Ordens de Serviço" e "Leitos Aramados") com "Não foi possível validar os módulos autorizados". A tela chama `getMyModuleAccess`, que consulta `public.user_module_access` — e essa tabela **não existe no banco**.

Confirmado via banco: `supabase_migrations.schema_migrations` mostra a última migração aplicada como `20260716131602`. As quatro migrações de Leitos Aramados (`20260721133000_wire_tray_foundation`, `133100_wire_tray_security`, `133200_wire_tray_commands`, `133300_wire_tray_fulfillment`) **nunca rodaram na nuvem**, então nenhuma das tabelas `wire_tray_*` nem `user_module_access` existe. Como `getMyModuleAccess` faz `.from("user_module_access")` sempre (mesmo para o módulo OS, apenas para validar), o `.maybeSingle()` retorna erro de relation missing e o handler lança a mensagem genérica que o usuário vê.

Nada no fluxo de auth em si está quebrado — Google e e-mail/senha autenticam com sucesso (as logs de auth mostram login `200`). O bloqueio é 100% no passo pós-login que valida acesso a módulos contra uma tabela ausente.

## Correção

Aplicar as quatro migrações pendentes exatamente como já estão versionadas no repositório, sem alterar o fluxo de login e sem tocar em código de UI:

1. `supabase/migrations/20260721133000_wire_tray_foundation.sql`
2. `supabase/migrations/20260721133100_wire_tray_security.sql`
3. `supabase/migrations/20260721133200_wire_tray_commands.sql`
4. `supabase/migrations/20260721133300_wire_tray_fulfillment.sql`

Elas criam `public.user_module_access` (com `GRANT SELECT ... TO authenticated` e RLS), o enum `app_module`, as demais tabelas de Leitos Aramados e a RPC `wire_tray_list_access_users` / `wire_tray_set_module_access` que outros pontos do app já esperam.

Efeito no login:
- Módulo **Ordens de Serviço**: `getMyModuleAccess` retorna `{ os: true, wireTrays: null }` → `finishAuthentication` prossegue e redireciona para `/ordens/...`.
- Módulo **Leitos Aramados**: para usuários ainda sem linha em `user_module_access`, retorna `wireTrays: null` e a UI mostra a mensagem já existente "Sua sessão está ativa, mas ainda não possui acesso ao módulo Leitos Aramados" — comportamento correto e previsto pelo código atual. Admins podem então liberar acesso pela tela de configurações de Leitos.

## Passos técnicos

1. Executar as quatro migrações via ferramenta `supabase--migration`, na ordem cronológica dos nomes, cada uma no seu próprio call para preservar o versionamento.
2. Após rodar, verificar com `supabase--read_query`:
   - `user_module_access` existe e tem `GRANT SELECT ... TO authenticated`.
   - RPCs `wire_tray_list_access_users` e `wire_tray_set_module_access` presentes.
3. Testar o login no preview em ambos os módulos com a conta atual do usuário — deve entrar em Ordens de Serviço e, ao tentar Leitos, receber a mensagem de "sem acesso ao módulo" (esperado até liberação).

## Fora de escopo

- Nenhuma mudança em `src/routes/login.tsx`, `AuthContext`, `getMyModuleAccess` ou fluxo OAuth Google.
- Nenhuma alteração em RLS / policies existentes de outras tabelas.
- Nenhum seed operacional de Leitos Aramados (as migrações são intencionalmente aditivas e não semeiam dados).
