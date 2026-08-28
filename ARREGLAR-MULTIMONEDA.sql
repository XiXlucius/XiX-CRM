-- ============================================================
-- Multimoneda: USD (moneda interna) + vista en EUR y Bs.
--
-- El dolar sigue siendo la moneda de la deuda: todo lo que ya
-- esta guardado queda valido y NO se reconvierte nada.
-- Esta tabla solo guarda las tasas del dia para poder MOSTRAR
-- los montos en bolivares o euros, y para dejar constancia de a
-- que tasa se cobro cada cuota.
--
-- Es seguro correrlo mas de una vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid,
  rate_date   date NOT NULL,
  source      text NOT NULL DEFAULT 'bcv',      -- 'bcv' | 'manual'
  usd_to_ves  numeric(20,6) NOT NULL CHECK (usd_to_ves > 0),
  eur_to_ves  numeric(20,6) CHECK (eur_to_ves IS NULL OR eur_to_ves > 0),
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Una sola tasa por dia y por origen. Si se vuelve a leer el BCV
-- el mismo dia, se actualiza en vez de duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_unicidad
  ON exchange_rates (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), rate_date, source);

CREATE INDEX IF NOT EXISTS exchange_rates_por_fecha
  ON exchange_rates (rate_date DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Las tasas son informacion publica del BCV: cualquiera con sesion
-- puede leerlas. Escribir queda para usuarios autenticados (el
-- proceso automatico usa la clave de servicio, que salta RLS).
DROP POLICY IF EXISTS "leer_tasas" ON exchange_rates;
CREATE POLICY "leer_tasas" ON exchange_rates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "escribir_tasas" ON exchange_rates;
CREATE POLICY "escribir_tasas" ON exchange_rates
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "actualizar_tasas" ON exchange_rates;
CREATE POLICY "actualizar_tasas" ON exchange_rates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- Constancia de como se liquido cada cobro.
-- Si el cliente pago en bolivares, aqui queda cuanto entrego y a
-- que tasa, para poder auditarlo meses despues.
-- ------------------------------------------------------------

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_currency text
    CHECK (paid_currency IS NULL OR paid_currency IN ('USD','EUR','VES'));
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_amount_original numeric(20,2);
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric(20,6);

ALTER TABLE partial_payments
  ADD COLUMN IF NOT EXISTS paid_currency text
    CHECK (paid_currency IS NULL OR paid_currency IN ('USD','EUR','VES'));
ALTER TABLE partial_payments
  ADD COLUMN IF NOT EXISTS paid_amount_original numeric(20,2);
ALTER TABLE partial_payments
  ADD COLUMN IF NOT EXISTS exchange_rate_used numeric(20,6);

-- ------------------------------------------------------------
-- Articulos del credito.
-- Antes un cliente financiaba UN producto descrito en texto. Ahora
-- puede llevarse varias cosas, cada una con su cantidad y precio.
-- Se guarda como jsonb y no en tabla aparte a proposito: los
-- articulos solo se leen junto con su cliente, nunca por separado.
--
-- `product` y `product_cost` se conservan: el primero como resumen
-- legible y el segundo como total, para no romper listados,
-- busquedas ni los clientes ya registrados.
-- ------------------------------------------------------------

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS items jsonb;

NOTIFY pgrst, 'reload schema';
