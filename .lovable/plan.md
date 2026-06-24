## Objetivo
Conceder a role `admin` aos usuários mostrados no print, para que tenham acesso de visualização total do sistema.

## Observação
A mensagem fala em "3 usuários", mas o print lista **4 e‑mails**. Vou tratar os 4 como administradores. Se algum não deve ser admin, me avise antes de aprovar.

## Usuários a promover
- marciop.freddi@gmail.com
- lemarcfino@gmail.com
- lemarcmanutencao@gmail.com
- eduardo.s.qt@gmail.com

Todos já existem em `public.profiles` e hoje não possuem nenhuma role atribuída em `public.user_roles`.

## Mudança (1 migration SQL)
Inserir a role `admin` para os 4 `user_id` correspondentes em `public.user_roles`, com `ON CONFLICT (user_id, role) DO NOTHING` para ser idempotente.

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('28326a48-46d4-4a26-942c-d087e6d05036', 'admin'),
  ('f3a5b4f7-0522-4593-9b6b-635eb385828f', 'admin'),
  ('80210d37-3ec8-4f0b-a6e5-f2b52abc1eb5', 'admin'),
  ('fcfc6a61-ae65-48dd-aed5-03b4be0e2495', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Fora de escopo
- Não vou alterar políticas RLS, tabelas ou código de UI. O sistema já possui a função `public.has_role(uid, 'admin')` disponível para reforçar permissões de admin onde for necessário em iterações futuras.
- Se o objetivo for também *exibir* dados de todos os usuários nas telas (ex.: lista de OS de outros operadores), isso exige ajustes nas policies/queries — posso planejar em separado se desejar.
