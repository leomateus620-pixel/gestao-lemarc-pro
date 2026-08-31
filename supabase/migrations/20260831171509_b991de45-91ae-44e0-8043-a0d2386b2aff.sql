ALTER TABLE public.service_order_time_sessions
  ADD COLUMN IF NOT EXISTS technician_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS technician_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS technician_review_note text;

ALTER TABLE public.service_order_labor_entries
  ADD COLUMN IF NOT EXISTS technician_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS technician_reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS time_review_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS time_review_completed_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Own technician or admin can update session" ON public.service_order_time_sessions;
CREATE POLICY "Order technician or admin can update session"
ON public.service_order_time_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.user_is_order_technician(service_order_id)
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.user_is_order_technician(service_order_id)
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated can insert time sessions" ON public.service_order_time_sessions;
CREATE POLICY "Order technician or admin can insert session"
ON public.service_order_time_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.user_is_order_technician(service_order_id)
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);