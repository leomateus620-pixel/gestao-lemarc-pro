ALTER TABLE public.service_order_labor_entries
  ADD CONSTRAINT service_order_labor_entries_duration_sane
  CHECK (duration_minutes >= 0 AND duration_minutes <= 960);