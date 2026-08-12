-- Espelha as sessões de tempo do técnico que registrou para os colegas da mesma OS sem nenhum apontamento (OS #1106 e #1107).
WITH target_orders AS (
  SELECT id FROM public.service_orders WHERE number IN (1106, 1107)
),
source_sessions AS (
  SELECT s.* FROM public.service_order_time_sessions s
  WHERE s.service_order_id IN (SELECT id FROM target_orders) AND s.kind = 'work'
),
missing_techs AS (
  SELECT DISTINCT sot.service_order_id, sot.technician_id
  FROM public.service_order_technicians sot
  WHERE sot.service_order_id IN (SELECT id FROM target_orders)
    AND NOT EXISTS (
      SELECT 1 FROM source_sessions ss
      WHERE ss.service_order_id = sot.service_order_id
        AND ss.technician_id = sot.technician_id
    )
)
INSERT INTO public.service_order_time_sessions (
  service_order_id, technician_id, kind, started_at, ended_at,
  pause_reason, pause_notes, end_reason, source, notes, created_by
)
SELECT ss.service_order_id, mt.technician_id, 'work', ss.started_at, ss.ended_at,
       ss.pause_reason, ss.pause_notes, ss.end_reason, 'admin_adjustment',
       'Tempo espelhado do colega de equipe (correção de apontamento).', ss.created_by
FROM missing_techs mt
JOIN source_sessions ss ON ss.service_order_id = mt.service_order_id;

-- Força o recálculo da apuração de horas dessas OS.
UPDATE public.service_order_financials f
SET labor_entries_adjusted_at = NULL, labor_entries_adjusted_by = NULL
WHERE f.service_order_id IN (SELECT id FROM public.service_orders WHERE number IN (1106, 1107));