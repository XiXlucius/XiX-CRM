/*
================================================================================
  MIGRACION OBLIGATORIA — XiX Tech CRM
  Multi-empresa (org_id) + punto de partida de ruta de cobro

  QUE HACE: agrega las tablas y columnas que el codigo nuevo necesita.
            Sin esto la app abre en BLANCO.

  COMO CORRERLA:
    1. Entra a https://supabase.com y abre tu proyecto.
    2. Menu izquierdo -> "SQL Editor" -> "New query".
    3. Copia y pega TODO este archivo.
    4. Dale al boton "Run".
    5. Deberia decir "Success". Si sale un error, copialo y pasamelo.

  ANTES DE CORRERLA:
    Supabase -> Settings -> Database -> Backups. Descarga un respaldo.
    Esta migracion reescribe los permisos (RLS) de 14 tablas y no se puede
    deshacer con un simple "undo".

  NOTA: es segura de correr dos veces (usa IF NOT EXISTS / ON CONFLICT).
================================================================================
*/

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
-- VERIFICACION — deberia devolver una fila por cada usuario con datos
-- ############################################################################

SELECT o.name AS organizacion, m.role AS rol, u.email
FROM memberships m
JOIN organizations o ON o.id = m.org_id
JOIN auth.users u ON u.id = m.user_id;
