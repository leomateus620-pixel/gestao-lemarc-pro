
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete system settings"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
