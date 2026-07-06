DROP POLICY IF EXISTS "Update orders (admin or owner)" ON public.service_orders;

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