DROP POLICY IF EXISTS "View order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "View order technicians" ON public.service_order_technicians;

CREATE POLICY "View order technicians"
ON public.service_order_technicians
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.user_owns_order(service_order_id)
  OR public.user_is_order_technician(service_order_id)
);