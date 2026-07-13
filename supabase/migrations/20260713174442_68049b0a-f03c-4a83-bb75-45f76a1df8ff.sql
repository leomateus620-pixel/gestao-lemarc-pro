ALTER TABLE public.service_order_financials
  ADD COLUMN IF NOT EXISTS labor_entries_adjusted_at timestamptz,
  ADD COLUMN IF NOT EXISTS labor_entries_adjusted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;