ALTER TABLE public.service_order_labor_entries
  ADD COLUMN IF NOT EXISTS entry_source text NOT NULL DEFAULT 'legacy';

ALTER TABLE public.service_order_labor_entries
  DROP CONSTRAINT IF EXISTS service_order_labor_entries_entry_source_valid;

ALTER TABLE public.service_order_labor_entries
  ADD CONSTRAINT service_order_labor_entries_entry_source_valid
  CHECK (entry_source IN ('legacy', 'session_sync', 'admin_adjustment', 'admin_finalization'));

CREATE OR REPLACE FUNCTION public.prevent_terminal_order_labor_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status public.service_order_status;
  is_finalized boolean;
BEGIN
  IF NEW.entry_source <> 'session_sync' THEN
    RETURN NEW;
  END IF;

  SELECT so.status, (sof.finalized_at IS NOT NULL)
    INTO order_status, is_finalized
  FROM public.service_orders so
  LEFT JOIN public.service_order_financials sof
    ON sof.service_order_id = so.id
  WHERE so.id = NEW.service_order_id;

  IF order_status IN ('finished', 'review', 'approved', 'cancelled')
     OR COALESCE(is_finalized, false) THEN
    RAISE EXCEPTION 'Não é permitido sincronizar horas automaticamente em uma OS encerrada.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_terminal_order_labor_sync
  ON public.service_order_labor_entries;

CREATE TRIGGER prevent_terminal_order_labor_sync
BEFORE INSERT ON public.service_order_labor_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_terminal_order_labor_sync();