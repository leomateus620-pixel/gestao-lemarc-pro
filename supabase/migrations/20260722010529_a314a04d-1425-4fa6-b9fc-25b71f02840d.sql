-- Minimal foundation to restore login (getMyModuleAccess).
-- Full wire_tray migrations remain pending and can be applied later.

DO $$ BEGIN
  CREATE TYPE public.app_module AS ENUM ('os', 'wire_trays');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wire_tray_module_role AS ENUM (
    'admin', 'gestor', 'comercial', 'producao', 'estoque', 'faturamento', 'consulta'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key public.app_module NOT NULL,
  module_role public.wire_tray_module_role,
  active boolean NOT NULL DEFAULT true,
  financial_access boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_module_access_role_check CHECK (
    (module_key = 'wire_trays' AND module_role IS NOT NULL)
    OR (module_key = 'os')
  ),
  CONSTRAINT user_module_access_unique UNIQUE (user_id, module_key)
);

GRANT SELECT ON public.user_module_access TO authenticated;
GRANT ALL ON public.user_module_access TO service_role;

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own module access" ON public.user_module_access;
CREATE POLICY "Users read own module access"
  ON public.user_module_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage module access" ON public.user_module_access;
CREATE POLICY "Admins manage module access"
  ON public.user_module_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS user_module_access_updated_at ON public.user_module_access;
CREATE TRIGGER user_module_access_updated_at
  BEFORE UPDATE ON public.user_module_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant wire_trays admin to existing OS admins so they retain full access.
INSERT INTO public.user_module_access (user_id, module_key, module_role, active, financial_access, created_by)
SELECT ur.user_id, 'wire_trays'::public.app_module, 'admin'::public.wire_tray_module_role, true, true, ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'::public.app_role
ON CONFLICT (user_id, module_key) DO NOTHING;