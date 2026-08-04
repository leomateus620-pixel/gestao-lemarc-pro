DO $$
DECLARE
  v_admin uuid;
BEGIN
  SELECT user_id INTO v_admin FROM public.user_roles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT user_id INTO v_admin FROM public.user_module_access WHERE module_key = 'wire_trays' LIMIT 1;
  END IF;
  IF v_admin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.wire_tray_stock_locations) THEN
    INSERT INTO public.wire_tray_stock_locations (code, name, description, active, created_by)
    VALUES ('ALMOX-01', 'Almoxarifado principal', 'Local padrão criado automaticamente para leitos aramados.', true, v_admin);
  END IF;
END
$$;

UPDATE public.wire_tray_products p
SET default_location_id = (
  SELECT l.id FROM public.wire_tray_stock_locations l WHERE l.active ORDER BY l.created_at LIMIT 1
)
WHERE p.default_location_id IS NULL;

CREATE OR REPLACE FUNCTION public.wire_tray_confirm_order(_order_id uuid, _idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_product public.wire_tray_products%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_location_id uuid;
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

    v_location_id := v_product.default_location_id;
    IF v_location_id IS NULL THEN
      SELECT l.id INTO v_location_id
      FROM public.wire_tray_stock_locations l
      WHERE l.active
      ORDER BY l.created_at
      LIMIT 1;

      IF v_location_id IS NULL THEN
        INSERT INTO public.wire_tray_stock_locations (code, name, description, active, created_by)
        VALUES ('ALMOX-01', 'Almoxarifado principal',
                'Local padrão criado automaticamente na confirmação de pedido.', true,
                coalesce(auth.uid(), v_product.created_by))
        RETURNING id INTO v_location_id;
      END IF;

      UPDATE public.wire_tray_products
      SET default_location_id = v_location_id
      WHERE id = v_product.id;
      v_product.default_location_id := v_location_id;
    END IF;

    INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
    VALUES (v_product.id, v_location_id)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    SELECT * INTO v_balance
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = v_product.id
      AND b.location_id = v_location_id
    FOR UPDATE;

    v_reserve := least(v_item.requested_quantity, v_balance.available_quantity);
    v_shortage := v_item.requested_quantity - v_reserve;

    IF v_reserve > 0 THEN
      INSERT INTO public.wire_tray_reservations (
        order_id, order_item_id, product_id, location_id, quantity, created_by
      )
      VALUES (
        v_order.id, v_item.id, v_product.id, v_location_id,
        v_reserve, auth.uid()
      )
      RETURNING id INTO v_reservation_id;

      UPDATE public.wire_tray_stock_balances SET
        reserved_quantity = reserved_quantity + v_reserve,
        version = version + 1
      WHERE id = v_balance.id;

      PERFORM public.wire_tray_insert_movement(
        gen_random_uuid(), 'reservation', v_product.id, v_location_id,
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
        v_location_id, v_shortage, v_order.priority,
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
      '/leitos/separacao',
      jsonb_build_object('order_number', v_order.number)
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'producao', 'estoque')
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
$function$;