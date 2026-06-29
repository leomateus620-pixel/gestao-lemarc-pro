
-- Restrict service_order_technicians policies to authenticated role
DROP POLICY IF EXISTS "View order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Insert order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Update order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Delete order technicians (admin or order owner)" ON public.service_order_technicians;

CREATE POLICY "View order technicians (admin or order owner)"
  ON public.service_order_technicians FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_order_technicians.service_order_id AND so.created_by = auth.uid()
  ));

CREATE POLICY "Insert order technicians (admin or order owner)"
  ON public.service_order_technicians FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_order_technicians.service_order_id AND so.created_by = auth.uid()
  ));

CREATE POLICY "Update order technicians (admin or order owner)"
  ON public.service_order_technicians FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_order_technicians.service_order_id AND so.created_by = auth.uid()
  ))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_order_technicians.service_order_id AND so.created_by = auth.uid()
  ));

CREATE POLICY "Delete order technicians (admin or order owner)"
  ON public.service_order_technicians FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM service_orders so
    WHERE so.id = service_order_technicians.service_order_id AND so.created_by = auth.uid()
  ));

-- Restrict has_role SECURITY DEFINER function execution to roles that need it (RLS policies run as the policy invoker but SECURITY DEFINER funcs need EXECUTE)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
