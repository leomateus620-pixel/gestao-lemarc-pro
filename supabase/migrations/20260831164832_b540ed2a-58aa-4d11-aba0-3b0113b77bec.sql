CREATE OR REPLACE FUNCTION public.prevent_terminal_order_labor_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- 'finished' é ação do técnico (encerrar serviço) e ocorre antes da revisão
  -- do admin: as horas do histórico ainda precisam ser materializadas.
  IF order_status IN ('review', 'approved', 'cancelled')
     OR COALESCE(is_finalized, false) THEN
    RAISE EXCEPTION 'Não é permitido sincronizar horas automaticamente em uma OS revisada.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;