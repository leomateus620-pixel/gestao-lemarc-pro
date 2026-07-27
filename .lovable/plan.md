## Cadastrar novo administrador

Criar o usuário `leonardomateuspjjc56@gmail.com` com senha `Leonardo5656.` e atribuir papel de administrador no sistema.

### Passos

1. Criar o usuário via Auth Admin API (email já confirmado, sem exigir verificação por e-mail).
2. Inserir registro em `public.user_roles` com `role = 'admin'` para o `user_id` recém-criado.
3. Garantir acesso ao módulo Leitos Aramados inserindo linha em `public.user_module_access` (`module_key = 'wire_trays'`, `module_role = 'admin'`, `active = true`, `financial_access = true`), seguindo o mesmo padrão já usado para os demais admins.
4. O trigger `handle_new_user` criará automaticamente o registro em `public.profiles`.

### Observações

- Login via Google continuará restrito: como esse e-mail estará cadastrado como admin, ele poderá também usar Google Login futuramente sem bloqueio.
- Nenhuma alteração de schema, rota ou UI é necessária — apenas inserção de dados.
- A senha será usada apenas para o cadastro inicial; recomende ao usuário trocá-la após o primeiro acesso.
