## Corrigir "infinite recursion" nas policies das OS

### Diagnóstico
O login do técnico dispara `listServiceOrders`, que consulta `service_orders`. As policies têm **recursão mútua**:
- `service_orders` (SELECT) → subquery em `service_order_technicians`
- `service_order_technicians` (SELECT/INSERT/UPDATE/DELETE) → subquery em `service_orders`

O Postgres detecta o loop e aborta com `infinite recursion detected in policy`.

### Correção (migração)
Criar duas funções `SECURITY DEFINER` (bypassam RLS ao serem chamadas dentro das policies) e reescrever as policies para usá-las:

```sql
-- Retorna true se auth.uid() é o criador da OS
create or replace function public.user_owns_order(_order_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.service_orders where id=_order_id and created_by=auth.uid());
$$;

-- Retorna true se auth.uid() é técnico atribuído à OS
create or replace function public.user_is_order_technician(_order_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.service_order_technicians sot
    join public.technicians t on t.id = sot.technician_id
    where sot.service_order_id=_order_id and t.user_id=auth.uid()
  );
$$;
```

Substituir as policies:
- **`service_orders` SELECT** (`View accessible orders`): `is_admin() OR created_by = auth.uid() OR public.user_is_order_technician(id)`.
- Remover a policy duplicada `View orders (admin or owner)` (redundante com a acima).
- **`service_order_technicians`** SELECT/INSERT/UPDATE/DELETE: `is_admin() OR public.user_owns_order(service_order_id)`.

### Escopo / segurança
- Sem alterar lógica de acesso: técnico continua vendo apenas OSs onde é responsável; admin/dono continuam com acesso completo.
- Grants não mudam.
- Sem tocar em UI, server functions ou rotas.

### Validação
- Rodar `select public.user_is_order_technician(...)` e testar login do Marcio → dashboard do técnico carrega listagem sem erro.
- Testar login admin → nenhuma regressão.
