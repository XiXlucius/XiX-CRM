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
