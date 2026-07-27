-- Auditoria de ajustes de horários pelos técnicos
ALTER TABLE public.service_order_time_sessions
  ADD COLUMN IF NOT EXISTS adjusted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS adjusted_at timestamptz,
  ADD COLUMN IF NOT EXISTS adjustment_reason text;

-- Política de UPDATE reforçada: apenas técnico dono da sessão OU admin
DROP POLICY IF EXISTS "Authenticated can update own or admin" ON public.service_order_time_sessions;

CREATE POLICY "Own technician or admin can update session"
ON public.service_order_time_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
);