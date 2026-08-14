import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersRound,
  Plus,
  Target,
  Percent,
  Wallet,
  TrendingUp,
  Phone,
  Mail,
  Power,
  Pencil,
  UserPlus,
  Loader2,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useStore } from '../store';
import { ROLES } from '../data';
import type { TeamMember, Role } from '../types';
import { Card, SectionHeader, Modal, fmtMoney, fmtPct, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  vendedor: 'Vendedor',
};

export function EquipoTab() {
  const { team, toggleTeamActive, updateTeamMember, addTeamMember } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await toggleTeamActive(id);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setTogglingId(null);
    }
  };

  const totals = useMemo(() => {
    const active = team.filter((m) => m.active);
    return {
      activeCount: active.length,
      totalGoal: active.reduce((a, m) => a + m.goalMonthly, 0),
      totalAchieved: active.reduce((a, m) => a + m.achievedMonthly, 0),
      avgCommission: active.length
        ? active.reduce((a, m) => a + m.commissionRatePct, 0) / active.length
        : 0,
      totalPortfolio: active.reduce((a, m) => a + m.activePortfolio, 0),
    };
  }, [team]);

  return (
    <div data-tour="equipo" className="space-y-5">
      <SectionHeader
        title="Equipo & Comisiones"
        subtitle={`${team.length} miembros · ${totals.activeCount} activos`}
        icon={<UsersRound size={16} />}
        action={
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={15} /> <span className="hidden sm:inline">Nuevo miembro</span>
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile icon={<Target size={16} />} label="Meta del equipo" value={fmtMoney(totals.totalGoal)} accent="text-accent-300" />
        <SummaryTile icon={<TrendingUp size={16} />} label="Alcanzado" value={fmtMoney(totals.totalAchieved)} accent="text-success-500" />
        <SummaryTile icon={<Percent size={16} />} label="Comisión promedio" value={fmtPct(totals.avgCommission)} accent="text-violet-400" />
        <SummaryTile icon={<Wallet size={16} />} label="Cartera total" value={fmtMoney(totals.totalPortfolio)} accent="text-metal-300" />
      </div>

      {/* Roster */}
      <Card className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-850">
              <tr className="text-left kicker">
                <th className="px-4 py-3 font-medium">Miembro</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Meta / Logro</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium">Cartera</th>
                <th className="px-4 py-3 font-medium">Mora</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tint/5">
              {team.map((m) => {
                const pct = m.goalMonthly ? (m.achievedMonthly / m.goalMonthly) * 100 : 0;
                return (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900/60 ring-1 ring-tint/10 text-accent-300 text-xs font-semibold">
                          {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-metal-100">{m.name}</p>
                          <p className="text-[11px] text-slate-500">Desde {fmtDate(m.joinedAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip bg-tint/5 text-slate-300">{ROLE_LABELS[m.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="num text-sm text-metal-100">{fmtMoney(m.achievedMonthly)}</p>
                      <p className="text-[11px] text-slate-500">/ {fmtMoney(m.goalMonthly)}</p>
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-tint/5">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-success-500' : 'bg-accent-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 num text-slate-300">{fmtPct(m.commissionRatePct)}</td>
                    <td className="px-4 py-3 num text-slate-300">{fmtMoney(m.activePortfolio)}</td>
                    <td className="px-4 py-3">
                      <span className={`num ${m.delinquencyPct > 8 ? 'text-danger-400' : m.delinquencyPct > 5 ? 'text-warning-400' : 'text-success-500'}`}>
                        {fmtPct(m.delinquencyPct)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(m.id)}
                        disabled={togglingId === m.id}
                        className={`chip transition-colors disabled:opacity-50 ${
                          m.active ? 'bg-success/15 text-success-500' : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${m.active ? 'bg-success-500' : 'bg-slate-500'}`} />
                        {m.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(m)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-tint/5 hover:text-metal-100 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleToggle(m.id)}
                          disabled={togglingId === m.id}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-tint/5 hover:text-metal-100 transition-colors disabled:opacity-50"
                        >
                          {togglingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vista de tarjetas en móvil/tablet — mismos datos y acciones que la tabla */}
      <div className="lg:hidden space-y-3">
        {team.map((m) => (
          <TeamMemberCard key={m.id} member={m} toggling={togglingId === m.id} onToggle={() => handleToggle(m.id)} onEdit={() => setEditing(m)} />
        ))}
      </div>

      {/* Edit modal */}
      <MemberModal
        open={!!editing}
        member={editing}
        onClose={() => setEditing(null)}
        onSave={async (patch) => {
          if (!editing) return;
          try {
            await updateTeamMember(editing.id, patch as Partial<TeamMember>);
            toast.success('Miembro actualizado');
            setEditing(null);
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
      />

      {/* Add modal */}
      <MemberModal
        open={adding}
        member={null}
        onClose={() => setAdding(false)}
        onSave={async (m) => {
          try {
            await addTeamMember(m as Omit<TeamMember, 'id' | 'joinedAt'>);
            toast.success('Miembro agregado');
            setAdding(false);
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}

function SummaryTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={accent}>{icon}</span>
        <span className="kicker">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-medium text-metal-100">{value}</p>
    </Card>
  );
}

function TeamMemberCard({ member: m, toggling, onToggle, onEdit }: { member: TeamMember; toggling: boolean; onToggle: () => void; onEdit: () => void }) {
  const pct = m.goalMonthly ? (m.achievedMonthly / m.goalMonthly) * 100 : 0;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900/60 ring-1 ring-tint/10 text-accent-300 text-xs font-semibold">
            {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-medium text-metal-100">{m.name}</p>
            <p className="text-[11px] text-slate-500">{ROLE_LABELS[m.role]} · Desde {fmtDate(m.joinedAt)}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`chip transition-colors disabled:opacity-50 ${
            m.active ? 'bg-success/15 text-success-500' : 'bg-slate-500/15 text-slate-400'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${m.active ? 'bg-success-500' : 'bg-slate-500'}`} />
          {m.active ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      <div className="mt-3">
        <p className="num text-sm text-metal-100">{fmtMoney(m.achievedMonthly)} <span className="text-[11px] text-slate-500 font-normal">/ {fmtMoney(m.goalMonthly)}</span></p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-tint/5">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-success-500' : 'bg-accent-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[10px] uppercase text-slate-500">Comisión</p>
          <p className="num text-slate-300">{fmtPct(m.commissionRatePct)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Cartera</p>
          <p className="num text-slate-300">{fmtMoney(m.activePortfolio)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500">Mora</p>
          <p className={`num ${m.delinquencyPct > 8 ? 'text-danger-400' : m.delinquencyPct > 5 ? 'text-warning-400' : 'text-success-500'}`}>
            {fmtPct(m.delinquencyPct)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-1 border-t border-tint/5 pt-3">
        <button onClick={onEdit} className="btn-ghost px-2.5 py-1.5 text-xs">
          <Pencil size={13} /> Editar
        </button>
        <button onClick={onToggle} disabled={toggling} className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-50">
          {toggling ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />} {m.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </Card>
  );
}

function MemberModal({
  open,
  member,
  onClose,
  onSave,
}: {
  open: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onSave: (data: Omit<TeamMember, 'id' | 'joinedAt'>) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: 'vendedor' as Role,
    email: '',
    phone: '',
    active: true,
    goalMonthly: 14000,
    achievedMonthly: 0,
    commissionRatePct: 4,
    activePortfolio: 0,
    delinquencyPct: 0,
    originLat: '' as number | '',
    originLng: '' as number | '',
  });

  // sync when opening with existing member
  useEffect(() => {
    if (member) {
      setForm({
        name: member.name,
        role: member.role,
        email: member.email,
        phone: member.phone,
        active: member.active,
        goalMonthly: member.goalMonthly,
        achievedMonthly: member.achievedMonthly,
        commissionRatePct: member.commissionRatePct,
        activePortfolio: member.activePortfolio,
        delinquencyPct: member.delinquencyPct,
        originLat: member.originLat ?? '',
        originLng: member.originLng ?? '',
      });
    } else {
      setForm({
        name: '',
        role: 'vendedor',
        email: '',
        phone: '',
        active: true,
        goalMonthly: 14000,
        achievedMonthly: 0,
        commissionRatePct: 4,
        activePortfolio: 0,
        delinquencyPct: 0,
        originLat: '',
        originLng: '',
      });
    }
  }, [member, open]);

  const set = (k: keyof typeof form, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((f) => ({ ...f, originLat: +pos.coords.latitude.toFixed(5), originLng: +pos.coords.longitude.toFixed(5) }));
    });
  };

  const submit = async () => {
    if (!form.name) return;
    setSubmitting(true);
    try {
      await onSave({
        ...form,
        originLat: form.originLat === '' ? null : form.originLat,
        originLng: form.originLng === '' ? null : form.originLng,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={member ? 'Editar miembro' : 'Nuevo miembro del equipo'} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.filter((r) => r.id !== 'admin').map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label"><Mail size={11} className="inline mr-1" />Email</label>
            <input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="label"><Phone size={11} className="inline mr-1" />Teléfono</label>
            <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Meta mensual ($)</label>
            <input type="number" className="input" value={form.goalMonthly} onChange={(e) => set('goalMonthly', +e.target.value)} />
          </div>
          <div>
            <label className="label">Logrado mensual ($)</label>
            <input type="number" className="input" value={form.achievedMonthly} onChange={(e) => set('achievedMonthly', +e.target.value)} />
          </div>
          <div>
            <label className="label">Comisión (%)</label>
            <input type="number" step="0.1" className="input" value={form.commissionRatePct} onChange={(e) => set('commissionRatePct', +e.target.value)} />
          </div>
          <div>
            <label className="label">Cartera activa ($)</label>
            <input type="number" className="input" value={form.activePortfolio} onChange={(e) => set('activePortfolio', +e.target.value)} />
          </div>
          <div>
            <label className="label">Índice de mora (%)</label>
            <input type="number" step="0.1" className="input" value={form.delinquencyPct} onChange={(e) => set('delinquencyPct', +e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.active ? '1' : '0'} onChange={(e) => set('active', e.target.value === '1')}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Punto de partida (ruta de cobro)</label>
            <button type="button" onClick={useMyLocation} className="btn-ghost text-2xs"><Navigation size={11} /> Usar mi ubicación actual</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.0001" className="input" placeholder="Latitud" value={form.originLat} onChange={(e) => set('originLat', e.target.value === '' ? '' : +e.target.value)} />
            <input type="number" step="0.0001" className="input" placeholder="Longitud" value={form.originLng} onChange={(e) => set('originLng', e.target.value === '' ? '' : +e.target.value)} />
          </div>
          <p className="text-2xs text-slate-500 mt-1 flex items-center gap-1"><MapPin size={10} /> Opcional — si no se define, la ruta del día usa la oficina como respaldo.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Cancelar</button>
          <button onClick={submit} className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><UserPlus size={15} /> {member ? 'Guardar cambios' : 'Agregar miembro'}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
