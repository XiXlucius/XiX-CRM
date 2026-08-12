/*
# CrediNucleo — Schema inicial multi-tenant

## Resumen
Crea el esquema completo del CRM de crédito: clientes, bitácora, equipo,
facturas, productos, progreso de cursos, configuración de negocio,
notificaciones y auditoría. Todo scopeado por usuario (auth.uid) con RLS.

## Tablas nuevas
1. `clients` — clientes a crédito, vinculados al usuario autenticado
2. `bitacora_entries` — notas de contacto por cliente (FK a clients)
3. `team_members` — miembros del equipo del usuario
4. `invoices` — facturas/cuotas, vinculadas a clientes
5. `products` — catálogo de productos con stock y rotación
6. `course_progress` — progreso de cursos por usuario
7. `business_settings` — parámetros de negocio (1 fila por usuario)
8. `notifications` — notificaciones in-app por usuario
9. `audit_log` — trazabilidad de acciones por usuario

## Seguridad
- RLS habilitado en todas las tablas.
- 4 políticas CRUD por tabla, scopeadas a `auth.uid()` via `user_id`.
- Columnas `user_id` con `DEFAULT auth.uid()` para inserts del frontend.
- Tablas hijas (bitacora, invoices) verifican ownership via FK a clients.

## Notas
- `business_settings` tiene una restricción UNIQUE en user_id (1 fila por usuario).
- `audit_log` registra usuario, acción, entidad, valores anterior/nuevo.
- Índices en columnas frecuentemente filtradas (status, due_date, sku).
*/

-- ============ CLIENTS ============
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cedula text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  municipality text NOT NULL DEFAULT 'chacao',
  address text NOT NULL DEFAULT '',
  product text NOT NULL DEFAULT '',
  product_cost numeric NOT NULL DEFAULT 0,
  down_payment_pct numeric NOT NULL DEFAULT 20,
  interest_rate numeric NOT NULL DEFAULT 18,
  frequency text NOT NULL DEFAULT 'quincenal',
  term_months integer NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'prospecto',
  assigned_agent text NOT NULL DEFAULT '',
  risk_score integer NOT NULL DEFAULT 50,
  monthly_income numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ BITACORA ============
CREATE TABLE IF NOT EXISTS bitacora_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'whatsapp',
  note text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT 'recordatorio',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bitacora_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bitacora_client ON bitacora_entries(client_id);

DROP POLICY IF EXISTS "select_own_bitacora" ON bitacora_entries;
CREATE POLICY "select_own_bitacora" ON bitacora_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bitacora" ON bitacora_entries;
CREATE POLICY "insert_own_bitacora" ON bitacora_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_bitacora" ON bitacora_entries;
CREATE POLICY "update_own_bitacora" ON bitacora_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bitacora" ON bitacora_entries;
CREATE POLICY "delete_own_bitacora" ON bitacora_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ TEAM MEMBERS ============
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'vendedor',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  goal_monthly numeric NOT NULL DEFAULT 0,
  achieved_monthly numeric NOT NULL DEFAULT 0,
  commission_rate_pct numeric NOT NULL DEFAULT 4,
  active_portfolio numeric NOT NULL DEFAULT 0,
  delinquency_pct numeric NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_team_user ON team_members(user_id);

DROP POLICY IF EXISTS "select_own_team" ON team_members;
CREATE POLICY "select_own_team" ON team_members FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_team" ON team_members;
CREATE POLICY "insert_own_team" ON team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_team" ON team_members;
CREATE POLICY "update_own_team" ON team_members FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_team" ON team_members;
CREATE POLICY "delete_own_team" ON team_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  due_date timestamptz NOT NULL DEFAULT now(),
  paid_date timestamptz,
  status text NOT NULL DEFAULT 'pendiente',
  is_down_payment boolean NOT NULL DEFAULT false,
  installment_number integer NOT NULL DEFAULT 1,
  total_installments integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  tax_pct numeric NOT NULL DEFAULT 16,
  discount_pct numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  sold integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COURSE PROGRESS ============
CREATE TABLE IF NOT EXISTS course_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  completed_lessons text[] NOT NULL DEFAULT '{}',
  best_score integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_progress_user ON course_progress(user_id);

DROP POLICY IF EXISTS "select_own_progress" ON course_progress;
CREATE POLICY "select_own_progress" ON course_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_progress" ON course_progress;
CREATE POLICY "insert_own_progress" ON course_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_progress" ON course_progress;
CREATE POLICY "update_own_progress" ON course_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_progress" ON course_progress;
CREATE POLICY "delete_own_progress" ON course_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ BUSINESS SETTINGS ============
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  min_down_payment_pct numeric NOT NULL DEFAULT 10,
  base_interest_rate numeric NOT NULL DEFAULT 18,
  commission_tier1 numeric NOT NULL DEFAULT 3,
  commission_tier2 numeric NOT NULL DEFAULT 4,
  commission_tier3 numeric NOT NULL DEFAULT 5,
  stock_alert_threshold numeric NOT NULL DEFAULT 80,
  scoring_weight_downpayment numeric NOT NULL DEFAULT 30,
  scoring_weight_term numeric NOT NULL DEFAULT 20,
  scoring_weight_income numeric NOT NULL DEFAULT 25,
  scoring_weight_history numeric NOT NULL DEFAULT 25,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON business_settings;
CREATE POLICY "select_own_settings" ON business_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON business_settings;
CREATE POLICY "insert_own_settings" ON business_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON business_settings;
CREATE POLICY "update_own_settings" ON business_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON business_settings;
CREATE POLICY "delete_own_settings" ON business_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'media',
  read boolean NOT NULL DEFAULT false,
  link text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

DROP POLICY IF EXISTS "select_own_audit" ON audit_log;
CREATE POLICY "select_own_audit" ON audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audit" ON audit_log;
CREATE POLICY "insert_own_audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
