
CREATE TABLE public.service_order_material_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  caption text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_som_attachments_order ON public.service_order_material_attachments(service_order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_material_attachments TO authenticated;
GRANT ALL ON public.service_order_material_attachments TO service_role;

ALTER TABLE public.service_order_material_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view material attachments"
  ON public.service_order_material_attachments
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert material attachments"
  ON public.service_order_material_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete material attachments"
  ON public.service_order_material_attachments
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Storage policies for the private bucket service-order-materials
CREATE POLICY "Admins read material files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'service-order-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins upload material files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-order-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete material files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-order-materials' AND public.has_role(auth.uid(), 'admin'::public.app_role));
