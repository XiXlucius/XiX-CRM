import { useCallback, useEffect, useState } from 'react';
import { UserCog, ShieldCheck, RotateCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';
import { ROLES } from '../data';
import { Card } from './ui';
import type { Role } from '../types';

/**
 * Gestión de usuarios de la organización — solo visible para admin.
 *
 * Los datos NO salen de una tabla directa: `auth.users` no es legible desde el
 * cliente, así que el correo de cada miembro viene de `list_org_members()`, una
 * función del servidor que además comprueba que quien pregunta sea admin.
 * Asignar rol pasa por `set_member_role()` por el mismo motivo: la decisión de
 * quién puede hacerlo vive en el servidor, no aquí.
 *
 * Ver MIGRACION-USUARIO-NUEVO.sql
 */

interface Member {
  membership_id: string;
  member_user_id: string;
  email: string;
  member_role: Role;
  active: boolean;
  joined_at: string;
}

const ASIGNABLES: Role[] = ['nuevo', 'vendedor', 'supervisor', 'gerente', 'admin'];

export function OrgMembers() {
  const { role } = useOrg();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('list_org_members');
    if (err) setError(friendlyError(err));
    else setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (role === 'admin') load();
    else setLoading(false);
  }, [role, load]);

  // La pestaña Equipo ya la ven gerentes y supervisores; esta sección no.
  if (role !== 'admin') return null;

  const cambiarRol = async (m: Member, nuevo: Role) => {
    if (nuevo === m.member_role) return;
    setSaving(m.membership_id);
    const { error: err } = await supabase.rpc('set_member_role', {
      p_membership: m.membership_id,
      p_role: nuevo,
    });
    setSaving(null);
    if (err) {
      toast.error(friendlyError(err));
      return;
    }
    toast.success(`${m.email} ahora es ${ROLES.find((r) => r.id === nuevo)?.label ?? nuevo}`);
    load();
  };

  const pendientes = members.filter((m) => m.member_role === 'nuevo').length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300">
            <UserCog size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-medium">Usuarios del sistema</h3>
            <p className="text-xs text-slate-500">
              {pendientes > 0
                ? `${pendientes} ${pendientes === 1 ? 'cuenta pendiente' : 'cuentas pendientes'} de asignar`
                : 'Quién puede entrar y con qué permisos'}
            </p>
          </div>
        </div>
        <button onClick={load} className="btn-ghost px-3 py-1.5 text-xs" disabled={loading}>
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 mb-4">
          <AlertTriangle size={16} className="text-danger-400 mt-0.5 shrink-0" />
          <p className="text-sm text-danger-400">{error}</p>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500 py-4">Cargando usuarios...</p>}

      {!loading && !error && members.length === 0 && (
        <p className="text-sm text-slate-500 py-4">
          Todavía no hay más usuarios registrados.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {members.map((m) => {
          const esPendiente = m.member_role === 'nuevo';
          return (
            <div
              key={m.membership_id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors ${
                esPendiente
                  ? 'border-warning-500/30 bg-warning-500/[0.06]'
                  : 'border-tint/10 bg-ink-900/30'
              }`}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900/80 ring-1 ring-tint/10 text-accent-300 text-xs font-semibold">
                {m.email.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium text-metal-100 truncate">{m.email}</p>
                <p className="text-xs text-slate-500">
                  {esPendiente ? 'Esperando que le asignes un rol' : `Desde ${new Date(m.joined_at).toLocaleDateString('es-VE')}`}
                  {!m.active && ' · desactivado'}
                </p>
              </div>

              <select
                className="input w-auto min-w-[150px] py-1.5 text-sm"
                value={m.member_role}
                disabled={saving === m.membership_id}
                onChange={(e) => cambiarRol(m, e.target.value as Role)}
              >
                {ASIGNABLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLES.find((x) => x.id === r)?.label ?? r}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-600" />
        Quien se registre entra con el rol <strong className="text-slate-400">Usuario nuevo</strong>,
        sin ningún acceso, hasta que le asignes uno aquí. El servidor comprueba
        que seas administrador en cada cambio — no basta con ver esta pantalla.
      </p>
    </Card>
  );
}
