/*
================================================================================
  Verificacion completa de la base de datos

  Devuelve UNA sola fila. Cada columna dice OK o FALTA.
  Todo lo que diga FALTA hay que arreglarlo antes de que el flujo funcione.

  PEGALO SOLO. Ctrl+A en el editor primero.
================================================================================
*/

SELECT
  -- 1. Las 4 funciones del sistema de roles
  CASE WHEN (
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('join_default_org','list_org_members','set_member_role','set_member_active')
  ) = 4 THEN 'OK' ELSE 'FALTA -> correr SOLO-FUNCIONES.sql' END
  AS "1_funciones",

  -- 2. La restriccion de memberships acepta el rol `nuevo`
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' AND rel.relname = 'memberships'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%nuevo%'
  ) THEN 'OK' ELSE 'FALTA -> correr PERMITIR-ROL-NUEVO.sql' END
  AS "2_rol_nuevo",

  -- 3. El rol `nuevo` no tiene NINGUN permiso
  CASE WHEN (
    SELECT count(*) FROM role_permissions WHERE role = 'nuevo'
  ) = 0 THEN 'OK' ELSE 'MAL -> tiene permisos, no deberia' END
  AS "3_nuevo_sin_permisos",

  -- 4. Existe exactamente UNA organizacion
  CASE
    WHEN (SELECT count(*) FROM organizations) = 1 THEN 'OK'
    WHEN (SELECT count(*) FROM organizations) = 0 THEN 'FALTA -> no hay ninguna'
    ELSE 'REVISAR -> hay ' || (SELECT count(*) FROM organizations)::text || ', deberia haber 1'
  END
  AS "4_organizaciones",

  -- 5. Hay al menos un admin
  CASE WHEN (
    SELECT count(*) FROM memberships WHERE role = 'admin' AND active
  ) >= 1 THEN 'OK' ELSE 'MAL -> nadie puede asignar roles' END
  AS "5_hay_admin",

  -- 6. Nadie puede crear organizaciones desde la app
  CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations'
      AND policyname = 'insert_own_org'
  ) THEN 'OK' ELSE 'REVISAR -> la politica sigue activa' END
  AS "6_sin_orgs_libres";


-- ############################################################################
-- Detalle: quien esta registrado y con que rol
-- ############################################################################

SELECT
  u.email,
  m.role   AS rol,
  m.active AS activo,
  o.name   AS organizacion,
  m.created_at AS registrado
FROM memberships m
JOIN organizations o ON o.id = m.org_id
JOIN auth.users u ON u.id = m.user_id
ORDER BY m.created_at;
