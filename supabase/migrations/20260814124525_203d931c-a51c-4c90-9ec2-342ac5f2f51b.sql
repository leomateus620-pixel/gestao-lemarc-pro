ALTER TABLE public.service_order_financials
  ADD COLUMN IF NOT EXISTS displacement_decided boolean NOT NULL DEFAULT false;

UPDATE public.service_order_financials
SET displacement_decided = true
WHERE displacement_type <> 'none'
   OR displacement_total_cents > 0
   OR displacement_km_total > 0;