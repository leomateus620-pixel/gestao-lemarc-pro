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
  )
  OR EXISTS (
    SELECT 1
    FROM public.service_orders so
    JOIN public.technicians t ON t.id = so.technician_id
    WHERE so.id = _order_id
      AND t.user_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.service_order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'service_order_assigned',
  title text NOT NULL,
  message text NULL,
  read_at timestamptz NULL,
  dismissed_at timestamptz NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT service_order_notifications_type_not_blank CHECK (btrim(type) <> ''),
  CONSTRAINT service_order_notifications_unique_assignment UNIQUE (
    service_order_id,
    technician_id,
    type
  )
);

CREATE INDEX IF NOT EXISTS idx_son_user_unread
  ON public.service_order_notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_son_service_order
  ON public.service_order_notifications(service_order_id);

CREATE INDEX IF NOT EXISTS idx_son_technician
  ON public.service_order_notifications(technician_id);

GRANT SELECT, INSERT, UPDATE ON public.service_order_notifications TO authenticated;
GRANT ALL ON public.service_order_notifications TO service_role;

ALTER TABLE public.service_order_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own service order notifications"
  ON public.service_order_notifications;
DROP POLICY IF EXISTS "Order owners create service order notifications"
  ON public.service_order_notifications;
DROP POLICY IF EXISTS "Users or order owners update service order notifications"
  ON public.service_order_notifications;

CREATE POLICY "Users read own service order notifications"
ON public.service_order_notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR public.user_owns_order(service_order_id)
);

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
  )
);

CREATE POLICY "Users or order owners update service order notifications"
ON public.service_order_notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR public.user_owns_order(service_order_id)
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
  )
);
