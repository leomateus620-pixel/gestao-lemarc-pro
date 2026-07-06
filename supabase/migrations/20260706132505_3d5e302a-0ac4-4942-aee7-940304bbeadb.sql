
CREATE TABLE public.service_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  caption text,
  category text CHECK (category IN ('antes','depois','evidencia','peca_trocada','outro')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_order_attachments_order ON public.service_order_attachments(service_order_id);

GRANT SELECT, INSERT, DELETE ON public.service_order_attachments TO authenticated;
GRANT ALL ON public.service_order_attachments TO service_role;

ALTER TABLE public.service_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attachments"
  ON public.service_order_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own attachments"
  ON public.service_order_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can delete attachment"
  ON public.service_order_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enforce_service_order_attachment_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.service_order_attachments WHERE service_order_id = NEW.service_order_id) >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 fotos por OS atingido.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_service_order_attachment_limit
  BEFORE INSERT ON public.service_order_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_order_attachment_limit();
