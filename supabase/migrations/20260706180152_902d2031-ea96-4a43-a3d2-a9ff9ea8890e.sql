-- Add 'tecnico' role and restrict financials/labor to admins.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnico';
