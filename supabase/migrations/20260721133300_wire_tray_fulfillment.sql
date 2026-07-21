-- Leitos Aramados: production, separation, billing, dispatch and notification commands.

CREATE OR REPLACE FUNCTION public.wire_tray_create_production_order(
  _product_id uuid,
  _destination_location_id uuid,
  _planned_quantity numeric,
  _order_item_id uuid,
  _responsible_user_id uuid,
  _priority public.service_priority,
  _planned_completion_date date,
  _technical_instructions text,
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
  v_order public.wire_tray_orders%ROWTYPE;
  v_item_preview public.wire_tray_order_items%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_open numeric(18,3) := 0;
  v_outstanding numeric(18,3);
  v_order_id uuid;
  v_origin public.wire_tray_production_origin;
  v_production public.wire_tray_production_orders%ROWTYPE;
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'producao']::public.wire_tray_module_role[]
  );
  IF _planned_quantity IS NULL OR _planned_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade planejada deve ser maior que zero.' USING ERRCODE = '23514';
  END IF;
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'create_production_order'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'create_production_order', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'create_production_order'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta ordem de produção já está em criação.' USING ERRCODE = '40001';
  END IF;

  IF _order_item_id IS NOT NULL THEN
    SELECT * INTO v_item_preview
    FROM public.wire_tray_order_items i
    WHERE i.id = _order_item_id;
    IF v_item_preview.id IS NULL OR v_item_preview.product_id <> _product_id THEN
      RAISE EXCEPTION 'Item de pedido incompatível com o produto.' USING ERRCODE = '23503';
    END IF;
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = v_item_preview.order_id
    FOR UPDATE;
    IF v_order.id IS NULL OR v_order.status IN (
      'draft', 'cancelled', 'billed', 'ready_for_dispatch', 'dispatched', 'completed'
    ) THEN
      RAISE EXCEPTION 'O pedido não aceita uma nova ordem de produção.' USING ERRCODE = '55000';
    END IF;
    SELECT * INTO v_item
    FROM public.wire_tray_order_items i
    WHERE i.id = _order_item_id AND i.product_id = _product_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id AND p.active
  FOR UPDATE;
  IF v_product.id IS NULL THEN RAISE EXCEPTION 'Produto não encontrado ou inativo.' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.wire_tray_stock_locations l
    WHERE l.id = _destination_location_id AND l.active
  ) THEN
    RAISE EXCEPTION 'Local de destino não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  IF _order_item_id IS NULL THEN
    v_origin := 'manual_stock';
  ELSE
    SELECT coalesce(sum(po.planned_quantity - po.produced_quantity), 0)
    INTO v_open
    FROM public.wire_tray_production_orders po
    WHERE po.order_item_id = v_item.id
      AND po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');
    v_outstanding := greatest(0, v_item.requested_quantity - v_item.reserved_quantity - v_open);
    IF _planned_quantity > v_outstanding THEN
      RAISE EXCEPTION 'A quantidade excede a falta atual do item (%).', v_outstanding
        USING ERRCODE = '23514';
    END IF;
    v_order_id := v_item.order_id;
    v_origin := 'customer_order';
  END IF;

  IF _responsible_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = _responsible_user_id
      AND uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'producao')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _responsible_user_id AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'O responsável selecionado não possui acesso à produção.' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.wire_tray_production_orders (
    origin_type, order_id, order_item_id, product_id, destination_location_id,
    planned_quantity, responsible_user_id, priority, planned_completion_date,
    technical_instructions, generation_reason, created_by
  )
  VALUES (
    v_origin, v_order_id, _order_item_id, v_product.id, _destination_location_id,
    _planned_quantity, _responsible_user_id, coalesce(_priority, 'media'),
    _planned_completion_date, nullif(btrim(_technical_instructions), ''),
    CASE WHEN v_origin = 'manual_stock' THEN 'Produção manual para estoque.'
         ELSE 'Produção manual vinculada à falta de pedido.' END,
    auth.uid()
  )
  RETURNING * INTO v_production;

  IF v_order_id IS NOT NULL THEN
    UPDATE public.wire_tray_orders SET
      status = 'production_pending', version = version + 1
    WHERE id = v_order_id
      AND status NOT IN ('cancelled', 'completed', 'dispatched');
  END IF;

  PERFORM public.wire_tray_write_audit(
    'production_order_created', 'production_order', v_production.id, NULL,
    jsonb_build_object(
      'number', v_production.number,
      'origin_type', v_production.origin_type,
      'product_id', v_production.product_id,
      'planned_quantity', v_production.planned_quantity
    ), '{}'::jsonb, _idempotency_key
  );
  v_result := jsonb_build_object(
    'id', v_production.id,
    'number', v_production.number,
    'status', v_production.status
  );
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'create_production_order'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_production_entry(
  _production_order_id uuid,
  _entry_type public.wire_tray_production_entry_type,
  _quantity numeric,
  _notes text,
  _evidence_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.wire_tray_module_role;
  v_preview public.wire_tray_production_orders%ROWTYPE;
  v_production public.wire_tray_production_orders%ROWTYPE;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_entry_id uuid;
  v_reservation_id uuid;
  v_quantity numeric(18,3) := coalesce(_quantity, 0);
  v_result jsonb;
BEGIN
  v_role := public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'producao']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT pe.id INTO v_entry_id
  FROM public.wire_tray_production_entries pe
  WHERE pe.created_by = auth.uid() AND pe.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    SELECT * INTO v_production
    FROM public.wire_tray_production_orders po WHERE po.id = _production_order_id;
    RETURN jsonb_build_object(
      'entry_id', v_entry_id, 'id', v_production.id,
      'status', v_production.status, 'produced_quantity', v_production.produced_quantity
    );
  END IF;

  SELECT * INTO v_preview
  FROM public.wire_tray_production_orders po
  WHERE po.id = _production_order_id;
  IF v_preview.id IS NULL THEN RAISE EXCEPTION 'Ordem de produção não encontrada.' USING ERRCODE = 'P0002'; END IF;

  -- Customer production always locks the customer order before the production row.
  IF v_preview.order_id IS NOT NULL THEN
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = v_preview.order_id
    FOR UPDATE;
    IF v_order.status = 'cancelled' THEN
      RAISE EXCEPTION 'O pedido vinculado foi cancelado.' USING ERRCODE = '55000';
    END IF;
    SELECT * INTO v_item
    FROM public.wire_tray_order_items i
    WHERE i.id = v_preview.order_item_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_production
  FROM public.wire_tray_production_orders po
  WHERE po.id = _production_order_id
  FOR UPDATE;

  -- Recheck after the aggregate lock so concurrent retries converge on the
  -- first committed result instead of attempting the transition twice.
  SELECT pe.id INTO v_entry_id
  FROM public.wire_tray_production_entries pe
  WHERE pe.created_by = auth.uid() AND pe.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'entry_id', v_entry_id, 'id', v_production.id,
      'status', v_production.status, 'produced_quantity', v_production.produced_quantity
    );
  END IF;

  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['production_order']::text[],
    v_production.id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );

  CASE _entry_type
    WHEN 'start' THEN
      IF v_production.status NOT IN ('planned', 'released') THEN
        RAISE EXCEPTION 'Esta produção não pode ser iniciada no estado atual.' USING ERRCODE = '55000';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'in_progress', started_at = coalesce(started_at, now()),
        responsible_user_id = coalesce(responsible_user_id, auth.uid()), version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'progress' THEN
      IF v_production.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Inicie ou retome a produção antes de registrar avanço.' USING ERRCODE = '55000';
      END IF;
      IF v_quantity <= 0 OR v_production.produced_quantity + v_quantity > v_production.planned_quantity THEN
        RAISE EXCEPTION 'Quantidade inválida. Restam % para produzir.',
          v_production.planned_quantity - v_production.produced_quantity USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        produced_quantity = produced_quantity + v_quantity, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'pause' THEN
      IF v_production.status <> 'in_progress' OR _notes IS NULL OR btrim(_notes) = '' THEN
        RAISE EXCEPTION 'Informe o motivo para pausar uma produção em andamento.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'paused', pause_reason = btrim(_notes), version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'resume' THEN
      IF v_production.status <> 'paused' THEN
        RAISE EXCEPTION 'Somente uma produção pausada pode ser retomada.' USING ERRCODE = '55000';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'in_progress', pause_reason = NULL, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'scrap' THEN
      IF v_production.status <> 'in_progress' OR v_quantity <= 0 THEN
        RAISE EXCEPTION 'Informe uma perda positiva durante a produção.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        scrap_quantity = scrap_quantity + v_quantity, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'cancel' THEN
      IF v_role NOT IN ('admin', 'gestor') THEN
        RAISE EXCEPTION 'O cancelamento exige autorização gerencial.' USING ERRCODE = '42501';
      END IF;
      IF v_production.status NOT IN ('planned', 'released', 'paused') THEN
        RAISE EXCEPTION 'A produção não pode ser cancelada no estado atual.' USING ERRCODE = '55000';
      END IF;
      IF _notes IS NULL OR btrim(_notes) = '' THEN
        RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'cancelled', cancelled_at = now(), pause_reason = btrim(_notes),
        version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'complete' THEN
      IF v_production.status NOT IN ('in_progress', 'awaiting_check') THEN
        RAISE EXCEPTION 'A produção precisa estar em andamento para ser concluída.' USING ERRCODE = '55000';
      END IF;
      IF v_production.produced_quantity <> v_production.planned_quantity THEN
        RAISE EXCEPTION 'Produza a quantidade planejada antes de concluir. Restam %.',
          v_production.planned_quantity - v_production.produced_quantity USING ERRCODE = '23514';
      END IF;

      INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
      VALUES (v_production.product_id, v_production.destination_location_id)
      ON CONFLICT (product_id, location_id) DO NOTHING;
      SELECT * INTO v_balance
      FROM public.wire_tray_stock_balances b
      WHERE b.product_id = v_production.product_id
        AND b.location_id = v_production.destination_location_id
      FOR UPDATE;

      IF v_production.origin_type = 'customer_order' THEN
        INSERT INTO public.wire_tray_reservations (
          order_id, order_item_id, product_id, location_id, quantity, created_by
        )
        VALUES (
          v_production.order_id, v_production.order_item_id, v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity, auth.uid()
        )
        RETURNING id INTO v_reservation_id;
        UPDATE public.wire_tray_stock_balances SET
          physical_quantity = physical_quantity + v_production.planned_quantity,
          reserved_quantity = reserved_quantity + v_production.planned_quantity,
          version = version + 1
        WHERE id = v_balance.id;
        UPDATE public.wire_tray_order_items SET
          produced_quantity = produced_quantity + v_production.planned_quantity,
          reserved_quantity = reserved_quantity + v_production.planned_quantity
        WHERE id = v_production.order_item_id;
        PERFORM public.wire_tray_insert_movement(
          gen_random_uuid(), 'production_entry', v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity,
          v_production.planned_quantity, v_production.planned_quantity,
          v_balance.physical_quantity, v_balance.physical_quantity + v_production.planned_quantity,
          v_balance.reserved_quantity, v_balance.reserved_quantity + v_production.planned_quantity,
          'Produção concluída e comprometida com o pedido.',
          v_production.order_id, v_production.order_item_id, v_reservation_id,
          v_production.id, NULL, _evidence_document_id, _idempotency_key || ':movement'
        );
      ELSE
        UPDATE public.wire_tray_stock_balances SET
          physical_quantity = physical_quantity + v_production.planned_quantity,
          version = version + 1
        WHERE id = v_balance.id;
        PERFORM public.wire_tray_insert_movement(
          gen_random_uuid(), 'production_entry', v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity,
          v_production.planned_quantity, 0,
          v_balance.physical_quantity, v_balance.physical_quantity + v_production.planned_quantity,
          v_balance.reserved_quantity, v_balance.reserved_quantity,
          'Produção concluída para estoque.', NULL, NULL, NULL,
          v_production.id, NULL, _evidence_document_id, _idempotency_key || ':movement'
        );
      END IF;

      UPDATE public.wire_tray_production_orders SET
        status = 'completed', completed_at = now(), pause_reason = NULL, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;

      IF v_production.order_id IS NOT NULL THEN
        UPDATE public.wire_tray_orders o SET
          status = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM public.wire_tray_order_items i
              WHERE i.order_id = o.id AND i.reserved_quantity < i.requested_quantity
            ) THEN 'stock_reserved'::public.wire_tray_order_status
            ELSE 'in_production'::public.wire_tray_order_status
          END,
          version = version + 1
        WHERE o.id = v_production.order_id
          AND o.status NOT IN ('cancelled', 'completed', 'dispatched');
      END IF;
    ELSE
      RAISE EXCEPTION 'Evento de produção inválido.' USING ERRCODE = '22023';
  END CASE;

  IF _entry_type IN ('start', 'resume') AND v_production.order_id IS NOT NULL THEN
    UPDATE public.wire_tray_orders o SET
      status = 'in_production',
      version = version + 1
    WHERE o.id = v_production.order_id
      AND o.status NOT IN (
        'cancelled', 'completed', 'dispatched', 'billed', 'ready_for_dispatch'
      );
  END IF;

  INSERT INTO public.wire_tray_production_entries (
    production_order_id, entry_type, quantity, notes, evidence_document_id,
    idempotency_key, created_by
  )
  VALUES (
    v_production.id, _entry_type, greatest(v_quantity, 0),
    nullif(btrim(_notes), ''), _evidence_document_id, _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_entry_id;

  PERFORM public.wire_tray_write_audit(
    'production_' || _entry_type::text, 'production_order', v_production.id, NULL,
    jsonb_build_object(
      'status', v_production.status,
      'produced_quantity', v_production.produced_quantity,
      'planned_quantity', v_production.planned_quantity,
      'scrap_quantity', v_production.scrap_quantity
    ), '{}'::jsonb, _idempotency_key
  );
  v_result := jsonb_build_object(
    'entry_id', v_entry_id,
    'id', v_production.id,
    'status', v_production.status,
    'produced_quantity', v_production.produced_quantity,
    'planned_quantity', v_production.planned_quantity
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_reservation(
  _reservation_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res public.wire_tray_reservations%ROWTYPE;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_remaining numeric(18,3);
  v_production_id uuid;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe a justificativa da liberação.' USING ERRCODE = '23514';
  END IF;

  SELECT o.* INTO v_order
  FROM public.wire_tray_orders o
  JOIN public.wire_tray_reservations r ON r.order_id = o.id
  WHERE r.id = _reservation_id
  FOR UPDATE OF o;
  SELECT * INTO v_res
  FROM public.wire_tray_reservations r
  WHERE r.id = _reservation_id
  FOR UPDATE;
  IF v_res.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada.' USING ERRCODE = 'P0002'; END IF;
  v_remaining := v_res.remaining_quantity;
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('id', v_res.id, 'status', v_res.status, 'released_quantity', 0);
  END IF;
  SELECT * INTO v_item FROM public.wire_tray_order_items i WHERE i.id = v_res.order_item_id FOR UPDATE;
  SELECT * INTO v_balance
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
  FOR UPDATE;

  UPDATE public.wire_tray_stock_balances SET
    reserved_quantity = reserved_quantity - v_remaining, version = version + 1
  WHERE id = v_balance.id;
  UPDATE public.wire_tray_reservations SET
    released_quantity = released_quantity + v_remaining,
    status = 'released', released_at = now()
  WHERE id = v_res.id;
  UPDATE public.wire_tray_order_items SET
    reserved_quantity = reserved_quantity - v_remaining,
    production_required_quantity = production_required_quantity + v_remaining
  WHERE id = v_item.id;

  SELECT po.id INTO v_production_id
  FROM public.wire_tray_production_orders po
  WHERE po.order_item_id = v_item.id
    AND po.status IN ('planned', 'released')
  ORDER BY po.created_at LIMIT 1 FOR UPDATE;
  IF v_production_id IS NULL THEN
    INSERT INTO public.wire_tray_production_orders (
      origin_type, order_id, order_item_id, product_id, destination_location_id,
      planned_quantity, priority, planned_completion_date, generation_reason, created_by
    )
    VALUES (
      'customer_order', v_order.id, v_item.id, v_item.product_id, v_res.location_id,
      v_remaining, v_order.priority, v_order.expected_delivery_date,
      'Reposição de reserva liberada com autorização.', auth.uid()
    )
    RETURNING id INTO v_production_id;
  ELSE
    UPDATE public.wire_tray_production_orders SET
      planned_quantity = planned_quantity + v_remaining,
      generation_reason = concat(generation_reason, ' Reserva liberada: ', btrim(_reason)),
      version = version + 1
    WHERE id = v_production_id;
  END IF;
  UPDATE public.wire_tray_orders SET status = 'production_pending', version = version + 1
  WHERE id = v_order.id;

  PERFORM public.wire_tray_insert_movement(
    gen_random_uuid(), 'reservation_release', v_res.product_id, v_res.location_id,
    v_remaining, 0, -v_remaining,
    v_balance.physical_quantity, v_balance.physical_quantity,
    v_balance.reserved_quantity, v_balance.reserved_quantity - v_remaining,
    btrim(_reason), v_order.id, v_item.id, v_res.id, v_production_id
  );
  PERFORM public.wire_tray_write_audit(
    'reservation_released', 'reservation', v_res.id, NULL,
    jsonb_build_object('released_quantity', v_remaining, 'production_order_id', v_production_id),
    jsonb_build_object('reason', btrim(_reason))
  );
  RETURN jsonb_build_object(
    'id', v_res.id, 'status', 'released', 'released_quantity', v_remaining,
    'production_order_id', v_production_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_separation(
  _order_id uuid,
  _order_item_id uuid,
  _entry_type public.wire_tray_separation_entry_type,
  _quantity numeric,
  _difference_quantity numeric,
  _reason text,
  _resolves_entry_id uuid,
  _evidence_document_id uuid,
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
  v_target public.wire_tray_separation_entries%ROWTYPE;
  v_entry_id uuid;
  v_quantity numeric(18,3) := coalesce(_quantity, 0);
  v_difference numeric(18,3) := coalesce(_difference_quantity, 0);
  v_ready boolean;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;
  SELECT se.id INTO v_entry_id
  FROM public.wire_tray_separation_entries se
  WHERE se.created_by = auth.uid() AND se.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('entry_id', v_entry_id, 'order_id', _order_id);
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT * INTO v_item
  FROM public.wire_tray_order_items i
  WHERE i.id = _order_item_id AND i.order_id = _order_id
  FOR UPDATE;
  IF v_order.id IS NULL OR v_item.id IS NULL THEN
    RAISE EXCEPTION 'Pedido ou item não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  SELECT se.id INTO v_entry_id
  FROM public.wire_tray_separation_entries se
  WHERE se.created_by = auth.uid() AND se.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'entry_id', v_entry_id,
      'order_id', v_order.id,
      'status', v_order.status,
      'ready_for_billing', v_order.status = 'ready_for_billing'
    );
  END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['order']::text[],
    v_order.id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );
  IF v_order.status IN ('draft', 'cancelled', 'billed', 'ready_for_dispatch', 'dispatched', 'completed') THEN
    RAISE EXCEPTION 'O pedido não está disponível para separação ou conferência.' USING ERRCODE = '55000';
  END IF;

  IF _entry_type = 'separation' THEN
    IF v_item.reserved_quantity < v_item.requested_quantity THEN
      RAISE EXCEPTION 'O item ainda não está integralmente reservado.' USING ERRCODE = '55000';
    END IF;
    IF v_quantity <= 0 OR v_item.separated_quantity + v_quantity > v_item.reserved_quantity THEN
      RAISE EXCEPTION 'Quantidade de separação acima do saldo reservado.' USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      separated_quantity = separated_quantity + v_quantity
    WHERE id = v_item.id RETURNING * INTO v_item;
    UPDATE public.wire_tray_orders SET
      status = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM public.wire_tray_order_items i
          WHERE i.order_id = v_order.id AND i.separated_quantity < i.requested_quantity
        ) THEN 'awaiting_check'::public.wire_tray_order_status
        ELSE 'separating'::public.wire_tray_order_status
      END,
      version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;
  ELSIF _entry_type IN ('checking', 'discrepancy') THEN
    IF v_quantity <= 0 OR v_item.checked_quantity + v_quantity > v_item.separated_quantity THEN
      RAISE EXCEPTION 'A conferência não pode exceder a quantidade separada.' USING ERRCODE = '23514';
    END IF;
    IF v_difference > 0 AND (_reason IS NULL OR btrim(_reason) = '') THEN
      RAISE EXCEPTION 'Descreva a divergência encontrada.' USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      checked_quantity = checked_quantity + v_quantity
    WHERE id = v_item.id RETURNING * INTO v_item;
    UPDATE public.wire_tray_orders SET status = 'awaiting_check', version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;
  ELSIF _entry_type = 'resolution' THEN
    IF _resolves_entry_id IS NULL OR _reason IS NULL OR btrim(_reason) = '' THEN
      RAISE EXCEPTION 'Informe a divergência e a justificativa da resolução.' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO v_target
    FROM public.wire_tray_separation_entries se
    WHERE se.id = _resolves_entry_id
      AND se.order_id = v_order.id
      AND se.difference_quantity > 0
    FOR SHARE;
    IF v_target.id IS NULL THEN
      RAISE EXCEPTION 'Divergência não encontrada.' USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.wire_tray_separation_entries se
      WHERE se.resolves_entry_id = v_target.id AND se.entry_type = 'resolution'
    ) THEN
      RAISE EXCEPTION 'Esta divergência já foi resolvida.' USING ERRCODE = '55000';
    END IF;
    v_quantity := 0;
    v_difference := 0;
  ELSE
    RAISE EXCEPTION 'Tipo de registro inválido.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.wire_tray_separation_entries (
    order_id, order_item_id, entry_type, quantity, difference_quantity,
    reason, resolves_entry_id, evidence_document_id, idempotency_key, created_by
  )
  VALUES (
    v_order.id, v_item.id, _entry_type, v_quantity, v_difference,
    nullif(btrim(_reason), ''), _resolves_entry_id, _evidence_document_id,
    _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_entry_id;

  IF _entry_type = 'discrepancy' AND v_difference > 0 THEN
    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_separation_discrepancy',
      'Divergência na conferência',
      format(
        'O pedido #%s possui divergência de %s unidade(s) em %s.',
        v_order.number,
        v_difference,
        v_item.product_name_snapshot
      ),
      '/leitos/separacao',
      jsonb_build_object('entry_id', v_entry_id, 'order_item_id', v_item.id)
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'estoque')
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL
    DO UPDATE SET
      message = EXCLUDED.message,
      metadata = EXCLUDED.metadata,
      read_at = NULL,
      dismissed_at = NULL,
      created_at = now();
  END IF;

  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.wire_tray_order_items i
      WHERE i.order_id = v_order.id
        AND (i.reserved_quantity < i.requested_quantity
          OR i.separated_quantity < i.requested_quantity
          OR i.checked_quantity < i.requested_quantity)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.wire_tray_separation_entries d
      WHERE d.order_id = v_order.id
        AND d.difference_quantity > 0
        AND NOT EXISTS (
          SELECT 1 FROM public.wire_tray_separation_entries r
          WHERE r.resolves_entry_id = d.id AND r.entry_type = 'resolution'
        )
    )
  INTO v_ready;

  IF v_ready THEN
    UPDATE public.wire_tray_orders SET
      status = 'ready_for_billing', ready_for_billing_at = coalesce(ready_for_billing_at, now()),
      version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;

    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_ready_for_billing',
      'Pedido #' || v_order.number || ' pronto para faturamento',
      v_order.client_name_snapshot || ' · conferência concluída',
      '/leitos/faturamento',
      jsonb_build_object(
        'order_number', v_order.number,
        'client_name', v_order.client_name_snapshot,
        'ready_at', v_order.ready_for_billing_at
      )
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND (
        uma.module_role IN ('admin', 'faturamento')
        OR (uma.module_role = 'gestor' AND uma.financial_access)
      )
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL DO NOTHING;
  END IF;

  PERFORM public.wire_tray_write_audit(
    'order_' || _entry_type::text, 'order', v_order.id, NULL,
    jsonb_build_object(
      'order_item_id', v_item.id,
      'quantity', v_quantity,
      'difference_quantity', v_difference,
      'status', v_order.status,
      'ready_for_billing', v_ready
    ), '{}'::jsonb, _idempotency_key
  );
  RETURN jsonb_build_object(
    'entry_id', v_entry_id, 'order_id', v_order.id,
    'status', v_order.status, 'ready_for_billing', v_ready
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_mark_billed(
  _order_id uuid,
  _invoice_reference text,
  _billing_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'faturamento']::public.wire_tray_module_role[]
  );
  IF NOT public.wire_tray_can_view_financials() THEN
    RAISE EXCEPTION 'A confirmação de faturamento exige acesso financeiro.' USING ERRCODE = '42501';
  END IF;
  IF _invoice_reference IS NULL OR btrim(_invoice_reference) = '' THEN
    RAISE EXCEPTION 'Informe a referência da nota ou do faturamento.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'billed' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'ready_for_billing' THEN
    RAISE EXCEPTION 'O pedido ainda não está liberado pela conferência.' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.wire_tray_order_financials (
    order_id, total_cents, invoice_reference, billing_notes, billed_by, created_by
  )
  VALUES (
    v_order.id, 0, btrim(_invoice_reference), nullif(btrim(_billing_notes), ''),
    auth.uid(), auth.uid()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    invoice_reference = EXCLUDED.invoice_reference,
    billing_notes = EXCLUDED.billing_notes,
    billed_by = EXCLUDED.billed_by;
  UPDATE public.wire_tray_orders SET
    status = 'billed', billed_at = now(), version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_billed', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status, 'billed_at', v_order.billed_at)
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_for_dispatch(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'faturamento']::public.wire_tray_module_role[]
  );
  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'ready_for_dispatch' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'billed' THEN
    RAISE EXCEPTION 'Confirme o faturamento antes de liberar a expedição.' USING ERRCODE = '55000';
  END IF;
  UPDATE public.wire_tray_orders SET status = 'ready_for_dispatch', version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_released_for_dispatch', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status)
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_dispatch_order(
  _order_id uuid,
  _transport_note text,
  _receipt_document_id uuid,
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
  v_item public.wire_tray_order_items%ROWTYPE;
  v_res public.wire_tray_reservations%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_needed numeric(18,3);
  v_take numeric(18,3);
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque', 'faturamento']::public.wire_tray_module_role[]
  );
  IF _transport_note IS NULL OR btrim(_transport_note) = '' THEN
    RAISE EXCEPTION 'Informe o transporte, retirada ou observação de expedição.' USING ERRCODE = '23514';
  END IF;
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid() AND r.operation = 'dispatch_order'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'dispatch_order', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid() AND r.operation = 'dispatch_order'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta expedição já está em andamento.' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _receipt_document_id,
    ARRAY['order']::text[],
    v_order.id,
    ARRAY['dispatch_receipt', 'photo', 'other']::public.wire_tray_document_type[]
  );
  IF v_order.status IN ('dispatched', 'completed') THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'ready_for_dispatch' THEN
    RAISE EXCEPTION 'O pedido não está liberado para expedição.' USING ERRCODE = '55000';
  END IF;

  -- Lock order items and products before balances. This is the same global
  -- order used by confirmation and manual stock commands, preventing cycles.
  PERFORM i.id
  FROM public.wire_tray_order_items i
  WHERE i.order_id = v_order.id
  ORDER BY i.product_id, i.id
  FOR UPDATE;
  PERFORM p.id
  FROM public.wire_tray_products p
  JOIN public.wire_tray_order_items i ON i.product_id = p.id
  WHERE i.order_id = v_order.id
  ORDER BY p.id
  FOR UPDATE OF p;

  FOR v_item IN
    SELECT * FROM public.wire_tray_order_items i
    WHERE i.order_id = v_order.id
    ORDER BY i.product_id, i.id
    FOR UPDATE
  LOOP
    IF v_item.checked_quantity < v_item.requested_quantity THEN
      RAISE EXCEPTION 'Todos os itens precisam estar integralmente conferidos.' USING ERRCODE = '55000';
    END IF;
    v_needed := v_item.requested_quantity - v_item.dispatched_quantity;
    FOR v_res IN
      SELECT * FROM public.wire_tray_reservations r
      WHERE r.order_item_id = v_item.id
        AND r.remaining_quantity > 0
        AND r.status IN ('active', 'partially_consumed')
      ORDER BY r.product_id, r.location_id, r.created_at, r.id
      FOR UPDATE
    LOOP
      EXIT WHEN v_needed <= 0;
      v_take := least(v_needed, v_res.remaining_quantity);
      SELECT * INTO v_balance
      FROM public.wire_tray_stock_balances b
      WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
      FOR UPDATE;
      IF v_balance.physical_quantity < v_take OR v_balance.reserved_quantity < v_take THEN
        RAISE EXCEPTION 'Saldo reservado inconsistente. A expedição foi bloqueada.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_stock_balances SET
        physical_quantity = physical_quantity - v_take,
        reserved_quantity = reserved_quantity - v_take,
        version = version + 1
      WHERE id = v_balance.id;
      UPDATE public.wire_tray_reservations SET
        consumed_quantity = consumed_quantity + v_take,
        status = CASE WHEN remaining_quantity = v_take
                      THEN 'consumed'::public.wire_tray_reservation_status
                      ELSE 'partially_consumed'::public.wire_tray_reservation_status END,
        consumed_at = CASE WHEN remaining_quantity = v_take THEN now() ELSE consumed_at END
      WHERE id = v_res.id;
      PERFORM public.wire_tray_insert_movement(
        gen_random_uuid(), 'dispatch', v_res.product_id, v_res.location_id, v_take,
        -v_take, -v_take,
        v_balance.physical_quantity, v_balance.physical_quantity - v_take,
        v_balance.reserved_quantity, v_balance.reserved_quantity - v_take,
        btrim(_transport_note), v_order.id, v_item.id, v_res.id, NULL,
        NULL, _receipt_document_id,
        _idempotency_key || ':' || v_item.id::text || ':' || v_res.id::text
      );
      v_needed := v_needed - v_take;
    END LOOP;
    IF v_needed > 0 THEN
      RAISE EXCEPTION 'Reserva insuficiente para expedir o item %.', v_item.product_name_snapshot
        USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      dispatched_quantity = requested_quantity
    WHERE id = v_item.id;
    PERFORM public.wire_tray_trigger_replenishment_internal(
      v_item.product_id, 'Reposição automática após expedição.'
    );
  END LOOP;

  UPDATE public.wire_tray_orders SET
    status = 'completed', dispatched_at = now(), completed_at = now(), version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_dispatched', 'order', v_order.id, NULL,
    jsonb_build_object(
      'status', v_order.status,
      'dispatched_at', v_order.dispatched_at,
      'completed_at', v_order.completed_at
    ), jsonb_build_object('transport_note', btrim(_transport_note)), _idempotency_key
  );
  v_result := jsonb_build_object('id', v_order.id, 'status', v_order.status, 'dispatched_at', v_order.dispatched_at);
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid() AND operation = 'dispatch_order'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_mark_notification_read(
  _notification_id uuid,
  _dismiss boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501'; END IF;
  UPDATE public.wire_tray_notifications SET
    read_at = CASE WHEN NOT _dismiss THEN coalesce(read_at, now()) ELSE read_at END,
    dismissed_at = CASE WHEN _dismiss THEN coalesce(dismissed_at, now()) ELSE dismissed_at END
  WHERE id = _notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

REVOKE UPDATE ON public.wire_tray_notifications FROM authenticated;

REVOKE ALL ON FUNCTION public.wire_tray_create_production_order(
  uuid, uuid, numeric, uuid, uuid, public.service_priority, date, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_production_entry(
  uuid, public.wire_tray_production_entry_type, numeric, text, uuid, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_reservation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_separation(
  uuid, uuid, public.wire_tray_separation_entry_type, numeric, numeric, text, uuid, uuid, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_mark_billed(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_for_dispatch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_dispatch_order(uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_mark_notification_read(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wire_tray_create_production_order(
  uuid, uuid, numeric, uuid, uuid, public.service_priority, date, text, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_production_entry(
  uuid, public.wire_tray_production_entry_type, numeric, text, uuid, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_release_reservation(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_separation(
  uuid, uuid, public.wire_tray_separation_entry_type, numeric, numeric, text, uuid, uuid, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_mark_billed(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_release_for_dispatch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_dispatch_order(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_mark_notification_read(uuid, boolean) TO authenticated, service_role;
