-- Leitos Aramados: transactional commands for access, drafts, reservations and inventory.

CREATE UNIQUE INDEX wire_tray_customer_production_one_open_per_item
  ON public.wire_tray_production_orders (order_item_id)
  WHERE origin_type = 'customer_order'
    AND status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');

CREATE OR REPLACE FUNCTION public.wire_tray_assert_role(
  _roles public.wire_tray_module_role[]
)
RETURNS public.wire_tray_module_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.wire_tray_module_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  v_role := public.wire_tray_current_role();
  IF v_role = ANY (_roles) THEN
    RETURN v_role;
  END IF;

  IF 'admin'::public.wire_tray_module_role = ANY (_roles)
     AND public.wire_tray_is_global_admin() THEN
    RETURN 'admin'::public.wire_tray_module_role;
  END IF;

  RAISE EXCEPTION 'Seu perfil não permite executar esta operação.'
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_write_audit(
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _before_data jsonb DEFAULT NULL,
  _after_data jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.wire_tray_audit_events (
    event_type, entity_type, entity_id, before_data, after_data, metadata,
    idempotency_key, actor_user_id
  )
  VALUES (
    _event_type, _entity_type, _entity_id, _before_data, _after_data,
    coalesce(_metadata, '{}'::jsonb), _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_assert_evidence_document(
  _document_id uuid,
  _allowed_entity_types text[],
  _entity_id uuid,
  _allowed_document_types public.wire_tray_document_type[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_document public.wire_tray_documents%ROWTYPE;
BEGIN
  IF _document_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_document
  FROM public.wire_tray_documents d
  WHERE d.id = _document_id
  FOR SHARE;

  IF v_document.id IS NULL OR v_document.status <> 'ready' THEN
    RAISE EXCEPTION 'O documento de evidência não existe ou ainda não está disponível.'
      USING ERRCODE = 'P0002';
  END IF;
  IF NOT (v_document.entity_type = ANY (_allowed_entity_types))
     OR v_document.entity_id <> _entity_id THEN
    RAISE EXCEPTION 'O documento de evidência não pertence a este registro.'
      USING ERRCODE = '23514';
  END IF;
  IF _allowed_document_types IS NOT NULL
     AND NOT (v_document.document_type = ANY (_allowed_document_types)) THEN
    RAISE EXCEPTION 'O tipo do documento não é válido como evidência desta operação.'
      USING ERRCODE = '23514';
  END IF;
  IF NOT public.wire_tray_can_view_document_visibility(v_document.visibility) THEN
    RAISE EXCEPTION 'Seu perfil não pode utilizar este documento.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_insert_movement(
  _movement_id uuid,
  _movement_type public.wire_tray_movement_type,
  _product_id uuid,
  _location_id uuid,
  _quantity numeric,
  _physical_delta numeric,
  _reserved_delta numeric,
  _previous_physical numeric,
  _new_physical numeric,
  _previous_reserved numeric,
  _new_reserved numeric,
  _reason text,
  _order_id uuid DEFAULT NULL,
  _order_item_id uuid DEFAULT NULL,
  _reservation_id uuid DEFAULT NULL,
  _production_order_id uuid DEFAULT NULL,
  _counterpart_movement_id uuid DEFAULT NULL,
  _evidence_document_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wire_tray_stock_movements (
    id, movement_type, product_id, location_id, quantity,
    physical_delta, reserved_delta,
    previous_physical, new_physical, previous_reserved, new_reserved,
    reason, order_id, order_item_id, reservation_id, production_order_id,
    counterpart_movement_id, evidence_document_id, idempotency_key, created_by
  )
  VALUES (
    coalesce(_movement_id, gen_random_uuid()), _movement_type, _product_id, _location_id,
    abs(_quantity), _physical_delta, _reserved_delta,
    _previous_physical, _new_physical, _previous_reserved, _new_reserved,
    _reason, _order_id, _order_item_id, _reservation_id, _production_order_id,
    _counterpart_movement_id, _evidence_document_id, _idempotency_key, auth.uid()
  )
  RETURNING id INTO _movement_id;
  RETURN _movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.wire_tray_assert_role(public.wire_tray_module_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_write_audit(text, text, uuid, jsonb, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_assert_evidence_document(
  uuid, text[], uuid, public.wire_tray_document_type[]
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_insert_movement(
  uuid, public.wire_tray_movement_type, uuid, uuid, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, text, uuid, uuid, uuid, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wire_tray_list_access_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  module_role public.wire_tray_module_role,
  active boolean,
  financial_access boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin']::public.wire_tray_module_role[]
  );

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    coalesce(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')::text,
    uma.module_role,
    coalesce(uma.active, false),
    coalesce(uma.financial_access, false),
    uma.updated_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.user_module_access uma
    ON uma.user_id = au.id
   AND uma.module_key = 'wire_trays'::public.app_module
  WHERE au.deleted_at IS NULL
  ORDER BY coalesce(p.full_name, au.email, au.id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_set_module_access(
  _user_id uuid,
  _module_role public.wire_tray_module_role,
  _active boolean,
  _financial_access boolean DEFAULT false
)
RETURNS public.user_module_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.user_module_access%ROWTYPE;
  v_result public.user_module_access%ROWTYPE;
  v_active_admins integer;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin']::public.wire_tray_module_role[]
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('wire_tray_admin_access', 0)
  );

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = _user_id AND au.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing
  FROM public.user_module_access uma
  WHERE uma.user_id = _user_id
    AND uma.module_key = 'wire_trays'::public.app_module
  FOR UPDATE;

  IF v_existing.id IS NOT NULL
     AND v_existing.active
     AND v_existing.module_role = 'admin'::public.wire_tray_module_role
     AND (NOT _active OR _module_role <> 'admin'::public.wire_tray_module_role) THEN
    SELECT count(*) INTO v_active_admins
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'::public.app_module
      AND uma.module_role = 'admin'::public.wire_tray_module_role
      AND uma.active;
    IF v_active_admins <= 1 THEN
      RAISE EXCEPTION 'O módulo precisa manter ao menos um administrador ativo.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.user_module_access (
    user_id, module_key, module_role, active, financial_access, created_by
  )
  VALUES (
    _user_id, 'wire_trays'::public.app_module, _module_role, _active,
    coalesce(_financial_access, false), auth.uid()
  )
  ON CONFLICT (user_id, module_key) DO UPDATE SET
    module_role = EXCLUDED.module_role,
    active = EXCLUDED.active,
    financial_access = EXCLUDED.financial_access
  RETURNING * INTO v_result;

  PERFORM public.wire_tray_write_audit(
    'module_access_changed', 'user_module_access', v_result.id,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE
      jsonb_build_object(
        'role', v_existing.module_role,
        'active', v_existing.active,
        'financial_access', v_existing.financial_access
      )
    END,
    jsonb_build_object(
      'role', v_result.module_role,
      'active', v_result.active,
      'financial_access', v_result.financial_access,
      'user_id', v_result.user_id
    )
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_save_order_draft(
  _order_id uuid,
  _payload jsonb,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_order public.wire_tray_orders%ROWTYPE;
  v_before jsonb;
  v_client_name text;
  v_unit_name text;
  v_item jsonb;
  v_product public.wire_tray_products%ROWTYPE;
  v_order_item_id uuid;
  v_quantity numeric(18,3);
  v_unit_price bigint;
  v_total bigint := 0;
  v_has_financial boolean := false;
  v_result jsonb;
  v_priority public.service_priority;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'comercial']::public.wire_tray_module_role[]
  );

  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'save_order_draft'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN
    RETURN v_existing_response;
  END IF;

  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'save_order_draft', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'save_order_draft'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta operação já está em andamento.' USING ERRCODE = '40001';
  END IF;

  IF jsonb_typeof(_payload->'items') <> 'array'
     OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um produto ao pedido.' USING ERRCODE = '23514';
  END IF;

  SELECT c.name INTO v_client_name
  FROM public.clients c
  WHERE c.id = (_payload->>'client_id')::uuid;
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.' USING ERRCODE = '23503';
  END IF;

  IF nullif(_payload->>'client_unit_id', '') IS NOT NULL THEN
    SELECT cu.name INTO v_unit_name
    FROM public.client_units cu
    WHERE cu.id = (_payload->>'client_unit_id')::uuid
      AND cu.client_id = (_payload->>'client_id')::uuid;
    IF v_unit_name IS NULL THEN
      RAISE EXCEPTION 'A unidade não pertence ao cliente selecionado.' USING ERRCODE = '23503';
    END IF;
  END IF;

  v_priority := coalesce(nullif(_payload->>'priority', '')::public.service_priority, 'media');

  IF _order_id IS NULL THEN
    INSERT INTO public.wire_tray_orders (
      client_id, client_unit_id, client_name_snapshot, client_unit_name_snapshot,
      customer_order_reference, quotation_reference, commercial_responsible_id,
      priority, expected_delivery_date, operational_notes, created_by
    )
    VALUES (
      (_payload->>'client_id')::uuid,
      nullif(_payload->>'client_unit_id', '')::uuid,
      v_client_name,
      v_unit_name,
      nullif(btrim(_payload->>'customer_order_reference'), ''),
      nullif(btrim(_payload->>'quotation_reference'), ''),
      auth.uid(),
      v_priority,
      nullif(_payload->>'expected_delivery_date', '')::date,
      nullif(btrim(_payload->>'operational_notes'), ''),
      auth.uid()
    )
    RETURNING * INTO v_order;
  ELSE
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = _order_id
    FOR UPDATE;
    IF v_order.id IS NULL THEN
      RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002';
    END IF;
    IF v_order.status <> 'draft'::public.wire_tray_order_status THEN
      RAISE EXCEPTION 'Somente rascunhos podem ser editados.' USING ERRCODE = '55000';
    END IF;
    v_before := jsonb_build_object(
      'client_id', v_order.client_id,
      'client_unit_id', v_order.client_unit_id,
      'priority', v_order.priority,
      'expected_delivery_date', v_order.expected_delivery_date
    );

    UPDATE public.wire_tray_orders SET
      client_id = (_payload->>'client_id')::uuid,
      client_unit_id = nullif(_payload->>'client_unit_id', '')::uuid,
      client_name_snapshot = v_client_name,
      client_unit_name_snapshot = v_unit_name,
      customer_order_reference = nullif(btrim(_payload->>'customer_order_reference'), ''),
      quotation_reference = nullif(btrim(_payload->>'quotation_reference'), ''),
      priority = v_priority,
      expected_delivery_date = nullif(_payload->>'expected_delivery_date', '')::date,
      operational_notes = nullif(btrim(_payload->>'operational_notes'), ''),
      version = version + 1
    WHERE id = v_order.id
    RETURNING * INTO v_order;

    IF NOT public.wire_tray_can_view_financials()
       AND EXISTS (
         SELECT 1
         FROM public.wire_tray_order_item_financials f
         JOIN public.wire_tray_order_items i ON i.id = f.order_item_id
         WHERE i.order_id = v_order.id
       ) THEN
      RAISE EXCEPTION 'Este rascunho contém valores e exige permissão financeira para edição.'
        USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.wire_tray_order_item_financials f
    USING public.wire_tray_order_items i
    WHERE f.order_item_id = i.id AND i.order_id = v_order.id;
    DELETE FROM public.wire_tray_order_items WHERE order_id = v_order.id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_payload->'items')
  LOOP
    v_quantity := (v_item->>'quantity')::numeric;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Todas as quantidades devem ser maiores que zero.' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_product
    FROM public.wire_tray_products p
    WHERE p.id = (v_item->>'product_id')::uuid
      AND p.active;
    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Produto indisponível ou não encontrado.' USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.wire_tray_order_items (
      order_id, product_id, product_name_snapshot, product_sku_snapshot,
      category_snapshot, unit_snapshot, requested_quantity, notes, sort_order
    )
    VALUES (
      v_order.id, v_product.id, v_product.name, v_product.sku,
      v_product.category, v_product.unit, v_quantity,
      nullif(btrim(v_item->>'notes'), ''),
      coalesce((v_item->>'sort_order')::integer, 0)
    )
    RETURNING id INTO v_order_item_id;

    IF nullif(v_item->>'unit_price_cents', '') IS NOT NULL THEN
      IF NOT public.wire_tray_can_view_financials() THEN
        RAISE EXCEPTION 'Seu perfil não permite registrar valores.' USING ERRCODE = '42501';
      END IF;
      v_unit_price := (v_item->>'unit_price_cents')::bigint;
      IF v_unit_price < 0 THEN
        RAISE EXCEPTION 'O valor unitário não pode ser negativo.' USING ERRCODE = '23514';
      END IF;
      INSERT INTO public.wire_tray_order_item_financials (
        order_item_id, unit_price_cents, total_cents, created_by
      )
      VALUES (
        v_order_item_id, v_unit_price, round(v_unit_price * v_quantity)::bigint, auth.uid()
      );
      v_total := v_total + round(v_unit_price * v_quantity)::bigint;
      v_has_financial := true;
    END IF;
  END LOOP;

  IF v_has_financial THEN
    INSERT INTO public.wire_tray_order_financials (
      order_id, total_cents, created_by
    )
    VALUES (v_order.id, v_total, auth.uid())
    ON CONFLICT (order_id) DO UPDATE SET total_cents = EXCLUDED.total_cents;
  ELSIF public.wire_tray_can_view_financials() THEN
    DELETE FROM public.wire_tray_order_financials WHERE order_id = v_order.id;
  END IF;

  PERFORM public.wire_tray_write_audit(
    CASE WHEN _order_id IS NULL THEN 'order_draft_created' ELSE 'order_draft_updated' END,
    'order', v_order.id, v_before,
    jsonb_build_object(
      'number', v_order.number,
      'client_id', v_order.client_id,
      'status', v_order.status,
      'item_count', jsonb_array_length(_payload->'items')
    ),
    '{}'::jsonb,
    _idempotency_key
  );

  v_result := jsonb_build_object(
    'id', v_order.id,
    'number', v_order.number,
    'status', v_order.status
  );
  UPDATE public.wire_tray_operation_requests SET
    response = v_result,
    completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'save_order_draft'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_trigger_replenishment_internal(
  _product_id uuid,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_product public.wire_tray_products%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_existing uuid;
  v_incoming numeric(18,3) := 0;
  v_projected numeric(18,3);
  v_quantity numeric(18,3);
  v_production_id uuid;
BEGIN
  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id
  FOR UPDATE;

  IF v_product.id IS NULL OR NOT v_product.active
     OR NOT v_product.automatic_replenishment
     OR v_product.default_location_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT po.id INTO v_existing
  FROM public.wire_tray_production_orders po
  WHERE po.product_id = v_product.id
    AND po.origin_type = 'replenishment'::public.wire_tray_production_origin
    AND po.status IN (
      'planned'::public.wire_tray_production_status,
      'released'::public.wire_tray_production_status,
      'in_progress'::public.wire_tray_production_status,
      'paused'::public.wire_tray_production_status,
      'awaiting_check'::public.wire_tray_production_status
    )
  ORDER BY po.created_at
  LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
  VALUES (v_product.id, v_product.default_location_id)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  SELECT * INTO v_balance
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = v_product.id
    AND b.location_id = v_product.default_location_id
  FOR UPDATE;

  SELECT coalesce(sum(po.planned_quantity - po.produced_quantity), 0)
  INTO v_incoming
  FROM public.wire_tray_production_orders po
  WHERE po.product_id = v_product.id
    AND po.origin_type IN (
      'replenishment'::public.wire_tray_production_origin,
      'manual_stock'::public.wire_tray_production_origin
    )
    AND po.status IN (
      'planned'::public.wire_tray_production_status,
      'released'::public.wire_tray_production_status,
      'in_progress'::public.wire_tray_production_status,
      'paused'::public.wire_tray_production_status,
      'awaiting_check'::public.wire_tray_production_status
    );

  v_projected := v_balance.available_quantity + v_incoming;
  IF v_projected > v_product.minimum_stock THEN RETURN NULL; END IF;

  v_quantity := greatest(
    v_product.minimum_production_batch,
    coalesce(v_product.target_stock - v_projected, v_product.minimum_production_batch)
  );

  INSERT INTO public.wire_tray_production_orders (
    origin_type, product_id, destination_location_id, planned_quantity,
    priority, generation_reason, created_by
  )
  VALUES (
    'replenishment', v_product.id, v_product.default_location_id, v_quantity,
    'media', coalesce(nullif(btrim(_reason), ''), 'Reposição automática por estoque projetado.'),
    auth.uid()
  )
  RETURNING id INTO v_production_id;

  PERFORM public.wire_tray_write_audit(
    'replenishment_created', 'production_order', v_production_id, NULL,
    jsonb_build_object(
      'product_id', v_product.id,
      'projected_quantity', v_projected,
      'minimum_stock', v_product.minimum_stock,
      'target_stock', v_product.target_stock,
      'planned_quantity', v_quantity
    )
  );
  RETURN v_production_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT po.id INTO v_existing
    FROM public.wire_tray_production_orders po
    WHERE po.product_id = _product_id
      AND po.origin_type = 'replenishment'::public.wire_tray_production_origin
      AND po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
    ORDER BY po.created_at
    LIMIT 1;
    RETURN v_existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_trigger_replenishment(_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  RETURN public.wire_tray_trigger_replenishment_internal(
    _product_id, 'Reposição solicitada após validação do estoque projetado.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_confirm_order(
  _order_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_product public.wire_tray_products%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_reserve numeric(18,3);
  v_shortage numeric(18,3);
  v_reservation_id uuid;
  v_production_id uuid;
  v_has_shortage boolean := false;
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'comercial']::public.wire_tray_module_role[]
  );

  SELECT * INTO v_order
  FROM public.wire_tray_orders o
  WHERE o.id = _order_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.status <> 'draft'::public.wire_tray_order_status THEN
    IF v_order.status = 'cancelled'::public.wire_tray_order_status THEN
      RAISE EXCEPTION 'Pedido cancelado não pode ser confirmado.' USING ERRCODE = '55000';
    END IF;
    RETURN jsonb_build_object('id', v_order.id, 'number', v_order.number, 'status', v_order.status);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.wire_tray_order_items i WHERE i.order_id = v_order.id
  ) THEN
    RAISE EXCEPTION 'O pedido não possui itens.' USING ERRCODE = '23514';
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.wire_tray_order_items i
    WHERE i.order_id = v_order.id
    ORDER BY i.product_id, i.id
    FOR UPDATE
  LOOP
    SELECT * INTO v_product
    FROM public.wire_tray_products p
    WHERE p.id = v_item.product_id
    FOR UPDATE;
    IF v_product.default_location_id IS NULL THEN
      RAISE EXCEPTION 'Configure o local padrão do produto % antes de confirmar.', v_product.name
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
    VALUES (v_product.id, v_product.default_location_id)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    SELECT * INTO v_balance
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = v_product.id
      AND b.location_id = v_product.default_location_id
    FOR UPDATE;

    v_reserve := least(v_item.requested_quantity, v_balance.available_quantity);
    v_shortage := v_item.requested_quantity - v_reserve;

    IF v_reserve > 0 THEN
      INSERT INTO public.wire_tray_reservations (
        order_id, order_item_id, product_id, location_id, quantity, created_by
      )
      VALUES (
        v_order.id, v_item.id, v_product.id, v_product.default_location_id,
        v_reserve, auth.uid()
      )
      RETURNING id INTO v_reservation_id;

      UPDATE public.wire_tray_stock_balances SET
        reserved_quantity = reserved_quantity + v_reserve,
        version = version + 1
      WHERE id = v_balance.id;

      PERFORM public.wire_tray_insert_movement(
        gen_random_uuid(), 'reservation', v_product.id, v_product.default_location_id,
        v_reserve, 0, v_reserve,
        v_balance.physical_quantity, v_balance.physical_quantity,
        v_balance.reserved_quantity, v_balance.reserved_quantity + v_reserve,
        'Reserva na confirmação do pedido.',
        v_order.id, v_item.id, v_reservation_id, NULL, NULL, NULL,
        CASE WHEN _idempotency_key IS NULL THEN NULL ELSE _idempotency_key || ':' || v_item.id::text END
      );
    END IF;

    IF v_shortage > 0 THEN
      v_has_shortage := true;
      INSERT INTO public.wire_tray_production_orders (
        origin_type, order_id, order_item_id, product_id, destination_location_id,
        planned_quantity, priority, planned_completion_date, generation_reason, created_by
      )
      VALUES (
        'customer_order', v_order.id, v_item.id, v_product.id,
        v_product.default_location_id, v_shortage, v_order.priority,
        v_order.expected_delivery_date, 'Déficit apurado na confirmação do pedido.', auth.uid()
      )
      RETURNING id INTO v_production_id;
    END IF;

    UPDATE public.wire_tray_order_items SET
      reserved_quantity = v_reserve,
      production_required_quantity = v_shortage
    WHERE id = v_item.id;

    PERFORM public.wire_tray_trigger_replenishment_internal(
      v_product.id, 'Reposição automática após reserva de pedido.'
    );
  END LOOP;

  UPDATE public.wire_tray_orders SET
    status = CASE WHEN v_has_shortage THEN 'production_pending'::public.wire_tray_order_status
                  ELSE 'stock_reserved'::public.wire_tray_order_status END,
    confirmed_at = now(),
    version = version + 1
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  IF v_has_shortage THEN
    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_requires_production',
      'Pedido com necessidade de produção',
      format('O pedido #%s possui itens sem saldo disponível.', v_order.number),
      '/leitos/producao',
      jsonb_build_object('order_number', v_order.number)
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'producao')
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL
    DO UPDATE SET
      message = EXCLUDED.message,
      metadata = EXCLUDED.metadata,
      read_at = NULL,
      dismissed_at = NULL,
      created_at = now();
  END IF;

  PERFORM public.wire_tray_write_audit(
    'order_confirmed', 'order', v_order.id,
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', v_order.status, 'confirmed_at', v_order.confirmed_at),
    '{}'::jsonb,
    _idempotency_key
  );

  v_result := jsonb_build_object('id', v_order.id, 'number', v_order.number, 'status', v_order.status);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_order_reservations_internal(
  _order_id uuid,
  _reason text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res public.wire_tray_reservations%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_remaining numeric(18,3);
  v_total numeric(18,3) := 0;
BEGIN
  FOR v_res IN
    SELECT *
    FROM public.wire_tray_reservations r
    WHERE r.order_id = _order_id
      AND r.status IN ('active', 'partially_consumed')
      AND r.remaining_quantity > 0
    ORDER BY r.product_id, r.location_id, r.id
    FOR UPDATE
  LOOP
    v_remaining := v_res.remaining_quantity;
    SELECT * INTO v_balance
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
    FOR UPDATE;

    UPDATE public.wire_tray_stock_balances SET
      reserved_quantity = reserved_quantity - v_remaining,
      version = version + 1
    WHERE id = v_balance.id;

    UPDATE public.wire_tray_reservations SET
      released_quantity = released_quantity + v_remaining,
      status = 'released',
      released_at = now()
    WHERE id = v_res.id;

    UPDATE public.wire_tray_order_items SET
      reserved_quantity = greatest(0, reserved_quantity - v_remaining)
    WHERE id = v_res.order_item_id;

    PERFORM public.wire_tray_insert_movement(
      gen_random_uuid(), 'reservation_release', v_res.product_id, v_res.location_id,
      v_remaining, 0, -v_remaining,
      v_balance.physical_quantity, v_balance.physical_quantity,
      v_balance.reserved_quantity, v_balance.reserved_quantity - v_remaining,
      _reason, _order_id, v_res.order_item_id, v_res.id
    );
    v_total := v_total + v_remaining;
  END LOOP;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_cancel_order(
  _order_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_released numeric(18,3);
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'comercial']::public.wire_tray_module_role[]
  );
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_order
  FROM public.wire_tray_orders o
  WHERE o.id = _order_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status IN ('dispatched', 'completed') THEN
    RAISE EXCEPTION 'Pedido expedido ou concluído não pode ser cancelado.' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.wire_tray_production_orders po
    WHERE po.order_id = v_order.id
      AND po.status IN ('in_progress', 'paused', 'awaiting_check', 'completed')
  ) THEN
    RAISE EXCEPTION 'Há produção iniciada para este pedido. Encaminhe para revisão administrativa.'
      USING ERRCODE = '55000';
  END IF;

  v_released := public.wire_tray_release_order_reservations_internal(v_order.id, _reason);
  UPDATE public.wire_tray_production_orders SET
    status = 'cancelled', cancelled_at = now(), version = version + 1
  WHERE order_id = v_order.id AND status IN ('planned', 'released');
  UPDATE public.wire_tray_orders SET
    status = 'cancelled', cancelled_at = now(), cancellation_reason = btrim(_reason),
    version = version + 1
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  PERFORM public.wire_tray_write_audit(
    'order_cancelled', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status, 'released_quantity', v_released),
    jsonb_build_object('reason', btrim(_reason))
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'released_quantity', v_released);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_stock_movement(
  _product_id uuid,
  _location_id uuid,
  _movement_type public.wire_tray_movement_type,
  _quantity numeric,
  _reason text,
  _destination_location_id uuid,
  _evidence_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_product public.wire_tray_products%ROWTYPE;
  v_source public.wire_tray_stock_balances%ROWTYPE;
  v_destination public.wire_tray_stock_balances%ROWTYPE;
  v_delta numeric(18,3);
  v_magnitude numeric(18,3);
  v_out_id uuid := gen_random_uuid();
  v_in_id uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe o motivo da movimentação.' USING ERRCODE = '23514';
  END IF;
  IF _movement_type NOT IN ('stock_entry', 'stock_exit', 'return', 'loss', 'adjustment', 'transfer_out') THEN
    RAISE EXCEPTION 'Tipo de movimentação manual inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'record_stock_movement'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'record_stock_movement', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'record_stock_movement'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta movimentação já está em andamento.' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id
  FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['product']::text[],
    _product_id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );
  IF NOT EXISTS (SELECT 1 FROM public.wire_tray_stock_locations l WHERE l.id = _location_id AND l.active) THEN
    RAISE EXCEPTION 'Local de estoque não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  IF _movement_type = 'adjustment' THEN
    IF _quantity = 0 THEN RAISE EXCEPTION 'O ajuste não pode ser zero.' USING ERRCODE = '23514'; END IF;
    v_delta := _quantity;
    v_magnitude := abs(_quantity);
  ELSE
    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'A quantidade deve ser maior que zero.' USING ERRCODE = '23514';
    END IF;
    v_magnitude := _quantity;
    v_delta := CASE WHEN _movement_type IN ('stock_entry', 'return') THEN _quantity ELSE -_quantity END;
  END IF;

  IF _movement_type = 'transfer_out' THEN
    IF _destination_location_id IS NULL OR _destination_location_id = _location_id THEN
      RAISE EXCEPTION 'Selecione um local de destino diferente.' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.wire_tray_stock_locations l
      WHERE l.id = _destination_location_id AND l.active
    ) THEN
      RAISE EXCEPTION 'Local de destino não encontrado ou inativo.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
  VALUES (_product_id, _location_id)
  ON CONFLICT (product_id, location_id) DO NOTHING;
  IF _movement_type = 'transfer_out' THEN
    INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
    VALUES (_product_id, _destination_location_id)
    ON CONFLICT (product_id, location_id) DO NOTHING;
  END IF;

  -- Deterministic location order prevents transfer deadlocks.
  PERFORM b.id
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = _product_id
    AND b.location_id IN (_location_id, coalesce(_destination_location_id, _location_id))
  ORDER BY b.location_id
  FOR UPDATE;

  SELECT * INTO v_source
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = _product_id AND b.location_id = _location_id;
  IF v_source.physical_quantity + v_delta < v_source.reserved_quantity THEN
    RAISE EXCEPTION 'Movimentação recusada: o saldo físico ficaria abaixo do reservado.'
      USING ERRCODE = '23514';
  END IF;

  IF _movement_type = 'transfer_out' THEN
    SELECT * INTO v_destination
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = _product_id AND b.location_id = _destination_location_id;

    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity - v_magnitude, version = version + 1
    WHERE id = v_source.id;
    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity + v_magnitude, version = version + 1
    WHERE id = v_destination.id;

    PERFORM public.wire_tray_insert_movement(
      v_out_id, 'transfer_out', _product_id, _location_id, v_magnitude,
      -v_magnitude, 0,
      v_source.physical_quantity, v_source.physical_quantity - v_magnitude,
      v_source.reserved_quantity, v_source.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, v_in_id, _evidence_document_id,
      _idempotency_key || ':out'
    );
    PERFORM public.wire_tray_insert_movement(
      v_in_id, 'transfer_in', _product_id, _destination_location_id, v_magnitude,
      v_magnitude, 0,
      v_destination.physical_quantity, v_destination.physical_quantity + v_magnitude,
      v_destination.reserved_quantity, v_destination.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, v_out_id, _evidence_document_id,
      _idempotency_key || ':in'
    );
    v_result := jsonb_build_object(
      'movement_id', v_out_id,
      'counterpart_movement_id', v_in_id,
      'physical_quantity', v_source.physical_quantity - v_magnitude,
      'available_quantity', v_source.physical_quantity - v_magnitude - v_source.reserved_quantity
    );
  ELSE
    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity + v_delta, version = version + 1
    WHERE id = v_source.id;
    PERFORM public.wire_tray_insert_movement(
      v_out_id, _movement_type, _product_id, _location_id, v_magnitude,
      v_delta, 0,
      v_source.physical_quantity, v_source.physical_quantity + v_delta,
      v_source.reserved_quantity, v_source.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, NULL, _evidence_document_id,
      _idempotency_key
    );
    v_result := jsonb_build_object(
      'movement_id', v_out_id,
      'physical_quantity', v_source.physical_quantity + v_delta,
      'available_quantity', v_source.physical_quantity + v_delta - v_source.reserved_quantity
    );
  END IF;

  PERFORM public.wire_tray_write_audit(
    'stock_movement_recorded', 'stock_movement', v_out_id, NULL,
    v_result, jsonb_build_object('reason', btrim(_reason)), _idempotency_key
  );
  IF v_delta < 0 THEN
    PERFORM public.wire_tray_trigger_replenishment_internal(
      _product_id, 'Reposição automática após movimentação de saída.'
    );
  END IF;
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'record_stock_movement'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE VIEW public.wire_tray_projected_inventory
WITH (security_invoker = true)
AS
SELECT
  b.id AS balance_id,
  b.product_id,
  b.location_id,
  b.physical_quantity,
  b.reserved_quantity,
  b.available_quantity,
  coalesce(sum(po.planned_quantity - po.produced_quantity) FILTER (
    WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
  ), 0)::numeric(18,3) AS in_production_quantity,
  (
    b.available_quantity
    + coalesce(sum(po.planned_quantity - po.produced_quantity) FILTER (
        WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
          AND po.origin_type IN ('replenishment', 'manual_stock')
      ), 0)
  )::numeric(18,3) AS projected_quantity,
  b.updated_at
FROM public.wire_tray_stock_balances b
LEFT JOIN public.wire_tray_production_orders po
  ON po.product_id = b.product_id
 AND po.destination_location_id = b.location_id
GROUP BY b.id;

GRANT SELECT ON public.wire_tray_projected_inventory TO authenticated, service_role;

-- Product-level inventory is calculated in the database so health filters and
-- pagination are applied before rows are returned to the client. Customer-order
-- production remains visible as work in progress, but it is not counted as
-- projected free stock because it is committed to that order on completion.
CREATE OR REPLACE VIEW public.wire_tray_inventory_catalog
WITH (security_invoker = true)
AS
WITH balance_totals AS (
  SELECT
    b.product_id,
    sum(b.physical_quantity)::numeric(18,3) AS physical_quantity,
    sum(b.reserved_quantity)::numeric(18,3) AS reserved_quantity,
    max(b.updated_at) AS balance_updated_at
  FROM public.wire_tray_stock_balances b
  GROUP BY b.product_id
),
production_totals AS (
  SELECT
    po.product_id,
    sum(po.planned_quantity - po.produced_quantity)::numeric(18,3) AS in_production_quantity,
    coalesce(
      sum(po.planned_quantity - po.produced_quantity) FILTER (
        WHERE po.origin_type IN ('replenishment', 'manual_stock')
      ),
      0
    )::numeric(18,3) AS incoming_stock_quantity
  FROM public.wire_tray_production_orders po
  WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
  GROUP BY po.product_id
),
inventory AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.category,
    p.unit,
    p.active,
    p.short_description,
    p.width_mm,
    p.height_mm,
    p.length_mm,
    p.material,
    p.finish,
    p.technical_notes,
    p.default_location_id,
    p.minimum_stock,
    p.target_stock,
    p.minimum_production_batch,
    p.automatic_replenishment,
    p.replenishment_notes,
    p.created_at,
    p.updated_at,
    l.id AS default_location_record_id,
    l.code AS default_location_code,
    l.name AS default_location_name,
    l.description AS default_location_description,
    l.active AS default_location_active,
    l.updated_at AS default_location_updated_at,
    coalesce(b.physical_quantity, 0)::numeric(18,3) AS physical_quantity,
    coalesce(b.reserved_quantity, 0)::numeric(18,3) AS reserved_quantity,
    (coalesce(b.physical_quantity, 0) - coalesce(b.reserved_quantity, 0))::numeric(18,3)
      AS available_quantity,
    coalesce(pt.in_production_quantity, 0)::numeric(18,3) AS in_production_quantity,
    coalesce(pt.incoming_stock_quantity, 0)::numeric(18,3) AS incoming_stock_quantity,
    (
      coalesce(b.physical_quantity, 0)
      - coalesce(b.reserved_quantity, 0)
      + coalesce(pt.incoming_stock_quantity, 0)
    )::numeric(18,3) AS projected_quantity,
    b.balance_updated_at
  FROM public.wire_tray_products p
  LEFT JOIN public.wire_tray_stock_locations l ON l.id = p.default_location_id
  LEFT JOIN balance_totals b ON b.product_id = p.id
  LEFT JOIN production_totals pt ON pt.product_id = p.id
)
SELECT
  i.*,
  CASE
    WHEN i.physical_quantity = 0 THEN 'empty'
    WHEN i.available_quantity < i.minimum_stock THEN 'low'
    WHEN i.available_quantity = i.minimum_stock THEN 'attention'
    ELSE 'healthy'
  END AS stock_health
FROM inventory i;

GRANT SELECT ON public.wire_tray_inventory_catalog TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.wire_tray_list_access_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_set_module_access(uuid, public.wire_tray_module_role, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_save_order_draft(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_trigger_replenishment_internal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_trigger_replenishment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_confirm_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_order_reservations_internal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_cancel_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_stock_movement(
  uuid, uuid, public.wire_tray_movement_type, numeric, text, uuid, uuid, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wire_tray_list_access_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_set_module_access(uuid, public.wire_tray_module_role, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_save_order_draft(uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_trigger_replenishment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_confirm_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_cancel_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_stock_movement(
  uuid, uuid, public.wire_tray_movement_type, numeric, text, uuid, uuid, text
) TO authenticated, service_role;
