## Objetivo
Aplicar controle por papéis (RBAC) nas OS, clientes e técnicos. Admin enxerga e edita tudo; operador só os próprios registros. Profiles permanece privado por usuário.

## 1. Migração de banco

### Tabela de papéis (padrão Lovable, sem recursão de RLS)
- Enum `public.app_role` com valores `admin`, `operador`.
- Tabela `public.user_roles` (`id`, `user_id` → `auth.users`, `role app_role`, `created_at`, unique `(user_id, role)`).
- GRANT `SELECT` para `authenticated`, `ALL` para `service_role`.
- RLS ligada com políticas:
  - Usuário lê os próprios papéis.
  - Só admin insere/edita/exclui papéis (via `has_role`).

### Função `public.has_role(_user_id uuid, _role app_role)`
`SECURITY DEFINER`, `STABLE`, `search_path = public`. Usada em todas as políticas para evitar recursão.

### Substituir políticas de `service_orders`, `clients`, `technicians`
Remover as políticas atuais "Authenticated can view/insert" e "Creator can update/delete" e recriar:

- **SELECT**: `public.has_role(auth.uid(), 'admin') OR created_by = auth.uid()`
- **INSERT**: `with check (created_by = auth.uid())` (admin também é autenticado, passa)
- **UPDATE**: `using (has_role(auth.uid(),'admin') OR created_by = auth.uid())` + mesmo `with check`
- **DELETE**: `using (has_role(auth.uid(),'admin') OR created_by = auth.uid())`

Resultado: operador só vê/edita o que criou; admin vê e edita tudo. Profiles fica como está (cada um o seu).

### Bootstrap do primeiro admin
Inserir papel `admin` para o primeiro usuário existente em `auth.users` (ou nenhum, se vazio), para não travar o sistema. Próximos admins são promovidos por outro admin.

## 2. Código de aplicação (build mode)

- `src/hooks/useUserRole.ts` — hook que consulta `user_roles` do usuário logado via `supabase.auth.getUser()` + select.
- Esconder no UI ações destrutivas (excluir OS de outro usuário) quando não for admin — a RLS já bloqueia, isto é só UX.
- Nenhuma alteração nas server functions: continuam usando `requireSupabaseAuth`, e a RLS faz o resto.

## Fora de escopo
- Tela de gestão de usuários/papéis (pode vir depois).
- Papel intermediário "supervisor".
- Mudanças nas tabelas `profiles`.

## Verificação
- Rodar linter do Supabase após a migração.
- Testar manualmente: login admin vê todas as OS; login operador só as próprias; INSERT continua funcionando; UPDATE/DELETE de OS alheia retorna erro de RLS para operador.
