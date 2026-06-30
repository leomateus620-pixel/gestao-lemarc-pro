ALTER TABLE public.client_units
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS distance_km_from_base numeric(8,2),
  ADD COLUMN IF NOT EXISTS default_displacement_rate_cents integer,
  ADD COLUMN IF NOT EXISTS default_displacement_type text,
  ADD COLUMN IF NOT EXISTS billing_notes text;

ALTER TABLE public.client_units
  DROP CONSTRAINT IF EXISTS client_units_displacement_type_check;
ALTER TABLE public.client_units
  ADD CONSTRAINT client_units_displacement_type_check
  CHECK (default_displacement_type IS NULL OR default_displacement_type IN ('km','fixed','none'));

ALTER TABLE public.client_units
  DROP CONSTRAINT IF EXISTS client_units_displacement_rate_nonneg;
ALTER TABLE public.client_units
  ADD CONSTRAINT client_units_displacement_rate_nonneg
  CHECK (default_displacement_rate_cents IS NULL OR default_displacement_rate_cents >= 0);

ALTER TABLE public.client_units
  DROP CONSTRAINT IF EXISTS client_units_distance_nonneg;
ALTER TABLE public.client_units
  ADD CONSTRAINT client_units_distance_nonneg
  CHECK (distance_km_from_base IS NULL OR distance_km_from_base >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS client_units_client_cnpj_unique
  ON public.client_units (client_id, cnpj)
  WHERE cnpj IS NOT NULL;