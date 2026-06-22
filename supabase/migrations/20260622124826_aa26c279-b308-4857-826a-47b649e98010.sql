
-- 1. Enum + tabela user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Substituir policies de service_orders
DROP POLICY IF EXISTS "Authenticated can view orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated can insert orders" ON public.service_orders;
DROP POLICY IF EXISTS "Creator can update orders" ON public.service_orders;
DROP POLICY IF EXISTS "Creator can delete orders" ON public.service_orders;

CREATE POLICY "View orders (admin or owner)" ON public.service_orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Insert orders (self)" ON public.service_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update orders (admin or owner)" ON public.service_orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Delete orders (admin or owner)" ON public.service_orders
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- 4. Substituir policies de clients
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Creator can update clients" ON public.clients;
DROP POLICY IF EXISTS "Creator can delete clients" ON public.clients;

CREATE POLICY "View clients (admin or owner)" ON public.clients
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Insert clients (self)" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update clients (admin or owner)" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Delete clients (admin or owner)" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- 5. Substituir policies de technicians
DROP POLICY IF EXISTS "Authenticated can view technicians" ON public.technicians;
DROP POLICY IF EXISTS "Authenticated can insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Creator can update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Creator can delete technicians" ON public.technicians;

CREATE POLICY "View technicians (admin or owner)" ON public.technicians
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Insert technicians (self)" ON public.technicians
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Update technicians (admin or owner)" ON public.technicians
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by)
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

CREATE POLICY "Delete technicians (admin or owner)" ON public.technicians
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- 6. Bootstrap: promover o primeiro usuário existente a admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;
