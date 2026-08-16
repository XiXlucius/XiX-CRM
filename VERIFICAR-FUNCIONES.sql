/*
================================================================================
  Diagnostico: "Could not find the function public.join_default_org"

  Ese error tiene DOS causas posibles:

    A) La migracion nunca se aplico  -> la consulta 1 no devuelve nada
    B) Se aplico, pero PostgREST     -> la consulta 1 SI devuelve filas
       tiene la cache vieja             y basta con el NOTIFY de abajo

  Corre este archivo entero y mira el resultado de la primera consulta.
================================================================================
*/

-- ============ 1. ¿Existen las funciones? ============
-- Deben aparecer las 4. Si sale VACIO, la migracion no se aplico:
-- vuelve a correr MIGRACION-USUARIO-NUEVO.sql completo.

SELECT
  p.proname       AS funcion,
  pg_get_function_identity_arguments(p.oid) AS argumentos,
  p.prosecdef     AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('join_default_org', 'list_org_members', 'set_member_role', 'set_member_active')
ORDER BY p.proname;


-- ============ 2. ¿Tiene permiso de ejecucion el rol `authenticated`? ============
-- Si una funcion existe pero no aparece aqui, le falta el GRANT.

SELECT routine_name AS funcion, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('join_default_org', 'list_org_members', 'set_member_role', 'set_member_active')
  AND grantee = 'authenticated'
ORDER BY routine_name;


-- ============ 3. Forzar el refresco de la cache de PostgREST ============
-- Esto arregla el caso B. Es inofensivo correrlo siempre.

NOTIFY pgrst, 'reload schema';


-- ============ 4. Red de seguridad: volver a otorgar los permisos ============
-- Si las funciones existian pero sin GRANT, esto lo corrige. Si no existen,
-- estas lineas fallaran: en ese caso el problema es el caso A.

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION join_default_org() TO authenticated;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'join_default_org() NO EXISTE — corre MIGRACION-USUARIO-NUEVO.sql';
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION list_org_members() TO authenticated;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'list_org_members() NO EXISTE';
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION set_member_role(uuid, text) TO authenticated;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'set_member_role() NO EXISTE';
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION set_member_active(uuid, boolean) TO authenticated;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'set_member_active() NO EXISTE';
END $$;

NOTIFY pgrst, 'reload schema';
