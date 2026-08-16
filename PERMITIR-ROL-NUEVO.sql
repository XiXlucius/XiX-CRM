/*
================================================================================
  Permitir el rol `nuevo` en memberships

  POR QUE VA APARTE
  El archivo grande empezaba con:
      ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
      ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (...);

  Eso da por sentado que la restriccion se llama `memberships_role_check`. Si en
  tu base tiene otro nombre, el DROP no la quita, el ADD choca o la vieja
  sobrevive, y el SQL Editor revierte el script COMPLETO — por eso las funciones
  nunca llegaron a crearse.

  Este script no supone nada: busca el nombre real de cualquier restriccion
  CHECK sobre la columna `role` y la reemplaza.

  PEGALO SOLO. Ctrl+A en el editor primero.
================================================================================
*/

-- ============ memberships ============
DO $$
DECLARE
  c record;
BEGIN
  -- Quitar TODA restriccion CHECK que mencione la columna role.
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'memberships'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE memberships DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE 'memberships: quitada la restriccion %', c.conname;
  END LOOP;

  ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
    CHECK (role IN ('nuevo', 'admin', 'gerente', 'supervisor', 'vendedor'));
END $$;


-- ============ invitations ============
-- Puede no existir la tabla, segun hasta donde llegara la migracion anterior.
DO $$
DECLARE
  c record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invitations'
  ) THEN
    RAISE NOTICE 'invitations no existe, se omite';
    RETURN;
  END IF;

  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'invitations'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE invitations DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('nuevo', 'admin', 'gerente', 'supervisor', 'vendedor'));
END $$;


-- ============ `nuevo` sin ningun permiso ============
DELETE FROM role_permissions WHERE role = 'nuevo';


-- ============ Nadie crea organizaciones desde la aplicacion ============
-- join_default_org() la crea si hace falta, y corre con privilegios propios.
DROP POLICY IF EXISTS "insert_own_org" ON organizations;


NOTIFY pgrst, 'reload schema';


-- ############################################################################
-- RESULTADO — la condicion debe incluir 'nuevo'
-- ############################################################################

SELECT rel.relname AS tabla, con.conname AS restriccion, pg_get_constraintdef(con.oid) AS condicion
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN ('memberships', 'invitations')
  AND con.contype = 'c'
ORDER BY rel.relname;
