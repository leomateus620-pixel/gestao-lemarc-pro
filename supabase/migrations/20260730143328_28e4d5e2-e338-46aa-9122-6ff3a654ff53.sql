ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS execution_report text,
  ADD COLUMN IF NOT EXISTS execution_report_updated_by uuid,
  ADD COLUMN IF NOT EXISTS execution_report_updated_at timestamp with time zone;