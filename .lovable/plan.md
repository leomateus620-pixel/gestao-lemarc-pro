## Cadastrar usuário Marcio (técnico)

### O que será feito
1. **Reduzir política mínima de senha** no Supabase Auth de 6 para 4 caracteres (via `supabase--configure_auth`) — necessário para aceitar "5656".
2. **Criar o usuário** `lemarcmanutencao@gmail.com` com senha `5656` diretamente na tabela `auth.users` usando a Auth Admin API através de uma migração/insert seed, com e-mail já confirmado (sem passo de verificação).
3. **Atribuir papel `tecnico`** em `public.user_roles` (o trigger `handle_new_user_role` já faria isso automaticamente, mas explicitaremos para garantir).
4. **Criar `profile`** com `full_name = "Marcio"` (trigger `handle_new_user` já popula, garantiremos o nome).

### Detalhes técnicos
- A criação real do usuário em `auth.users` requer chamada `auth.admin.createUser` (não pode ser feita por SQL puro sem hash de senha). Faremos isso via um **server function protegido** executado uma única vez OU via `supabase--insert` chamando função SQL que usa `crypt()` com bcrypt para popular `encrypted_password`. Optaremos por seed SQL:
  ```sql
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, ...)
  VALUES (gen_random_uuid(), 'lemarcmanutencao@gmail.com',
          crypt('5656', gen_salt('bf')), now(), ...);
  ```
  Os triggers `handle_new_user` e `handle_new_user_role` cuidam de `profiles` e `user_roles`.
- Depois: `UPDATE public.profiles SET full_name = 'Marcio'` e garantir `role = 'tecnico'`.

### Aviso de segurança
Senha de 4 dígitos numéricos é **fraca** e afeta todos os futuros cadastros do sistema. Recomendo trocar depois do primeiro login.

### Validação
- Confirmar via `supabase--read_query` que existe 1 registro em `auth.users`, `profiles` e `user_roles` para o e-mail.
- Testar login manual no preview.
