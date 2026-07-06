DROP POLICY IF EXISTS "View technicians" ON public.technicians;
DROP POLICY IF EXISTS "View technicians (admin or owner)" ON public.technicians;
CREATE POLICY "View technicians (authenticated)"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (true);