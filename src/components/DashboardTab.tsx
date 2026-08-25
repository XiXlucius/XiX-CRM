import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useStore } from '../store';
import { CaracasHeatmap } from './CaracasHeatmap';
import { Card, SectionHeader, fmtMoney, fmtPct } from './ui';
import { AnimatedCounter } from './AnimatedCounter';
import { useCurrentRole } from '../store';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

export function DashboardTab() {
  const { clients, invoices, team } = useStore();
  const role = useCurrentRole();
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const agents = useMemo(() => {
    const set = new Set(clients.map((c) => c.assignedAgent).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [clients]);

  const scopedClients = useMemo(() =>
    agentFilter === 'all' ? clients : clients.filter((c) => c.assignedAgent === agentFilter),
  [clients, agentFilter]);

  const scopedInvoices = useMemo(() => {
    if (agentFilter === 'all') return invoices;
    const clientIds = new Set(scopedClients.map((c) => c.id));
    return invoices.filter((i) => clientIds.has(i.clientId));
  }, [invoices, scopedClients, agentFilter]);

  const kpis = useMemo(() => {
    const total = scopedClients.length;
    const approved = scopedClients.filter((c) =>
      ['aprobado', 'activo'].includes(c.status),
    ).length;
    const active = scopedClients.filter((c) => c.status === 'activo').length;
    const delinquent = scopedClients.filter((c) => c.status === 'en_mora').length;
    const conversion = total ? (approved / total) * 100 : 0;
    const activePortfolio = scopedClients
      .filter((c) => c.status === 'activo')
      .reduce((a, c) => a + c.productCost * (1 - c.downPaymentPct / 100), 0);
    const delinquencyIndex = active ? (delinquent / active) * 100 : 0;
    const monthlyCollections = scopedInvoices
      .filter((i) => i.status === 'pagada')
      .reduce((a, i) => a + i.amount, 0);
    return {
      conversion,
      activePortfolio,
      delinquencyIndex,
      monthlyCollections,
      total,
      approved,
      active,
      delinquent,
    };
  }, [scopedClients, scopedInvoices]);

  const trendData = useMemo(
    () =>
      MONTHS.map((m, i) => ({
        month: m,
        cartera: Math.round(kpis.activePortfolio * (0.7 + i * 0.06)),
        cobranza: Math.round(kpis.monthlyCollections * (0.6 + i * 0.08)),
      })),
    [kpis],
  );

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedClients.forEach((c) => {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    });
    return [
      { name: 'Prospecto', value: counts.prospecto ?? 0, color: '#75798c' },
      { name: 'Revisión', value: counts.en_revision ?? 0, color: '#c9ae7d' },
      { name: 'Aprobado', value: counts.aprobado ?? 0, color: '#b5abfc' },
      { name: 'Activo', value: counts.activo ?? 0, color: '#86b298' },
      { name: 'Mora', value: counts.en_mora ?? 0, color: '#d09090' },
      { name: 'Rechazado', value: counts.rechazado ?? 0, color: '#595d6c' },
    ];
  }, [scopedClients]);

  const topAgents = useMemo(
    () =>
      team
        .filter((m) => m.role === 'vendedor')
        .sort((a, b) => b.achievedMonthly - a.achievedMonthly)
        .slice(0, 4),
    [team],
  );

  return (
    <div data-tour="dashboard" className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-metal-100 tracking-tight">
          Panel ejecutivo
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Bienvenido, {role.label}. Resumen de tu cartera de crédito en tiempo real.
        </p>
      </div>

      {/* Agent filter */}
      {agents.length > 2 && (
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <span className="kicker">Filtrar por agente:</span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="input w-auto"
            >
              {agents.map((a) => (
                <option key={a} value={a}>{a === 'all' ? 'Todos los agentes' : a}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500 ml-auto">
              {scopedClients.length} clientes · {scopedInvoices.length} facturas
            </span>
          </div>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Tasa de Conversión"
          value={kpis.conversion}
          decimals={1}
          suffix="%"
          icon={<TrendingUp size={18} />}
          delta="+3.2%"
          deltaUp
          accent="from-accent-500/20 to-accent-500/5"
          iconColor="text-accent-300"
        />
        <KpiCard
          label="Cartera Activa"
          value={kpis.activePortfolio}
          prefix="$"
          icon={<Wallet size={18} />}
          delta="+$8.4k"
          deltaUp
          accent="from-violet-500/20 to-violet-500/5"
          iconColor="text-violet-400"
        />
        <KpiCard
          label="Índice de Mora"
          value={kpis.delinquencyIndex}
          decimals={1}
          suffix="%"
          icon={<AlertTriangle size={18} />}
          delta="-1.1%"
          deltaUp={false}
          goodDown
          accent="from-warning/20 to-warning/5"
          iconColor="text-warning-400"
        />
        <KpiCard
          label="Cobranzas del Mes"
          value={kpis.monthlyCollections}
          prefix="$"
          icon={<Banknote size={18} />}
          delta="+12.5%"
          deltaUp
          accent="from-success/20 to-success/5"
          iconColor="text-success-500"
        />
      </div>

      {/* Heatmap */}
      <CaracasHeatmap />

      {/* Trend chart + status breakdown */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="Evolución de cartera y cobranza"
            subtitle="Últimos 6 meses · valores en USD"
            icon={<Activity size={16} />}
          />
          <div className="h-[220px] sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ left: -16, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gCartera" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9184d9" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#9184d9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCobranza" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86b298" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f424d" vertical={false} />
                <XAxis dataKey="month" stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#232532',
                    border: '1px solid #3f424d',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#b2b6ca' }}
                />
                <Area
                  type="monotone"
                  dataKey="cartera"
                  name="Cartera"
                  stroke="#b5abfc"
                  strokeWidth={2}
                  fill="url(#gCartera)"
                />
                <Area
                  type="monotone"
                  dataKey="cobranza"
                  name="Cobranza"
                  stroke="#86b298"
                  strokeWidth={2}
                  fill="url(#gCobranza)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionHeader
            title="Estado de solicitudes"
            subtitle={`${kpis.total} clientes en cartera`}
            icon={<Activity size={16} />}
          />
          <div className="h-[220px] sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 20, right: 16 }}>
                <XAxis type="number" stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} width={70} />
                <Tooltip
                  contentStyle={{
                    background: '#232532',
                    border: '1px solid #3f424d',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {statusBreakdown.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top agents */}
      <Card className="p-4 sm:p-5">
        <SectionHeader
          title="Top vendedores del mes"
          subtitle="Rendimiento vs. meta"
          icon={<TrendingUp size={16} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {topAgents.map((m, i) => {
            const pct = m.goalMonthly ? (m.achievedMonthly / m.goalMonthly) * 100 : 0;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-tint/5 bg-ink-900/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900/60 ring-1 ring-tint/10 text-accent-300 text-xs font-semibold">
                      {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-metal-100">{m.name}</p>
                      <p className="text-[11px] text-slate-500">Vendedor</p>
                    </div>
                  </div>
                  {m.active ? (
                    <span className="h-2 w-2 rounded-full bg-success-500" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-600" />
                  )}
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="num text-lg text-metal-100">
                    {fmtMoney(m.achievedMonthly)}
                  </span>
                  <span className="text-xs text-slate-500">/ {fmtMoney(m.goalMonthly)}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-full rounded-full ${
                      pct >= 100 ? 'bg-success-500' : 'bg-gradient-to-r from-accent-600 to-violet-500'
                    }`}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {fmtPct(pct)} de la meta
                </p>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  icon,
  delta,
  deltaUp,
  goodDown = false,
  accent,
  iconColor,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: React.ReactNode;
  delta: string;
  deltaUp: boolean;
  goodDown?: boolean;
  accent: string;
  iconColor: string;
}) {
  const positive = goodDown ? !deltaUp : deltaUp;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-ink-900/40 ${iconColor}`}>
          {icon}
        </div>
        <span
          className={`chip ${
            positive
              ? 'bg-success/15 text-success-500'
              : 'bg-danger/15 text-danger-400'
          }`}
        >
          {deltaUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </span>
      </div>
      <p className="mt-4 text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium text-metal-100">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
      </p>
    </motion.div>
  );
}
