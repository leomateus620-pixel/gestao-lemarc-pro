DROP POLICY IF EXISTS "Order owners create service order notifications"
  ON public.service_order_notifications;

CREATE POLICY "Order owners create service order notifications"
ON public.service_order_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL
  AND technician_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.technicians t
    WHERE t.id = technician_id
      AND t.user_id = user_id
  )
  AND (
    public.is_admin()
    OR public.user_owns_order(service_order_id)
    OR public.user_is_order_technician(service_order_id)
  )
);

DROP POLICY IF EXISTS "Users or order owners update service order notifications"
  ON public.service_order_notifications;

CREATE POLICY "Users or order owners update service order notifications"
ON public.service_order_notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR public.user_owns_order(service_order_id)
  OR public.user_is_order_technician(service_order_id)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.technicians t
    WHERE t.id = technician_id
      AND t.user_id = user_id
  )
  AND (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.user_owns_order(service_order_id)
    OR public.user_is_order_technician(service_order_id)
  )
);