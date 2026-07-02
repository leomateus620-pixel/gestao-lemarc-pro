
CREATE TABLE public.service_order_time_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES public.technicians(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('work','displacement')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NULL THEN NULL
         ELSE GREATEST(0, (EXTRACT(EPOCH FROM (ended_at - started_at))/60)::int) END
  ) STORED,
  pause_reason text,
  pause_notes text,
  end_reason text CHECK (end_reason IN ('pause','finish','manual','resume_correction')),
  source text NOT NULL DEFAULT 'mobile' CHECK (source IN ('mobile','desktop','admin_adjustment')),
  notes text,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_order_time_sessions_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX service_order_time_sessions_order_tech_idx
  ON public.service_order_time_sessions (service_order_id, technician_id, ended_at);

CREATE UNIQUE INDEX service_order_time_sessions_one_open_work_per_tech
  ON public.service_order_time_sessions (service_order_id, technician_id)
  WHERE ended_at IS NULL AND kind = 'work';

CREATE TRIGGER service_order_time_sessions_updated_at
  BEFORE UPDATE ON public.service_order_time_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_order_time_sessions TO authenticated;
GRANT ALL ON public.service_order_time_sessions TO service_role;

ALTER TABLE public.service_order_time_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read time sessions"
  ON public.service_order_time_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert time sessions"
  ON public.service_order_time_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update own or admin"
  ON public.service_order_time_sessions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete time sessions"
  ON public.service_order_time_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
