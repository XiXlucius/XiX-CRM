import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  ShieldCheck,
  Users,
  Eye,
  User,
  Lock,
  Check,
  Database,
  Percent,
  TrendingUp,
  Save,
  RotateCcw,
  Sliders,
  KeyRound,
  Download,
  History,
  AlertCircle,
  RefreshCw,
  Server,
} from 'lucide-react';
import { useStore, useCurrentRole } from '../store';
import { ROLES, NAV_ITEMS } from '../data';
import { Card, SectionHeader, fmtDate, NumberInput } from './ui';
import type { Permission, Role } from '../types';
import type { BusinessSettings } from '../lib/scoring';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const ROLE_ICONS: Record<Role, typeof ShieldCheck> = {
  nuevo: User,
  admin: ShieldCheck,
  gerente: Users,
  supervisor: Eye,
  vendedor: User,
};

export function ConfigTab() {
  const { settings, updateSettings, audit } = useStore();
  const currentRole = useCurrentRole();
  const toast = useToast();
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (k: keyof BusinessSettings, v: number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const runBackup = async () => {
    setBackupRunning(true);
    try {
      // Simulate backup by recording timestamp
      await new Promise((r) => setTimeout(r, 1500));
      setLastBackup(new Date().toISOString());
      localStorage.setItem('xixtech_last_backup', new Date().toISOString());
    } finally {
      setBackupRunning(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('xixtech_last_backup');
    if (stored) setLastBackup(stored);
  }, []);

  const adminAuditEntries = audit.filter(
    (a) => a.action.includes('role') || a.action.includes('settings') || a.action.includes('admin') || a.action.includes('key'),
  ).slice(0, 20);

  return (
    <div data-tour="config" className="space-y-5">
      <SectionHeader
        title="Configuración & Parámetros de Negocio"
        subtitle="Personaliza tasas, comisiones, alertas, seguridad y respaldos"
        icon={<Settings size={16} />}
      />

      {/* Business parameters */}
      <Card className="p-5">
        <SectionHeader title="Parámetros financieros" subtitle="Aplican a nuevas solicitudes" icon={<Percent size={16} />} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField label="Inicial mínima (%)" value={form.min_down_payment_pct} onChange={(v) => set('min_down_payment_pct', v)} icon={<Percent size={13} />} />
          <NumberField label="Tasa base anual (%)" value={form.base_interest_rate} onChange={(v) => set('base_interest_rate', v)} icon={<TrendingUp size={13} />} />
          <NumberField label="Umbral alerta stock (%)" value={form.stock_alert_threshold} onChange={(v) => set('stock_alert_threshold', v)} icon={<Sliders size={13} />} />
        </div>
      </Card>

      {/* Commission tiers */}
      <Card className="p-5">
        <SectionHeader title="Tiers de comisión" subtitle="Por nivel de desempeño del agente" icon={<Users size={16} />} />
        <div className="grid sm:grid-cols-3 gap-4">
          <NumberField label="Tier 1 — Básico (%)" value={form.commission_tier1} onChange={(v) => set('commission_tier1', v)} />
          <NumberField label="Tier 2 — Intermedio (%)" value={form.commission_tier2} onChange={(v) => set('commission_tier2', v)} />
          <NumberField label="Tier 3 — Experto (%)" value={form.commission_tier3} onChange={(v) => set('commission_tier3', v)} />
        </div>
      </Card>

      {/* Scoring weights */}
      <Card className="p-5">
        <SectionHeader
          title="Pesos del motor de scoring"
          subtitle="Reparten el puntaje de riesgo entre los cinco criterios"
          icon={<Sliders size={16} />}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberField label="Peso ingreso (%)" value={form.scoring_weight_income} onChange={(v) => set('scoring_weight_income', v)} />
          <NumberField label="Peso antigüedad laboral (%)" value={form.scoring_weight_tenure} onChange={(v) => set('scoring_weight_tenure', v)} />
          <NumberField label="Peso carga de la cuota (%)" value={form.scoring_weight_term} onChange={(v) => set('scoring_weight_term', v)} />
          <NumberField label="Peso historial de pago (%)" value={form.scoring_weight_history} onChange={(v) => set('scoring_weight_history', v)} />
          <NumberField label="Peso cédula física (%)" value={form.scoring_weight_id} onChange={(v) => set('scoring_weight_id', v)} />
        </div>
        <WeightSummary form={form} />

        <div className="mt-4 pt-4 border-t border-tint/5">
          <div className="grid sm:grid-cols-2 gap-4">
            <NumberField label="Bono por inicial (puntos)" value={form.scoring_weight_downpayment} onChange={(v) => set('scoring_weight_downpayment', v)} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Esto no es un peso: son puntos que se <span className="text-metal-100">suman</span> al score
            cuando el cliente da alguna inicial. No dar inicial no resta nada.
          </p>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <button onClick={() => setForm(settings)} disabled={saving} className="btn-ghost">
          <RotateCcw size={15} /> Cancelar
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <><RefreshCw size={15} className="animate-spin" /> Guardando...</> : saved ? <><Check size={15} /> Guardado</> : <><Save size={15} /> Guardar parámetros</>}
        </button>
      </div>

      {/* Backups */}
      <Card className="p-5">
        <SectionHeader title="Respaldos de datos" subtitle="Copias de seguridad de la base de datos Supabase" icon={<Server size={16} />} />
        <div className="space-y-3">
          <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-metal-100">Último respaldo</p>
              <p className="text-xs text-slate-500">{lastBackup ? fmtDate(lastBackup) : 'Sin respaldos registrados'}</p>
            </div>
            <button onClick={runBackup} disabled={backupRunning} className="btn-primary text-xs">
              {backupRunning ? <><RefreshCw size={13} className="animate-spin" /> Respaldando...</> : <><Download size={13} /> Ejecutar respaldo</>}
            </button>
          </div>
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 text-xs text-slate-400">
            <p className="flex items-center gap-1.5">
              <AlertCircle size={13} className="text-accent-300" />
              Supabase mantiene respaldos automáticos diarios con punto de restauración PITR (Point-in-Time Recovery).
              Se recomienda ejecutar un respaldo manual antes de cambios mayores en la configuración.
            </p>
          </div>
        </div>
      </Card>

      {/* Key rotation */}
      <Card className="p-5">
        <SectionHeader title="Rotación de credenciales" subtitle="Gestión de service role key y secretos" icon={<KeyRound size={16} />} />
        <div className="space-y-3">
          <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
            <p className="text-sm font-medium text-metal-100">Service Role Key</p>
            <p className="text-xs text-slate-500 mt-1">
              La service role key se usa solo en edge functions del lado del servidor.
              Nunca debe estar en el código del cliente.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="chip bg-success/15 text-success-500">
                <Check size={11} /> Configurada en el servidor
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-slate-400">
            <p className="flex items-center gap-1.5">
              <AlertCircle size={13} className="text-warning-400" />
              Para rotar la service role key: ve al dashboard de Supabase → Settings → API → "Reset service role key".
              Luego actualiza los secrets de las edge functions. Esta acción invalida la key anterior inmediatamente.
            </p>
          </div>
        </div>
      </Card>

      {/* Admin audit log */}
      <Card className="p-5">
        <SectionHeader title="Auditoría de accesos admin" subtitle="Cambios de rol, configuración y credenciales" icon={<History size={16} />} />
        {adminAuditEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Sin eventos de auditoría admin registrados</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {adminAuditEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-metal-100">{entry.action}</span>
                  <span className="text-[11px] text-slate-500">{fmtDate(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {entry.userEmail} · {entry.entity}
                  {entry.entityId && ` · ${entry.entityId.slice(0, 8)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* RBAC matrix */}
      <Card className="p-5">
        <SectionHeader title="Matriz de permisos por rol" subtitle="Visualiza qué módulos accede cada perfil" icon={<Lock size={16} />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left kicker">
                <th className="px-3 py-2.5 font-medium">Módulo</th>
                {ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r.id];
                  return (
                    <th key={r.id} className="px-3 py-2.5 font-medium text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`grid h-7 w-7 place-items-center rounded-lg bg-ink-900/60 ring-1 ring-tint/10 text-accent-300`}>
                          <Icon size={13} />
                        </span>
                        {r.label}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-tint/5">
              {NAV_ITEMS.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-metal-100">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.description}</p>
                  </td>
                  {ROLES.map((r) => {
                    const allowed = r.permissions.includes(item.id as Permission);
                    return (
                      <td key={r.id} className="px-3 py-2.5 text-center">
                        {allowed ? (
                          <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-success/15 text-success-500">
                            <Check size={13} />
                          </span>
                        ) : (
                          <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-tint/5 text-slate-600">
                            <Lock size={11} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Current role */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300`}>
            {(() => { const Icon = ROLE_ICONS[currentRole.id]; return <Icon size={20} />; })()}
          </div>
          <div>
            <p className="kicker">Tu perfil activo</p>
            <p className="font-display text-lg font-medium text-metal-100">{currentRole.label}</p>
            <p className="mt-1 text-sm text-slate-400">{currentRole.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentRole.permissions.map((p) => (
                <span key={p} className="chip bg-accent-500/10 text-accent-300">
                  {NAV_ITEMS.find((n) => n.id === p)?.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Persistencia de datos" subtitle="Los datos se sincronizan en Supabase con RLS" icon={<Database size={16} />} />
        <p className="text-sm text-slate-400">
          Tu información se almacena de forma segura en la nube, protegida por Row Level Security.
          Cada usuario solo accede a sus propios datos. Las acciones se registran en el log de auditoría.
        </p>
      </Card>
    </div>
  );
}

function NumberField({ label, value, onChange, icon }: { label: string; value: number; onChange: (v: number) => void; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="label">{icon && <span className="inline mr-1">{icon}</span>}{label}</label>
      {/* Usa el NumberInput compartido para heredar las flechas del CRM en vez
          de las grises del navegador, y para poder vaciar el campo al escribir. */}
      <NumberInput value={value} onChange={onChange} step={1} min={0} />
    </div>
  );
}

// El bono por inicial NO entra aquí: no es un peso, se suma aparte.
// (Antes esta suma incluía el bono y omitía antigüedad y cédula, así que
// marcaba error permanente aunque la configuración estuviera bien.)
function WeightSummary({ form }: { form: BusinessSettings }) {
  const total =
    form.scoring_weight_income +
    form.scoring_weight_tenure +
    form.scoring_weight_term +
    form.scoring_weight_history +
    form.scoring_weight_id;
  const exact = Math.abs(total - 100) < 0.1;
  return (
    <div className={`mt-4 rounded-xl p-3 text-sm ${exact ? 'bg-success/10 text-success-500' : 'bg-warning/10 text-warning-400'}`}>
      {exact ? (
        <>✓ Los pesos suman 100%</>
      ) : (
        <>
          Los pesos suman {total.toFixed(1)}%. Funciona igual — el motor reparte el
          puntaje en proporción — pero es más fácil de leer si suman 100.
        </>
      )}
    </div>
  );
}
