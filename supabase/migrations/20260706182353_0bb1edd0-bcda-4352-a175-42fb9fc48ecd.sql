
-- Helper: current user owns the order
CREATE OR REPLACE FUNCTION public.user_owns_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE id = _order_id AND created_by = auth.uid()
  );
$$;

-- Helper: current user is a technician assigned to the order
CREATE OR REPLACE FUNCTION public.user_is_order_technician(_order_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_order_technicians sot
    JOIN public.technicians t ON t.id = sot.technician_id
    WHERE sot.service_order_id = _order_id
      AND t.user_id = auth.uid()
  );
$$;

-- Rewrite service_orders SELECT policies (drop both, add single non-recursive)
DROP POLICY IF EXISTS "View accessible orders" ON public.service_orders;
DROP POLICY IF EXISTS "View orders (admin or owner)" ON public.service_orders;

CREATE POLICY "View accessible orders"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR public.user_is_order_technician(id)
);

-- Rewrite service_order_technicians policies to use non-recursive helper
DROP POLICY IF EXISTS "View order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Insert order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Update order technicians (admin or order owner)" ON public.service_order_technicians;
DROP POLICY IF EXISTS "Delete order technicians (admin or order owner)" ON public.service_order_technicians;

CREATE POLICY "View order technicians (admin or order owner)"
ON public.service_order_technicians
FOR SELECT
TO authenticated
USING (public.is_admin() OR public.user_owns_order(service_order_id));

CREATE POLICY "Insert order technicians (admin or order owner)"
ON public.service_order_technicians
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR public.user_owns_order(service_order_id));

CREATE POLICY "Update order technicians (admin or order owner)"
ON public.service_order_technicians
FOR UPDATE
TO authenticated
USING (public.is_admin() OR public.user_owns_order(service_order_id))
WITH CHECK (public.is_admin() OR public.user_owns_order(service_order_id));

CREATE POLICY "Delete order technicians (admin or order owner)"
ON public.service_order_technicians
FOR DELETE
TO authenticated
USING (public.is_admin() OR public.user_owns_order(service_order_id));
