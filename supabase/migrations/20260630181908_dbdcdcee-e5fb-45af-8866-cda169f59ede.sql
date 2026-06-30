
-- 1) service_order_signatures
CREATE TABLE public.service_order_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  signed_by_name text NOT NULL,
  signed_by_role text,
  signature_path text,
  signature_data_url text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  collected_by uuid REFERENCES auth.users(id),
  user_agent text,
  ip_address text,
  device_info jsonb,
  geo_lat numeric,
  geo_lng numeric,
  signature_hash text,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revoke_reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sosig_order ON public.service_order_signatures(service_order_id);
CREATE UNIQUE INDEX uniq_sosig_active_per_order
  ON public.service_order_signatures(service_order_id)
  WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.service_order_signatures TO authenticated;
GRANT ALL ON public.service_order_signatures TO service_role;

ALTER TABLE public.service_order_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sosig_select_auth" ON public.service_order_signatures
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sosig_insert_self" ON public.service_order_signatures
  FOR INSERT TO authenticated
  WITH CHECK (collected_by = auth.uid());

CREATE POLICY "sosig_update_admin" ON public.service_order_signatures
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Waiver columns on service_orders
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS signature_waiver_reason text,
  ADD COLUMN IF NOT EXISTS signature_waived_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS signature_waived_at timestamptz;

-- 3) Storage policies for service-order-signatures bucket (bucket created via Storage API).
-- Authenticated users can read and write; uploads must use a path beginning with the order id.
CREATE POLICY "sosig_storage_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'service-order-signatures');

CREATE POLICY "sosig_storage_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-order-signatures');

CREATE POLICY "sosig_storage_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'service-order-signatures' AND public.has_role(auth.uid(), 'admin'));
