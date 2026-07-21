-- Leitos Aramados: module authorization, RLS, append-only ledgers and private storage.

CREATE OR REPLACE FUNCTION public.wire_tray_is_global_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = auth.uid()
      AND uma.module_key = 'wire_trays'::public.app_module
      AND uma.active
      AND uma.module_role IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_current_role()
RETURNS public.wire_tray_module_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT uma.module_role
  FROM public.user_module_access uma
  WHERE uma.user_id = auth.uid()
    AND uma.module_key = 'wire_trays'::public.app_module
    AND uma.active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_current_role_in(
  _roles public.wire_tray_module_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = auth.uid()
      AND uma.module_key = 'wire_trays'::public.app_module
      AND uma.active
      AND uma.module_role = ANY (_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_can_view_financials()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = auth.uid()
      AND uma.module_key = 'wire_trays'::public.app_module
      AND uma.active
      AND (
        uma.module_role IN (
          'admin'::public.wire_tray_module_role,
          'comercial'::public.wire_tray_module_role,
          'faturamento'::public.wire_tray_module_role
        )
        OR (
          uma.module_role = 'gestor'::public.wire_tray_module_role
          AND uma.financial_access
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_can_view_document_visibility(
  _visibility public.wire_tray_document_visibility
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE _visibility
    WHEN 'operational'::public.wire_tray_document_visibility
      THEN public.wire_tray_has_access()
    WHEN 'commercial'::public.wire_tray_document_visibility
      THEN public.wire_tray_current_role_in(
        ARRAY['admin', 'gestor', 'comercial', 'faturamento']::public.wire_tray_module_role[]
      )
    WHEN 'financial'::public.wire_tray_document_visibility
      THEN public.wire_tray_can_view_financials()
    WHEN 'admin_only'::public.wire_tray_document_visibility
      THEN public.wire_tray_current_role_in(
        ARRAY['admin']::public.wire_tray_module_role[]
      )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_can_access_document_path(_storage_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wire_tray_documents d
    WHERE d.storage_path = _storage_path
      AND d.status = 'ready'
      AND public.wire_tray_can_view_document_visibility(d.visibility)
  );
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_document_entity_exists(
  _entity_type text,
  _entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE _entity_type
    WHEN 'product' THEN EXISTS (
      SELECT 1 FROM public.wire_tray_products p WHERE p.id = _entity_id
    )
    WHEN 'order' THEN EXISTS (
      SELECT 1 FROM public.wire_tray_orders o WHERE o.id = _entity_id
    )
    WHEN 'production_order' THEN EXISTS (
      SELECT 1 FROM public.wire_tray_production_orders po WHERE po.id = _entity_id
    )
    WHEN 'movement' THEN EXISTS (
      SELECT 1 FROM public.wire_tray_stock_movements m WHERE m.id = _entity_id
    )
    WHEN 'dispatch' THEN EXISTS (
      SELECT 1 FROM public.wire_tray_orders o WHERE o.id = _entity_id
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.wire_tray_is_global_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_has_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_current_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_current_role_in(public.wire_tray_module_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_can_view_financials() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_can_view_document_visibility(public.wire_tray_document_visibility) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_can_access_document_path(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_document_entity_exists(text, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wire_tray_is_global_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_has_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_current_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_current_role_in(public.wire_tray_module_role[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_can_view_financials() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_can_view_document_visibility(public.wire_tray_document_visibility) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_can_access_document_path(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_document_entity_exists(text, uuid) TO authenticated, service_role;

-- Active existing OS administrators are the only automatic bootstrap recipients.
INSERT INTO public.user_module_access (
  user_id, module_key, module_role, active, financial_access, created_by
)
SELECT
  ur.user_id,
  'wire_trays'::public.app_module,
  'admin'::public.wire_tray_module_role,
  true,
  true,
  ur.user_id
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'admin'::public.app_role
  AND au.deleted_at IS NULL
ON CONFLICT (user_id, module_key) DO NOTHING;

-- Grants remain deliberately narrow. Critical writes are available only through RPCs.
-- Access changes are only accepted through wire_tray_set_module_access so the
-- last-admin invariant and audit event cannot be bypassed through PostgREST.
GRANT SELECT ON public.user_module_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wire_tray_stock_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wire_tray_products TO authenticated;
GRANT SELECT ON public.wire_tray_stock_balances TO authenticated;
GRANT SELECT ON public.wire_tray_orders TO authenticated;
GRANT SELECT ON public.wire_tray_order_items TO authenticated;
GRANT SELECT ON public.wire_tray_order_financials TO authenticated;
GRANT SELECT ON public.wire_tray_order_item_financials TO authenticated;
GRANT SELECT ON public.wire_tray_reservations TO authenticated;
GRANT SELECT ON public.wire_tray_production_orders TO authenticated;
GRANT SELECT ON public.wire_tray_production_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wire_tray_documents TO authenticated;
GRANT SELECT ON public.wire_tray_separation_entries TO authenticated;
GRANT SELECT ON public.wire_tray_stock_movements TO authenticated;
GRANT SELECT, UPDATE ON public.wire_tray_notifications TO authenticated;
GRANT SELECT ON public.wire_tray_audit_events TO authenticated;

GRANT ALL ON public.user_module_access TO service_role;
GRANT ALL ON public.wire_tray_stock_locations TO service_role;
GRANT ALL ON public.wire_tray_products TO service_role;
GRANT ALL ON public.wire_tray_stock_balances TO service_role;
GRANT ALL ON public.wire_tray_orders TO service_role;
GRANT ALL ON public.wire_tray_order_items TO service_role;
GRANT ALL ON public.wire_tray_order_financials TO service_role;
GRANT ALL ON public.wire_tray_order_item_financials TO service_role;
GRANT ALL ON public.wire_tray_reservations TO service_role;
GRANT ALL ON public.wire_tray_production_orders TO service_role;
GRANT ALL ON public.wire_tray_production_entries TO service_role;
GRANT ALL ON public.wire_tray_documents TO service_role;
GRANT ALL ON public.wire_tray_separation_entries TO service_role;
GRANT ALL ON public.wire_tray_stock_movements TO service_role;
GRANT ALL ON public.wire_tray_notifications TO service_role;
GRANT ALL ON public.wire_tray_audit_events TO service_role;
GRANT ALL ON public.wire_tray_operation_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wire_tray_orders_number_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.wire_tray_production_orders_number_seq TO service_role;

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_order_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_order_item_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_production_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_separation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wire_tray_operation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own or admins read module access"
ON public.user_module_access FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

CREATE POLICY "Wire tray admins insert module access"
ON public.user_module_access FOR INSERT TO authenticated
WITH CHECK (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

CREATE POLICY "Wire tray admins update module access"
ON public.user_module_access FOR UPDATE TO authenticated
USING (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
)
WITH CHECK (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

CREATE POLICY "Wire tray admins delete module access"
ON public.user_module_access FOR DELETE TO authenticated
USING (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

CREATE POLICY "Wire tray users read locations"
ON public.wire_tray_stock_locations FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray inventory roles create locations"
ON public.wire_tray_stock_locations FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  )
);
CREATE POLICY "Wire tray inventory roles update locations"
ON public.wire_tray_stock_locations FOR UPDATE TO authenticated
USING (
  public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  )
)
WITH CHECK (
  public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  )
);

CREATE POLICY "Wire tray users read products"
ON public.wire_tray_products FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray managers create products"
ON public.wire_tray_products FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
);
CREATE POLICY "Wire tray managers update products"
ON public.wire_tray_products FOR UPDATE TO authenticated
USING (
  public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
)
WITH CHECK (
  public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
);

CREATE POLICY "Wire tray users read balances"
ON public.wire_tray_stock_balances FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read orders"
ON public.wire_tray_orders FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read order items"
ON public.wire_tray_order_items FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Authorized users read order financials"
ON public.wire_tray_order_financials FOR SELECT TO authenticated
USING (public.wire_tray_can_view_financials());
CREATE POLICY "Authorized users read item financials"
ON public.wire_tray_order_item_financials FOR SELECT TO authenticated
USING (public.wire_tray_can_view_financials());
CREATE POLICY "Wire tray users read reservations"
ON public.wire_tray_reservations FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read production orders"
ON public.wire_tray_production_orders FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read production entries"
ON public.wire_tray_production_entries FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read separation entries"
ON public.wire_tray_separation_entries FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read movements"
ON public.wire_tray_stock_movements FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
CREATE POLICY "Wire tray users read audit"
ON public.wire_tray_audit_events FOR SELECT TO authenticated
USING (public.wire_tray_has_access());

CREATE POLICY "Authorized users read wire tray documents"
ON public.wire_tray_documents FOR SELECT TO authenticated
USING (public.wire_tray_can_view_document_visibility(visibility));
CREATE POLICY "Authorized users register wire tray documents"
ON public.wire_tray_documents FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND status = 'pending'
  AND split_part(storage_path, '/', 1) = auth.uid()::text
  AND public.wire_tray_document_entity_exists(entity_type, entity_id)
  AND public.wire_tray_can_view_document_visibility(visibility)
  AND NOT public.wire_tray_current_role_in(
    ARRAY['consulta']::public.wire_tray_module_role[]
  )
);
CREATE POLICY "Document owners or admins update metadata"
ON public.wire_tray_documents FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
)
WITH CHECK (
  created_by = auth.uid()
  OR public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
);

CREATE OR REPLACE FUNCTION public.wire_tray_protect_document_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.document_type IS DISTINCT FROM OLD.document_type
     OR NEW.visibility IS DISTINCT FROM OLD.visibility
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.file_name IS DISTINCT FROM OLD.file_name
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.file_size IS DISTINCT FROM OLD.file_size
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'A identidade e a visibilidade do documento são imutáveis.'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.status IN ('ready', 'rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'O estado final do documento é imutável.'
      USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'pending' AND NEW.status = 'ready' AND NOT EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'wire-tray-documents'
      AND o.name = NEW.storage_path
  ) THEN
    RAISE EXCEPTION 'O arquivo precisa ser persistido antes da confirmação do documento.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER wire_tray_documents_identity_immutable
  BEFORE UPDATE ON public.wire_tray_documents
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_protect_document_identity();

REVOKE ALL ON FUNCTION public.wire_tray_protect_document_identity()
FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users read own wire tray notifications"
ON public.wire_tray_notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
);
CREATE POLICY "Users update own notification state"
ON public.wire_tray_notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Registrations remain editable through ordinary RLS, while every persisted
-- creation and change is mirrored to the append-only audit ledger.
CREATE OR REPLACE FUNCTION public.wire_tray_audit_registry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_type text := TG_ARGV[0];
BEGIN
  INSERT INTO public.wire_tray_audit_events (
    event_type,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata,
    actor_user_id
  )
  VALUES (
    v_entity_type || CASE WHEN TG_OP = 'INSERT' THEN '_created' ELSE '_updated' END,
    v_entity_type,
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    '{}'::jsonb,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER wire_tray_locations_registry_audit
  AFTER INSERT OR UPDATE ON public.wire_tray_stock_locations
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_audit_registry_change('stock_location');
CREATE TRIGGER wire_tray_products_registry_audit
  AFTER INSERT OR UPDATE ON public.wire_tray_products
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_audit_registry_change('product');
CREATE TRIGGER wire_tray_documents_registry_audit
  AFTER INSERT OR UPDATE ON public.wire_tray_documents
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_audit_registry_change('document');

REVOKE ALL ON FUNCTION public.wire_tray_audit_registry_change()
FROM PUBLIC, anon, authenticated;

-- Append-only protection also applies to privileged clients.
CREATE OR REPLACE FUNCTION public.wire_tray_reject_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Registros de movimento e auditoria são imutáveis.'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER wire_tray_stock_movements_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
CREATE TRIGGER wire_tray_production_entries_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_production_entries
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
CREATE TRIGGER wire_tray_separation_entries_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_separation_entries
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
CREATE TRIGGER wire_tray_audit_events_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();

REVOKE EXECUTE ON FUNCTION public.wire_tray_reject_ledger_mutation() FROM PUBLIC, anon, authenticated;

-- Private, constrained storage bucket. No public URLs are valid for this bucket.
INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'wire-tray-documents',
  'wire-tray-documents',
  false,
  15728640,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Authorized users read persisted wire tray files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'wire-tray-documents'
  AND public.wire_tray_can_access_document_path(name)
);

CREATE POLICY "Authorized users upload wire tray files to own prefix"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'wire-tray-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
  AND public.wire_tray_has_access()
  AND NOT public.wire_tray_current_role_in(
    ARRAY['consulta']::public.wire_tray_module_role[]
  )
);

CREATE POLICY "Owners or admins remove wire tray files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'wire-tray-documents'
  AND (
    split_part(name, '/', 1) = auth.uid()::text
    OR public.wire_tray_current_role_in(
      ARRAY['admin']::public.wire_tray_module_role[]
    )
  )
);
