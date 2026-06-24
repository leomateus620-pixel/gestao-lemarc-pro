DO $$ BEGIN
  CREATE TYPE public.billing_status AS ENUM ('pending', 'ready', 'billed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS billing_status public.billing_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS billed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS billing_notes text NULL,
  ADD COLUMN IF NOT EXISTS invoice_reference text NULL;

CREATE INDEX IF NOT EXISTS service_orders_billing_status_idx
  ON public.service_orders (billing_status);
CREATE INDEX IF NOT EXISTS service_orders_opened_at_idx
  ON public.service_orders (opened_at DESC);