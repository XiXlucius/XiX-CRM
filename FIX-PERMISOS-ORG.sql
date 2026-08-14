/*
================================================================================
  PARCHE — "No tienes permiso para realizar esta acción" al entrar por primera vez

  CAUSA
  `store.tsx` crea la organización con:
      .from('organizations').insert({...}).select('id').single()

  Ese `.select()` lee de vuelta la fila recién insertada. La política de lectura
  original era:
      USING (id = current_org_id())

  ...pero `current_org_id()` resuelve la organización a través de tu MEMBRESÍA,
  y la membresía se crea en el paso SIGUIENTE. En ese instante devuelve NULL, la
  lectura se bloquea y la app corta con "No tienes permiso".

  ARREGLO
  El dueño de una organización siempre puede leerla, tenga membresía o no.
  Y siempre puedes leer tus propias membresías.

  Es seguro correrlo varias veces. No borra datos ni cambia estructura:
  solo reemplaza dos políticas de lectura.

  CÓMO CORRERLO
  Supabase -> SQL Editor -> New query -> pegar todo -> Run.
================================================================================
*/

-- 1. El dueño puede leer su organización aunque aún no tenga membresía.
DROP POLICY IF EXISTS "select_own_org" ON organizations;
CREATE POLICY "select_own_org" ON organizations
  FOR SELECT TO authenticated
  USING (id = current_org_id() OR owner_id = auth.uid());

-- 2. Siempre puedes leer tus propias membresías (además de las de tu org).
DROP POLICY IF EXISTS "org_select_memberships" ON memberships;
CREATE POLICY "org_select_memberships" ON memberships
  FOR SELECT TO authenticated
  USING (org_id = current_org_id() OR user_id = auth.uid());


-- ############################################################################
-- VERIFICACION — debe devolver las 2 politicas con su condicion nueva
-- ############################################################################

SELECT tablename AS tabla, policyname AS politica, qual AS condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('select_own_org', 'org_select_memberships')
ORDER BY tablename;
