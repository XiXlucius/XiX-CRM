import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Role } from '../types';

// Ver HANDOFF-MULTIUSUARIO.md (Fase 3.2). El rol ya no es un valor local que cualquiera cambia
// desde la consola — viene de la membership real del usuario en el servidor, y los permisos
// vienen de role_permissions (RLS es quien de verdad los hace cumplir; esto es solo para la UI).
interface OrgContextValue {
  orgId: string | null;
  role: Role | null;
  permissions: string[];
  loading: boolean;
  needsOnboarding: boolean;
  createOrganization: (name: string) => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // Garantiza que la membresía exista ANTES de leerla.
    //
    // Antes esto no estaba y había una carrera en el primer registro:
    // OrgProvider consultaba `memberships` y no encontraba nada, porque quien
    // creaba la fila era `store.tsx` un instante después. Como OrgContext solo
    // se recarga cuando cambia `user.id`, el rol se quedaba en `null` hasta que
    // el usuario refrescara la página — y con rol nulo no se mostraba la
    // pantalla de espera.
    //
    // `join_default_org()` es idempotente: si ya hay membresía, la devuelve sin
    // tocar nada. Si la función no existe todavía (migración sin aplicar), se
    // registra el error y se sigue: la consulta de abajo dirá que no hay
    // membresía y la app mostrará el aviso correspondiente.
    const { error: joinErr } = await supabase.rpc('join_default_org');
    if (joinErr) console.error('[OrgContext] join_default_org:', joinErr.message);

    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setOrgId(null);
      setRole(null);
      setPermissions([]);
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }

    const { data: perms } = await supabase.from('role_permissions').select('permission').eq('role', membership.role);
    setOrgId(membership.org_id);
    setRole(membership.role as Role);
    setPermissions((perms ?? []).map((p) => p.permission as string));
    setNeedsOnboarding(false);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const createOrganization = async (name: string) => {
    if (!user) return;
    const { data: org, error: orgErr } = await supabase.from('organizations').insert({ name, owner_id: user.id }).select('id').single();
    if (orgErr) throw orgErr;
    const { error: memErr } = await supabase.from('memberships').insert({ org_id: org!.id, user_id: user.id, role: 'admin', active: true });
    if (memErr) throw memErr;
    await load();
  };

  return (
    <OrgContext.Provider value={{ orgId, role, permissions, loading, needsOnboarding, createOrganization }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
  return ctx;
}
