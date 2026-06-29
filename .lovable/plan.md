# Corrigir "permission denied for function has_role"

## Causa
Na correção de segurança anterior, revoguei `EXECUTE` da função `public.has_role` para `authenticated` e `anon`. Mesmo sendo `SECURITY DEFINER`, o Postgres verifica a permissão de **EXECUTE do chamador** antes de invocar a função. Como todas as políticas RLS (clientes, OSs, técnicos, etc.) chamam `has_role(auth.uid(), 'admin')`, qualquer query do app passou a falhar com `permission denied for function has_role` — daí o "Algo deu errado".

## Correção
Migração curta restaurando o `EXECUTE` para os roles que executam políticas RLS:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
```

`service_role` já tem acesso e segue inalterado.

## Sobre o aviso de segurança original
O linter sinaliza "SECURITY DEFINER executável por usuário autenticado" como `warn`. No nosso caso, isso é **intencional e necessário**: `has_role` é a função canônica usada dentro das políticas RLS (padrão recomendado da Supabase). Ela apenas verifica se o `_user_id` informado possui um determinado papel — não expõe nem altera dados. Após restaurar o GRANT, vou marcar essa finding como **ignored** no scanner, explicando que é um falso positivo para esse uso.

A outra correção (políticas de `service_order_technicians` restritas a `authenticated` em vez de `public`) permanece em vigor — esta migração não a desfaz.

## Validação
- Reabrir o app e confirmar que dashboard, listagens de OS e clientes carregam normalmente.
- Verificar no console que `permission denied for function has_role` desaparece.
