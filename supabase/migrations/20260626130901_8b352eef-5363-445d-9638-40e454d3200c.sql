
-- 1) Hourly rate padrão no cadastro do técnico
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS hourly_rate_cents integer;

-- 2) Função do técnico no vínculo da OS
ALTER TABLE public.service_order_technicians
  ADD COLUMN IF NOT EXISTS role text;

-- 3) Tabela de apontamentos de horas (labor entries)
CREATE TABLE IF NOT EXISTS public.service_order_labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  role text,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  hourly_rate_cents integer NOT NULL CHECK (hourly_rate_cents >= 0),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT labor_entry_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_labor_entries_order ON public.service_order_labor_entries(service_order_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_tech  ON public.service_order_labor_entries(technician_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_labor_entries TO authenticated;
GRANT ALL ON public.service_order_labor_entries TO service_role;

ALTER TABLE public.service_order_labor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View labor entries (admin or order owner)"
ON public.service_order_labor_entries FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_labor_entries.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Insert labor entries (admin or order owner)"
ON public.service_order_labor_entries FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_labor_entries.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Update labor entries (admin or order owner)"
ON public.service_order_labor_entries FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_labor_entries.service_order_id
      AND so.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_labor_entries.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Delete labor entries (admin or order owner)"
ON public.service_order_labor_entries FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_labor_entries.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE TRIGGER trg_labor_entries_updated_at
BEFORE UPDATE ON public.service_order_labor_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Tabela de resumo financeiro (1:1 com a OS)
DO $$ BEGIN
  CREATE TYPE public.displacement_type AS ENUM ('none', 'per_km', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.service_order_financials (
  service_order_id uuid PRIMARY KEY REFERENCES public.service_orders(id) ON DELETE CASCADE,
  total_labor_minutes integer NOT NULL DEFAULT 0,
  total_labor_cents integer NOT NULL DEFAULT 0,
  displacement_type public.displacement_type NOT NULL DEFAULT 'none',
  displacement_count integer NOT NULL DEFAULT 0,
  displacement_km_total numeric(10,2) NOT NULL DEFAULT 0,
  displacement_rate_cents integer NOT NULL DEFAULT 0,
  displacement_total_cents integer NOT NULL DEFAULT 0,
  displacement_notes text,
  materials_total_cents integer NOT NULL DEFAULT 0,
  grand_total_cents integer NOT NULL DEFAULT 0,
  notes text,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_financials TO authenticated;
GRANT ALL ON public.service_order_financials TO service_role;

ALTER TABLE public.service_order_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View financials (admin or order owner)"
ON public.service_order_financials FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_financials.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Insert financials (admin or order owner)"
ON public.service_order_financials FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_financials.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Update financials (admin or order owner)"
ON public.service_order_financials FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_financials.service_order_id
      AND so.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_financials.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE POLICY "Delete financials (admin or order owner)"
ON public.service_order_financials FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.service_orders so
    WHERE so.id = service_order_financials.service_order_id
      AND so.created_by = auth.uid()
  )
);

CREATE TRIGGER trg_financials_updated_at
BEFORE UPDATE ON public.service_order_financials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
