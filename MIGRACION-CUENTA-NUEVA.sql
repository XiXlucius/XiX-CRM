/*
================================================================================
  XiX Tech CRM — ESQUEMA COMPLETO PARA UNA BASE DE DATOS NUEVA Y VACIA

  Usa este archivo SOLO en un proyecto de Supabase recien creado.
  Crea todo desde cero: tablas, permisos, storage y multi-empresa.

  Contiene, en orden:
    1. Esquema inicial del CRM        (001_credinucleo_schema)
    2. Funciones extra + storage      (002_xix_tech_features)
    3. Punto de partida ruta de cobro (003_ruta_cobro_origin)
    4. Multi-empresa + roles          (004_multi_tenant, con correccion)

  COMO CORRERLO:
    Supabase -> SQL Editor -> New query -> pegar TODO -> Run.

  Al terminar NO veras filas de resultado: la base esta vacia, las
  organizaciones se crean solas cuando te registres en la app. Eso es normal.
  Lo que importa es que diga "Success".
================================================================================
*/

-- ############ 1 de 4 — ESQUEMA INICIAL ############
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


-- ############ 2 de 4 — FUNCIONES EXTRA + STORAGE ############
/*
# XiX Tech — Funcionalidades avanzadas (sin seed)

## Resumen
Añade soporte para: geolocalización de clientes, subida de documentos,
plantillas de mensajes, pagos parciales con múltiples fechas/montos,
renegociación de deuda, y registro de mora automática ($4/semana tras 3 días de gracia).

## Tablas nuevas
1. `client_documents` — documentos vinculados a un cliente
2. `message_templates` — plantillas de mensajes por canal y estado
3. `partial_payments` — pagos parciales contra una factura
4. `renegotiations` — renegociaciones de deuda
5. `late_fees` — cargos por mora ($4/semana tras 3 días de gracia)

## Columnas nuevas
- `clients.latitude` / `clients.longitude` — geolocalización

## Seguridad
- RLS en todas las tablas nuevas, 4 políticas CRUD cada una, scopeadas a auth.uid().
- Storage bucket `client-documents` para archivos.
*/

-- ============ ADD LAT/LNG TO CLIENTS ============
DO $$ BEGIN
  ALTER TABLE clients ADD COLUMN latitude numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE clients ADD COLUMN longitude numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============ CLIENT DOCUMENTS ============
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'otros',
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_docs_client ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_docs_user ON client_documents(user_id);

DROP POLICY IF EXISTS "select_own_documents" ON client_documents;
CREATE POLICY "select_own_documents" ON client_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON client_documents;
CREATE POLICY "insert_own_documents" ON client_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON client_documents;
CREATE POLICY "update_own_documents" ON client_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON client_documents;
CREATE POLICY "delete_own_documents" ON client_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ MESSAGE TEMPLATES ============
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  client_status text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_templates_user ON message_templates(user_id);

DROP POLICY IF EXISTS "select_own_templates" ON message_templates;
CREATE POLICY "select_own_templates" ON message_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_templates" ON message_templates;
CREATE POLICY "insert_own_templates" ON message_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_templates" ON message_templates;
CREATE POLICY "update_own_templates" ON message_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_templates" ON message_templates;
CREATE POLICY "delete_own_templates" ON message_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ PARTIAL PAYMENTS ============
CREATE TABLE IF NOT EXISTS partial_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partial_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_partial_invoice ON partial_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_partial_user ON partial_payments(user_id);

DROP POLICY IF EXISTS "select_own_partial" ON partial_payments;
CREATE POLICY "select_own_partial" ON partial_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_partial" ON partial_payments;
CREATE POLICY "insert_own_partial" ON partial_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_partial" ON partial_payments;
CREATE POLICY "update_own_partial" ON partial_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_partial" ON partial_payments;
CREATE POLICY "delete_own_partial" ON partial_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ RENEGOTIATIONS ============
CREATE TABLE IF NOT EXISTS renegotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  old_term_months integer NOT NULL,
  new_term_months integer NOT NULL,
  old_interest_rate numeric NOT NULL,
  new_interest_rate numeric NOT NULL,
  old_frequency text NOT NULL,
  new_frequency text NOT NULL,
  outstanding_balance numeric NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE renegotiations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reneg_client ON renegotiations(client_id);
CREATE INDEX IF NOT EXISTS idx_reneg_user ON renegotiations(user_id);

DROP POLICY IF EXISTS "select_own_reneg" ON renegotiations;
CREATE POLICY "select_own_reneg" ON renegotiations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reneg" ON renegotiations;
CREATE POLICY "insert_own_reneg" ON renegotiations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reneg" ON renegotiations;
CREATE POLICY "update_own_reneg" ON renegotiations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reneg" ON renegotiations;
CREATE POLICY "delete_own_reneg" ON renegotiations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LATE FEES ============
CREATE TABLE IF NOT EXISTS late_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 4,
  week_number integer NOT NULL DEFAULT 1,
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE late_fees ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_latefee_client ON late_fees(client_id);
CREATE INDEX IF NOT EXISTS idx_latefee_user ON late_fees(user_id);

DROP POLICY IF EXISTS "select_own_latefee" ON late_fees;
CREATE POLICY "select_own_latefee" ON late_fees FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_latefee" ON late_fees;
CREATE POLICY "insert_own_latefee" ON late_fees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_latefee" ON late_fees;
CREATE POLICY "update_own_latefee" ON late_fees FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_latefee" ON late_fees;
CREATE POLICY "delete_own_latefee" ON late_fees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "select_own_docs_storage" ON storage.objects;
CREATE POLICY "select_own_docs_storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "insert_own_docs_storage" ON storage.objects;
CREATE POLICY "insert_own_docs_storage" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "delete_own_docs_storage" ON storage.objects;
CREATE POLICY "delete_own_docs_storage" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ############ 3 y 4 de 4 — RUTA DE COBRO + MULTI-EMPRESA ############

-- ############################################################################
-- PARTE 1 de 2 — Punto de partida configurable para la ruta de cobro
-- ############################################################################

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN origin_lat numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE team_members ADD COLUMN origin_lng numeric;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;


-- ############################################################################
-- PARTE 2 de 2 — Multi-empresa real + roles en el servidor
-- ############################################################################

-- ============ ORGANIZATIONS / MEMBERSHIPS / INVITATIONS ============

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','gerente','supervisor','vendedor')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(org_id);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','gerente','supervisor','vendedor')),
  token text NOT NULL UNIQUE,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id);

CREATE TABLE IF NOT EXISTS role_permissions (
  role text NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO role_permissions (role, permission) VALUES
  ('admin','dashboard'), ('admin','crm'), ('admin','courses'), ('admin','playbook'),
  ('admin','equipo'), ('admin','facturacion'), ('admin','inventario'), ('admin','config'),
  ('admin','reportes'), ('admin','auditoria'), ('admin','ruta'),
  ('gerente','dashboard'), ('gerente','crm'), ('gerente','equipo'), ('gerente','facturacion'),
  ('gerente','inventario'), ('gerente','reportes'), ('gerente','ruta'),
  ('supervisor','dashboard'), ('supervisor','crm'), ('supervisor','facturacion'),
  ('supervisor','playbook'), ('supervisor','auditoria'),
  ('vendedor','dashboard'), ('vendedor','crm'), ('vendedor','courses'), ('vendedor','playbook'),
  ('vendedor','facturacion'), ('vendedor','ruta')
ON CONFLICT (role, permission) DO NOTHING;

-- ============ FUNCIONES AUXILIARES ============

-- CORRECCION: esta columna estaba mas abajo en la migracion original, DESPUES de
-- la funcion my_agent_name() que la usa. Postgres valida el cuerpo de las funciones
-- SQL al crearlas, asi que fallaba con "column tm.membership_id does not exist".
-- Tiene que existir antes.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM memberships WHERE user_id = auth.uid() AND active LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION user_role(p_org uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM memberships WHERE org_id = p_org AND user_id = auth.uid() AND active LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_permission(p_org uuid, p_perm text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role = user_role(p_org) AND rp.permission = p_perm
  );
$$;

CREATE OR REPLACE FUNCTION my_agent_name(p_org uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tm.name FROM team_members tm
  JOIN memberships m ON m.id = tm.membership_id
  WHERE m.org_id = p_org AND m.user_id = auth.uid() LIMIT 1;
$$;

-- ============ ORG_ID + BACKFILL DE DATOS EXISTENTES (14 tablas) ============

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clients','bitacora_entries','team_members','invoices','products','course_progress',
    'business_settings','notifications','audit_log','client_documents','message_templates',
    'partial_payments','renegotiations','late_fees'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE', tbl);
  END LOOP;
END $$;

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS membership_id uuid REFERENCES memberships(id) ON DELETE SET NULL;

DO $$
DECLARE
  uid uuid;
  new_org uuid;
BEGIN
  FOR uid IN
    SELECT user_id FROM clients
    UNION SELECT user_id FROM bitacora_entries
    UNION SELECT user_id FROM team_members
    UNION SELECT user_id FROM invoices
    UNION SELECT user_id FROM products
    UNION SELECT user_id FROM course_progress
    UNION SELECT user_id FROM business_settings
    UNION SELECT user_id FROM notifications
    UNION SELECT user_id FROM audit_log
    UNION SELECT user_id FROM client_documents
    UNION SELECT user_id FROM message_templates
    UNION SELECT user_id FROM partial_payments
    UNION SELECT user_id FROM renegotiations
    UNION SELECT user_id FROM late_fees
  LOOP
    IF NOT EXISTS (SELECT 1 FROM memberships WHERE user_id = uid) THEN
      INSERT INTO organizations (name, owner_id) VALUES ('Mi organización', uid) RETURNING id INTO new_org;
      INSERT INTO memberships (org_id, user_id, role, active) VALUES (new_org, uid, 'admin', true);
    ELSE
      SELECT org_id INTO new_org FROM memberships WHERE user_id = uid LIMIT 1;
    END IF;

    UPDATE clients            SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE bitacora_entries   SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE team_members       SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE invoices           SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE products           SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE course_progress    SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE business_settings  SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE notifications      SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE audit_log          SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE client_documents   SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE message_templates  SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE partial_payments   SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE renegotiations     SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE late_fees          SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
  END LOOP;
END $$;

UPDATE team_members tm
SET membership_id = m.id
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE tm.membership_id IS NULL AND tm.org_id = m.org_id AND lower(u.email) = lower(tm.email) AND tm.email <> '';

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clients','bitacora_entries','team_members','invoices','products','course_progress',
    'business_settings','notifications','audit_log','client_documents','message_templates',
    'partial_payments','renegotiations','late_fees'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN org_id SET NOT NULL', tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_org ON %I(org_id)', tbl, tbl);
  END LOOP;
END $$;

ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_user_id_key;
DO $$ BEGIN
  ALTER TABLE business_settings ADD CONSTRAINT business_settings_org_id_key UNIQUE (org_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============ PERMISOS (RLS): ORGANIZACION + PERMISO DE ROL ============

DROP POLICY IF EXISTS "select_own_clients" ON clients;
DROP POLICY IF EXISTS "insert_own_clients" ON clients;
DROP POLICY IF EXISTS "update_own_clients" ON clients;
DROP POLICY IF EXISTS "delete_own_clients" ON clients;
DROP POLICY IF EXISTS "org_select_clients" ON clients;
DROP POLICY IF EXISTS "org_insert_clients" ON clients;
DROP POLICY IF EXISTS "org_update_clients" ON clients;
DROP POLICY IF EXISTS "org_delete_clients" ON clients;

CREATE POLICY "org_select_clients" ON clients FOR SELECT TO authenticated USING (
  org_id = current_org_id() AND has_permission(org_id, 'crm') AND
  (user_role(org_id) <> 'vendedor' OR assigned_agent = my_agent_name(org_id))
);
CREATE POLICY "org_insert_clients" ON clients FOR INSERT TO authenticated WITH CHECK (
  org_id = current_org_id() AND has_permission(org_id, 'crm')
);
CREATE POLICY "org_update_clients" ON clients FOR UPDATE TO authenticated USING (
  org_id = current_org_id() AND has_permission(org_id, 'crm') AND
  (user_role(org_id) <> 'vendedor' OR assigned_agent = my_agent_name(org_id))
) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_delete_clients" ON clients FOR DELETE TO authenticated USING (
  org_id = current_org_id() AND has_permission(org_id, 'crm') AND user_role(org_id) <> 'vendedor'
);

DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('bitacora_entries','crm'), ('team_members','equipo'), ('invoices','facturacion'),
    ('products','inventario'), ('course_progress','courses'), ('business_settings','config'),
    ('client_documents','crm'), ('message_templates','crm'), ('partial_payments','facturacion'),
    ('renegotiations','crm'), ('late_fees','facturacion')
  ) AS t(tbl, perm) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'select_own_' || replace(spec.tbl,'team_members','team'), spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'insert_own_' || replace(spec.tbl,'team_members','team'), spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'update_own_' || replace(spec.tbl,'team_members','team'), spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'delete_own_' || replace(spec.tbl,'team_members','team'), spec.tbl);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_select_' || spec.tbl, spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_insert_' || spec.tbl, spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_update_' || spec.tbl, spec.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_delete_' || spec.tbl, spec.tbl);

    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_select_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_insert_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L)) WITH CHECK (org_id = current_org_id())', 'org_update_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_delete_' || spec.tbl, spec.tbl, spec.perm);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
DROP POLICY IF EXISTS "org_select_notifications" ON notifications;
DROP POLICY IF EXISTS "org_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "org_update_notifications" ON notifications;
DROP POLICY IF EXISTS "org_delete_notifications" ON notifications;
CREATE POLICY "org_select_notifications" ON notifications FOR SELECT TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid());
CREATE POLICY "org_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_update_notifications" ON notifications FOR UPDATE TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_delete_notifications" ON notifications FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid());

DROP POLICY IF EXISTS "select_own_audit" ON audit_log;
DROP POLICY IF EXISTS "insert_own_audit" ON audit_log;
DROP POLICY IF EXISTS "org_select_audit" ON audit_log;
DROP POLICY IF EXISTS "org_insert_audit" ON audit_log;
CREATE POLICY "org_select_audit" ON audit_log FOR SELECT TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, 'auditoria'));
CREATE POLICY "org_insert_audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());

DROP POLICY IF EXISTS "org_select_memberships" ON memberships;
DROP POLICY IF EXISTS "org_admin_insert_memberships" ON memberships;
DROP POLICY IF EXISTS "org_admin_update_memberships" ON memberships;
DROP POLICY IF EXISTS "org_admin_delete_memberships" ON memberships;
CREATE POLICY "org_select_memberships" ON memberships FOR SELECT TO authenticated USING (org_id = current_org_id());
-- Nota: la regla original solo permitia insertar si ya eras admin de la org, lo cual hacia
-- imposible crear la PRIMERA membership de una organizacion nueva (un usuario recien
-- registrado quedaba trabado). Se agrega el caso "bootstrap": puedes crear tu propia
-- membership si eres el dueno de esa organizacion y todavia no tiene miembros.
CREATE POLICY "org_admin_insert_memberships" ON memberships FOR INSERT TO authenticated WITH CHECK (
  (org_id = current_org_id() AND user_role(org_id) = 'admin')
  OR (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM memberships m2 WHERE m2.org_id = memberships.org_id)
  )
);
CREATE POLICY "org_admin_update_memberships" ON memberships FOR UPDATE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin') WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_admin_delete_memberships" ON memberships FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');

DROP POLICY IF EXISTS "org_admin_select_invitations" ON invitations;
DROP POLICY IF EXISTS "org_admin_insert_invitations" ON invitations;
DROP POLICY IF EXISTS "org_admin_delete_invitations" ON invitations;
CREATE POLICY "org_admin_select_invitations" ON invitations FOR SELECT TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');
CREATE POLICY "org_admin_insert_invitations" ON invitations FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id() AND user_role(org_id) = 'admin');
CREATE POLICY "org_admin_delete_invitations" ON invitations FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');

DROP POLICY IF EXISTS "select_own_org" ON organizations;
DROP POLICY IF EXISTS "insert_own_org" ON organizations;
CREATE POLICY "select_own_org" ON organizations FOR SELECT TO authenticated USING (id = current_org_id());
CREATE POLICY "insert_own_org" ON organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "select_role_permissions" ON role_permissions;
CREATE POLICY "select_role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "org_update_business_settings" ON business_settings;
CREATE POLICY "org_update_business_settings" ON business_settings FOR UPDATE TO authenticated USING (
  org_id = current_org_id() AND has_permission(org_id, 'config') AND user_role(org_id) <> 'supervisor'
) WITH CHECK (org_id = current_org_id());

-- ============ STORAGE: ruta por organizacion ============
DROP POLICY IF EXISTS "select_own_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "insert_own_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "delete_own_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "org_select_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "org_insert_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "org_delete_docs_storage" ON storage.objects;

CREATE POLICY "org_select_docs_storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);
CREATE POLICY "org_insert_docs_storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);
CREATE POLICY "org_delete_docs_storage" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);


-- ############################################################################
-- VERIFICACION
-- Debe devolver 18 filas, una por tabla, todas con "OK".
-- Si falta alguna, algo se interrumpio a medias.
-- ############################################################################

SELECT t.tabla, CASE WHEN c.oid IS NULL THEN 'FALTA' ELSE 'OK' END AS estado
FROM (VALUES
  ('clients'), ('bitacora_entries'), ('team_members'), ('invoices'),
  ('products'), ('course_progress'), ('business_settings'), ('notifications'),
  ('audit_log'), ('client_documents'), ('message_templates'),
  ('partial_payments'), ('renegotiations'), ('late_fees'),
  ('organizations'), ('memberships'), ('invitations'), ('role_permissions')
) AS t(tabla)
LEFT JOIN pg_class c ON c.relname = t.tabla AND c.relnamespace = 'public'::regnamespace
ORDER BY estado DESC, t.tabla;
