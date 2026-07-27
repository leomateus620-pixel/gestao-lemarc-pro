-- Reconciles the access-only Leitos deployment with the complete operational schema.
-- This migration is additive: it never drops tables or deletes operational records.
BEGIN;

SELECT pg_advisory_xact_lock(hashtextextended('wire_tray_schema_reconciliation_v1', 0));

DO $wire_prerequisites$
BEGIN
  IF to_regclass('auth.users') IS NULL
     OR to_regclass('public.user_roles') IS NULL
     OR to_regclass('public.clients') IS NULL
     OR to_regclass('public.client_units') IS NULL
     OR to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR to_regprocedure('public.update_updated_at_column()') IS NULL
     OR to_regtype('public.app_role') IS NULL
     OR to_regtype('public.service_priority') IS NULL THEN
    RAISE EXCEPTION
      'Leitos Aramados requer a fundação existente de autenticação, clientes, unidades e Storage.'
      USING ERRCODE = '55000';
  END IF;
END
$wire_prerequisites$;

-- The deployed incident has only user_module_access. A partially-created operational
-- group is quarantined instead of being overwritten because it may contain records
-- whose constraints cannot be inferred safely.
DO $wire_partial_guard$
DECLARE
  existing_operational_tables integer;
BEGIN
  SELECT count(*)
  INTO existing_operational_tables
  FROM (VALUES
    ('wire_tray_stock_locations'),
    ('wire_tray_products'),
    ('wire_tray_stock_balances'),
    ('wire_tray_orders'),
    ('wire_tray_order_items'),
    ('wire_tray_order_financials'),
    ('wire_tray_order_item_financials'),
    ('wire_tray_reservations'),
    ('wire_tray_production_orders'),
    ('wire_tray_documents'),
    ('wire_tray_production_entries'),
    ('wire_tray_separation_entries'),
    ('wire_tray_stock_movements'),
    ('wire_tray_notifications'),
    ('wire_tray_audit_events'),
    ('wire_tray_operation_requests')
  ) AS expected(name)
  WHERE to_regclass('public.' || expected.name) IS NOT NULL;

  IF existing_operational_tables NOT IN (0, 16) THEN
    RAISE EXCEPTION
      'Foi detectada uma implantação operacional parcial de Leitos Aramados (% de 16 tabelas). A reconciliação foi interrompida sem alterar registros.',
      existing_operational_tables
      USING ERRCODE = '55000';
  END IF;
END
$wire_partial_guard$;

-- Source: 20260721133000_wire_tray_foundation.sql
-- Leitos Aramados: additive domain model.
-- Operational records are intentionally not seeded by this migration.

DO $wire_type_app_module$
BEGIN
  IF to_regtype('public.app_module') IS NULL THEN
    CREATE TYPE public.app_module AS ENUM ('os', 'wire_trays');
  END IF;
END
$wire_type_app_module$;
DO $wire_type_wire_tray_module_role$
BEGIN
  IF to_regtype('public.wire_tray_module_role') IS NULL THEN
    CREATE TYPE public.wire_tray_module_role AS ENUM (
      'admin', 'gestor', 'comercial', 'producao', 'estoque', 'faturamento', 'consulta'
    );
  END IF;
END
$wire_type_wire_tray_module_role$;
DO $wire_type_wire_tray_product_category$
BEGIN
  IF to_regtype('public.wire_tray_product_category') IS NULL THEN
    CREATE TYPE public.wire_tray_product_category AS ENUM (
      'straight_tray', 'curve', 'branch', 'reduction', 'splice', 'support', 'cover', 'accessory', 'other'
    );
  END IF;
END
$wire_type_wire_tray_product_category$;
DO $wire_type_wire_tray_unit$
BEGIN
  IF to_regtype('public.wire_tray_unit') IS NULL THEN
    CREATE TYPE public.wire_tray_unit AS ENUM ('piece', 'meter', 'kilogram', 'set');
  END IF;
END
$wire_type_wire_tray_unit$;
DO $wire_type_wire_tray_order_status$
BEGIN
  IF to_regtype('public.wire_tray_order_status') IS NULL THEN
    CREATE TYPE public.wire_tray_order_status AS ENUM (
      'draft', 'confirmed', 'stock_reserved', 'production_pending', 'in_production',
      'separating', 'awaiting_check', 'ready_for_billing', 'billed',
      'ready_for_dispatch', 'dispatched', 'completed', 'cancelled'
    );
  END IF;
END
$wire_type_wire_tray_order_status$;
DO $wire_type_wire_tray_reservation_status$
BEGIN
  IF to_regtype('public.wire_tray_reservation_status') IS NULL THEN
    CREATE TYPE public.wire_tray_reservation_status AS ENUM (
      'active', 'partially_consumed', 'consumed', 'released', 'cancelled'
    );
  END IF;
END
$wire_type_wire_tray_reservation_status$;
DO $wire_type_wire_tray_production_origin$
BEGIN
  IF to_regtype('public.wire_tray_production_origin') IS NULL THEN
    CREATE TYPE public.wire_tray_production_origin AS ENUM (
      'customer_order', 'replenishment', 'manual_stock'
    );
  END IF;
END
$wire_type_wire_tray_production_origin$;
DO $wire_type_wire_tray_production_status$
BEGIN
  IF to_regtype('public.wire_tray_production_status') IS NULL THEN
    CREATE TYPE public.wire_tray_production_status AS ENUM (
      'planned', 'released', 'in_progress', 'paused', 'awaiting_check', 'completed', 'cancelled'
    );
  END IF;
END
$wire_type_wire_tray_production_status$;
DO $wire_type_wire_tray_production_entry_type$
BEGIN
  IF to_regtype('public.wire_tray_production_entry_type') IS NULL THEN
    CREATE TYPE public.wire_tray_production_entry_type AS ENUM (
      'start', 'progress', 'pause', 'resume', 'scrap', 'complete', 'cancel'
    );
  END IF;
END
$wire_type_wire_tray_production_entry_type$;
DO $wire_type_wire_tray_movement_type$
BEGIN
  IF to_regtype('public.wire_tray_movement_type') IS NULL THEN
    CREATE TYPE public.wire_tray_movement_type AS ENUM (
      'stock_entry', 'stock_exit', 'transfer_out', 'transfer_in', 'return', 'loss',
      'adjustment', 'reservation', 'reservation_release', 'reservation_consumption',
      'production_entry', 'dispatch'
    );
  END IF;
END
$wire_type_wire_tray_movement_type$;
DO $wire_type_wire_tray_separation_entry_type$
BEGIN
  IF to_regtype('public.wire_tray_separation_entry_type') IS NULL THEN
    CREATE TYPE public.wire_tray_separation_entry_type AS ENUM (
      'separation', 'checking', 'discrepancy', 'resolution'
    );
  END IF;
END
$wire_type_wire_tray_separation_entry_type$;
DO $wire_type_wire_tray_document_type$
BEGIN
  IF to_regtype('public.wire_tray_document_type') IS NULL THEN
    CREATE TYPE public.wire_tray_document_type AS ENUM (
      'quotation', 'customer_order', 'technical_drawing', 'production_instruction',
      'invoice', 'dispatch_receipt', 'photo', 'other'
    );
  END IF;
END
$wire_type_wire_tray_document_type$;
DO $wire_type_wire_tray_document_visibility$
BEGIN
  IF to_regtype('public.wire_tray_document_visibility') IS NULL THEN
    CREATE TYPE public.wire_tray_document_visibility AS ENUM (
      'operational', 'commercial', 'financial', 'admin_only'
    );
  END IF;
END
$wire_type_wire_tray_document_visibility$;

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

CREATE TABLE IF NOT EXISTS public.wire_tray_stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_location_code_not_blank CHECK (btrim(code) <> ''),
  CONSTRAINT wire_tray_location_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_locations_code_unique
  ON public.wire_tray_stock_locations (lower(code));

CREATE TABLE IF NOT EXISTS public.wire_tray_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text,
  name text NOT NULL,
  category public.wire_tray_product_category NOT NULL,
  unit public.wire_tray_unit NOT NULL DEFAULT 'piece',
  active boolean NOT NULL DEFAULT true,
  short_description text,
  width_mm numeric(14,3),
  height_mm numeric(14,3),
  length_mm numeric(14,3),
  material text,
  finish text,
  technical_notes text,
  default_location_id uuid REFERENCES public.wire_tray_stock_locations(id) ON DELETE SET NULL,
  minimum_stock numeric(18,3) NOT NULL DEFAULT 0,
  target_stock numeric(18,3),
  minimum_production_batch numeric(18,3) NOT NULL DEFAULT 1,
  automatic_replenishment boolean NOT NULL DEFAULT false,
  replenishment_notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_product_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT wire_tray_product_dimensions_nonnegative CHECK (
    coalesce(width_mm, 0) >= 0 AND coalesce(height_mm, 0) >= 0 AND coalesce(length_mm, 0) >= 0
  ),
  CONSTRAINT wire_tray_product_stock_nonnegative CHECK (
    minimum_stock >= 0 AND coalesce(target_stock, 0) >= 0 AND minimum_production_batch > 0
  ),
  CONSTRAINT wire_tray_product_target_valid CHECK (
    target_stock IS NULL OR target_stock >= minimum_stock
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_products_sku_unique
  ON public.wire_tray_products (lower(sku)) WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE INDEX IF NOT EXISTS wire_tray_products_active_category_idx
  ON public.wire_tray_products (active, category, name);

CREATE TABLE IF NOT EXISTS public.wire_tray_stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.wire_tray_products(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES public.wire_tray_stock_locations(id) ON DELETE RESTRICT,
  physical_quantity numeric(18,3) NOT NULL DEFAULT 0,
  reserved_quantity numeric(18,3) NOT NULL DEFAULT 0,
  available_quantity numeric(18,3)
    GENERATED ALWAYS AS (physical_quantity - reserved_quantity) STORED,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_balances_nonnegative CHECK (
    physical_quantity >= 0 AND reserved_quantity >= 0
  ),
  CONSTRAINT wire_tray_balances_reservation_valid CHECK (reserved_quantity <= physical_quantity),
  CONSTRAINT wire_tray_balances_unique UNIQUE (product_id, location_id)
);

CREATE INDEX IF NOT EXISTS wire_tray_balances_location_idx
  ON public.wire_tray_stock_balances (location_id, product_id);

CREATE TABLE IF NOT EXISTS public.wire_tray_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number bigint GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  client_unit_id uuid REFERENCES public.client_units(id) ON DELETE RESTRICT,
  client_name_snapshot text NOT NULL,
  client_unit_name_snapshot text,
  customer_order_reference text,
  quotation_reference text,
  commercial_responsible_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority public.service_priority NOT NULL DEFAULT 'media',
  expected_delivery_date date,
  operational_notes text,
  status public.wire_tray_order_status NOT NULL DEFAULT 'draft',
  confirmed_at timestamptz,
  ready_for_billing_at timestamptz,
  billed_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  version bigint NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wire_tray_orders_status_date_idx
  ON public.wire_tray_orders (status, expected_delivery_date, created_at DESC);
CREATE INDEX IF NOT EXISTS wire_tray_orders_client_idx
  ON public.wire_tray_orders (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wire_tray_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.wire_tray_products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  product_sku_snapshot text,
  category_snapshot public.wire_tray_product_category NOT NULL,
  unit_snapshot public.wire_tray_unit NOT NULL,
  requested_quantity numeric(18,3) NOT NULL,
  reserved_quantity numeric(18,3) NOT NULL DEFAULT 0,
  production_required_quantity numeric(18,3) NOT NULL DEFAULT 0,
  produced_quantity numeric(18,3) NOT NULL DEFAULT 0,
  separated_quantity numeric(18,3) NOT NULL DEFAULT 0,
  checked_quantity numeric(18,3) NOT NULL DEFAULT 0,
  dispatched_quantity numeric(18,3) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_order_item_requested_positive CHECK (requested_quantity > 0),
  CONSTRAINT wire_tray_order_item_quantities_nonnegative CHECK (
    reserved_quantity >= 0 AND production_required_quantity >= 0 AND produced_quantity >= 0
    AND separated_quantity >= 0 AND checked_quantity >= 0 AND dispatched_quantity >= 0
  ),
  CONSTRAINT wire_tray_order_item_progress_valid CHECK (
    reserved_quantity <= requested_quantity
    AND separated_quantity <= requested_quantity
    AND checked_quantity <= separated_quantity
    AND dispatched_quantity <= checked_quantity
  ),
  CONSTRAINT wire_tray_order_item_unique_product UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS wire_tray_order_items_product_idx
  ON public.wire_tray_order_items (product_id, order_id);

-- Financial information is physically separated from operational order data.
CREATE TABLE IF NOT EXISTS public.wire_tray_order_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL DEFAULT 'BRL',
  total_cents bigint NOT NULL DEFAULT 0,
  invoice_reference text,
  billing_notes text,
  billed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_order_financial_total_nonnegative CHECK (total_cents >= 0)
);

CREATE TABLE IF NOT EXISTS public.wire_tray_order_item_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL UNIQUE REFERENCES public.wire_tray_order_items(id) ON DELETE RESTRICT,
  unit_price_cents bigint NOT NULL,
  total_cents bigint NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_item_financial_values_nonnegative CHECK (
    unit_price_cents >= 0 AND total_cents >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.wire_tray_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.wire_tray_order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.wire_tray_products(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES public.wire_tray_stock_locations(id) ON DELETE RESTRICT,
  quantity numeric(18,3) NOT NULL,
  consumed_quantity numeric(18,3) NOT NULL DEFAULT 0,
  released_quantity numeric(18,3) NOT NULL DEFAULT 0,
  remaining_quantity numeric(18,3)
    GENERATED ALWAYS AS (quantity - consumed_quantity - released_quantity) STORED,
  status public.wire_tray_reservation_status NOT NULL DEFAULT 'active',
  released_at timestamptz,
  consumed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_reservation_quantity_positive CHECK (quantity > 0),
  CONSTRAINT wire_tray_reservation_progress_nonnegative CHECK (
    consumed_quantity >= 0 AND released_quantity >= 0
  ),
  CONSTRAINT wire_tray_reservation_progress_valid CHECK (
    consumed_quantity + released_quantity <= quantity
  )
);

CREATE INDEX IF NOT EXISTS wire_tray_reservations_order_status_idx
  ON public.wire_tray_reservations (order_id, status, created_at);
CREATE INDEX IF NOT EXISTS wire_tray_reservations_balance_idx
  ON public.wire_tray_reservations (product_id, location_id, status);

CREATE TABLE IF NOT EXISTS public.wire_tray_production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number bigint GENERATED BY DEFAULT AS IDENTITY UNIQUE,
  origin_type public.wire_tray_production_origin NOT NULL,
  order_id uuid REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES public.wire_tray_order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.wire_tray_products(id) ON DELETE RESTRICT,
  destination_location_id uuid NOT NULL REFERENCES public.wire_tray_stock_locations(id) ON DELETE RESTRICT,
  planned_quantity numeric(18,3) NOT NULL,
  produced_quantity numeric(18,3) NOT NULL DEFAULT 0,
  scrap_quantity numeric(18,3) NOT NULL DEFAULT 0,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority public.service_priority NOT NULL DEFAULT 'media',
  planned_completion_date date,
  technical_instructions text,
  generation_reason text,
  status public.wire_tray_production_status NOT NULL DEFAULT 'planned',
  pause_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  version bigint NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_production_quantity_positive CHECK (planned_quantity > 0),
  CONSTRAINT wire_tray_production_progress_valid CHECK (
    produced_quantity >= 0 AND scrap_quantity >= 0 AND produced_quantity <= planned_quantity
  ),
  CONSTRAINT wire_tray_production_destination_valid CHECK (
    (origin_type = 'customer_order' AND order_id IS NOT NULL AND order_item_id IS NOT NULL)
    OR (origin_type IN ('replenishment', 'manual_stock') AND order_id IS NULL AND order_item_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS wire_tray_production_status_due_idx
  ON public.wire_tray_production_orders (status, planned_completion_date, created_at DESC);
CREATE INDEX IF NOT EXISTS wire_tray_production_product_idx
  ON public.wire_tray_production_orders (product_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_replenishment_one_open_per_product
  ON public.wire_tray_production_orders (product_id)
  WHERE origin_type = 'replenishment'
    AND status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');

CREATE TABLE IF NOT EXISTS public.wire_tray_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  document_type public.wire_tray_document_type NOT NULL,
  visibility public.wire_tray_document_visibility NOT NULL DEFAULT 'operational',
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  caption text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_document_entity_type_valid CHECK (
    entity_type IN ('product', 'order', 'production_order', 'movement', 'dispatch')
  ),
  CONSTRAINT wire_tray_document_file_name_not_blank CHECK (btrim(file_name) <> ''),
  CONSTRAINT wire_tray_document_file_size_valid CHECK (file_size > 0 AND file_size <= 15728640),
  CONSTRAINT wire_tray_document_mime_type_valid CHECK (
    mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT wire_tray_document_path_owned CHECK (
    split_part(storage_path, '/', 1) = created_by::text
  ),
  CONSTRAINT wire_tray_invoice_visibility_valid CHECK (
    document_type <> 'invoice'
    OR visibility IN ('financial', 'admin_only')
  ),
  CONSTRAINT wire_tray_document_status_valid CHECK (status IN ('pending', 'ready', 'rejected'))
);

CREATE INDEX IF NOT EXISTS wire_tray_documents_entity_idx
  ON public.wire_tray_documents (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wire_tray_production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.wire_tray_production_orders(id) ON DELETE RESTRICT,
  entry_type public.wire_tray_production_entry_type NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  notes text,
  evidence_document_id uuid REFERENCES public.wire_tray_documents(id) ON DELETE SET NULL,
  idempotency_key text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_production_entry_quantity_nonnegative CHECK (quantity >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_production_entries_idempotency_idx
  ON public.wire_tray_production_entries (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wire_tray_production_entries_order_idx
  ON public.wire_tray_production_entries (production_order_id, created_at);

CREATE TABLE IF NOT EXISTS public.wire_tray_separation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.wire_tray_order_items(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES public.wire_tray_reservations(id) ON DELETE RESTRICT,
  entry_type public.wire_tray_separation_entry_type NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  difference_quantity numeric(18,3) NOT NULL DEFAULT 0,
  reason text,
  resolves_entry_id uuid REFERENCES public.wire_tray_separation_entries(id) ON DELETE RESTRICT,
  evidence_document_id uuid REFERENCES public.wire_tray_documents(id) ON DELETE SET NULL,
  idempotency_key text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_separation_quantities_nonnegative CHECK (
    quantity >= 0 AND difference_quantity >= 0
  ),
  CONSTRAINT wire_tray_separation_resolution_valid CHECK (
    (entry_type = 'resolution' AND resolves_entry_id IS NOT NULL)
    OR (entry_type <> 'resolution' AND resolves_entry_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_separation_entries_idempotency_idx
  ON public.wire_tray_separation_entries (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wire_tray_separation_entries_order_idx
  ON public.wire_tray_separation_entries (order_id, order_item_id, created_at);

CREATE TABLE IF NOT EXISTS public.wire_tray_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type public.wire_tray_movement_type NOT NULL,
  product_id uuid NOT NULL REFERENCES public.wire_tray_products(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES public.wire_tray_stock_locations(id) ON DELETE RESTRICT,
  quantity numeric(18,3) NOT NULL,
  physical_delta numeric(18,3) NOT NULL DEFAULT 0,
  reserved_delta numeric(18,3) NOT NULL DEFAULT 0,
  previous_physical numeric(18,3) NOT NULL,
  new_physical numeric(18,3) NOT NULL,
  previous_reserved numeric(18,3) NOT NULL,
  new_reserved numeric(18,3) NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES public.wire_tray_order_items(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES public.wire_tray_reservations(id) ON DELETE RESTRICT,
  production_order_id uuid REFERENCES public.wire_tray_production_orders(id) ON DELETE RESTRICT,
  counterpart_movement_id uuid REFERENCES public.wire_tray_stock_movements(id) ON DELETE RESTRICT,
  evidence_document_id uuid REFERENCES public.wire_tray_documents(id) ON DELETE SET NULL,
  idempotency_key text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_movement_quantity_positive CHECK (quantity > 0),
  CONSTRAINT wire_tray_movement_balances_nonnegative CHECK (
    previous_physical >= 0 AND new_physical >= 0
    AND previous_reserved >= 0 AND new_reserved >= 0
    AND previous_reserved <= previous_physical
    AND new_reserved <= new_physical
  ),
  CONSTRAINT wire_tray_movement_reason_not_blank CHECK (btrim(reason) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_stock_movements_idempotency_idx
  ON public.wire_tray_stock_movements (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS wire_tray_stock_movements_product_date_idx
  ON public.wire_tray_stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wire_tray_stock_movements_order_idx
  ON public.wire_tray_stock_movements (order_id, created_at DESC) WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wire_tray_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.wire_tray_orders(id) ON DELETE RESTRICT,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  route text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_notification_type_not_blank CHECK (btrim(notification_type) <> ''),
  CONSTRAINT wire_tray_notification_title_not_blank CHECK (btrim(title) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_notifications_unique_business_event
  ON public.wire_tray_notifications (user_id, order_id, notification_type)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS wire_tray_notifications_unread_idx
  ON public.wire_tray_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.wire_tray_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_audit_event_type_not_blank CHECK (btrim(event_type) <> ''),
  CONSTRAINT wire_tray_audit_entity_type_not_blank CHECK (btrim(entity_type) <> '')
);

CREATE INDEX IF NOT EXISTS wire_tray_audit_entity_idx
  ON public.wire_tray_audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wire_tray_audit_date_idx
  ON public.wire_tray_audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.wire_tray_operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  response jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wire_tray_operation_not_blank CHECK (btrim(operation) <> ''),
  CONSTRAINT wire_tray_operation_key_not_blank CHECK (btrim(idempotency_key) <> ''),
  CONSTRAINT wire_tray_operation_unique UNIQUE (user_id, operation, idempotency_key)
);

-- Existing updated-at convention.
DROP TRIGGER IF EXISTS user_module_access_updated_at ON public.user_module_access;
CREATE TRIGGER user_module_access_updated_at
  BEFORE UPDATE ON public.user_module_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_locations_updated_at ON public.wire_tray_stock_locations;
CREATE TRIGGER wire_tray_locations_updated_at
  BEFORE UPDATE ON public.wire_tray_stock_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_products_updated_at ON public.wire_tray_products;
CREATE TRIGGER wire_tray_products_updated_at
  BEFORE UPDATE ON public.wire_tray_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_balances_updated_at ON public.wire_tray_stock_balances;
CREATE TRIGGER wire_tray_balances_updated_at
  BEFORE UPDATE ON public.wire_tray_stock_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_orders_updated_at ON public.wire_tray_orders;
CREATE TRIGGER wire_tray_orders_updated_at
  BEFORE UPDATE ON public.wire_tray_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_order_items_updated_at ON public.wire_tray_order_items;
CREATE TRIGGER wire_tray_order_items_updated_at
  BEFORE UPDATE ON public.wire_tray_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_order_financials_updated_at ON public.wire_tray_order_financials;
CREATE TRIGGER wire_tray_order_financials_updated_at
  BEFORE UPDATE ON public.wire_tray_order_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_order_item_financials_updated_at ON public.wire_tray_order_item_financials;
CREATE TRIGGER wire_tray_order_item_financials_updated_at
  BEFORE UPDATE ON public.wire_tray_order_item_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_reservations_updated_at ON public.wire_tray_reservations;
CREATE TRIGGER wire_tray_reservations_updated_at
  BEFORE UPDATE ON public.wire_tray_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS wire_tray_production_orders_updated_at ON public.wire_tray_production_orders;
CREATE TRIGGER wire_tray_production_orders_updated_at
  BEFORE UPDATE ON public.wire_tray_production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $wire_enum_contract$
DECLARE
  missing_labels text[];
BEGIN
  SELECT array_agg(expected.type_name || '.' || expected.label ORDER BY expected.type_name, expected.label)
  INTO missing_labels
  FROM (VALUES
    ('app_module', 'os'),
    ('app_module', 'wire_trays'),
    ('wire_tray_module_role', 'admin'),
    ('wire_tray_module_role', 'gestor'),
    ('wire_tray_module_role', 'comercial'),
    ('wire_tray_module_role', 'producao'),
    ('wire_tray_module_role', 'estoque'),
    ('wire_tray_module_role', 'faturamento'),
    ('wire_tray_module_role', 'consulta'),
    ('wire_tray_product_category', 'straight_tray'),
    ('wire_tray_product_category', 'curve'),
    ('wire_tray_product_category', 'branch'),
    ('wire_tray_product_category', 'reduction'),
    ('wire_tray_product_category', 'splice'),
    ('wire_tray_product_category', 'support'),
    ('wire_tray_product_category', 'cover'),
    ('wire_tray_product_category', 'accessory'),
    ('wire_tray_product_category', 'other'),
    ('wire_tray_unit', 'piece'),
    ('wire_tray_unit', 'meter'),
    ('wire_tray_unit', 'kilogram'),
    ('wire_tray_unit', 'set'),
    ('wire_tray_order_status', 'draft'),
    ('wire_tray_order_status', 'confirmed'),
    ('wire_tray_order_status', 'stock_reserved'),
    ('wire_tray_order_status', 'production_pending'),
    ('wire_tray_order_status', 'in_production'),
    ('wire_tray_order_status', 'separating'),
    ('wire_tray_order_status', 'awaiting_check'),
    ('wire_tray_order_status', 'ready_for_billing'),
    ('wire_tray_order_status', 'billed'),
    ('wire_tray_order_status', 'ready_for_dispatch'),
    ('wire_tray_order_status', 'dispatched'),
    ('wire_tray_order_status', 'completed'),
    ('wire_tray_order_status', 'cancelled'),
    ('wire_tray_reservation_status', 'active'),
    ('wire_tray_reservation_status', 'partially_consumed'),
    ('wire_tray_reservation_status', 'consumed'),
    ('wire_tray_reservation_status', 'released'),
    ('wire_tray_reservation_status', 'cancelled'),
    ('wire_tray_production_origin', 'customer_order'),
    ('wire_tray_production_origin', 'replenishment'),
    ('wire_tray_production_origin', 'manual_stock'),
    ('wire_tray_production_status', 'planned'),
    ('wire_tray_production_status', 'released'),
    ('wire_tray_production_status', 'in_progress'),
    ('wire_tray_production_status', 'paused'),
    ('wire_tray_production_status', 'awaiting_check'),
    ('wire_tray_production_status', 'completed'),
    ('wire_tray_production_status', 'cancelled'),
    ('wire_tray_production_entry_type', 'start'),
    ('wire_tray_production_entry_type', 'progress'),
    ('wire_tray_production_entry_type', 'pause'),
    ('wire_tray_production_entry_type', 'resume'),
    ('wire_tray_production_entry_type', 'scrap'),
    ('wire_tray_production_entry_type', 'complete'),
    ('wire_tray_production_entry_type', 'cancel'),
    ('wire_tray_movement_type', 'stock_entry'),
    ('wire_tray_movement_type', 'stock_exit'),
    ('wire_tray_movement_type', 'transfer_out'),
    ('wire_tray_movement_type', 'transfer_in'),
    ('wire_tray_movement_type', 'return'),
    ('wire_tray_movement_type', 'loss'),
    ('wire_tray_movement_type', 'adjustment'),
    ('wire_tray_movement_type', 'reservation'),
    ('wire_tray_movement_type', 'reservation_release'),
    ('wire_tray_movement_type', 'reservation_consumption'),
    ('wire_tray_movement_type', 'production_entry'),
    ('wire_tray_movement_type', 'dispatch'),
    ('wire_tray_separation_entry_type', 'separation'),
    ('wire_tray_separation_entry_type', 'checking'),
    ('wire_tray_separation_entry_type', 'discrepancy'),
    ('wire_tray_separation_entry_type', 'resolution'),
    ('wire_tray_document_type', 'quotation'),
    ('wire_tray_document_type', 'customer_order'),
    ('wire_tray_document_type', 'technical_drawing'),
    ('wire_tray_document_type', 'production_instruction'),
    ('wire_tray_document_type', 'invoice'),
    ('wire_tray_document_type', 'dispatch_receipt'),
    ('wire_tray_document_type', 'photo'),
    ('wire_tray_document_type', 'other'),
    ('wire_tray_document_visibility', 'operational'),
    ('wire_tray_document_visibility', 'commercial'),
    ('wire_tray_document_visibility', 'financial'),
    ('wire_tray_document_visibility', 'admin_only')
  ) AS expected(type_name, label)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
      AND t.typname = expected.type_name
      AND e.enumlabel = expected.label
  );

  IF missing_labels IS NOT NULL THEN
    RAISE EXCEPTION 'Enums incompatíveis em Leitos Aramados: %', array_to_string(missing_labels, ', ')
      USING ERRCODE = '55000';
  END IF;
END
$wire_enum_contract$;

-- Source: 20260721133100_wire_tray_security.sql
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

-- Remove the two temporary policies installed by the minimal access-only migration.
DROP POLICY IF EXISTS "Users read own module access" ON public.user_module_access;
DROP POLICY IF EXISTS "Admins manage module access" ON public.user_module_access;

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

DROP POLICY IF EXISTS "Users read own or admins read module access" ON public.user_module_access;
CREATE POLICY "Users read own or admins read module access"
ON public.user_module_access FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

DROP POLICY IF EXISTS "Wire tray admins insert module access" ON public.user_module_access;
CREATE POLICY "Wire tray admins insert module access"
ON public.user_module_access FOR INSERT TO authenticated
WITH CHECK (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

DROP POLICY IF EXISTS "Wire tray admins update module access" ON public.user_module_access;
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

DROP POLICY IF EXISTS "Wire tray admins delete module access" ON public.user_module_access;
CREATE POLICY "Wire tray admins delete module access"
ON public.user_module_access FOR DELETE TO authenticated
USING (
  public.wire_tray_current_role_in(ARRAY['admin']::public.wire_tray_module_role[])
  OR public.wire_tray_is_global_admin()
);

DROP POLICY IF EXISTS "Wire tray users read locations" ON public.wire_tray_stock_locations;
CREATE POLICY "Wire tray users read locations"
ON public.wire_tray_stock_locations FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray inventory roles create locations" ON public.wire_tray_stock_locations;
CREATE POLICY "Wire tray inventory roles create locations"
ON public.wire_tray_stock_locations FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  )
);
DROP POLICY IF EXISTS "Wire tray inventory roles update locations" ON public.wire_tray_stock_locations;
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

DROP POLICY IF EXISTS "Wire tray users read products" ON public.wire_tray_products;
CREATE POLICY "Wire tray users read products"
ON public.wire_tray_products FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray managers create products" ON public.wire_tray_products;
CREATE POLICY "Wire tray managers create products"
ON public.wire_tray_products FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
);
DROP POLICY IF EXISTS "Wire tray managers update products" ON public.wire_tray_products;
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

DROP POLICY IF EXISTS "Wire tray users read balances" ON public.wire_tray_stock_balances;
CREATE POLICY "Wire tray users read balances"
ON public.wire_tray_stock_balances FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read orders" ON public.wire_tray_orders;
CREATE POLICY "Wire tray users read orders"
ON public.wire_tray_orders FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read order items" ON public.wire_tray_order_items;
CREATE POLICY "Wire tray users read order items"
ON public.wire_tray_order_items FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Authorized users read order financials" ON public.wire_tray_order_financials;
CREATE POLICY "Authorized users read order financials"
ON public.wire_tray_order_financials FOR SELECT TO authenticated
USING (public.wire_tray_can_view_financials());
DROP POLICY IF EXISTS "Authorized users read item financials" ON public.wire_tray_order_item_financials;
CREATE POLICY "Authorized users read item financials"
ON public.wire_tray_order_item_financials FOR SELECT TO authenticated
USING (public.wire_tray_can_view_financials());
DROP POLICY IF EXISTS "Wire tray users read reservations" ON public.wire_tray_reservations;
CREATE POLICY "Wire tray users read reservations"
ON public.wire_tray_reservations FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read production orders" ON public.wire_tray_production_orders;
CREATE POLICY "Wire tray users read production orders"
ON public.wire_tray_production_orders FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read production entries" ON public.wire_tray_production_entries;
CREATE POLICY "Wire tray users read production entries"
ON public.wire_tray_production_entries FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read separation entries" ON public.wire_tray_separation_entries;
CREATE POLICY "Wire tray users read separation entries"
ON public.wire_tray_separation_entries FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read movements" ON public.wire_tray_stock_movements;
CREATE POLICY "Wire tray users read movements"
ON public.wire_tray_stock_movements FOR SELECT TO authenticated
USING (public.wire_tray_has_access());
DROP POLICY IF EXISTS "Wire tray users read audit" ON public.wire_tray_audit_events;
CREATE POLICY "Wire tray users read audit"
ON public.wire_tray_audit_events FOR SELECT TO authenticated
USING (public.wire_tray_has_access());

DROP POLICY IF EXISTS "Authorized users read wire tray documents" ON public.wire_tray_documents;
CREATE POLICY "Authorized users read wire tray documents"
ON public.wire_tray_documents FOR SELECT TO authenticated
USING (public.wire_tray_can_view_document_visibility(visibility));
DROP POLICY IF EXISTS "Authorized users register wire tray documents" ON public.wire_tray_documents;
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
DROP POLICY IF EXISTS "Document owners or admins update metadata" ON public.wire_tray_documents;
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

DROP TRIGGER IF EXISTS wire_tray_documents_identity_immutable ON public.wire_tray_documents;
CREATE TRIGGER wire_tray_documents_identity_immutable
  BEFORE UPDATE ON public.wire_tray_documents
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_protect_document_identity();

REVOKE ALL ON FUNCTION public.wire_tray_protect_document_identity()
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users read own wire tray notifications" ON public.wire_tray_notifications;
CREATE POLICY "Users read own wire tray notifications"
ON public.wire_tray_notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.wire_tray_current_role_in(
    ARRAY['admin', 'gestor']::public.wire_tray_module_role[]
  )
);
DROP POLICY IF EXISTS "Users update own notification state" ON public.wire_tray_notifications;
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

DROP TRIGGER IF EXISTS wire_tray_locations_registry_audit ON public.wire_tray_stock_locations;
CREATE TRIGGER wire_tray_locations_registry_audit
  AFTER INSERT OR UPDATE ON public.wire_tray_stock_locations
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_audit_registry_change('stock_location');
DROP TRIGGER IF EXISTS wire_tray_products_registry_audit ON public.wire_tray_products;
CREATE TRIGGER wire_tray_products_registry_audit
  AFTER INSERT OR UPDATE ON public.wire_tray_products
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_audit_registry_change('product');
DROP TRIGGER IF EXISTS wire_tray_documents_registry_audit ON public.wire_tray_documents;
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

DROP TRIGGER IF EXISTS wire_tray_stock_movements_immutable ON public.wire_tray_stock_movements;
CREATE TRIGGER wire_tray_stock_movements_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
DROP TRIGGER IF EXISTS wire_tray_production_entries_immutable ON public.wire_tray_production_entries;
CREATE TRIGGER wire_tray_production_entries_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_production_entries
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
DROP TRIGGER IF EXISTS wire_tray_separation_entries_immutable ON public.wire_tray_separation_entries;
CREATE TRIGGER wire_tray_separation_entries_immutable
  BEFORE UPDATE OR DELETE ON public.wire_tray_separation_entries
  FOR EACH ROW EXECUTE FUNCTION public.wire_tray_reject_ledger_mutation();
DROP TRIGGER IF EXISTS wire_tray_audit_events_immutable ON public.wire_tray_audit_events;
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

DROP POLICY IF EXISTS "Authorized users read persisted wire tray files" ON storage.objects;
CREATE POLICY "Authorized users read persisted wire tray files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'wire-tray-documents'
  AND public.wire_tray_can_access_document_path(name)
);

DROP POLICY IF EXISTS "Authorized users upload wire tray files to own prefix" ON storage.objects;
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

DROP POLICY IF EXISTS "Owners or admins remove wire tray files" ON storage.objects;
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

-- Source: 20260721133200_wire_tray_commands.sql
-- Leitos Aramados: transactional commands for access, drafts, reservations and inventory.

CREATE UNIQUE INDEX IF NOT EXISTS wire_tray_customer_production_one_open_per_item
  ON public.wire_tray_production_orders (order_item_id)
  WHERE origin_type = 'customer_order'
    AND status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');

CREATE OR REPLACE FUNCTION public.wire_tray_assert_role(
  _roles public.wire_tray_module_role[]
)
RETURNS public.wire_tray_module_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.wire_tray_module_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  v_role := public.wire_tray_current_role();
  IF v_role = ANY (_roles) THEN
    RETURN v_role;
  END IF;

  IF 'admin'::public.wire_tray_module_role = ANY (_roles)
     AND public.wire_tray_is_global_admin() THEN
    RETURN 'admin'::public.wire_tray_module_role;
  END IF;

  RAISE EXCEPTION 'Seu perfil não permite executar esta operação.'
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_write_audit(
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _before_data jsonb DEFAULT NULL,
  _after_data jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.wire_tray_audit_events (
    event_type, entity_type, entity_id, before_data, after_data, metadata,
    idempotency_key, actor_user_id
  )
  VALUES (
    _event_type, _entity_type, _entity_id, _before_data, _after_data,
    coalesce(_metadata, '{}'::jsonb), _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_assert_evidence_document(
  _document_id uuid,
  _allowed_entity_types text[],
  _entity_id uuid,
  _allowed_document_types public.wire_tray_document_type[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_document public.wire_tray_documents%ROWTYPE;
BEGIN
  IF _document_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_document
  FROM public.wire_tray_documents d
  WHERE d.id = _document_id
  FOR SHARE;

  IF v_document.id IS NULL OR v_document.status <> 'ready' THEN
    RAISE EXCEPTION 'O documento de evidência não existe ou ainda não está disponível.'
      USING ERRCODE = 'P0002';
  END IF;
  IF NOT (v_document.entity_type = ANY (_allowed_entity_types))
     OR v_document.entity_id <> _entity_id THEN
    RAISE EXCEPTION 'O documento de evidência não pertence a este registro.'
      USING ERRCODE = '23514';
  END IF;
  IF _allowed_document_types IS NOT NULL
     AND NOT (v_document.document_type = ANY (_allowed_document_types)) THEN
    RAISE EXCEPTION 'O tipo do documento não é válido como evidência desta operação.'
      USING ERRCODE = '23514';
  END IF;
  IF NOT public.wire_tray_can_view_document_visibility(v_document.visibility) THEN
    RAISE EXCEPTION 'Seu perfil não pode utilizar este documento.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_insert_movement(
  _movement_id uuid,
  _movement_type public.wire_tray_movement_type,
  _product_id uuid,
  _location_id uuid,
  _quantity numeric,
  _physical_delta numeric,
  _reserved_delta numeric,
  _previous_physical numeric,
  _new_physical numeric,
  _previous_reserved numeric,
  _new_reserved numeric,
  _reason text,
  _order_id uuid DEFAULT NULL,
  _order_item_id uuid DEFAULT NULL,
  _reservation_id uuid DEFAULT NULL,
  _production_order_id uuid DEFAULT NULL,
  _counterpart_movement_id uuid DEFAULT NULL,
  _evidence_document_id uuid DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wire_tray_stock_movements (
    id, movement_type, product_id, location_id, quantity,
    physical_delta, reserved_delta,
    previous_physical, new_physical, previous_reserved, new_reserved,
    reason, order_id, order_item_id, reservation_id, production_order_id,
    counterpart_movement_id, evidence_document_id, idempotency_key, created_by
  )
  VALUES (
    coalesce(_movement_id, gen_random_uuid()), _movement_type, _product_id, _location_id,
    abs(_quantity), _physical_delta, _reserved_delta,
    _previous_physical, _new_physical, _previous_reserved, _new_reserved,
    _reason, _order_id, _order_item_id, _reservation_id, _production_order_id,
    _counterpart_movement_id, _evidence_document_id, _idempotency_key, auth.uid()
  )
  RETURNING id INTO _movement_id;
  RETURN _movement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.wire_tray_assert_role(public.wire_tray_module_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_write_audit(text, text, uuid, jsonb, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_assert_evidence_document(
  uuid, text[], uuid, public.wire_tray_document_type[]
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_insert_movement(
  uuid, public.wire_tray_movement_type, uuid, uuid, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, text, uuid, uuid, uuid, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.wire_tray_list_access_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  module_role public.wire_tray_module_role,
  active boolean,
  financial_access boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin']::public.wire_tray_module_role[]
  );

  RETURN QUERY
  SELECT
    au.id,
    au.email::text,
    coalesce(p.full_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')::text,
    uma.module_role,
    coalesce(uma.active, false),
    coalesce(uma.financial_access, false),
    uma.updated_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.user_module_access uma
    ON uma.user_id = au.id
   AND uma.module_key = 'wire_trays'::public.app_module
  WHERE au.deleted_at IS NULL
  ORDER BY coalesce(p.full_name, au.email, au.id::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_set_module_access(
  _user_id uuid,
  _module_role public.wire_tray_module_role,
  _active boolean,
  _financial_access boolean DEFAULT false
)
RETURNS public.user_module_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.user_module_access%ROWTYPE;
  v_result public.user_module_access%ROWTYPE;
  v_active_admins integer;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin']::public.wire_tray_module_role[]
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('wire_tray_admin_access', 0)
  );

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = _user_id AND au.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing
  FROM public.user_module_access uma
  WHERE uma.user_id = _user_id
    AND uma.module_key = 'wire_trays'::public.app_module
  FOR UPDATE;

  IF v_existing.id IS NOT NULL
     AND v_existing.active
     AND v_existing.module_role = 'admin'::public.wire_tray_module_role
     AND (NOT _active OR _module_role <> 'admin'::public.wire_tray_module_role) THEN
    SELECT count(*) INTO v_active_admins
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'::public.app_module
      AND uma.module_role = 'admin'::public.wire_tray_module_role
      AND uma.active;
    IF v_active_admins <= 1 THEN
      RAISE EXCEPTION 'O módulo precisa manter ao menos um administrador ativo.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.user_module_access (
    user_id, module_key, module_role, active, financial_access, created_by
  )
  VALUES (
    _user_id, 'wire_trays'::public.app_module, _module_role, _active,
    coalesce(_financial_access, false), auth.uid()
  )
  ON CONFLICT (user_id, module_key) DO UPDATE SET
    module_role = EXCLUDED.module_role,
    active = EXCLUDED.active,
    financial_access = EXCLUDED.financial_access
  RETURNING * INTO v_result;

  PERFORM public.wire_tray_write_audit(
    'module_access_changed', 'user_module_access', v_result.id,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE
      jsonb_build_object(
        'role', v_existing.module_role,
        'active', v_existing.active,
        'financial_access', v_existing.financial_access
      )
    END,
    jsonb_build_object(
      'role', v_result.module_role,
      'active', v_result.active,
      'financial_access', v_result.financial_access,
      'user_id', v_result.user_id
    )
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_save_order_draft(
  _order_id uuid,
  _payload jsonb,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_order public.wire_tray_orders%ROWTYPE;
  v_before jsonb;
  v_client_name text;
  v_unit_name text;
  v_item jsonb;
  v_product public.wire_tray_products%ROWTYPE;
  v_order_item_id uuid;
  v_quantity numeric(18,3);
  v_unit_price bigint;
  v_total bigint := 0;
  v_has_financial boolean := false;
  v_result jsonb;
  v_priority public.service_priority;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'comercial']::public.wire_tray_module_role[]
  );

  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'save_order_draft'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN
    RETURN v_existing_response;
  END IF;

  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'save_order_draft', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'save_order_draft'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta operação já está em andamento.' USING ERRCODE = '40001';
  END IF;

  IF jsonb_typeof(_payload->'items') <> 'array'
     OR jsonb_array_length(_payload->'items') = 0 THEN
    RAISE EXCEPTION 'Adicione ao menos um produto ao pedido.' USING ERRCODE = '23514';
  END IF;

  SELECT c.name INTO v_client_name
  FROM public.clients c
  WHERE c.id = (_payload->>'client_id')::uuid;
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.' USING ERRCODE = '23503';
  END IF;

  IF nullif(_payload->>'client_unit_id', '') IS NOT NULL THEN
    SELECT cu.name INTO v_unit_name
    FROM public.client_units cu
    WHERE cu.id = (_payload->>'client_unit_id')::uuid
      AND cu.client_id = (_payload->>'client_id')::uuid;
    IF v_unit_name IS NULL THEN
      RAISE EXCEPTION 'A unidade não pertence ao cliente selecionado.' USING ERRCODE = '23503';
    END IF;
  END IF;

  v_priority := coalesce(nullif(_payload->>'priority', '')::public.service_priority, 'media');

  IF _order_id IS NULL THEN
    INSERT INTO public.wire_tray_orders (
      client_id, client_unit_id, client_name_snapshot, client_unit_name_snapshot,
      customer_order_reference, quotation_reference, commercial_responsible_id,
      priority, expected_delivery_date, operational_notes, created_by
    )
    VALUES (
      (_payload->>'client_id')::uuid,
      nullif(_payload->>'client_unit_id', '')::uuid,
      v_client_name,
      v_unit_name,
      nullif(btrim(_payload->>'customer_order_reference'), ''),
      nullif(btrim(_payload->>'quotation_reference'), ''),
      auth.uid(),
      v_priority,
      nullif(_payload->>'expected_delivery_date', '')::date,
      nullif(btrim(_payload->>'operational_notes'), ''),
      auth.uid()
    )
    RETURNING * INTO v_order;
  ELSE
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = _order_id
    FOR UPDATE;
    IF v_order.id IS NULL THEN
      RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002';
    END IF;
    IF v_order.status <> 'draft'::public.wire_tray_order_status THEN
      RAISE EXCEPTION 'Somente rascunhos podem ser editados.' USING ERRCODE = '55000';
    END IF;
    v_before := jsonb_build_object(
      'client_id', v_order.client_id,
      'client_unit_id', v_order.client_unit_id,
      'priority', v_order.priority,
      'expected_delivery_date', v_order.expected_delivery_date
    );

    UPDATE public.wire_tray_orders SET
      client_id = (_payload->>'client_id')::uuid,
      client_unit_id = nullif(_payload->>'client_unit_id', '')::uuid,
      client_name_snapshot = v_client_name,
      client_unit_name_snapshot = v_unit_name,
      customer_order_reference = nullif(btrim(_payload->>'customer_order_reference'), ''),
      quotation_reference = nullif(btrim(_payload->>'quotation_reference'), ''),
      priority = v_priority,
      expected_delivery_date = nullif(_payload->>'expected_delivery_date', '')::date,
      operational_notes = nullif(btrim(_payload->>'operational_notes'), ''),
      version = version + 1
    WHERE id = v_order.id
    RETURNING * INTO v_order;

    IF NOT public.wire_tray_can_view_financials()
       AND EXISTS (
         SELECT 1
         FROM public.wire_tray_order_item_financials f
         JOIN public.wire_tray_order_items i ON i.id = f.order_item_id
         WHERE i.order_id = v_order.id
       ) THEN
      RAISE EXCEPTION 'Este rascunho contém valores e exige permissão financeira para edição.'
        USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.wire_tray_order_item_financials f
    USING public.wire_tray_order_items i
    WHERE f.order_item_id = i.id AND i.order_id = v_order.id;
    DELETE FROM public.wire_tray_order_items WHERE order_id = v_order.id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_payload->'items')
  LOOP
    v_quantity := (v_item->>'quantity')::numeric;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Todas as quantidades devem ser maiores que zero.' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_product
    FROM public.wire_tray_products p
    WHERE p.id = (v_item->>'product_id')::uuid
      AND p.active;
    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Produto indisponível ou não encontrado.' USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.wire_tray_order_items (
      order_id, product_id, product_name_snapshot, product_sku_snapshot,
      category_snapshot, unit_snapshot, requested_quantity, notes, sort_order
    )
    VALUES (
      v_order.id, v_product.id, v_product.name, v_product.sku,
      v_product.category, v_product.unit, v_quantity,
      nullif(btrim(v_item->>'notes'), ''),
      coalesce((v_item->>'sort_order')::integer, 0)
    )
    RETURNING id INTO v_order_item_id;

    IF nullif(v_item->>'unit_price_cents', '') IS NOT NULL THEN
      IF NOT public.wire_tray_can_view_financials() THEN
        RAISE EXCEPTION 'Seu perfil não permite registrar valores.' USING ERRCODE = '42501';
      END IF;
      v_unit_price := (v_item->>'unit_price_cents')::bigint;
      IF v_unit_price < 0 THEN
        RAISE EXCEPTION 'O valor unitário não pode ser negativo.' USING ERRCODE = '23514';
      END IF;
      INSERT INTO public.wire_tray_order_item_financials (
        order_item_id, unit_price_cents, total_cents, created_by
      )
      VALUES (
        v_order_item_id, v_unit_price, round(v_unit_price * v_quantity)::bigint, auth.uid()
      );
      v_total := v_total + round(v_unit_price * v_quantity)::bigint;
      v_has_financial := true;
    END IF;
  END LOOP;

  IF v_has_financial THEN
    INSERT INTO public.wire_tray_order_financials (
      order_id, total_cents, created_by
    )
    VALUES (v_order.id, v_total, auth.uid())
    ON CONFLICT (order_id) DO UPDATE SET total_cents = EXCLUDED.total_cents;
  ELSIF public.wire_tray_can_view_financials() THEN
    DELETE FROM public.wire_tray_order_financials WHERE order_id = v_order.id;
  END IF;

  PERFORM public.wire_tray_write_audit(
    CASE WHEN _order_id IS NULL THEN 'order_draft_created' ELSE 'order_draft_updated' END,
    'order', v_order.id, v_before,
    jsonb_build_object(
      'number', v_order.number,
      'client_id', v_order.client_id,
      'status', v_order.status,
      'item_count', jsonb_array_length(_payload->'items')
    ),
    '{}'::jsonb,
    _idempotency_key
  );

  v_result := jsonb_build_object(
    'id', v_order.id,
    'number', v_order.number,
    'status', v_order.status
  );
  UPDATE public.wire_tray_operation_requests SET
    response = v_result,
    completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'save_order_draft'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_trigger_replenishment_internal(
  _product_id uuid,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_product public.wire_tray_products%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_existing uuid;
  v_incoming numeric(18,3) := 0;
  v_projected numeric(18,3);
  v_quantity numeric(18,3);
  v_production_id uuid;
BEGIN
  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id
  FOR UPDATE;

  IF v_product.id IS NULL OR NOT v_product.active
     OR NOT v_product.automatic_replenishment
     OR v_product.default_location_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT po.id INTO v_existing
  FROM public.wire_tray_production_orders po
  WHERE po.product_id = v_product.id
    AND po.origin_type = 'replenishment'::public.wire_tray_production_origin
    AND po.status IN (
      'planned'::public.wire_tray_production_status,
      'released'::public.wire_tray_production_status,
      'in_progress'::public.wire_tray_production_status,
      'paused'::public.wire_tray_production_status,
      'awaiting_check'::public.wire_tray_production_status
    )
  ORDER BY po.created_at
  LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
  VALUES (v_product.id, v_product.default_location_id)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  SELECT * INTO v_balance
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = v_product.id
    AND b.location_id = v_product.default_location_id
  FOR UPDATE;

  SELECT coalesce(sum(po.planned_quantity - po.produced_quantity), 0)
  INTO v_incoming
  FROM public.wire_tray_production_orders po
  WHERE po.product_id = v_product.id
    AND po.origin_type IN (
      'replenishment'::public.wire_tray_production_origin,
      'manual_stock'::public.wire_tray_production_origin
    )
    AND po.status IN (
      'planned'::public.wire_tray_production_status,
      'released'::public.wire_tray_production_status,
      'in_progress'::public.wire_tray_production_status,
      'paused'::public.wire_tray_production_status,
      'awaiting_check'::public.wire_tray_production_status
    );

  v_projected := v_balance.available_quantity + v_incoming;
  IF v_projected > v_product.minimum_stock THEN RETURN NULL; END IF;

  v_quantity := greatest(
    v_product.minimum_production_batch,
    coalesce(v_product.target_stock - v_projected, v_product.minimum_production_batch)
  );

  INSERT INTO public.wire_tray_production_orders (
    origin_type, product_id, destination_location_id, planned_quantity,
    priority, generation_reason, created_by
  )
  VALUES (
    'replenishment', v_product.id, v_product.default_location_id, v_quantity,
    'media', coalesce(nullif(btrim(_reason), ''), 'Reposição automática por estoque projetado.'),
    auth.uid()
  )
  RETURNING id INTO v_production_id;

  PERFORM public.wire_tray_write_audit(
    'replenishment_created', 'production_order', v_production_id, NULL,
    jsonb_build_object(
      'product_id', v_product.id,
      'projected_quantity', v_projected,
      'minimum_stock', v_product.minimum_stock,
      'target_stock', v_product.target_stock,
      'planned_quantity', v_quantity
    )
  );
  RETURN v_production_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT po.id INTO v_existing
    FROM public.wire_tray_production_orders po
    WHERE po.product_id = _product_id
      AND po.origin_type = 'replenishment'::public.wire_tray_production_origin
      AND po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
    ORDER BY po.created_at
    LIMIT 1;
    RETURN v_existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_trigger_replenishment(_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  RETURN public.wire_tray_trigger_replenishment_internal(
    _product_id, 'Reposição solicitada após validação do estoque projetado.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_confirm_order(
  _order_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_product public.wire_tray_products%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_reserve numeric(18,3);
  v_shortage numeric(18,3);
  v_reservation_id uuid;
  v_production_id uuid;
  v_has_shortage boolean := false;
  v_result jsonb;
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
  IF v_order.status <> 'draft'::public.wire_tray_order_status THEN
    IF v_order.status = 'cancelled'::public.wire_tray_order_status THEN
      RAISE EXCEPTION 'Pedido cancelado não pode ser confirmado.' USING ERRCODE = '55000';
    END IF;
    RETURN jsonb_build_object('id', v_order.id, 'number', v_order.number, 'status', v_order.status);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.wire_tray_order_items i WHERE i.order_id = v_order.id
  ) THEN
    RAISE EXCEPTION 'O pedido não possui itens.' USING ERRCODE = '23514';
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.wire_tray_order_items i
    WHERE i.order_id = v_order.id
    ORDER BY i.product_id, i.id
    FOR UPDATE
  LOOP
    SELECT * INTO v_product
    FROM public.wire_tray_products p
    WHERE p.id = v_item.product_id
    FOR UPDATE;
    IF v_product.default_location_id IS NULL THEN
      RAISE EXCEPTION 'Configure o local padrão do produto % antes de confirmar.', v_product.name
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
    VALUES (v_product.id, v_product.default_location_id)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    SELECT * INTO v_balance
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = v_product.id
      AND b.location_id = v_product.default_location_id
    FOR UPDATE;

    v_reserve := least(v_item.requested_quantity, v_balance.available_quantity);
    v_shortage := v_item.requested_quantity - v_reserve;

    IF v_reserve > 0 THEN
      INSERT INTO public.wire_tray_reservations (
        order_id, order_item_id, product_id, location_id, quantity, created_by
      )
      VALUES (
        v_order.id, v_item.id, v_product.id, v_product.default_location_id,
        v_reserve, auth.uid()
      )
      RETURNING id INTO v_reservation_id;

      UPDATE public.wire_tray_stock_balances SET
        reserved_quantity = reserved_quantity + v_reserve,
        version = version + 1
      WHERE id = v_balance.id;

      PERFORM public.wire_tray_insert_movement(
        gen_random_uuid(), 'reservation', v_product.id, v_product.default_location_id,
        v_reserve, 0, v_reserve,
        v_balance.physical_quantity, v_balance.physical_quantity,
        v_balance.reserved_quantity, v_balance.reserved_quantity + v_reserve,
        'Reserva na confirmação do pedido.',
        v_order.id, v_item.id, v_reservation_id, NULL, NULL, NULL,
        CASE WHEN _idempotency_key IS NULL THEN NULL ELSE _idempotency_key || ':' || v_item.id::text END
      );
    END IF;

    IF v_shortage > 0 THEN
      v_has_shortage := true;
      INSERT INTO public.wire_tray_production_orders (
        origin_type, order_id, order_item_id, product_id, destination_location_id,
        planned_quantity, priority, planned_completion_date, generation_reason, created_by
      )
      VALUES (
        'customer_order', v_order.id, v_item.id, v_product.id,
        v_product.default_location_id, v_shortage, v_order.priority,
        v_order.expected_delivery_date, 'Déficit apurado na confirmação do pedido.', auth.uid()
      )
      RETURNING id INTO v_production_id;
    END IF;

    UPDATE public.wire_tray_order_items SET
      reserved_quantity = v_reserve,
      production_required_quantity = v_shortage
    WHERE id = v_item.id;

    PERFORM public.wire_tray_trigger_replenishment_internal(
      v_product.id, 'Reposição automática após reserva de pedido.'
    );
  END LOOP;

  UPDATE public.wire_tray_orders SET
    status = CASE WHEN v_has_shortage THEN 'production_pending'::public.wire_tray_order_status
                  ELSE 'stock_reserved'::public.wire_tray_order_status END,
    confirmed_at = now(),
    version = version + 1
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  IF v_has_shortage THEN
    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_requires_production',
      'Pedido com necessidade de produção',
      format('O pedido #%s possui itens sem saldo disponível.', v_order.number),
      '/leitos/producao',
      jsonb_build_object('order_number', v_order.number)
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'producao')
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL
    DO UPDATE SET
      message = EXCLUDED.message,
      metadata = EXCLUDED.metadata,
      read_at = NULL,
      dismissed_at = NULL,
      created_at = now();
  END IF;

  PERFORM public.wire_tray_write_audit(
    'order_confirmed', 'order', v_order.id,
    jsonb_build_object('status', 'draft'),
    jsonb_build_object('status', v_order.status, 'confirmed_at', v_order.confirmed_at),
    '{}'::jsonb,
    _idempotency_key
  );

  v_result := jsonb_build_object('id', v_order.id, 'number', v_order.number, 'status', v_order.status);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_order_reservations_internal(
  _order_id uuid,
  _reason text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res public.wire_tray_reservations%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_remaining numeric(18,3);
  v_total numeric(18,3) := 0;
BEGIN
  FOR v_res IN
    SELECT *
    FROM public.wire_tray_reservations r
    WHERE r.order_id = _order_id
      AND r.status IN ('active', 'partially_consumed')
      AND r.remaining_quantity > 0
    ORDER BY r.product_id, r.location_id, r.id
    FOR UPDATE
  LOOP
    v_remaining := v_res.remaining_quantity;
    SELECT * INTO v_balance
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
    FOR UPDATE;

    UPDATE public.wire_tray_stock_balances SET
      reserved_quantity = reserved_quantity - v_remaining,
      version = version + 1
    WHERE id = v_balance.id;

    UPDATE public.wire_tray_reservations SET
      released_quantity = released_quantity + v_remaining,
      status = 'released',
      released_at = now()
    WHERE id = v_res.id;

    UPDATE public.wire_tray_order_items SET
      reserved_quantity = greatest(0, reserved_quantity - v_remaining)
    WHERE id = v_res.order_item_id;

    PERFORM public.wire_tray_insert_movement(
      gen_random_uuid(), 'reservation_release', v_res.product_id, v_res.location_id,
      v_remaining, 0, -v_remaining,
      v_balance.physical_quantity, v_balance.physical_quantity,
      v_balance.reserved_quantity, v_balance.reserved_quantity - v_remaining,
      _reason, _order_id, v_res.order_item_id, v_res.id
    );
    v_total := v_total + v_remaining;
  END LOOP;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_cancel_order(
  _order_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_released numeric(18,3);
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'comercial']::public.wire_tray_module_role[]
  );
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_order
  FROM public.wire_tray_orders o
  WHERE o.id = _order_id
  FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status IN ('dispatched', 'completed') THEN
    RAISE EXCEPTION 'Pedido expedido ou concluído não pode ser cancelado.' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.wire_tray_production_orders po
    WHERE po.order_id = v_order.id
      AND po.status IN ('in_progress', 'paused', 'awaiting_check', 'completed')
  ) THEN
    RAISE EXCEPTION 'Há produção iniciada para este pedido. Encaminhe para revisão administrativa.'
      USING ERRCODE = '55000';
  END IF;

  v_released := public.wire_tray_release_order_reservations_internal(v_order.id, _reason);
  UPDATE public.wire_tray_production_orders SET
    status = 'cancelled', cancelled_at = now(), version = version + 1
  WHERE order_id = v_order.id AND status IN ('planned', 'released');
  UPDATE public.wire_tray_orders SET
    status = 'cancelled', cancelled_at = now(), cancellation_reason = btrim(_reason),
    version = version + 1
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  PERFORM public.wire_tray_write_audit(
    'order_cancelled', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status, 'released_quantity', v_released),
    jsonb_build_object('reason', btrim(_reason))
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'released_quantity', v_released);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_stock_movement(
  _product_id uuid,
  _location_id uuid,
  _movement_type public.wire_tray_movement_type,
  _quantity numeric,
  _reason text,
  _destination_location_id uuid,
  _evidence_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_product public.wire_tray_products%ROWTYPE;
  v_source public.wire_tray_stock_balances%ROWTYPE;
  v_destination public.wire_tray_stock_balances%ROWTYPE;
  v_delta numeric(18,3);
  v_magnitude numeric(18,3);
  v_out_id uuid := gen_random_uuid();
  v_in_id uuid := gen_random_uuid();
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe o motivo da movimentação.' USING ERRCODE = '23514';
  END IF;
  IF _movement_type NOT IN ('stock_entry', 'stock_exit', 'return', 'loss', 'adjustment', 'transfer_out') THEN
    RAISE EXCEPTION 'Tipo de movimentação manual inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'record_stock_movement'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'record_stock_movement', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'record_stock_movement'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta movimentação já está em andamento.' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id
  FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['product']::text[],
    _product_id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );
  IF NOT EXISTS (SELECT 1 FROM public.wire_tray_stock_locations l WHERE l.id = _location_id AND l.active) THEN
    RAISE EXCEPTION 'Local de estoque não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  IF _movement_type = 'adjustment' THEN
    IF _quantity = 0 THEN RAISE EXCEPTION 'O ajuste não pode ser zero.' USING ERRCODE = '23514'; END IF;
    v_delta := _quantity;
    v_magnitude := abs(_quantity);
  ELSE
    IF _quantity IS NULL OR _quantity <= 0 THEN
      RAISE EXCEPTION 'A quantidade deve ser maior que zero.' USING ERRCODE = '23514';
    END IF;
    v_magnitude := _quantity;
    v_delta := CASE WHEN _movement_type IN ('stock_entry', 'return') THEN _quantity ELSE -_quantity END;
  END IF;

  IF _movement_type = 'transfer_out' THEN
    IF _destination_location_id IS NULL OR _destination_location_id = _location_id THEN
      RAISE EXCEPTION 'Selecione um local de destino diferente.' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.wire_tray_stock_locations l
      WHERE l.id = _destination_location_id AND l.active
    ) THEN
      RAISE EXCEPTION 'Local de destino não encontrado ou inativo.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
  VALUES (_product_id, _location_id)
  ON CONFLICT (product_id, location_id) DO NOTHING;
  IF _movement_type = 'transfer_out' THEN
    INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
    VALUES (_product_id, _destination_location_id)
    ON CONFLICT (product_id, location_id) DO NOTHING;
  END IF;

  -- Deterministic location order prevents transfer deadlocks.
  PERFORM b.id
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = _product_id
    AND b.location_id IN (_location_id, coalesce(_destination_location_id, _location_id))
  ORDER BY b.location_id
  FOR UPDATE;

  SELECT * INTO v_source
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = _product_id AND b.location_id = _location_id;
  IF v_source.physical_quantity + v_delta < v_source.reserved_quantity THEN
    RAISE EXCEPTION 'Movimentação recusada: o saldo físico ficaria abaixo do reservado.'
      USING ERRCODE = '23514';
  END IF;

  IF _movement_type = 'transfer_out' THEN
    SELECT * INTO v_destination
    FROM public.wire_tray_stock_balances b
    WHERE b.product_id = _product_id AND b.location_id = _destination_location_id;

    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity - v_magnitude, version = version + 1
    WHERE id = v_source.id;
    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity + v_magnitude, version = version + 1
    WHERE id = v_destination.id;

    PERFORM public.wire_tray_insert_movement(
      v_out_id, 'transfer_out', _product_id, _location_id, v_magnitude,
      -v_magnitude, 0,
      v_source.physical_quantity, v_source.physical_quantity - v_magnitude,
      v_source.reserved_quantity, v_source.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, v_in_id, _evidence_document_id,
      _idempotency_key || ':out'
    );
    PERFORM public.wire_tray_insert_movement(
      v_in_id, 'transfer_in', _product_id, _destination_location_id, v_magnitude,
      v_magnitude, 0,
      v_destination.physical_quantity, v_destination.physical_quantity + v_magnitude,
      v_destination.reserved_quantity, v_destination.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, v_out_id, _evidence_document_id,
      _idempotency_key || ':in'
    );
    v_result := jsonb_build_object(
      'movement_id', v_out_id,
      'counterpart_movement_id', v_in_id,
      'physical_quantity', v_source.physical_quantity - v_magnitude,
      'available_quantity', v_source.physical_quantity - v_magnitude - v_source.reserved_quantity
    );
  ELSE
    UPDATE public.wire_tray_stock_balances SET
      physical_quantity = physical_quantity + v_delta, version = version + 1
    WHERE id = v_source.id;
    PERFORM public.wire_tray_insert_movement(
      v_out_id, _movement_type, _product_id, _location_id, v_magnitude,
      v_delta, 0,
      v_source.physical_quantity, v_source.physical_quantity + v_delta,
      v_source.reserved_quantity, v_source.reserved_quantity,
      btrim(_reason), NULL, NULL, NULL, NULL, NULL, _evidence_document_id,
      _idempotency_key
    );
    v_result := jsonb_build_object(
      'movement_id', v_out_id,
      'physical_quantity', v_source.physical_quantity + v_delta,
      'available_quantity', v_source.physical_quantity + v_delta - v_source.reserved_quantity
    );
  END IF;

  PERFORM public.wire_tray_write_audit(
    'stock_movement_recorded', 'stock_movement', v_out_id, NULL,
    v_result, jsonb_build_object('reason', btrim(_reason)), _idempotency_key
  );
  IF v_delta < 0 THEN
    PERFORM public.wire_tray_trigger_replenishment_internal(
      _product_id, 'Reposição automática após movimentação de saída.'
    );
  END IF;
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'record_stock_movement'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE VIEW public.wire_tray_projected_inventory
WITH (security_invoker = true)
AS
SELECT
  b.id AS balance_id,
  b.product_id,
  b.location_id,
  b.physical_quantity,
  b.reserved_quantity,
  b.available_quantity,
  coalesce(sum(po.planned_quantity - po.produced_quantity) FILTER (
    WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
  ), 0)::numeric(18,3) AS in_production_quantity,
  (
    b.available_quantity
    + coalesce(sum(po.planned_quantity - po.produced_quantity) FILTER (
        WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
          AND po.origin_type IN ('replenishment', 'manual_stock')
      ), 0)
  )::numeric(18,3) AS projected_quantity,
  b.updated_at
FROM public.wire_tray_stock_balances b
LEFT JOIN public.wire_tray_production_orders po
  ON po.product_id = b.product_id
 AND po.destination_location_id = b.location_id
GROUP BY b.id;

GRANT SELECT ON public.wire_tray_projected_inventory TO authenticated, service_role;

-- Product-level inventory is calculated in the database so health filters and
-- pagination are applied before rows are returned to the client. Customer-order
-- production remains visible as work in progress, but it is not counted as
-- projected free stock because it is committed to that order on completion.
CREATE OR REPLACE VIEW public.wire_tray_inventory_catalog
WITH (security_invoker = true)
AS
WITH balance_totals AS (
  SELECT
    b.product_id,
    sum(b.physical_quantity)::numeric(18,3) AS physical_quantity,
    sum(b.reserved_quantity)::numeric(18,3) AS reserved_quantity,
    max(b.updated_at) AS balance_updated_at
  FROM public.wire_tray_stock_balances b
  GROUP BY b.product_id
),
production_totals AS (
  SELECT
    po.product_id,
    sum(po.planned_quantity - po.produced_quantity)::numeric(18,3) AS in_production_quantity,
    coalesce(
      sum(po.planned_quantity - po.produced_quantity) FILTER (
        WHERE po.origin_type IN ('replenishment', 'manual_stock')
      ),
      0
    )::numeric(18,3) AS incoming_stock_quantity
  FROM public.wire_tray_production_orders po
  WHERE po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check')
  GROUP BY po.product_id
),
inventory AS (
  SELECT
    p.id,
    p.sku,
    p.name,
    p.category,
    p.unit,
    p.active,
    p.short_description,
    p.width_mm,
    p.height_mm,
    p.length_mm,
    p.material,
    p.finish,
    p.technical_notes,
    p.default_location_id,
    p.minimum_stock,
    p.target_stock,
    p.minimum_production_batch,
    p.automatic_replenishment,
    p.replenishment_notes,
    p.created_at,
    p.updated_at,
    l.id AS default_location_record_id,
    l.code AS default_location_code,
    l.name AS default_location_name,
    l.description AS default_location_description,
    l.active AS default_location_active,
    l.updated_at AS default_location_updated_at,
    coalesce(b.physical_quantity, 0)::numeric(18,3) AS physical_quantity,
    coalesce(b.reserved_quantity, 0)::numeric(18,3) AS reserved_quantity,
    (coalesce(b.physical_quantity, 0) - coalesce(b.reserved_quantity, 0))::numeric(18,3)
      AS available_quantity,
    coalesce(pt.in_production_quantity, 0)::numeric(18,3) AS in_production_quantity,
    coalesce(pt.incoming_stock_quantity, 0)::numeric(18,3) AS incoming_stock_quantity,
    (
      coalesce(b.physical_quantity, 0)
      - coalesce(b.reserved_quantity, 0)
      + coalesce(pt.incoming_stock_quantity, 0)
    )::numeric(18,3) AS projected_quantity,
    b.balance_updated_at
  FROM public.wire_tray_products p
  LEFT JOIN public.wire_tray_stock_locations l ON l.id = p.default_location_id
  LEFT JOIN balance_totals b ON b.product_id = p.id
  LEFT JOIN production_totals pt ON pt.product_id = p.id
)
SELECT
  i.*,
  CASE
    WHEN i.physical_quantity = 0 THEN 'empty'
    WHEN i.available_quantity < i.minimum_stock THEN 'low'
    WHEN i.available_quantity = i.minimum_stock THEN 'attention'
    ELSE 'healthy'
  END AS stock_health
FROM inventory i;

GRANT SELECT ON public.wire_tray_inventory_catalog TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.wire_tray_list_access_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_set_module_access(uuid, public.wire_tray_module_role, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_save_order_draft(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_trigger_replenishment_internal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_trigger_replenishment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_confirm_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_order_reservations_internal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wire_tray_cancel_order(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_stock_movement(
  uuid, uuid, public.wire_tray_movement_type, numeric, text, uuid, uuid, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wire_tray_list_access_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_set_module_access(uuid, public.wire_tray_module_role, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_save_order_draft(uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_trigger_replenishment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_confirm_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_cancel_order(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_stock_movement(
  uuid, uuid, public.wire_tray_movement_type, numeric, text, uuid, uuid, text
) TO authenticated, service_role;

-- Source: 20260721133300_wire_tray_fulfillment.sql
-- Leitos Aramados: production, separation, billing, dispatch and notification commands.

CREATE OR REPLACE FUNCTION public.wire_tray_create_production_order(
  _product_id uuid,
  _destination_location_id uuid,
  _planned_quantity numeric,
  _order_item_id uuid,
  _responsible_user_id uuid,
  _priority public.service_priority,
  _planned_completion_date date,
  _technical_instructions text,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_product public.wire_tray_products%ROWTYPE;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item_preview public.wire_tray_order_items%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_open numeric(18,3) := 0;
  v_outstanding numeric(18,3);
  v_order_id uuid;
  v_origin public.wire_tray_production_origin;
  v_production public.wire_tray_production_orders%ROWTYPE;
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'producao']::public.wire_tray_module_role[]
  );
  IF _planned_quantity IS NULL OR _planned_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade planejada deve ser maior que zero.' USING ERRCODE = '23514';
  END IF;
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid()
    AND r.operation = 'create_production_order'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'create_production_order', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid()
      AND r.operation = 'create_production_order'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta ordem de produção já está em criação.' USING ERRCODE = '40001';
  END IF;

  IF _order_item_id IS NOT NULL THEN
    SELECT * INTO v_item_preview
    FROM public.wire_tray_order_items i
    WHERE i.id = _order_item_id;
    IF v_item_preview.id IS NULL OR v_item_preview.product_id <> _product_id THEN
      RAISE EXCEPTION 'Item de pedido incompatível com o produto.' USING ERRCODE = '23503';
    END IF;
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = v_item_preview.order_id
    FOR UPDATE;
    IF v_order.id IS NULL OR v_order.status IN (
      'draft', 'cancelled', 'billed', 'ready_for_dispatch', 'dispatched', 'completed'
    ) THEN
      RAISE EXCEPTION 'O pedido não aceita uma nova ordem de produção.' USING ERRCODE = '55000';
    END IF;
    SELECT * INTO v_item
    FROM public.wire_tray_order_items i
    WHERE i.id = _order_item_id AND i.product_id = _product_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_product
  FROM public.wire_tray_products p
  WHERE p.id = _product_id AND p.active
  FOR UPDATE;
  IF v_product.id IS NULL THEN RAISE EXCEPTION 'Produto não encontrado ou inativo.' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.wire_tray_stock_locations l
    WHERE l.id = _destination_location_id AND l.active
  ) THEN
    RAISE EXCEPTION 'Local de destino não encontrado ou inativo.' USING ERRCODE = 'P0002';
  END IF;

  IF _order_item_id IS NULL THEN
    v_origin := 'manual_stock';
  ELSE
    SELECT coalesce(sum(po.planned_quantity - po.produced_quantity), 0)
    INTO v_open
    FROM public.wire_tray_production_orders po
    WHERE po.order_item_id = v_item.id
      AND po.status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');
    v_outstanding := greatest(0, v_item.requested_quantity - v_item.reserved_quantity - v_open);
    IF _planned_quantity > v_outstanding THEN
      RAISE EXCEPTION 'A quantidade excede a falta atual do item (%).', v_outstanding
        USING ERRCODE = '23514';
    END IF;
    v_order_id := v_item.order_id;
    v_origin := 'customer_order';
  END IF;

  IF _responsible_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.user_module_access uma
    WHERE uma.user_id = _responsible_user_id
      AND uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'producao')
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _responsible_user_id AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'O responsável selecionado não possui acesso à produção.' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.wire_tray_production_orders (
    origin_type, order_id, order_item_id, product_id, destination_location_id,
    planned_quantity, responsible_user_id, priority, planned_completion_date,
    technical_instructions, generation_reason, created_by
  )
  VALUES (
    v_origin, v_order_id, _order_item_id, v_product.id, _destination_location_id,
    _planned_quantity, _responsible_user_id, coalesce(_priority, 'media'),
    _planned_completion_date, nullif(btrim(_technical_instructions), ''),
    CASE WHEN v_origin = 'manual_stock' THEN 'Produção manual para estoque.'
         ELSE 'Produção manual vinculada à falta de pedido.' END,
    auth.uid()
  )
  RETURNING * INTO v_production;

  IF v_order_id IS NOT NULL THEN
    UPDATE public.wire_tray_orders SET
      status = 'production_pending', version = version + 1
    WHERE id = v_order_id
      AND status NOT IN ('cancelled', 'completed', 'dispatched');
  END IF;

  PERFORM public.wire_tray_write_audit(
    'production_order_created', 'production_order', v_production.id, NULL,
    jsonb_build_object(
      'number', v_production.number,
      'origin_type', v_production.origin_type,
      'product_id', v_production.product_id,
      'planned_quantity', v_production.planned_quantity
    ), '{}'::jsonb, _idempotency_key
  );
  v_result := jsonb_build_object(
    'id', v_production.id,
    'number', v_production.number,
    'status', v_production.status
  );
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid()
    AND operation = 'create_production_order'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_production_entry(
  _production_order_id uuid,
  _entry_type public.wire_tray_production_entry_type,
  _quantity numeric,
  _notes text,
  _evidence_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.wire_tray_module_role;
  v_preview public.wire_tray_production_orders%ROWTYPE;
  v_production public.wire_tray_production_orders%ROWTYPE;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_entry_id uuid;
  v_reservation_id uuid;
  v_quantity numeric(18,3) := coalesce(_quantity, 0);
  v_result jsonb;
BEGIN
  v_role := public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'producao']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT pe.id INTO v_entry_id
  FROM public.wire_tray_production_entries pe
  WHERE pe.created_by = auth.uid() AND pe.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    SELECT * INTO v_production
    FROM public.wire_tray_production_orders po WHERE po.id = _production_order_id;
    RETURN jsonb_build_object(
      'entry_id', v_entry_id, 'id', v_production.id,
      'status', v_production.status, 'produced_quantity', v_production.produced_quantity
    );
  END IF;

  SELECT * INTO v_preview
  FROM public.wire_tray_production_orders po
  WHERE po.id = _production_order_id;
  IF v_preview.id IS NULL THEN RAISE EXCEPTION 'Ordem de produção não encontrada.' USING ERRCODE = 'P0002'; END IF;

  -- Customer production always locks the customer order before the production row.
  IF v_preview.order_id IS NOT NULL THEN
    SELECT * INTO v_order
    FROM public.wire_tray_orders o
    WHERE o.id = v_preview.order_id
    FOR UPDATE;
    IF v_order.status = 'cancelled' THEN
      RAISE EXCEPTION 'O pedido vinculado foi cancelado.' USING ERRCODE = '55000';
    END IF;
    SELECT * INTO v_item
    FROM public.wire_tray_order_items i
    WHERE i.id = v_preview.order_item_id
    FOR UPDATE;
  END IF;

  SELECT * INTO v_production
  FROM public.wire_tray_production_orders po
  WHERE po.id = _production_order_id
  FOR UPDATE;

  -- Recheck after the aggregate lock so concurrent retries converge on the
  -- first committed result instead of attempting the transition twice.
  SELECT pe.id INTO v_entry_id
  FROM public.wire_tray_production_entries pe
  WHERE pe.created_by = auth.uid() AND pe.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'entry_id', v_entry_id, 'id', v_production.id,
      'status', v_production.status, 'produced_quantity', v_production.produced_quantity
    );
  END IF;

  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['production_order']::text[],
    v_production.id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );

  CASE _entry_type
    WHEN 'start' THEN
      IF v_production.status NOT IN ('planned', 'released') THEN
        RAISE EXCEPTION 'Esta produção não pode ser iniciada no estado atual.' USING ERRCODE = '55000';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'in_progress', started_at = coalesce(started_at, now()),
        responsible_user_id = coalesce(responsible_user_id, auth.uid()), version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'progress' THEN
      IF v_production.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Inicie ou retome a produção antes de registrar avanço.' USING ERRCODE = '55000';
      END IF;
      IF v_quantity <= 0 OR v_production.produced_quantity + v_quantity > v_production.planned_quantity THEN
        RAISE EXCEPTION 'Quantidade inválida. Restam % para produzir.',
          v_production.planned_quantity - v_production.produced_quantity USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        produced_quantity = produced_quantity + v_quantity, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'pause' THEN
      IF v_production.status <> 'in_progress' OR _notes IS NULL OR btrim(_notes) = '' THEN
        RAISE EXCEPTION 'Informe o motivo para pausar uma produção em andamento.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'paused', pause_reason = btrim(_notes), version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'resume' THEN
      IF v_production.status <> 'paused' THEN
        RAISE EXCEPTION 'Somente uma produção pausada pode ser retomada.' USING ERRCODE = '55000';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'in_progress', pause_reason = NULL, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'scrap' THEN
      IF v_production.status <> 'in_progress' OR v_quantity <= 0 THEN
        RAISE EXCEPTION 'Informe uma perda positiva durante a produção.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        scrap_quantity = scrap_quantity + v_quantity, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'cancel' THEN
      IF v_role NOT IN ('admin', 'gestor') THEN
        RAISE EXCEPTION 'O cancelamento exige autorização gerencial.' USING ERRCODE = '42501';
      END IF;
      IF v_production.status NOT IN ('planned', 'released', 'paused') THEN
        RAISE EXCEPTION 'A produção não pode ser cancelada no estado atual.' USING ERRCODE = '55000';
      END IF;
      IF _notes IS NULL OR btrim(_notes) = '' THEN
        RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_production_orders SET
        status = 'cancelled', cancelled_at = now(), pause_reason = btrim(_notes),
        version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;
    WHEN 'complete' THEN
      IF v_production.status NOT IN ('in_progress', 'awaiting_check') THEN
        RAISE EXCEPTION 'A produção precisa estar em andamento para ser concluída.' USING ERRCODE = '55000';
      END IF;
      IF v_production.produced_quantity <> v_production.planned_quantity THEN
        RAISE EXCEPTION 'Produza a quantidade planejada antes de concluir. Restam %.',
          v_production.planned_quantity - v_production.produced_quantity USING ERRCODE = '23514';
      END IF;

      INSERT INTO public.wire_tray_stock_balances (product_id, location_id)
      VALUES (v_production.product_id, v_production.destination_location_id)
      ON CONFLICT (product_id, location_id) DO NOTHING;
      SELECT * INTO v_balance
      FROM public.wire_tray_stock_balances b
      WHERE b.product_id = v_production.product_id
        AND b.location_id = v_production.destination_location_id
      FOR UPDATE;

      IF v_production.origin_type = 'customer_order' THEN
        INSERT INTO public.wire_tray_reservations (
          order_id, order_item_id, product_id, location_id, quantity, created_by
        )
        VALUES (
          v_production.order_id, v_production.order_item_id, v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity, auth.uid()
        )
        RETURNING id INTO v_reservation_id;
        UPDATE public.wire_tray_stock_balances SET
          physical_quantity = physical_quantity + v_production.planned_quantity,
          reserved_quantity = reserved_quantity + v_production.planned_quantity,
          version = version + 1
        WHERE id = v_balance.id;
        UPDATE public.wire_tray_order_items SET
          produced_quantity = produced_quantity + v_production.planned_quantity,
          reserved_quantity = reserved_quantity + v_production.planned_quantity
        WHERE id = v_production.order_item_id;
        PERFORM public.wire_tray_insert_movement(
          gen_random_uuid(), 'production_entry', v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity,
          v_production.planned_quantity, v_production.planned_quantity,
          v_balance.physical_quantity, v_balance.physical_quantity + v_production.planned_quantity,
          v_balance.reserved_quantity, v_balance.reserved_quantity + v_production.planned_quantity,
          'Produção concluída e comprometida com o pedido.',
          v_production.order_id, v_production.order_item_id, v_reservation_id,
          v_production.id, NULL, _evidence_document_id, _idempotency_key || ':movement'
        );
      ELSE
        UPDATE public.wire_tray_stock_balances SET
          physical_quantity = physical_quantity + v_production.planned_quantity,
          version = version + 1
        WHERE id = v_balance.id;
        PERFORM public.wire_tray_insert_movement(
          gen_random_uuid(), 'production_entry', v_production.product_id,
          v_production.destination_location_id, v_production.planned_quantity,
          v_production.planned_quantity, 0,
          v_balance.physical_quantity, v_balance.physical_quantity + v_production.planned_quantity,
          v_balance.reserved_quantity, v_balance.reserved_quantity,
          'Produção concluída para estoque.', NULL, NULL, NULL,
          v_production.id, NULL, _evidence_document_id, _idempotency_key || ':movement'
        );
      END IF;

      UPDATE public.wire_tray_production_orders SET
        status = 'completed', completed_at = now(), pause_reason = NULL, version = version + 1
      WHERE id = v_production.id RETURNING * INTO v_production;

      IF v_production.order_id IS NOT NULL THEN
        UPDATE public.wire_tray_orders o SET
          status = CASE
            WHEN NOT EXISTS (
              SELECT 1 FROM public.wire_tray_order_items i
              WHERE i.order_id = o.id AND i.reserved_quantity < i.requested_quantity
            ) THEN 'stock_reserved'::public.wire_tray_order_status
            ELSE 'in_production'::public.wire_tray_order_status
          END,
          version = version + 1
        WHERE o.id = v_production.order_id
          AND o.status NOT IN ('cancelled', 'completed', 'dispatched');
      END IF;
    ELSE
      RAISE EXCEPTION 'Evento de produção inválido.' USING ERRCODE = '22023';
  END CASE;

  IF _entry_type IN ('start', 'resume') AND v_production.order_id IS NOT NULL THEN
    UPDATE public.wire_tray_orders o SET
      status = 'in_production',
      version = version + 1
    WHERE o.id = v_production.order_id
      AND o.status NOT IN (
        'cancelled', 'completed', 'dispatched', 'billed', 'ready_for_dispatch'
      );
  END IF;

  INSERT INTO public.wire_tray_production_entries (
    production_order_id, entry_type, quantity, notes, evidence_document_id,
    idempotency_key, created_by
  )
  VALUES (
    v_production.id, _entry_type, greatest(v_quantity, 0),
    nullif(btrim(_notes), ''), _evidence_document_id, _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_entry_id;

  PERFORM public.wire_tray_write_audit(
    'production_' || _entry_type::text, 'production_order', v_production.id, NULL,
    jsonb_build_object(
      'status', v_production.status,
      'produced_quantity', v_production.produced_quantity,
      'planned_quantity', v_production.planned_quantity,
      'scrap_quantity', v_production.scrap_quantity
    ), '{}'::jsonb, _idempotency_key
  );
  v_result := jsonb_build_object(
    'entry_id', v_entry_id,
    'id', v_production.id,
    'status', v_production.status,
    'produced_quantity', v_production.produced_quantity,
    'planned_quantity', v_production.planned_quantity
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_reservation(
  _reservation_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_res public.wire_tray_reservations%ROWTYPE;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_remaining numeric(18,3);
  v_production_id uuid;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _reason IS NULL OR btrim(_reason) = '' THEN
    RAISE EXCEPTION 'Informe a justificativa da liberação.' USING ERRCODE = '23514';
  END IF;

  SELECT o.* INTO v_order
  FROM public.wire_tray_orders o
  JOIN public.wire_tray_reservations r ON r.order_id = o.id
  WHERE r.id = _reservation_id
  FOR UPDATE OF o;
  SELECT * INTO v_res
  FROM public.wire_tray_reservations r
  WHERE r.id = _reservation_id
  FOR UPDATE;
  IF v_res.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada.' USING ERRCODE = 'P0002'; END IF;
  v_remaining := v_res.remaining_quantity;
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('id', v_res.id, 'status', v_res.status, 'released_quantity', 0);
  END IF;
  SELECT * INTO v_item FROM public.wire_tray_order_items i WHERE i.id = v_res.order_item_id FOR UPDATE;
  SELECT * INTO v_balance
  FROM public.wire_tray_stock_balances b
  WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
  FOR UPDATE;

  UPDATE public.wire_tray_stock_balances SET
    reserved_quantity = reserved_quantity - v_remaining, version = version + 1
  WHERE id = v_balance.id;
  UPDATE public.wire_tray_reservations SET
    released_quantity = released_quantity + v_remaining,
    status = 'released', released_at = now()
  WHERE id = v_res.id;
  UPDATE public.wire_tray_order_items SET
    reserved_quantity = reserved_quantity - v_remaining,
    production_required_quantity = production_required_quantity + v_remaining
  WHERE id = v_item.id;

  SELECT po.id INTO v_production_id
  FROM public.wire_tray_production_orders po
  WHERE po.order_item_id = v_item.id
    AND po.status IN ('planned', 'released')
  ORDER BY po.created_at LIMIT 1 FOR UPDATE;
  IF v_production_id IS NULL THEN
    INSERT INTO public.wire_tray_production_orders (
      origin_type, order_id, order_item_id, product_id, destination_location_id,
      planned_quantity, priority, planned_completion_date, generation_reason, created_by
    )
    VALUES (
      'customer_order', v_order.id, v_item.id, v_item.product_id, v_res.location_id,
      v_remaining, v_order.priority, v_order.expected_delivery_date,
      'Reposição de reserva liberada com autorização.', auth.uid()
    )
    RETURNING id INTO v_production_id;
  ELSE
    UPDATE public.wire_tray_production_orders SET
      planned_quantity = planned_quantity + v_remaining,
      generation_reason = concat(generation_reason, ' Reserva liberada: ', btrim(_reason)),
      version = version + 1
    WHERE id = v_production_id;
  END IF;
  UPDATE public.wire_tray_orders SET status = 'production_pending', version = version + 1
  WHERE id = v_order.id;

  PERFORM public.wire_tray_insert_movement(
    gen_random_uuid(), 'reservation_release', v_res.product_id, v_res.location_id,
    v_remaining, 0, -v_remaining,
    v_balance.physical_quantity, v_balance.physical_quantity,
    v_balance.reserved_quantity, v_balance.reserved_quantity - v_remaining,
    btrim(_reason), v_order.id, v_item.id, v_res.id, v_production_id
  );
  PERFORM public.wire_tray_write_audit(
    'reservation_released', 'reservation', v_res.id, NULL,
    jsonb_build_object('released_quantity', v_remaining, 'production_order_id', v_production_id),
    jsonb_build_object('reason', btrim(_reason))
  );
  RETURN jsonb_build_object(
    'id', v_res.id, 'status', 'released', 'released_quantity', v_remaining,
    'production_order_id', v_production_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_record_separation(
  _order_id uuid,
  _order_item_id uuid,
  _entry_type public.wire_tray_separation_entry_type,
  _quantity numeric,
  _difference_quantity numeric,
  _reason text,
  _resolves_entry_id uuid,
  _evidence_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_target public.wire_tray_separation_entries%ROWTYPE;
  v_entry_id uuid;
  v_quantity numeric(18,3) := coalesce(_quantity, 0);
  v_difference numeric(18,3) := coalesce(_difference_quantity, 0);
  v_ready boolean;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque']::public.wire_tray_module_role[]
  );
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;
  SELECT se.id INTO v_entry_id
  FROM public.wire_tray_separation_entries se
  WHERE se.created_by = auth.uid() AND se.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('entry_id', v_entry_id, 'order_id', _order_id);
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  SELECT * INTO v_item
  FROM public.wire_tray_order_items i
  WHERE i.id = _order_item_id AND i.order_id = _order_id
  FOR UPDATE;
  IF v_order.id IS NULL OR v_item.id IS NULL THEN
    RAISE EXCEPTION 'Pedido ou item não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  SELECT se.id INTO v_entry_id
  FROM public.wire_tray_separation_entries se
  WHERE se.created_by = auth.uid() AND se.idempotency_key = _idempotency_key;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'entry_id', v_entry_id,
      'order_id', v_order.id,
      'status', v_order.status,
      'ready_for_billing', v_order.status = 'ready_for_billing'
    );
  END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _evidence_document_id,
    ARRAY['order']::text[],
    v_order.id,
    ARRAY['photo', 'other']::public.wire_tray_document_type[]
  );
  IF v_order.status IN ('draft', 'cancelled', 'billed', 'ready_for_dispatch', 'dispatched', 'completed') THEN
    RAISE EXCEPTION 'O pedido não está disponível para separação ou conferência.' USING ERRCODE = '55000';
  END IF;

  IF _entry_type = 'separation' THEN
    IF v_item.reserved_quantity < v_item.requested_quantity THEN
      RAISE EXCEPTION 'O item ainda não está integralmente reservado.' USING ERRCODE = '55000';
    END IF;
    IF v_quantity <= 0 OR v_item.separated_quantity + v_quantity > v_item.reserved_quantity THEN
      RAISE EXCEPTION 'Quantidade de separação acima do saldo reservado.' USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      separated_quantity = separated_quantity + v_quantity
    WHERE id = v_item.id RETURNING * INTO v_item;
    UPDATE public.wire_tray_orders SET
      status = CASE
        WHEN NOT EXISTS (
          SELECT 1 FROM public.wire_tray_order_items i
          WHERE i.order_id = v_order.id AND i.separated_quantity < i.requested_quantity
        ) THEN 'awaiting_check'::public.wire_tray_order_status
        ELSE 'separating'::public.wire_tray_order_status
      END,
      version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;
  ELSIF _entry_type IN ('checking', 'discrepancy') THEN
    IF v_quantity <= 0 OR v_item.checked_quantity + v_quantity > v_item.separated_quantity THEN
      RAISE EXCEPTION 'A conferência não pode exceder a quantidade separada.' USING ERRCODE = '23514';
    END IF;
    IF v_difference > 0 AND (_reason IS NULL OR btrim(_reason) = '') THEN
      RAISE EXCEPTION 'Descreva a divergência encontrada.' USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      checked_quantity = checked_quantity + v_quantity
    WHERE id = v_item.id RETURNING * INTO v_item;
    UPDATE public.wire_tray_orders SET status = 'awaiting_check', version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;
  ELSIF _entry_type = 'resolution' THEN
    IF _resolves_entry_id IS NULL OR _reason IS NULL OR btrim(_reason) = '' THEN
      RAISE EXCEPTION 'Informe a divergência e a justificativa da resolução.' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO v_target
    FROM public.wire_tray_separation_entries se
    WHERE se.id = _resolves_entry_id
      AND se.order_id = v_order.id
      AND se.difference_quantity > 0
    FOR SHARE;
    IF v_target.id IS NULL THEN
      RAISE EXCEPTION 'Divergência não encontrada.' USING ERRCODE = 'P0002';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.wire_tray_separation_entries se
      WHERE se.resolves_entry_id = v_target.id AND se.entry_type = 'resolution'
    ) THEN
      RAISE EXCEPTION 'Esta divergência já foi resolvida.' USING ERRCODE = '55000';
    END IF;
    v_quantity := 0;
    v_difference := 0;
  ELSE
    RAISE EXCEPTION 'Tipo de registro inválido.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.wire_tray_separation_entries (
    order_id, order_item_id, entry_type, quantity, difference_quantity,
    reason, resolves_entry_id, evidence_document_id, idempotency_key, created_by
  )
  VALUES (
    v_order.id, v_item.id, _entry_type, v_quantity, v_difference,
    nullif(btrim(_reason), ''), _resolves_entry_id, _evidence_document_id,
    _idempotency_key, auth.uid()
  )
  RETURNING id INTO v_entry_id;

  IF _entry_type = 'discrepancy' AND v_difference > 0 THEN
    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_separation_discrepancy',
      'Divergência na conferência',
      format(
        'O pedido #%s possui divergência de %s unidade(s) em %s.',
        v_order.number,
        v_difference,
        v_item.product_name_snapshot
      ),
      '/leitos/separacao',
      jsonb_build_object('entry_id', v_entry_id, 'order_item_id', v_item.id)
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND uma.module_role IN ('admin', 'gestor', 'estoque')
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL
    DO UPDATE SET
      message = EXCLUDED.message,
      metadata = EXCLUDED.metadata,
      read_at = NULL,
      dismissed_at = NULL,
      created_at = now();
  END IF;

  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.wire_tray_order_items i
      WHERE i.order_id = v_order.id
        AND (i.reserved_quantity < i.requested_quantity
          OR i.separated_quantity < i.requested_quantity
          OR i.checked_quantity < i.requested_quantity)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.wire_tray_separation_entries d
      WHERE d.order_id = v_order.id
        AND d.difference_quantity > 0
        AND NOT EXISTS (
          SELECT 1 FROM public.wire_tray_separation_entries r
          WHERE r.resolves_entry_id = d.id AND r.entry_type = 'resolution'
        )
    )
  INTO v_ready;

  IF v_ready THEN
    UPDATE public.wire_tray_orders SET
      status = 'ready_for_billing', ready_for_billing_at = coalesce(ready_for_billing_at, now()),
      version = version + 1
    WHERE id = v_order.id RETURNING * INTO v_order;

    INSERT INTO public.wire_tray_notifications (
      user_id, order_id, notification_type, title, message, route, metadata
    )
    SELECT
      uma.user_id,
      v_order.id,
      'order_ready_for_billing',
      'Pedido #' || v_order.number || ' pronto para faturamento',
      v_order.client_name_snapshot || ' · conferência concluída',
      '/leitos/faturamento',
      jsonb_build_object(
        'order_number', v_order.number,
        'client_name', v_order.client_name_snapshot,
        'ready_at', v_order.ready_for_billing_at
      )
    FROM public.user_module_access uma
    WHERE uma.module_key = 'wire_trays'
      AND uma.active
      AND (
        uma.module_role IN ('admin', 'faturamento')
        OR (uma.module_role = 'gestor' AND uma.financial_access)
      )
    ON CONFLICT (user_id, order_id, notification_type) WHERE order_id IS NOT NULL DO NOTHING;
  END IF;

  PERFORM public.wire_tray_write_audit(
    'order_' || _entry_type::text, 'order', v_order.id, NULL,
    jsonb_build_object(
      'order_item_id', v_item.id,
      'quantity', v_quantity,
      'difference_quantity', v_difference,
      'status', v_order.status,
      'ready_for_billing', v_ready
    ), '{}'::jsonb, _idempotency_key
  );
  RETURN jsonb_build_object(
    'entry_id', v_entry_id, 'order_id', v_order.id,
    'status', v_order.status, 'ready_for_billing', v_ready
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_mark_billed(
  _order_id uuid,
  _invoice_reference text,
  _billing_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'faturamento']::public.wire_tray_module_role[]
  );
  IF NOT public.wire_tray_can_view_financials() THEN
    RAISE EXCEPTION 'A confirmação de faturamento exige acesso financeiro.' USING ERRCODE = '42501';
  END IF;
  IF _invoice_reference IS NULL OR btrim(_invoice_reference) = '' THEN
    RAISE EXCEPTION 'Informe a referência da nota ou do faturamento.' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'billed' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'ready_for_billing' THEN
    RAISE EXCEPTION 'O pedido ainda não está liberado pela conferência.' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.wire_tray_order_financials (
    order_id, total_cents, invoice_reference, billing_notes, billed_by, created_by
  )
  VALUES (
    v_order.id, 0, btrim(_invoice_reference), nullif(btrim(_billing_notes), ''),
    auth.uid(), auth.uid()
  )
  ON CONFLICT (order_id) DO UPDATE SET
    invoice_reference = EXCLUDED.invoice_reference,
    billing_notes = EXCLUDED.billing_notes,
    billed_by = EXCLUDED.billed_by;
  UPDATE public.wire_tray_orders SET
    status = 'billed', billed_at = now(), version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_billed', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status, 'billed_at', v_order.billed_at)
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_release_for_dispatch(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.wire_tray_orders%ROWTYPE;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'faturamento']::public.wire_tray_module_role[]
  );
  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF v_order.status = 'ready_for_dispatch' THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'billed' THEN
    RAISE EXCEPTION 'Confirme o faturamento antes de liberar a expedição.' USING ERRCODE = '55000';
  END IF;
  UPDATE public.wire_tray_orders SET status = 'ready_for_dispatch', version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_released_for_dispatch', 'order', v_order.id, NULL,
    jsonb_build_object('status', v_order.status)
  );
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_dispatch_order(
  _order_id uuid,
  _transport_note text,
  _receipt_document_id uuid,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_claimed integer;
  v_existing_response jsonb;
  v_order public.wire_tray_orders%ROWTYPE;
  v_item public.wire_tray_order_items%ROWTYPE;
  v_res public.wire_tray_reservations%ROWTYPE;
  v_balance public.wire_tray_stock_balances%ROWTYPE;
  v_needed numeric(18,3);
  v_take numeric(18,3);
  v_result jsonb;
BEGIN
  PERFORM public.wire_tray_assert_role(
    ARRAY['admin', 'gestor', 'estoque', 'faturamento']::public.wire_tray_module_role[]
  );
  IF _transport_note IS NULL OR btrim(_transport_note) = '' THEN
    RAISE EXCEPTION 'Informe o transporte, retirada ou observação de expedição.' USING ERRCODE = '23514';
  END IF;
  IF _idempotency_key IS NULL OR btrim(_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Chave de idempotência obrigatória.' USING ERRCODE = '22023';
  END IF;

  SELECT response INTO v_existing_response
  FROM public.wire_tray_operation_requests r
  WHERE r.user_id = auth.uid() AND r.operation = 'dispatch_order'
    AND r.idempotency_key = _idempotency_key;
  IF FOUND AND v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
  INSERT INTO public.wire_tray_operation_requests (user_id, operation, idempotency_key)
  VALUES (auth.uid(), 'dispatch_order', _idempotency_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    SELECT response INTO v_existing_response
    FROM public.wire_tray_operation_requests r
    WHERE r.user_id = auth.uid() AND r.operation = 'dispatch_order'
      AND r.idempotency_key = _idempotency_key;
    IF v_existing_response IS NOT NULL THEN RETURN v_existing_response; END IF;
    RAISE EXCEPTION 'Esta expedição já está em andamento.' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_order FROM public.wire_tray_orders o WHERE o.id = _order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.wire_tray_assert_evidence_document(
    _receipt_document_id,
    ARRAY['order']::text[],
    v_order.id,
    ARRAY['dispatch_receipt', 'photo', 'other']::public.wire_tray_document_type[]
  );
  IF v_order.status IN ('dispatched', 'completed') THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status);
  END IF;
  IF v_order.status <> 'ready_for_dispatch' THEN
    RAISE EXCEPTION 'O pedido não está liberado para expedição.' USING ERRCODE = '55000';
  END IF;

  -- Lock order items and products before balances. This is the same global
  -- order used by confirmation and manual stock commands, preventing cycles.
  PERFORM i.id
  FROM public.wire_tray_order_items i
  WHERE i.order_id = v_order.id
  ORDER BY i.product_id, i.id
  FOR UPDATE;
  PERFORM p.id
  FROM public.wire_tray_products p
  JOIN public.wire_tray_order_items i ON i.product_id = p.id
  WHERE i.order_id = v_order.id
  ORDER BY p.id
  FOR UPDATE OF p;

  FOR v_item IN
    SELECT * FROM public.wire_tray_order_items i
    WHERE i.order_id = v_order.id
    ORDER BY i.product_id, i.id
    FOR UPDATE
  LOOP
    IF v_item.checked_quantity < v_item.requested_quantity THEN
      RAISE EXCEPTION 'Todos os itens precisam estar integralmente conferidos.' USING ERRCODE = '55000';
    END IF;
    v_needed := v_item.requested_quantity - v_item.dispatched_quantity;
    FOR v_res IN
      SELECT * FROM public.wire_tray_reservations r
      WHERE r.order_item_id = v_item.id
        AND r.remaining_quantity > 0
        AND r.status IN ('active', 'partially_consumed')
      ORDER BY r.product_id, r.location_id, r.created_at, r.id
      FOR UPDATE
    LOOP
      EXIT WHEN v_needed <= 0;
      v_take := least(v_needed, v_res.remaining_quantity);
      SELECT * INTO v_balance
      FROM public.wire_tray_stock_balances b
      WHERE b.product_id = v_res.product_id AND b.location_id = v_res.location_id
      FOR UPDATE;
      IF v_balance.physical_quantity < v_take OR v_balance.reserved_quantity < v_take THEN
        RAISE EXCEPTION 'Saldo reservado inconsistente. A expedição foi bloqueada.' USING ERRCODE = '23514';
      END IF;
      UPDATE public.wire_tray_stock_balances SET
        physical_quantity = physical_quantity - v_take,
        reserved_quantity = reserved_quantity - v_take,
        version = version + 1
      WHERE id = v_balance.id;
      UPDATE public.wire_tray_reservations SET
        consumed_quantity = consumed_quantity + v_take,
        status = CASE WHEN remaining_quantity = v_take
                      THEN 'consumed'::public.wire_tray_reservation_status
                      ELSE 'partially_consumed'::public.wire_tray_reservation_status END,
        consumed_at = CASE WHEN remaining_quantity = v_take THEN now() ELSE consumed_at END
      WHERE id = v_res.id;
      PERFORM public.wire_tray_insert_movement(
        gen_random_uuid(), 'dispatch', v_res.product_id, v_res.location_id, v_take,
        -v_take, -v_take,
        v_balance.physical_quantity, v_balance.physical_quantity - v_take,
        v_balance.reserved_quantity, v_balance.reserved_quantity - v_take,
        btrim(_transport_note), v_order.id, v_item.id, v_res.id, NULL,
        NULL, _receipt_document_id,
        _idempotency_key || ':' || v_item.id::text || ':' || v_res.id::text
      );
      v_needed := v_needed - v_take;
    END LOOP;
    IF v_needed > 0 THEN
      RAISE EXCEPTION 'Reserva insuficiente para expedir o item %.', v_item.product_name_snapshot
        USING ERRCODE = '23514';
    END IF;
    UPDATE public.wire_tray_order_items SET
      dispatched_quantity = requested_quantity
    WHERE id = v_item.id;
    PERFORM public.wire_tray_trigger_replenishment_internal(
      v_item.product_id, 'Reposição automática após expedição.'
    );
  END LOOP;

  UPDATE public.wire_tray_orders SET
    status = 'completed', dispatched_at = now(), completed_at = now(), version = version + 1
  WHERE id = v_order.id RETURNING * INTO v_order;
  PERFORM public.wire_tray_write_audit(
    'order_dispatched', 'order', v_order.id, NULL,
    jsonb_build_object(
      'status', v_order.status,
      'dispatched_at', v_order.dispatched_at,
      'completed_at', v_order.completed_at
    ), jsonb_build_object('transport_note', btrim(_transport_note)), _idempotency_key
  );
  v_result := jsonb_build_object('id', v_order.id, 'status', v_order.status, 'dispatched_at', v_order.dispatched_at);
  UPDATE public.wire_tray_operation_requests SET response = v_result, completed_at = now()
  WHERE user_id = auth.uid() AND operation = 'dispatch_order'
    AND idempotency_key = _idempotency_key;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.wire_tray_mark_notification_read(
  _notification_id uuid,
  _dismiss boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501'; END IF;
  UPDATE public.wire_tray_notifications SET
    read_at = CASE WHEN NOT _dismiss THEN coalesce(read_at, now()) ELSE read_at END,
    dismissed_at = CASE WHEN _dismiss THEN coalesce(dismissed_at, now()) ELSE dismissed_at END
  WHERE id = _notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

REVOKE UPDATE ON public.wire_tray_notifications FROM authenticated;

REVOKE ALL ON FUNCTION public.wire_tray_create_production_order(
  uuid, uuid, numeric, uuid, uuid, public.service_priority, date, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_production_entry(
  uuid, public.wire_tray_production_entry_type, numeric, text, uuid, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_reservation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_record_separation(
  uuid, uuid, public.wire_tray_separation_entry_type, numeric, numeric, text, uuid, uuid, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_mark_billed(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_release_for_dispatch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_dispatch_order(uuid, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wire_tray_mark_notification_read(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.wire_tray_create_production_order(
  uuid, uuid, numeric, uuid, uuid, public.service_priority, date, text, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_production_entry(
  uuid, public.wire_tray_production_entry_type, numeric, text, uuid, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_release_reservation(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_record_separation(
  uuid, uuid, public.wire_tray_separation_entry_type, numeric, numeric, text, uuid, uuid, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_mark_billed(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_release_for_dispatch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_dispatch_order(uuid, text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wire_tray_mark_notification_read(uuid, boolean) TO authenticated, service_role;

-- Views must execute with the caller permissions so base-table RLS is never bypassed.
ALTER VIEW public.wire_tray_projected_inventory SET (security_invoker = true);
ALTER VIEW public.wire_tray_inventory_catalog SET (security_invoker = true);

DO $wire_schema_contract$
DECLARE
  missing_objects text[];
  missing_columns text[];
  rls_disabled text[];
BEGIN
  SELECT array_agg(expected.kind || ':' || expected.name ORDER BY expected.kind, expected.name)
  INTO missing_objects
  FROM (VALUES
    ('table', 'user_module_access'),
    ('table', 'wire_tray_stock_locations'),
    ('table', 'wire_tray_products'),
    ('table', 'wire_tray_stock_balances'),
    ('table', 'wire_tray_orders'),
    ('table', 'wire_tray_order_items'),
    ('table', 'wire_tray_order_financials'),
    ('table', 'wire_tray_order_item_financials'),
    ('table', 'wire_tray_reservations'),
    ('table', 'wire_tray_production_orders'),
    ('table', 'wire_tray_documents'),
    ('table', 'wire_tray_production_entries'),
    ('table', 'wire_tray_separation_entries'),
    ('table', 'wire_tray_stock_movements'),
    ('table', 'wire_tray_notifications'),
    ('table', 'wire_tray_audit_events'),
    ('table', 'wire_tray_operation_requests'),
    ('view', 'wire_tray_projected_inventory'),
    ('view', 'wire_tray_inventory_catalog'),
    ('function', 'wire_tray_is_global_admin'),
    ('function', 'wire_tray_has_access'),
    ('function', 'wire_tray_current_role'),
    ('function', 'wire_tray_current_role_in'),
    ('function', 'wire_tray_can_view_financials'),
    ('function', 'wire_tray_can_view_document_visibility'),
    ('function', 'wire_tray_can_access_document_path'),
    ('function', 'wire_tray_document_entity_exists'),
    ('function', 'wire_tray_protect_document_identity'),
    ('function', 'wire_tray_audit_registry_change'),
    ('function', 'wire_tray_reject_ledger_mutation'),
    ('function', 'wire_tray_assert_role'),
    ('function', 'wire_tray_write_audit'),
    ('function', 'wire_tray_assert_evidence_document'),
    ('function', 'wire_tray_insert_movement'),
    ('function', 'wire_tray_list_access_users'),
    ('function', 'wire_tray_set_module_access'),
    ('function', 'wire_tray_save_order_draft'),
    ('function', 'wire_tray_trigger_replenishment_internal'),
    ('function', 'wire_tray_trigger_replenishment'),
    ('function', 'wire_tray_confirm_order'),
    ('function', 'wire_tray_release_order_reservations_internal'),
    ('function', 'wire_tray_cancel_order'),
    ('function', 'wire_tray_record_stock_movement'),
    ('function', 'wire_tray_create_production_order'),
    ('function', 'wire_tray_record_production_entry'),
    ('function', 'wire_tray_release_reservation'),
    ('function', 'wire_tray_record_separation'),
    ('function', 'wire_tray_mark_billed'),
    ('function', 'wire_tray_release_for_dispatch'),
    ('function', 'wire_tray_dispatch_order'),
    ('function', 'wire_tray_mark_notification_read')
  ) AS expected(kind, name)
  WHERE CASE expected.kind
    WHEN 'table' THEN to_regclass('public.' || expected.name) IS NULL
    WHEN 'view' THEN to_regclass('public.' || expected.name) IS NULL
    WHEN 'function' THEN NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = expected.name
    )
    ELSE true
  END;

  IF missing_objects IS NOT NULL THEN
    RAISE EXCEPTION 'Objetos ausentes após reconciliação: %', array_to_string(missing_objects, ', ')
      USING ERRCODE = '55000';
  END IF;

  SELECT array_agg(expected.table_name || '.' || expected.column_name ORDER BY expected.table_name, expected.column_name)
  INTO missing_columns
  FROM (VALUES
    ('user_module_access', 'id'),
    ('user_module_access', 'user_id'),
    ('user_module_access', 'module_key'),
    ('user_module_access', 'module_role'),
    ('user_module_access', 'active'),
    ('user_module_access', 'financial_access'),
    ('user_module_access', 'created_by'),
    ('user_module_access', 'created_at'),
    ('user_module_access', 'updated_at'),
    ('wire_tray_stock_locations', 'id'),
    ('wire_tray_stock_locations', 'code'),
    ('wire_tray_stock_locations', 'name'),
    ('wire_tray_stock_locations', 'description'),
    ('wire_tray_stock_locations', 'active'),
    ('wire_tray_stock_locations', 'created_by'),
    ('wire_tray_stock_locations', 'created_at'),
    ('wire_tray_stock_locations', 'updated_at'),
    ('wire_tray_products', 'id'),
    ('wire_tray_products', 'sku'),
    ('wire_tray_products', 'name'),
    ('wire_tray_products', 'category'),
    ('wire_tray_products', 'unit'),
    ('wire_tray_products', 'active'),
    ('wire_tray_products', 'short_description'),
    ('wire_tray_products', 'width_mm'),
    ('wire_tray_products', 'height_mm'),
    ('wire_tray_products', 'length_mm'),
    ('wire_tray_products', 'material'),
    ('wire_tray_products', 'finish'),
    ('wire_tray_products', 'technical_notes'),
    ('wire_tray_products', 'default_location_id'),
    ('wire_tray_products', 'minimum_stock'),
    ('wire_tray_products', 'target_stock'),
    ('wire_tray_products', 'minimum_production_batch'),
    ('wire_tray_products', 'automatic_replenishment'),
    ('wire_tray_products', 'replenishment_notes'),
    ('wire_tray_products', 'created_by'),
    ('wire_tray_products', 'created_at'),
    ('wire_tray_products', 'updated_at'),
    ('wire_tray_stock_balances', 'id'),
    ('wire_tray_stock_balances', 'product_id'),
    ('wire_tray_stock_balances', 'location_id'),
    ('wire_tray_stock_balances', 'physical_quantity'),
    ('wire_tray_stock_balances', 'reserved_quantity'),
    ('wire_tray_stock_balances', 'available_quantity'),
    ('wire_tray_stock_balances', 'version'),
    ('wire_tray_stock_balances', 'updated_at'),
    ('wire_tray_orders', 'id'),
    ('wire_tray_orders', 'number'),
    ('wire_tray_orders', 'client_id'),
    ('wire_tray_orders', 'client_unit_id'),
    ('wire_tray_orders', 'client_name_snapshot'),
    ('wire_tray_orders', 'client_unit_name_snapshot'),
    ('wire_tray_orders', 'customer_order_reference'),
    ('wire_tray_orders', 'quotation_reference'),
    ('wire_tray_orders', 'commercial_responsible_id'),
    ('wire_tray_orders', 'priority'),
    ('wire_tray_orders', 'expected_delivery_date'),
    ('wire_tray_orders', 'operational_notes'),
    ('wire_tray_orders', 'status'),
    ('wire_tray_orders', 'confirmed_at'),
    ('wire_tray_orders', 'ready_for_billing_at'),
    ('wire_tray_orders', 'billed_at'),
    ('wire_tray_orders', 'dispatched_at'),
    ('wire_tray_orders', 'completed_at'),
    ('wire_tray_orders', 'cancelled_at'),
    ('wire_tray_orders', 'cancellation_reason'),
    ('wire_tray_orders', 'version'),
    ('wire_tray_orders', 'created_by'),
    ('wire_tray_orders', 'created_at'),
    ('wire_tray_orders', 'updated_at'),
    ('wire_tray_order_items', 'id'),
    ('wire_tray_order_items', 'order_id'),
    ('wire_tray_order_items', 'product_id'),
    ('wire_tray_order_items', 'product_name_snapshot'),
    ('wire_tray_order_items', 'product_sku_snapshot'),
    ('wire_tray_order_items', 'category_snapshot'),
    ('wire_tray_order_items', 'unit_snapshot'),
    ('wire_tray_order_items', 'requested_quantity'),
    ('wire_tray_order_items', 'reserved_quantity'),
    ('wire_tray_order_items', 'production_required_quantity'),
    ('wire_tray_order_items', 'produced_quantity'),
    ('wire_tray_order_items', 'separated_quantity'),
    ('wire_tray_order_items', 'checked_quantity'),
    ('wire_tray_order_items', 'dispatched_quantity'),
    ('wire_tray_order_items', 'notes'),
    ('wire_tray_order_items', 'sort_order'),
    ('wire_tray_order_items', 'created_at'),
    ('wire_tray_order_items', 'updated_at'),
    ('wire_tray_order_financials', 'id'),
    ('wire_tray_order_financials', 'order_id'),
    ('wire_tray_order_financials', 'currency'),
    ('wire_tray_order_financials', 'total_cents'),
    ('wire_tray_order_financials', 'invoice_reference'),
    ('wire_tray_order_financials', 'billing_notes'),
    ('wire_tray_order_financials', 'billed_by'),
    ('wire_tray_order_financials', 'created_by'),
    ('wire_tray_order_financials', 'created_at'),
    ('wire_tray_order_financials', 'updated_at'),
    ('wire_tray_order_item_financials', 'id'),
    ('wire_tray_order_item_financials', 'order_item_id'),
    ('wire_tray_order_item_financials', 'unit_price_cents'),
    ('wire_tray_order_item_financials', 'total_cents'),
    ('wire_tray_order_item_financials', 'created_by'),
    ('wire_tray_order_item_financials', 'created_at'),
    ('wire_tray_order_item_financials', 'updated_at'),
    ('wire_tray_reservations', 'id'),
    ('wire_tray_reservations', 'order_id'),
    ('wire_tray_reservations', 'order_item_id'),
    ('wire_tray_reservations', 'product_id'),
    ('wire_tray_reservations', 'location_id'),
    ('wire_tray_reservations', 'quantity'),
    ('wire_tray_reservations', 'consumed_quantity'),
    ('wire_tray_reservations', 'released_quantity'),
    ('wire_tray_reservations', 'remaining_quantity'),
    ('wire_tray_reservations', 'status'),
    ('wire_tray_reservations', 'released_at'),
    ('wire_tray_reservations', 'consumed_at'),
    ('wire_tray_reservations', 'created_by'),
    ('wire_tray_reservations', 'created_at'),
    ('wire_tray_reservations', 'updated_at'),
    ('wire_tray_production_orders', 'id'),
    ('wire_tray_production_orders', 'number'),
    ('wire_tray_production_orders', 'origin_type'),
    ('wire_tray_production_orders', 'order_id'),
    ('wire_tray_production_orders', 'order_item_id'),
    ('wire_tray_production_orders', 'product_id'),
    ('wire_tray_production_orders', 'destination_location_id'),
    ('wire_tray_production_orders', 'planned_quantity'),
    ('wire_tray_production_orders', 'produced_quantity'),
    ('wire_tray_production_orders', 'scrap_quantity'),
    ('wire_tray_production_orders', 'responsible_user_id'),
    ('wire_tray_production_orders', 'priority'),
    ('wire_tray_production_orders', 'planned_completion_date'),
    ('wire_tray_production_orders', 'technical_instructions'),
    ('wire_tray_production_orders', 'generation_reason'),
    ('wire_tray_production_orders', 'status'),
    ('wire_tray_production_orders', 'pause_reason'),
    ('wire_tray_production_orders', 'started_at'),
    ('wire_tray_production_orders', 'completed_at'),
    ('wire_tray_production_orders', 'cancelled_at'),
    ('wire_tray_production_orders', 'version'),
    ('wire_tray_production_orders', 'created_by'),
    ('wire_tray_production_orders', 'created_at'),
    ('wire_tray_production_orders', 'updated_at'),
    ('wire_tray_documents', 'id'),
    ('wire_tray_documents', 'entity_type'),
    ('wire_tray_documents', 'entity_id'),
    ('wire_tray_documents', 'document_type'),
    ('wire_tray_documents', 'visibility'),
    ('wire_tray_documents', 'storage_path'),
    ('wire_tray_documents', 'file_name'),
    ('wire_tray_documents', 'mime_type'),
    ('wire_tray_documents', 'file_size'),
    ('wire_tray_documents', 'caption'),
    ('wire_tray_documents', 'status'),
    ('wire_tray_documents', 'created_by'),
    ('wire_tray_documents', 'created_at'),
    ('wire_tray_production_entries', 'id'),
    ('wire_tray_production_entries', 'production_order_id'),
    ('wire_tray_production_entries', 'entry_type'),
    ('wire_tray_production_entries', 'quantity'),
    ('wire_tray_production_entries', 'notes'),
    ('wire_tray_production_entries', 'evidence_document_id'),
    ('wire_tray_production_entries', 'idempotency_key'),
    ('wire_tray_production_entries', 'created_by'),
    ('wire_tray_production_entries', 'created_at'),
    ('wire_tray_separation_entries', 'id'),
    ('wire_tray_separation_entries', 'order_id'),
    ('wire_tray_separation_entries', 'order_item_id'),
    ('wire_tray_separation_entries', 'reservation_id'),
    ('wire_tray_separation_entries', 'entry_type'),
    ('wire_tray_separation_entries', 'quantity'),
    ('wire_tray_separation_entries', 'difference_quantity'),
    ('wire_tray_separation_entries', 'reason'),
    ('wire_tray_separation_entries', 'resolves_entry_id'),
    ('wire_tray_separation_entries', 'evidence_document_id'),
    ('wire_tray_separation_entries', 'idempotency_key'),
    ('wire_tray_separation_entries', 'created_by'),
    ('wire_tray_separation_entries', 'created_at'),
    ('wire_tray_stock_movements', 'id'),
    ('wire_tray_stock_movements', 'movement_type'),
    ('wire_tray_stock_movements', 'product_id'),
    ('wire_tray_stock_movements', 'location_id'),
    ('wire_tray_stock_movements', 'quantity'),
    ('wire_tray_stock_movements', 'physical_delta'),
    ('wire_tray_stock_movements', 'reserved_delta'),
    ('wire_tray_stock_movements', 'previous_physical'),
    ('wire_tray_stock_movements', 'new_physical'),
    ('wire_tray_stock_movements', 'previous_reserved'),
    ('wire_tray_stock_movements', 'new_reserved'),
    ('wire_tray_stock_movements', 'reason'),
    ('wire_tray_stock_movements', 'order_id'),
    ('wire_tray_stock_movements', 'order_item_id'),
    ('wire_tray_stock_movements', 'reservation_id'),
    ('wire_tray_stock_movements', 'production_order_id'),
    ('wire_tray_stock_movements', 'counterpart_movement_id'),
    ('wire_tray_stock_movements', 'evidence_document_id'),
    ('wire_tray_stock_movements', 'idempotency_key'),
    ('wire_tray_stock_movements', 'created_by'),
    ('wire_tray_stock_movements', 'created_at'),
    ('wire_tray_notifications', 'id'),
    ('wire_tray_notifications', 'user_id'),
    ('wire_tray_notifications', 'order_id'),
    ('wire_tray_notifications', 'notification_type'),
    ('wire_tray_notifications', 'title'),
    ('wire_tray_notifications', 'message'),
    ('wire_tray_notifications', 'route'),
    ('wire_tray_notifications', 'metadata'),
    ('wire_tray_notifications', 'read_at'),
    ('wire_tray_notifications', 'dismissed_at'),
    ('wire_tray_notifications', 'created_at'),
    ('wire_tray_audit_events', 'id'),
    ('wire_tray_audit_events', 'event_type'),
    ('wire_tray_audit_events', 'entity_type'),
    ('wire_tray_audit_events', 'entity_id'),
    ('wire_tray_audit_events', 'before_data'),
    ('wire_tray_audit_events', 'after_data'),
    ('wire_tray_audit_events', 'metadata'),
    ('wire_tray_audit_events', 'idempotency_key'),
    ('wire_tray_audit_events', 'actor_user_id'),
    ('wire_tray_audit_events', 'created_at'),
    ('wire_tray_operation_requests', 'id'),
    ('wire_tray_operation_requests', 'user_id'),
    ('wire_tray_operation_requests', 'operation'),
    ('wire_tray_operation_requests', 'idempotency_key'),
    ('wire_tray_operation_requests', 'response'),
    ('wire_tray_operation_requests', 'completed_at'),
    ('wire_tray_operation_requests', 'created_at')
  ) AS expected(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = expected.table_name
      AND c.column_name = expected.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Colunas ausentes apÃ³s reconciliaÃ§Ã£o: %', array_to_string(missing_columns, ', ')
      USING ERRCODE = '55000';
  END IF;

  SELECT array_agg(expected.name ORDER BY expected.name)
  INTO rls_disabled
  FROM (VALUES
    ('user_module_access'),
    ('wire_tray_stock_locations'),
    ('wire_tray_products'),
    ('wire_tray_stock_balances'),
    ('wire_tray_orders'),
    ('wire_tray_order_items'),
    ('wire_tray_order_financials'),
    ('wire_tray_order_item_financials'),
    ('wire_tray_reservations'),
    ('wire_tray_production_orders'),
    ('wire_tray_documents'),
    ('wire_tray_production_entries'),
    ('wire_tray_separation_entries'),
    ('wire_tray_stock_movements'),
    ('wire_tray_notifications'),
    ('wire_tray_audit_events'),
    ('wire_tray_operation_requests')
  ) AS expected(name)
  JOIN pg_class c ON c.oid = to_regclass('public.' || expected.name)
  WHERE NOT c.relrowsecurity;

  IF rls_disabled IS NOT NULL THEN
    RAISE EXCEPTION 'RLS desabilitada após reconciliação: %', array_to_string(rls_disabled, ', ')
      USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'wire-tray-documents' AND public = false
  ) THEN
    RAISE EXCEPTION 'Bucket privado de Leitos Aramados não foi reconciliado.'
      USING ERRCODE = '55000';
  END IF;
END
$wire_schema_contract$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

COMMIT;
