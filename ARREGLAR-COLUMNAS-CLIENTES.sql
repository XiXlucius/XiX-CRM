-- ============================================================
-- Arregla el error al registrar clientes.
--
-- El CRM guardaba tres datos que NO existian como columnas en la
-- tabla clients, asi que la base de datos rechazaba el registro
-- completo ("Ocurrio un error inesperado"):
--   - employment_tenure  (tiempo de trabajo)
--   - has_physical_id    (tiene cedula fisica)
--   - first_payment_date (fecha del primer cobro)
--
-- Ademas term_months era entero, pero el CRM permite sumar semanas
-- extra, lo que produce plazos con decimales (ej: 12.46 meses).
--
-- Es seguro correrlo mas de una vez.
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS employment_tenure text NOT NULL DEFAULT '6m-1y';

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS has_physical_id boolean NOT NULL DEFAULT true;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_payment_date date;

ALTER TABLE clients
  ALTER COLUMN term_months TYPE numeric;

-- Refresca el cache de esquema de la API para que los cambios
-- se vean de inmediato sin esperar.
NOTIFY pgrst, 'reload schema';
