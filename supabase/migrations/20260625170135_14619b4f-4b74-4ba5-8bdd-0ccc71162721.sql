
CREATE TABLE public.service_order_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_order_technicians_unique UNIQUE (service_order_id, technician_id)
);

CREATE INDEX idx_sot_service_order ON public.service_order_technicians(service_order_id);
CREATE INDEX idx_sot_technician ON public.service_order_technicians(technician_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_technicians TO authenticated;
GRANT ALL ON public.service_order_technicians TO service_role;

ALTER TABLE public.service_order_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View order technicians (admin or order owner)"
  ON public.service_order_technicians FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.created_by = auth.uid()
    )
  );

CREATE POLICY "Insert order technicians (admin or order owner)"
  ON public.service_order_technicians FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.created_by = auth.uid()
    )
  );

CREATE POLICY "Update order technicians (admin or order owner)"
  ON public.service_order_technicians FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.created_by = auth.uid()
    )
  );

CREATE POLICY "Delete order technicians (admin or order owner)"
  ON public.service_order_technicians FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.created_by = auth.uid()
    )
  );

-- Backfill: copy existing single-technician links into the new table
INSERT INTO public.service_order_technicians (service_order_id, technician_id, is_primary, assigned_by)
SELECT so.id, so.technician_id, true, so.created_by
FROM public.service_orders so
WHERE so.technician_id IS NOT NULL
ON CONFLICT (service_order_id, technician_id) DO NOTHING;
