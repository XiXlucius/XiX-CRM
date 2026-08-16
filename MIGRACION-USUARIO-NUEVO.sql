/*
================================================================================
  Rol "usuario nuevo" — solo el administrador asigna roles

  QUE CAMBIA
  Hoy, cuando alguien se registra, `ensureOrgId()` le crea una ORGANIZACION
  NUEVA y lo pone de administrador de la suya. Es decir: cada persona termina
  con su propio CRM vacio, aislado del tuyo.

  Despues de esta migracion:
    - El primer usuario que exista (tu) es admin de la organizacion.
    - Cualquiera que se registre despues entra a TU organizacion con el rol
      `nuevo`, que no tiene ningun permiso.
    - Solo un admin puede cambiarle el rol a alguien.
    - Nadie puede crear organizaciones desde la aplicacion.

  COMO CORRERLA
    Supabase -> SQL Editor -> New query -> pegar todo -> Run.

  Es segura de correr varias veces.
================================================================================
*/

-- ============ 1. Permitir el rol `nuevo` ============
-- La restriccion original solo aceptaba admin/gerente/supervisor/vendedor, asi
-- que `nuevo` ni siquiera se podia guardar.

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('nuevo', 'admin', 'gerente', 'supervisor', 'vendedor'));

ALTER TABLE invitations DROP CONSTRAINT IF EXISTS invitations_role_check;
ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
  CHECK (role IN ('nuevo', 'admin', 'gerente', 'supervisor', 'vendedor'));

-- `nuevo` no lleva NINGUNA fila en role_permissions. Sin filas = sin permisos.
DELETE FROM role_permissions WHERE role = 'nuevo';


-- ============ 2. Alta de usuarios ============
-- SECURITY DEFINER: corre con privilegios del dueno de la funcion, asi que
-- puede insertar la membresia aunque las politicas RLS se lo prohiban al
-- usuario. Es la UNICA via por la que alguien entra a la organizacion, y solo
-- sabe otorgar el rol `nuevo`.

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

  -- Ya pertenece a una organizacion: devolverla tal cual.
  SELECT org_id INTO existing
  FROM memberships WHERE user_id = uid AND active LIMIT 1;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  -- La organizacion es la mas antigua que exista.
  SELECT id INTO target FROM organizations ORDER BY created_at ASC LIMIT 1;

  IF target IS NULL THEN
    -- No hay ninguna: este es el primer usuario del sistema. Es el admin.
    INSERT INTO organizations (name, owner_id)
      VALUES ('Mi organizacion', uid) RETURNING id INTO target;
    INSERT INTO memberships (org_id, user_id, role, active)
      VALUES (target, uid, 'admin', true);
  ELSE
    -- Ya existe: entra sin permisos, a la espera de que un admin le asigne rol.
    INSERT INTO memberships (org_id, user_id, role, active)
      VALUES (target, uid, 'nuevo', true);
  END IF;

  RETURN target;
END $$;

GRANT EXECUTE ON FUNCTION join_default_org() TO authenticated;


-- ============ 3. Listar los miembros con su correo ============
-- `auth.users` no es legible desde el cliente, asi que hace falta una funcion.
-- Solo responde si quien pregunta es admin de la organizacion.

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
      CASE WHEN m.role = 'nuevo' THEN 0 ELSE 1 END,  -- pendientes primero
      m.created_at ASC;
END $$;

GRANT EXECUTE ON FUNCTION list_org_members() TO authenticated;


-- ============ 4. Asignar rol (solo admin) ============

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

  -- Salvaguarda: no dejar la organizacion sin ningun administrador.
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

GRANT EXECUTE ON FUNCTION set_member_role(uuid, text) TO authenticated;


-- ============ 5. Activar / desactivar un miembro (solo admin) ============

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

GRANT EXECUTE ON FUNCTION set_member_active(uuid, boolean) TO authenticated;


-- ============ 6. Nadie crea organizaciones desde la aplicacion ============
-- `join_default_org()` la crea si hace falta, y corre con privilegios propios.
DROP POLICY IF EXISTS "insert_own_org" ON organizations;


-- ############################################################################
-- VERIFICACION
-- Debe mostrar tu usuario como `admin`, y las 4 funciones creadas.
-- ############################################################################

SELECT u.email, m.role, m.active, o.name AS organizacion
FROM memberships m
JOIN organizations o ON o.id = m.org_id
JOIN auth.users u ON u.id = m.user_id
ORDER BY m.created_at;

SELECT proname AS funcion
FROM pg_proc
WHERE proname IN ('join_default_org', 'list_org_members', 'set_member_role', 'set_member_active')
ORDER BY proname;
