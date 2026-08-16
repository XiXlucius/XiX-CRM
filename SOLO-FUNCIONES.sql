/*
================================================================================
  SOLO LAS FUNCIONES — version minima

  El archivo grande empezaba con ALTER TABLE sobre restricciones cuyo nombre
  puede no coincidir en tu base. Si eso falla, el SQL Editor revierte TODO el
  script y las funciones nunca se crean.

  Este archivo no toca ninguna tabla: solo crea las 4 funciones y termina con
  un SELECT, para que el editor te muestre el resultado y sepas que funciono.

  PEGALO SOLO. Ctrl+A en el editor primero, para borrar lo que hubiera antes.
================================================================================
*/

-- ============ 1. Alta de usuarios ============
CREATE OR REPLACE FUNCTION join_default_org()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  existing uuid;
  target uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No hay sesion activa';
  END IF;

  SELECT org_id INTO existing
  FROM memberships WHERE user_id = uid AND active LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  SELECT id INTO target FROM organizations ORDER BY created_at ASC LIMIT 1;

  IF target IS NULL THEN
    INSERT INTO organizations (name, owner_id)
      VALUES ('Mi organizacion', uid) RETURNING id INTO target;
    INSERT INTO memberships (org_id, user_id, role, active)
      VALUES (target, uid, 'admin', true);
  ELSE
    INSERT INTO memberships (org_id, user_id, role, active)
      VALUES (target, uid, 'nuevo', true);
  END IF;

  RETURN target;
END $$;


-- ============ 2. Listar miembros con su correo ============
CREATE OR REPLACE FUNCTION list_org_members()
RETURNS TABLE (
  membership_id uuid,
  member_user_id uuid,
  email text,
  member_role text,
  active boolean,
  joined_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid := current_org_id();
BEGIN
  IF org IS NULL THEN RETURN; END IF;
  IF user_role(org) <> 'admin' THEN RETURN; END IF;

  RETURN QUERY
    SELECT m.id, m.user_id, u.email::text, m.role, m.active, m.created_at
    FROM memberships m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.org_id = org
    ORDER BY
      CASE WHEN m.role = 'nuevo' THEN 0 ELSE 1 END,
      m.created_at ASC;
END $$;


-- ============ 3. Asignar rol (solo admin) ============
CREATE OR REPLACE FUNCTION set_member_role(p_membership uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid := current_org_id();
  admins int;
  es_uno_mismo boolean;
BEGIN
  IF org IS NULL OR user_role(org) <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede asignar roles';
  END IF;

  IF p_role NOT IN ('nuevo', 'admin', 'gerente', 'supervisor', 'vendedor') THEN
    RAISE EXCEPTION 'Rol invalido: %', p_role;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM memberships WHERE id = p_membership AND user_id = auth.uid()
  ) INTO es_uno_mismo;

  SELECT count(*) INTO admins
  FROM memberships WHERE org_id = org AND role = 'admin' AND active;

  IF es_uno_mismo AND p_role <> 'admin' AND admins <= 1 THEN
    RAISE EXCEPTION 'No puedes quitarte el rol de admin: eres el unico administrador';
  END IF;

  UPDATE memberships SET role = p_role
  WHERE id = p_membership AND org_id = org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa membresia no pertenece a tu organizacion';
  END IF;
END $$;


-- ============ 4. Activar / desactivar (solo admin) ============
CREATE OR REPLACE FUNCTION set_member_active(p_membership uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  org uuid := current_org_id();
BEGIN
  IF org IS NULL OR user_role(org) <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede activar o desactivar miembros';
  END IF;

  IF EXISTS (SELECT 1 FROM memberships WHERE id = p_membership AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'No puedes desactivarte a ti mismo';
  END IF;

  UPDATE memberships SET active = p_active
  WHERE id = p_membership AND org_id = org;
END $$;


-- ============ 5. Permisos de ejecucion ============
GRANT EXECUTE ON FUNCTION join_default_org()                  TO authenticated;
GRANT EXECUTE ON FUNCTION list_org_members()                  TO authenticated;
GRANT EXECUTE ON FUNCTION set_member_role(uuid, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION set_member_active(uuid, boolean)    TO authenticated;

NOTIFY pgrst, 'reload schema';


-- ############################################################################
-- RESULTADO — deben salir las 4 filas. Si sale vacio, algo fallo antes.
-- ############################################################################

SELECT p.proname AS funcion, p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('join_default_org', 'list_org_members', 'set_member_role', 'set_member_active')
ORDER BY p.proname;
