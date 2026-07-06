## Problema

O técnico consegue **ver** a OS (`user_is_order_technician`), mas a política de **UPDATE** em `public.service_orders` só permite admin ou criador:

```
UPDATE: has_role(admin) OR auth.uid() = created_by
```

Quando o técnico clica em "Despachar OS" / "Iniciar deslocamento" / "Iniciar serviço", o `updateServiceOrderStatus` chama `.update(...).select().single()`. O RLS filtra a linha para 0 resultados, o `.single()` lança erro, o toast vermelho aparece e a UI não muda. Por isso o fluxo trava desde o primeiro clique.

## Correção

Migration única que **substitui** a política de UPDATE de `service_orders` para incluir o técnico atribuído:

```sql
DROP POLICY "Update orders (admin or owner)" ON public.service_orders;

CREATE POLICY "Update orders (admin, owner or assigned tech)"
ON public.service_orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR auth.uid() = created_by
  OR public.user_is_order_technician(id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR auth.uid() = created_by
  OR public.user_is_order_technician(id)
);
```

### Por que é seguro

- Aprovação para cobrança e cancelamento já são bloqueadas no handler `updateServiceOrderStatus` via `rpc('is_admin')` — técnico só consegue mover entre `pending → dispatched → transit → running → finished/review`.
- A regra de assinatura obrigatória antes de `finished/review/approved` também continua no handler.
- Alterações de valores financeiros ficam em outras tabelas (`service_order_financials`, `service_order_labor_entries`), cada uma com suas próprias policies — não são afetadas.

## Fora de escopo

- Nenhuma mudança em UI, componentes ou lógica de negócio.
- Nenhuma mudança em outras tabelas ou políticas.
