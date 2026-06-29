
ALTER TABLE public.technicians
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS default_availability text,
  ADD COLUMN IF NOT EXISTS hourly_rate_50_cents integer,
  ADD COLUMN IF NOT EXISTS hourly_rate_100_cents integer,
  ADD COLUMN IF NOT EXISTS pricing_notes text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

CREATE INDEX IF NOT EXISTS idx_technicians_active ON public.technicians(active);
CREATE INDEX IF NOT EXISTS idx_technicians_role ON public.technicians(role);
CREATE INDEX IF NOT EXISTS idx_technicians_user_id ON public.technicians(user_id);

CREATE TABLE IF NOT EXISTS public.technician_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  hourly_rate_cents integer,
  hourly_rate_50_cents integer,
  hourly_rate_100_cents integer,
  starts_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technician_rate_history_technician
  ON public.technician_rate_history(technician_id, starts_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technician_rate_history TO authenticated;
GRANT ALL ON public.technician_rate_history TO service_role;

ALTER TABLE public.technician_rate_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View technician rate history (admin or technician owner)" ON public.technician_rate_history;
DROP POLICY IF EXISTS "Insert technician rate history (admin or technician owner)" ON public.technician_rate_history;
DROP POLICY IF EXISTS "Update technician rate history (admin or creator)" ON public.technician_rate_history;
DROP POLICY IF EXISTS "Delete technician rate history (admin or creator)" ON public.technician_rate_history;

CREATE POLICY "View technician rate history (admin or technician owner)"
ON public.technician_rate_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (
    SELECT 1 FROM public.technicians t
    WHERE t.id = technician_rate_history.technician_id
      AND t.created_by = auth.uid()
  )
);

CREATE POLICY "Insert technician rate history (admin or technician owner)"
ON public.technician_rate_history FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR EXISTS (
    SELECT 1 FROM public.technicians t
    WHERE t.id = technician_rate_history.technician_id
      AND t.created_by = auth.uid()
  )
);

CREATE POLICY "Update technician rate history (admin or creator)"
ON public.technician_rate_history FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR created_by = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR created_by = auth.uid());

CREATE POLICY "Delete technician rate history (admin or creator)"
ON public.technician_rate_history FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR created_by = auth.uid());
