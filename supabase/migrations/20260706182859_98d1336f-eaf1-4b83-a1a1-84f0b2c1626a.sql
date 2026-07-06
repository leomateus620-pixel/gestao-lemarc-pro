
DROP POLICY IF EXISTS "View clients (admin or owner)" ON public.clients;
CREATE POLICY "View clients (any authenticated)"
ON public.clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "View units (admin or owner)" ON public.client_units;
CREATE POLICY "View units (any authenticated)"
ON public.client_units FOR SELECT TO authenticated USING (true);
