ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'outro';
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS service_type_other text;