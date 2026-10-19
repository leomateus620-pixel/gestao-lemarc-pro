CREATE TABLE public.service_order_team_requests (
  request_key text PRIMARY KEY,
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('link','link_and_start','start_own')),
  technician_ids uuid[] NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_order_team_requests TO authenticated;
GRANT ALL ON public.service_order_team_requests TO service_role;
ALTER TABLE public.service_order_team_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read team requests" ON public.service_order_team_requests
  FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.service_order_time_sessions ADD COLUMN IF NOT EXISTS request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS service_order_time_sessions_request_key_tech_uq
  ON public.service_order_time_sessions (request_key, technician_id) WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.team_link_technicians(
  _order_id uuid, _technician_ids uuid[], _start boolean, _request_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _status service_order_status;
  _now timestamptz := now();
  _existing public.service_order_team_requests;
  _ids uuid[];
  _tid uuid;
  _added uuid[] := '{}';
  _already uuid[] := '{}';
  _started uuid[] := '{}';
  _running uuid[] := '{}';
  _has_primary boolean;
  _rows int;
  _result jsonb;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem vincular técnicos.' USING ERRCODE = '42501';
  END IF;
  IF _request_key IS NULL OR length(_request_key) < 8 OR length(_request_key) > 100 THEN
    RAISE EXCEPTION 'Requisição inválida.';
  END IF;
  SELECT array_agg(DISTINCT x) INTO _ids FROM unnest(coalesce(_technician_ids, '{}')) x WHERE x IS NOT NULL;
  IF _ids IS NULL OR array_length(_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos um técnico.';
  END IF;

  SELECT status INTO _status FROM public.service_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada.'; END IF;

  SELECT * INTO _existing FROM public.service_order_team_requests WHERE request_key = _request_key;
  IF FOUND THEN
    IF _existing.actor_user_id <> _uid OR _existing.service_order_id <> _order_id THEN
      RAISE EXCEPTION 'Requisição inválida.';
    END IF;
    RETURN _existing.result || jsonb_build_object('replayed', true);
  END IF;

  IF _status = 'cancelled' THEN
    RAISE EXCEPTION 'Não é possível adicionar técnicos a uma OS cancelada.';
  END IF;
  IF _start AND _status <> 'running' THEN
    RAISE EXCEPTION 'Só é possível iniciar horas com a OS em execução.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_ids) i LEFT JOIN public.technicians t ON t.id = i
    WHERE t.id IS NULL OR t.active IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Há técnico inativo ou inexistente na seleção.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.service_order_technicians WHERE service_order_id = _order_id AND is_primary)
    INTO _has_primary;

  FOREACH _tid IN ARRAY _ids LOOP
    INSERT INTO public.service_order_technicians (service_order_id, technician_id, assigned_by, is_primary)
    VALUES (_order_id, _tid, _uid, false)
    ON CONFLICT (service_order_id, technician_id) DO NOTHING;
    GET DIAGNOSTICS _rows = ROW_COUNT;
    IF _rows > 0 THEN _added := _added || _tid; ELSE _already := _already || _tid; END IF;

    IF _start THEN
      INSERT INTO public.service_order_time_sessions
        (service_order_id, technician_id, kind, started_at, source, created_by, request_key)
      VALUES (_order_id, _tid, 'work', _now, 'desktop', _uid, _request_key)
      ON CONFLICT (service_order_id, technician_id) WHERE ((ended_at IS NULL) AND (kind = 'work'::text)) DO NOTHING;
      GET DIAGNOSTICS _rows = ROW_COUNT;
      IF _rows > 0 THEN _started := _started || _tid; ELSE _running := _running || _tid; END IF;
    END IF;
  END LOOP;

  _result := jsonb_build_object(
    'added', to_jsonb(_added), 'alreadyLinked', to_jsonb(_already),
    'started', to_jsonb(_started), 'alreadyRunning', to_jsonb(_running),
    'startedAt', CASE WHEN _start THEN to_jsonb(_now) ELSE 'null'::jsonb END,
    'replayed', false);

  INSERT INTO public.service_order_team_requests (request_key, service_order_id, actor_user_id, operation, technician_ids, result)
  VALUES (_request_key, _order_id, _uid, CASE WHEN _start THEN 'link_and_start' ELSE 'link' END, _ids, _result);
  RETURN _result;
END $$;

CREATE OR REPLACE FUNCTION public.team_start_own(_order_id uuid, _request_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _status service_order_status;
  _now timestamptz := now();
  _existing public.service_order_team_requests;
  _tid uuid;
  _session record;
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = '42501'; END IF;
  IF _request_key IS NULL OR length(_request_key) < 8 OR length(_request_key) > 100 THEN
    RAISE EXCEPTION 'Requisição inválida.';
  END IF;

  SELECT status INTO _status FROM public.service_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OS não encontrada.'; END IF;

  SELECT * INTO _existing FROM public.service_order_team_requests WHERE request_key = _request_key;
  IF FOUND THEN
    IF _existing.actor_user_id <> _uid OR _existing.service_order_id <> _order_id THEN
      RAISE EXCEPTION 'Requisição inválida.';
    END IF;
    RETURN _existing.result || jsonb_build_object('replayed', true);
  END IF;

  SELECT t.id INTO _tid FROM public.technicians t
  WHERE t.user_id = _uid AND t.active IS TRUE
    AND (EXISTS (SELECT 1 FROM public.service_order_technicians l WHERE l.service_order_id = _order_id AND l.technician_id = t.id)
         OR EXISTS (SELECT 1 FROM public.service_orders o WHERE o.id = _order_id AND o.technician_id = t.id))
  LIMIT 1;
  IF _tid IS NULL THEN
    RAISE EXCEPTION 'Você não está vinculado a esta OS.' USING ERRCODE = '42501';
  END IF;
  IF _status <> 'running' THEN
    RAISE EXCEPTION 'Só é possível iniciar horas com a OS em execução.';
  END IF;

  INSERT INTO public.service_order_time_sessions
    (service_order_id, technician_id, kind, started_at, source, created_by, request_key)
  VALUES (_order_id, _tid, 'work', _now, 'mobile', _uid, _request_key)
  ON CONFLICT (service_order_id, technician_id) WHERE ((ended_at IS NULL) AND (kind = 'work'::text)) DO NOTHING;

  SELECT id, started_at INTO _session FROM public.service_order_time_sessions
  WHERE service_order_id = _order_id AND technician_id = _tid AND kind = 'work' AND ended_at IS NULL;

  _result := jsonb_build_object('technicianId', _tid, 'sessionId', _session.id,
    'startedAt', _session.started_at, 'alreadyRunning', _session.started_at <> _now, 'replayed', false);
  INSERT INTO public.service_order_team_requests (request_key, service_order_id, actor_user_id, operation, technician_ids, result)
  VALUES (_request_key, _order_id, _uid, 'start_own', ARRAY[_tid], _result);
  RETURN _result;
END $$;

REVOKE ALL ON FUNCTION public.team_link_technicians(uuid, uuid[], boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.team_start_own(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_link_technicians(uuid, uuid[], boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_start_own(uuid, text) TO authenticated;