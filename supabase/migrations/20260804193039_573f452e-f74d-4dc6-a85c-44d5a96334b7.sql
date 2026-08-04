CREATE OR REPLACE FUNCTION public.wire_tray_delete_order(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
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

  IF v_order.status <> 'draft' THEN
    RAISE EXCEPTION 'Somente pedidos em rascunho podem ser excluídos. Utilize o cancelamento.'
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.wire_tray_reservations r WHERE r.order_id = v_order.id)
    OR EXISTS (SELECT 1 FROM public.wire_tray_production_orders p WHERE p.order_id = v_order.id)
    OR EXISTS (SELECT 1 FROM public.wire_tray_separation_entries s WHERE s.order_id = v_order.id)
    OR EXISTS (SELECT 1 FROM public.wire_tray_stock_movements m WHERE m.order_id = v_order.id)
  THEN
    RAISE EXCEPTION 'Este pedido possui movimentações vinculadas e não pode ser excluído.'
      USING ERRCODE = '55000';
  END IF;

  PERFORM public.wire_tray_write_audit(
    'order.deleted',
    'order',
    v_order.id,
    to_jsonb(v_order),
    NULL,
    jsonb_build_object('number', v_order.number, 'client', v_order.client_name_snapshot),
    NULL
  );

  DELETE FROM public.wire_tray_notifications n WHERE n.order_id = v_order.id;
  DELETE FROM public.wire_tray_order_item_financials f
  WHERE f.order_item_id IN (
    SELECT i.id FROM public.wire_tray_order_items i WHERE i.order_id = v_order.id
  );
  DELETE FROM public.wire_tray_order_financials f WHERE f.order_id = v_order.id;
  DELETE FROM public.wire_tray_order_items i WHERE i.order_id = v_order.id;
  DELETE FROM public.wire_tray_orders o WHERE o.id = v_order.id;

  RETURN jsonb_build_object('id', v_order.id, 'number', v_order.number, 'deleted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.wire_tray_delete_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wire_tray_delete_order(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';