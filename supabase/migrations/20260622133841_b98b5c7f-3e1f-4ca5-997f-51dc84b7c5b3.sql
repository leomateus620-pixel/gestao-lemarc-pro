
-- Expand clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS clients_cnpj_unique ON public.clients (cnpj) WHERE cnpj IS NOT NULL;

-- client_units
CREATE TABLE IF NOT EXISTS public.client_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sector text,
  city text,
  state text,
  address text,
  responsible_name text,
  phone text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_units_client ON public.client_units (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_units TO authenticated;
GRANT ALL ON public.client_units TO service_role;

ALTER TABLE public.client_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View units (admin or owner)" ON public.client_units
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);

CREATE POLICY "Insert units (self)" ON public.client_units
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update units (admin or owner)" ON public.client_units
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by)
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);

CREATE POLICY "Delete units (admin or owner)" ON public.client_units
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = created_by);

CREATE TRIGGER trg_client_units_updated_at
  BEFORE UPDATE ON public.client_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- service_orders: client_unit_id
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS client_unit_id uuid REFERENCES public.client_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_client_unit ON public.service_orders (client_unit_id);
