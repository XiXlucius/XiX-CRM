import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Filter, User, FileText, Boxes, Users, ReceiptText, Settings as SettingsIcon, CheckCircle2, Pencil, Trash2, Plus } from 'lucide-react';
import { useStore } from '../store';
import { Card, SectionHeader, EmptyState, fmtDate } from './ui';

const ENTITY_ICONS: Record<string, typeof User> = {
  client: User,
  invoice: ReceiptText,
  product: Boxes,
  team_member: Users,
  business_settings: SettingsIcon,
  invoices: ReceiptText,
};

const ACTION_STYLES: Record<string, { color: string; label: string }> = {
  create: { color: 'bg-success/15 text-success-500', label: 'Crear' },
  update: { color: 'bg-accent-500/15 text-accent-300', label: 'Editar' },
  delete: { color: 'bg-danger/15 text-danger-400', label: 'Eliminar' },
  pay_invoice: { color: 'bg-success/15 text-success-500', label: 'Pagar' },
  toggle_active: { color: 'bg-warning/15 text-warning-400', label: 'Activar/Desactivar' },
  generate_schedule: { color: 'bg-violet-500/15 text-violet-400', label: 'Generar cronograma' },
  update_settings: { color: 'bg-accent-500/15 text-accent-300', label: 'Configurar' },
};

export function AuditoriaTab() {
  const { audit } = useStore();
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const entities = useMemo(() => {
    const set = new Set(audit.map((a) => a.entity));
    return ['all', ...Array.from(set)];
  }, [audit]);

  const filtered = useMemo(
    () => (entityFilter === 'all' ? audit : audit.filter((a) => a.entity === entityFilter)),
    [audit, entityFilter],
  );

  return (
    <div data-tour="auditoria" className="space-y-5">
      <SectionHeader
        title="Auditoría & Trazabilidad"
        subtitle={`${audit.length} eventos registrados`}
        icon={<History size={16} />}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500"><Filter size={13} /> Entidad:</span>
        {entities.map((e) => (
          <button
            key={e}
            onClick={() => setEntityFilter(e)}
            className={`chip transition-colors ${
              entityFilter === e ? 'bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/30' : 'bg-tint/5 text-slate-400 hover:text-metal-100'
            }`}
          >
            {e === 'all' ? 'Todas' : e.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<History size={22} />} title="Sin eventos de auditoría" body="Las acciones que realices se registrarán aquí automáticamente." />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-850 backdrop-blur-sm">
                <tr className="text-left kicker">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tint/5">
                {filtered.map((a, i) => {
                  const Icon = ENTITY_ICONS[a.entity] ?? FileText;
                  const actionMeta = ACTION_STYLES[a.action] ?? { color: 'bg-tint/5 text-slate-400', label: a.action };
                  return (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.01, 0.3) }}
                      className="table-row"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-300">{a.userEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`chip text-[10px] ${actionMeta.color}`}>{actionMeta.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Icon size={13} className="text-slate-500" />
                          {a.entity.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                        {a.newValue ? JSON.stringify(a.newValue).slice(0, 80) : '—'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
