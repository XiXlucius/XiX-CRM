/*
# Multi-tenant real + roles en el servidor (HANDOFF-MULTIUSUARIO.md, Fase 1)

## IMPORTANTE — no aplicar sin revisar y probar contra un proyecto Supabase real primero.
Esta migración reescribe RLS en 14 tablas y hace backfill de datos existentes. Se escribió
siguiendo el handoff al pie de la letra, pero nunca se ejecutó ni se probó contra una base de
datos real (no hay entorno Supabase disponible en este flujo). Antes de aplicarla en producción:
1. Córrela primero contra una copia/staging.
2. Verifique el backfill (Fase 1.4) contra sus datos reales — no debe perder ninguna fila.
3. Corra las pruebas de la Fase 4 de `HANDOFF-MULTIUSUARIO.md` con dos usuarios reales.

## Decisión documentada (handoff 3.6)
`team_members` gana una columna `membership_id` (nullable) para vincular una fila de equipo a
un usuario con login real, cuando lo tenga. Los agentes sin login siguen existiendo como filas
sueltas — la ruta de cobro y las comisiones no dependen de que tengan membership.

## Resumen
- `organizations`, `memberships`, `invitations`, `role_permissions`.
- Funciones `current_org_id()`, `user_role(org)`, `has_permission(org, perm)`, `my_agent_name(org)`.
- `org_id` en las 14 tablas, backfill 1 organización por `user_id` existente, luego NOT NULL.
- RLS reemplazada: org + permiso, más las reglas de rol de la Fase 1.5.
- Storage: ruta de `client-documents` pasa a `<org_id>/<client_id>/<archivo>`.
*/

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

-- Valores tomados de src/data.ts (ROLES) al momento de esta migración.
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

-- ============ HELPER FUNCTIONS ============

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

-- Nombre de agente (team_members.name) del usuario logueado en esa org, vía membership_id.
CREATE OR REPLACE FUNCTION my_agent_name(p_org uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tm.name FROM team_members tm
  JOIN memberships m ON m.id = tm.membership_id
  WHERE m.org_id = p_org AND m.user_id = auth.uid() LIMIT 1;
$$;

-- ============ ORG_ID BACKFILL (14 tablas) ============

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

-- 1 organización + membership admin por cada user_id distinto que ya tenga datos (unión de
-- las 14 tablas, no solo `clients` — un usuario puede existir con solo team_members o solo
-- business_settings todavía).
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

    UPDATE clients SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE bitacora_entries SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE team_members SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE invoices SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE products SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE course_progress SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE business_settings SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE notifications SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE audit_log SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE client_documents SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE message_templates SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE partial_payments SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE renegotiations SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
    UPDATE late_fees SET org_id = new_org WHERE user_id = uid AND org_id IS NULL;
  END LOOP;
END $$;

-- Vincula automáticamente cada team_member al membership del mismo user_id cuando el email
-- coincide con un usuario ya registrado (mejor esfuerzo — revisar manualmente tras migrar).
UPDATE team_members tm
SET membership_id = m.id
FROM memberships m
JOIN auth.users u ON u.id = m.user_id
WHERE tm.membership_id IS NULL AND tm.org_id = m.org_id AND lower(u.email) = lower(tm.email) AND tm.email <> '';

-- Recién ahora NOT NULL + índices (falla ruidosamente si algo quedó sin backfillear).
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

-- business_settings pasa a ser 1 fila por organización (parámetros compartidos por el equipo),
-- no 1 por usuario. Si dos usuarios de la misma org ya tenían cada uno su propia fila (dueño +
-- alguien que la creó por separado), esto falla con "duplicate key" — revisar manualmente antes
-- de aplicar si ese caso existe en los datos reales.
ALTER TABLE business_settings DROP CONSTRAINT IF EXISTS business_settings_user_id_key;
ALTER TABLE business_settings ADD CONSTRAINT business_settings_org_id_key UNIQUE (org_id);

-- ============ RLS: ORG + PERMISO (reemplaza las políticas *_own_*) ============
-- user_id se mantiene en todas las tablas (autor del registro, para auditoría), pero deja de
-- ser la base de RLS: la base ahora es org_id + role_permissions.

-- clients: regla especial de vendedor (solo sus propios clientes vía assigned_agent).
DROP POLICY IF EXISTS "select_own_clients" ON clients;
DROP POLICY IF EXISTS "insert_own_clients" ON clients;
DROP POLICY IF EXISTS "update_own_clients" ON clients;
DROP POLICY IF EXISTS "delete_own_clients" ON clients;

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

-- Tablas simples: org + permiso de la pestaña dueña, mismo patrón en las 4 operaciones.
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

    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_select_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_insert_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L)) WITH CHECK (org_id = current_org_id())', 'org_update_' || spec.tbl, spec.tbl, spec.perm);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, %L))', 'org_delete_' || spec.tbl, spec.tbl, spec.perm);
  END LOOP;
END $$;

-- business_settings: supervisor tiene el permiso 'config'... en realidad no lo tiene (no está
-- en su lista), así que la regla genérica ya lo excluye. Solo admin administra memberships /
-- invitations más abajo, y solo admin puede togglear settings vía has_permission('config').

-- notifications: personales, no dependen de un permiso de pestaña — solo org + dueño.
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "org_select_notifications" ON notifications FOR SELECT TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid());
CREATE POLICY "org_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_update_notifications" ON notifications FOR UPDATE TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid()) WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_delete_notifications" ON notifications FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_id = auth.uid());

-- audit_log: insert para todos los miembros, select solo con permiso 'auditoria', sin update/delete.
DROP POLICY IF EXISTS "select_own_audit" ON audit_log;
DROP POLICY IF EXISTS "insert_own_audit" ON audit_log;
CREATE POLICY "org_select_audit" ON audit_log FOR SELECT TO authenticated USING (org_id = current_org_id() AND has_permission(org_id, 'auditoria'));
CREATE POLICY "org_insert_audit" ON audit_log FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id());

-- memberships / invitations: solo admin.
CREATE POLICY "org_select_memberships" ON memberships FOR SELECT TO authenticated USING (org_id = current_org_id());
CREATE POLICY "org_admin_insert_memberships" ON memberships FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id() AND user_role(org_id) = 'admin');
CREATE POLICY "org_admin_update_memberships" ON memberships FOR UPDATE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin') WITH CHECK (org_id = current_org_id());
CREATE POLICY "org_admin_delete_memberships" ON memberships FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');

CREATE POLICY "org_admin_select_invitations" ON invitations FOR SELECT TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');
CREATE POLICY "org_admin_insert_invitations" ON invitations FOR INSERT TO authenticated WITH CHECK (org_id = current_org_id() AND user_role(org_id) = 'admin');
CREATE POLICY "org_admin_delete_invitations" ON invitations FOR DELETE TO authenticated USING (org_id = current_org_id() AND user_role(org_id) = 'admin');

CREATE POLICY "select_own_org" ON organizations FOR SELECT TO authenticated USING (id = current_org_id());
CREATE POLICY "select_role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);

-- supervisor: no puede tocar business_settings aunque en teoría tuviera el permiso 'config'
-- (hoy no lo tiene en role_permissions; esta política extra es defensiva por si cambia).
DROP POLICY IF EXISTS "org_update_business_settings" ON business_settings;
CREATE POLICY "org_update_business_settings" ON business_settings FOR UPDATE TO authenticated USING (
  org_id = current_org_id() AND has_permission(org_id, 'config') AND user_role(org_id) <> 'supervisor'
) WITH CHECK (org_id = current_org_id());

-- ============ STORAGE: ruta por organización, no por usuario ============
DROP POLICY IF EXISTS "select_own_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "insert_own_docs_storage" ON storage.objects;
DROP POLICY IF EXISTS "delete_own_docs_storage" ON storage.objects;

CREATE POLICY "org_select_docs_storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);
CREATE POLICY "org_insert_docs_storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);
CREATE POLICY "org_delete_docs_storage" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = current_org_id()::text);
