-- Leitos Aramados: additive domain model.
-- Operational records are intentionally not seeded by this migration.

CREATE TYPE public.app_module AS ENUM ('os', 'wire_trays');
CREATE TYPE public.wire_tray_module_role AS ENUM (
  'admin', 'gestor', 'comercial', 'producao', 'estoque', 'faturamento', 'consulta'
);
CREATE TYPE public.wire_tray_product_category AS ENUM (
  'straight_tray', 'curve', 'branch', 'reduction', 'splice', 'support', 'cover', 'accessory', 'other'
);
CREATE TYPE public.wire_tray_unit AS ENUM ('piece', 'meter', 'kilogram', 'set');
CREATE TYPE public.wire_tray_order_status AS ENUM (
  'draft', 'confirmed', 'stock_reserved', 'production_pending', 'in_production',
  'separating', 'awaiting_check', 'ready_for_billing', 'billed',
  'ready_for_dispatch', 'dispatched', 'completed', 'cancelled'
);
CREATE TYPE public.wire_tray_reservation_status AS ENUM (
  'active', 'partially_consumed', 'consumed', 'released', 'cancelled'
);
CREATE TYPE public.wire_tray_production_origin AS ENUM (
  'customer_order', 'replenishment', 'manual_stock'
);
CREATE TYPE public.wire_tray_production_status AS ENUM (
  'planned', 'released', 'in_progress', 'paused', 'awaiting_check', 'completed', 'cancelled'
);
CREATE TYPE public.wire_tray_production_entry_type AS ENUM (
  'start', 'progress', 'pause', 'resume', 'scrap', 'complete', 'cancel'
);
CREATE TYPE public.wire_tray_movement_type AS ENUM (
  'stock_entry', 'stock_exit', 'transfer_out', 'transfer_in', 'return', 'loss',
  'adjustment', 'reservation', 'reservation_release', 'reservation_consumption',
  'production_entry', 'dispatch'
);
CREATE TYPE public.wire_tray_separation_entry_type AS ENUM (
  'separation', 'checking', 'discrepancy', 'resolution'
);
CREATE TYPE public.wire_tray_document_type AS ENUM (
  'quotation', 'customer_order', 'technical_drawing', 'production_instruction',
  'invoice', 'dispatch_receipt', 'photo', 'other'
);
CREATE TYPE public.wire_tray_document_visibility AS ENUM (
  'operational', 'commercial', 'financial', 'admin_only'
);

CREATE TABLE public.user_module_access (
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

CREATE TABLE public.wire_tray_stock_locations (
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

CREATE UNIQUE INDEX wire_tray_locations_code_unique
  ON public.wire_tray_stock_locations (lower(code));

CREATE TABLE public.wire_tray_products (
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

CREATE UNIQUE INDEX wire_tray_products_sku_unique
  ON public.wire_tray_products (lower(sku)) WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE INDEX wire_tray_products_active_category_idx
  ON public.wire_tray_products (active, category, name);

CREATE TABLE public.wire_tray_stock_balances (
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

CREATE INDEX wire_tray_balances_location_idx
  ON public.wire_tray_stock_balances (location_id, product_id);

CREATE TABLE public.wire_tray_orders (
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

CREATE INDEX wire_tray_orders_status_date_idx
  ON public.wire_tray_orders (status, expected_delivery_date, created_at DESC);
CREATE INDEX wire_tray_orders_client_idx
  ON public.wire_tray_orders (client_id, created_at DESC);

CREATE TABLE public.wire_tray_order_items (
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

CREATE INDEX wire_tray_order_items_product_idx
  ON public.wire_tray_order_items (product_id, order_id);

-- Financial information is physically separated from operational order data.
CREATE TABLE public.wire_tray_order_financials (
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

CREATE TABLE public.wire_tray_order_item_financials (
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

CREATE TABLE public.wire_tray_reservations (
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

CREATE INDEX wire_tray_reservations_order_status_idx
  ON public.wire_tray_reservations (order_id, status, created_at);
CREATE INDEX wire_tray_reservations_balance_idx
  ON public.wire_tray_reservations (product_id, location_id, status);

CREATE TABLE public.wire_tray_production_orders (
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

CREATE INDEX wire_tray_production_status_due_idx
  ON public.wire_tray_production_orders (status, planned_completion_date, created_at DESC);
CREATE INDEX wire_tray_production_product_idx
  ON public.wire_tray_production_orders (product_id, status);
CREATE UNIQUE INDEX wire_tray_replenishment_one_open_per_product
  ON public.wire_tray_production_orders (product_id)
  WHERE origin_type = 'replenishment'
    AND status IN ('planned', 'released', 'in_progress', 'paused', 'awaiting_check');

CREATE TABLE public.wire_tray_documents (
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

CREATE INDEX wire_tray_documents_entity_idx
  ON public.wire_tray_documents (entity_type, entity_id, created_at DESC);

CREATE TABLE public.wire_tray_production_entries (
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

CREATE UNIQUE INDEX wire_tray_production_entries_idempotency_idx
  ON public.wire_tray_production_entries (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX wire_tray_production_entries_order_idx
  ON public.wire_tray_production_entries (production_order_id, created_at);

CREATE TABLE public.wire_tray_separation_entries (
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

CREATE UNIQUE INDEX wire_tray_separation_entries_idempotency_idx
  ON public.wire_tray_separation_entries (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX wire_tray_separation_entries_order_idx
  ON public.wire_tray_separation_entries (order_id, order_item_id, created_at);

CREATE TABLE public.wire_tray_stock_movements (
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

CREATE UNIQUE INDEX wire_tray_stock_movements_idempotency_idx
  ON public.wire_tray_stock_movements (created_by, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX wire_tray_stock_movements_product_date_idx
  ON public.wire_tray_stock_movements (product_id, created_at DESC);
CREATE INDEX wire_tray_stock_movements_order_idx
  ON public.wire_tray_stock_movements (order_id, created_at DESC) WHERE order_id IS NOT NULL;

CREATE TABLE public.wire_tray_notifications (
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

CREATE UNIQUE INDEX wire_tray_notifications_unique_business_event
  ON public.wire_tray_notifications (user_id, order_id, notification_type)
  WHERE order_id IS NOT NULL;
CREATE INDEX wire_tray_notifications_unread_idx
  ON public.wire_tray_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE public.wire_tray_audit_events (
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

CREATE INDEX wire_tray_audit_entity_idx
  ON public.wire_tray_audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX wire_tray_audit_date_idx
  ON public.wire_tray_audit_events (created_at DESC);

CREATE TABLE public.wire_tray_operation_requests (
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
CREATE TRIGGER user_module_access_updated_at
  BEFORE UPDATE ON public.user_module_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_locations_updated_at
  BEFORE UPDATE ON public.wire_tray_stock_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_products_updated_at
  BEFORE UPDATE ON public.wire_tray_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_balances_updated_at
  BEFORE UPDATE ON public.wire_tray_stock_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_orders_updated_at
  BEFORE UPDATE ON public.wire_tray_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_order_items_updated_at
  BEFORE UPDATE ON public.wire_tray_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_order_financials_updated_at
  BEFORE UPDATE ON public.wire_tray_order_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_order_item_financials_updated_at
  BEFORE UPDATE ON public.wire_tray_order_item_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_reservations_updated_at
  BEFORE UPDATE ON public.wire_tray_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER wire_tray_production_orders_updated_at
  BEFORE UPDATE ON public.wire_tray_production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
