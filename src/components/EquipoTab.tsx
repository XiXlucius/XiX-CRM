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
} from 'lucide-react';
import { useStore } from '../store';
import { ROLES } from '../data';
import type { TeamMember, Role } from '../types';
import { Card, SectionHeader, Modal, fmtMoney, fmtPct, fmtDate } from './ui';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  vendedor: 'Vendedor',
};

export function EquipoTab() {
  const { team, toggleTeamActive, updateTeamMember, addTeamMember } = useStore();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [adding, setAdding] = useState(false);

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
        <SummaryTile icon={<Wallet size={16} />} label="Cartera total" value={fmtMoney(totals.totalPortfolio)} accent="text-sky-300" />
      </div>

      {/* Roster */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-850">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
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
            <tbody className="divide-y divide-white/5">
              {team.map((m) => {
                const pct = m.goalMonthly ? (m.achievedMonthly / m.goalMonthly) * 100 : 0;
                return (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent-500/20 to-violet-500/20 text-accent-300 text-xs font-semibold">
                          {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{m.name}</p>
                          <p className="text-[11px] text-slate-500">Desde {fmtDate(m.joinedAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip bg-white/5 text-slate-300">{ROLE_LABELS[m.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-sm text-white">{fmtMoney(m.achievedMonthly)}</p>
                      <p className="text-[11px] text-slate-500">/ {fmtMoney(m.goalMonthly)}</p>
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-success-500' : 'bg-accent-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{fmtPct(m.commissionRatePct)}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{fmtMoney(m.activePortfolio)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono ${m.delinquencyPct > 8 ? 'text-danger-400' : m.delinquencyPct > 5 ? 'text-warning-400' : 'text-success-500'}`}>
                        {fmtPct(m.delinquencyPct)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleTeamActive(m.id)}
                        className={`chip transition-colors ${
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
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleTeamActive(m.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <Power size={14} />
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

      {/* Edit modal */}
      <MemberModal
        open={!!editing}
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) updateTeamMember(editing.id, patch as Partial<TeamMember>);
          setEditing(null);
        }}
      />

      {/* Add modal */}
      <MemberModal
        open={adding}
        member={null}
        onClose={() => setAdding(false)}
        onSave={(m) => {
          addTeamMember(m as Omit<TeamMember, 'id' | 'joinedAt'>);
          setAdding(false);
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
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-semibold text-white">{value}</p>
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
  onSave: (data: Omit<TeamMember, 'id' | 'joinedAt'>) => void;
}) {
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
      });
    }
  }, [member, open]);

  const set = (k: keyof typeof form, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name) return;
    onSave(form);
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
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} className="btn-primary">
            <UserPlus size={15} /> {member ? 'Guardar cambios' : 'Agregar miembro'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
