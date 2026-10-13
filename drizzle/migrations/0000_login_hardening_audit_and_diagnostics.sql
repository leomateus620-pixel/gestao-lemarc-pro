-- Auditoria de ações administrativas de acesso (nunca guarda senha)
CREATE TABLE public.admin_password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('password_reset', 'sessions_revoked', 'password_reset_and_sessions_revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_password_resets TO authenticated;
GRANT ALL ON public.admin_password_resets TO service_role;
ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read access audit" ON public.admin_password_resets
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX admin_password_resets_created_idx ON public.admin_password_resets (created_at DESC);

-- Diagnóstico de falhas de login (sem senha, token ou e-mail completo)
CREATE TABLE public.login_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  stage text NOT NULL,
  error_code text NOT NULL,
  duration_ms integer,
  online boolean,
  app_version text,
  user_agent text,
  email_masked text
);
GRANT INSERT ON public.login_diagnostics TO anon, authenticated;
GRANT SELECT ON public.login_diagnostics TO authenticated;
GRANT ALL ON public.login_diagnostics TO service_role;
ALTER TABLE public.login_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can report login failure" ON public.login_diagnostics
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read login diagnostics" ON public.login_diagnostics
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE INDEX login_diagnostics_created_idx ON public.login_diagnostics (created_at DESC);
CREATE INDEX login_diagnostics_email_idx ON public.login_diagnostics (email_masked, created_at DESC);

CREATE OR REPLACE FUNCTION public.login_diagnostics_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_at := now();
  IF length(NEW.stage) > 40 OR length(NEW.error_code) > 80
     OR length(coalesce(NEW.app_version, '')) > 40
     OR length(coalesce(NEW.user_agent, '')) > 80
     OR length(coalesce(NEW.email_masked, '')) > 80 THEN
    RAISE EXCEPTION 'login_diagnostics: campo grande demais';
  END IF;
  -- O e-mail precisa estar mascarado (contém ***) e nunca pode ser completo.
  IF NEW.email_masked IS NOT NULL AND position('***' in NEW.email_masked) = 0 THEN
    RAISE EXCEPTION 'login_diagnostics: e-mail precisa estar mascarado';
  END IF;
  IF NEW.duration_ms IS NOT NULL AND (NEW.duration_ms < 0 OR NEW.duration_ms > 600000) THEN
    NEW.duration_ms := NULL;
  END IF;
  -- Limite de taxa: 10/min por e-mail mascarado e 300/min no total.
  IF (SELECT count(*) FROM public.login_diagnostics
      WHERE email_masked IS NOT DISTINCT FROM NEW.email_masked
        AND created_at > now() - interval '1 minute') >= 10 THEN
    RETURN NULL;
  END IF;
  IF (SELECT count(*) FROM public.login_diagnostics
      WHERE created_at > now() - interval '1 minute') >= 300 THEN
    RETURN NULL;
  END IF;
  -- Retenção de 30 dias.
  DELETE FROM public.login_diagnostics WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER login_diagnostics_guard_trg
  BEFORE INSERT ON public.login_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.login_diagnostics_guard();

-- Encerrar todas as sessões de um usuário (somente pelo servidor).
CREATE OR REPLACE FUNCTION public.admin_revoke_user_sessions(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = _user_id::text;
  DELETE FROM auth.sessions WHERE user_id = _user_id;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) TO service_role;