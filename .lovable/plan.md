## Problema

Ao abrir uma OS com dois técnicos, apenas o **técnico principal** (a primeira pessoa selecionada, gravada em `service_orders.technician_id`) vê a OS na "Central do técnico". O técnico secundário recebe a notificação, mas quando fecha, a OS não aparece na home.

## Causa raiz

O dashboard filtra `myOrders` com esta lógica:

```
assigned.some(t => myTechnicianIds.has(t.id))   // via embed assigned_technicians
|| order.technician_id === myTechnicianId       // fallback pela coluna legada
```

O embed `assigned_technicians` vem de `service_order_technicians`, cuja política RLS de SELECT atualmente permite apenas:

```
is_admin() OR user_owns_order(service_order_id)
```

Ou seja, o técnico não pode ler nenhuma linha da tabela de vínculos. Resultado: o embed volta vazio para ambos os técnicos. Sobra o fallback `order.technician_id`, que só bate para o **primeiro** técnico (o marcado como `is_primary` / gravado na coluna legada). O secundário fica invisível.

A RLS de `service_orders` já usa `user_is_order_technician(id)`, então a OS em si é retornada para os dois. O bug está isolado à RLS da tabela de vínculos.

## Correção

Uma única migration ampliando a política SELECT de `public.service_order_technicians` para incluir o técnico atribuído à OS:

```sql
DROP POLICY IF EXISTS "View order technicians (admin or order owner)"
  ON public.service_order_technicians;

CREATE POLICY "View order technicians"
ON public.service_order_technicians
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_owns_order(service_order_id)
  OR public.user_is_order_technician(service_order_id)
);
```

Efeito:
- Admin e criador continuam vendo tudo (nada muda).
- Cada técnico atribuído passa a enxergar as linhas de vínculo da própria OS (incluindo a dos colegas de equipe — necessário para o card "Controle de tempo" já listar os dois).
- Sem mudança nas policies de INSERT/UPDATE/DELETE (a manutenção do vínculo continua restrita a admin/dono).

## Escopo

- **Backend:** 1 migration nova em `supabase/migrations/` com o `DROP POLICY` + `CREATE POLICY` acima. Sem alterar tabelas, GRANTs, colunas ou outras policies.
- **Frontend:** nenhuma alteração. O `useMemo` de `myOrders` (que já checa `assigned_technicians` primeiro) passa a funcionar para os dois técnicos automaticamente. O card "Controle de tempo da OS" também se beneficia (deixa de depender de embed vazio).
- **Fluxos preservados:** listagem admin de OS, wizard de criação/edição, notificações, exclusão de OS, cálculos financeiros, histórico de tempo — nada é tocado.

## Verificação

Após aplicar a migration:
1. Confirmar via consulta que a policy nova está ativa em `pg_policy`.
2. Abrir a OS #1055 no perfil do Juan e no perfil do Douglas — a OS deve aparecer em ambos na "Central do técnico" e o card "Controle de tempo" deve listar os dois técnicos em cada perfil.
3. Perfil de admin/operador continua vendo tudo como antes.
