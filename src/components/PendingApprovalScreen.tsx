import { Clock, LogOut, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ParticleField } from './ParticleField';

/**
 * Pantalla para cuentas con rol `nuevo`: registradas correctamente, pero sin
 * ningún permiso hasta que un administrador les asigne un rol.
 *
 * No es solo cosmética — quien tiene rol `nuevo` no aparece en ninguna política
 * de RLS, así que cualquier consulta le devolvería vacío o un error de permisos.
 * Mostrarle el CRM sería enseñarle una app rota.
 */
export function PendingApprovalScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <ParticleField variant="login" />

      <div className="relative max-w-md text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-ink-900/80 ring-1 ring-accent-500/30 shadow-glow">
          <Clock size={26} className="text-accent-300" />
        </div>

        <h1 className="font-display text-2xl font-medium mb-3">
          Tu solicitud de registro se ha creado
        </h1>

        <p className="text-sm text-metal-300 leading-relaxed mb-2">
          Tu cuenta quedó registrada correctamente. Un administrador tiene que
          aprobarla y asignarte un rol antes de que puedas entrar al CRM.
        </p>

        {user?.email && (
          <p className="text-xs text-metal-500 mb-8">
            Registrado como <span className="text-metal-300">{user.email}</span>
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button onClick={() => window.location.reload()} className="btn-primary">
            <RotateCw size={15} /> Ya me aprobaron
          </button>
          <button onClick={logout} className="btn-ghost">
            <LogOut size={15} /> Salir
          </button>
        </div>

        <p className="mt-8 text-xs text-metal-500 leading-relaxed">
          Si crees que esto es un error, avisa a quien administra el CRM.
        </p>
      </div>
    </div>
  );
}
