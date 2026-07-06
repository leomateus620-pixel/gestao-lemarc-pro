
-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ============================================================
-- service_order_financials: admin only
-- ============================================================
DROP POLICY IF EXISTS "View financials of accessible orders" ON public.service_order_financials;
DROP POLICY IF EXISTS "Insert financials for created orders" ON public.service_order_financials;
DROP POLICY IF EXISTS "Update financials for created orders" ON public.service_order_financials;
DROP POLICY IF EXISTS "Delete financials for created orders" ON public.service_order_financials;

CREATE POLICY "Admins select financials"
ON public.service_order_financials FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins insert financials"
ON public.service_order_financials FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update financials"
ON public.service_order_financials FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete financials"
ON public.service_order_financials FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================================
-- service_order_labor_entries: admin only
-- ============================================================
DROP POLICY IF EXISTS "View labor of accessible orders" ON public.service_order_labor_entries;
DROP POLICY IF EXISTS "Insert labor for created orders" ON public.service_order_labor_entries;
DROP POLICY IF EXISTS "Update labor for created orders" ON public.service_order_labor_entries;
DROP POLICY IF EXISTS "Delete labor for created orders" ON public.service_order_labor_entries;

CREATE POLICY "Admins select labor"
ON public.service_order_labor_entries FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins insert labor"
ON public.service_order_labor_entries FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins update labor"
ON public.service_order_labor_entries FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete labor"
ON public.service_order_labor_entries FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================================
-- technicians: admin sees all, técnico only reads own record
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated can insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Creator can update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Creator can delete technicians" ON public.technicians;

CREATE POLICY "View technicians"
ON public.technicians FOR SELECT TO authenticated
USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins insert technicians"
ON public.technicians FOR INSERT TO authenticated
WITH CHECK (public.is_admin() AND auth.uid() = created_by);

CREATE POLICY "Admins update technicians"
ON public.technicians FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete technicians"
ON public.technicians FOR DELETE TO authenticated
USING (public.is_admin());

-- ============================================================
-- technician_rate_history: admin only
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='technician_rate_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can view rate history" ON public.technician_rate_history';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert rate history" ON public.technician_rate_history';
    EXECUTE 'DROP POLICY IF EXISTS "Creator can update rate history" ON public.technician_rate_history';
    EXECUTE 'DROP POLICY IF EXISTS "Creator can delete rate history" ON public.technician_rate_history';
    EXECUTE 'CREATE POLICY "Admins all rate history" ON public.technician_rate_history FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END$$;

-- ============================================================
-- service_orders: técnico só OS suas (criador ou atribuído)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view orders" ON public.service_orders;

CREATE POLICY "View accessible orders"
ON public.service_orders FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.service_order_technicians sot
    JOIN public.technicians t ON t.id = sot.technician_id
    WHERE sot.service_order_id = service_orders.id AND t.user_id = auth.uid()
  )
);

-- ============================================================
-- Auto-role trigger: novo usuário recebe 'tecnico' (ou 'admin' se for o primeiro)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  -- Skip if a role already exists for this user.
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role)
    INTO is_first;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'tecnico'::public.app_role END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
