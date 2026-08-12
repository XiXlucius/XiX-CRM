import { useState } from 'react';
import {
  TrendingUp, Users, DollarSign, Target,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertCircle, Sparkles, MoreHorizontal, Activity,
  Briefcase, Star, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';

const revenueData = [
  { mes: 'Ene', valor: 42000 },
  { mes: 'Feb', valor: 58000 },
  { mes: 'Mar', valor: 51000 },
  { mes: 'Abr', valor: 74000 },
  { mes: 'May', valor: 67000 },
  { mes: 'Jun', valor: 89000 },
  { mes: 'Jul', valor: 95000 },
];

const conversionData = [
  { etapa: 'Leads', cantidad: 140, fill: '#0ea5e9' },
  { etapa: 'Contacto', cantidad: 98,  fill: '#0284c7' },
  { etapa: 'Demo',    cantidad: 62,  fill: '#7c3aed' },
  { etapa: 'Propuesta', cantidad: 41, fill: '#a855f7' },
  { etapa: 'Cerrado', cantidad: 28,  fill: '#10b981' },
];

const recentActivity = [
  { name: 'María González',  action: 'Nuevo lead captado',    time: 'hace 3 min',  avatar: 'MG', color: 'from-cyan-500 to-blue-600' },
  { name: 'Carlos Méndez',   action: 'Propuesta enviada',     time: 'hace 18 min', avatar: 'CM', color: 'from-violet-500 to-purple-600' },
  { name: 'Ana Rodríguez',   action: 'Pago de $12,000 recibido', time: 'hace 1h', avatar: 'AR', color: 'from-emerald-500 to-teal-600' },
  { name: 'Pedro Jiménez',   action: 'Demo programada',       time: 'hace 2h',    avatar: 'PJ', color: 'from-amber-500 to-orange-600' },
  { name: 'Luisa Fernández', action: 'Contrato firmado',      time: 'hace 3h',    avatar: 'LF', color: 'from-rose-500 to-pink-600' },
];

const tasks = [
  { title: 'Seguimiento a María González', due: 'Hoy',    priority: 'alta',  done: false },
  { title: 'Preparar demo para Grupo Alfa', due: 'Mañana', priority: 'media', done: false },
  { title: 'Actualizar propuesta Empresa XYZ', due: 'Vie', priority: 'alta', done: false },
  { title: 'Llamada de onboarding - Cliente B',  due: 'Lun', priority: 'baja', done: true },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2.5 text-xs">
      <p className="text-metal-400 mb-1">{label}</p>
      <p className="text-cyan-300 font-bold">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function Dashboard() {
  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xs text-metal-500 uppercase tracking-widest mb-1">Panel Principal</p>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-metal-500">Jul 2025</span>
          <span className="badge badge-cyan"><Activity size={10} />En vivo</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos del Mes', value: '$95,400', change: '+18.2%', up: true, icon: DollarSign, accent: 'stat-card-cyan',   glow: 'text-cyan-400',   sub: 'vs. mes anterior' },
          { label: 'Nuevos Leads',     value: '140',     change: '+12',    up: true, icon: Users,      accent: 'stat-card-violet', glow: 'text-violet-400', sub: 'este mes' },
          { label: 'Tasa de Cierre',   value: '28.4%',   change: '+4.1%',  up: true, icon: Target,     accent: 'stat-card-green',  glow: 'text-emerald-400',sub: 'vs. 24.3% anterior' },
          { label: 'Ciclo de Venta',   value: '18 días', change: '-2d',    up: true, icon: Clock,      accent: 'stat-card-amber',  glow: 'text-amber-400',  sub: 'promedio mensual' },
        ].map((kpi) => (
          <div key={kpi.label} className={`glass-card ${kpi.accent} p-5`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-metal-400">{kpi.label}</p>
              <kpi.icon size={15} className={kpi.glow} />
            </div>
            <p className={`font-display text-2xl font-bold ${kpi.glow}`}>{kpi.value}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {kpi.up
                ? <ArrowUpRight size={13} className="text-emerald-400" />
                : <ArrowDownRight size={13} className="text-rose-400" />}
              <span className={`text-xs font-semibold ${kpi.up ? 'text-emerald-400' : 'text-rose-400'}`}>{kpi.change}</span>
              <span className="text-2xs text-metal-600">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main row: chart + pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue chart — 2 cols */}
        <div className="glass-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-metal-500 mb-0.5">Ingresos mensuales</p>
              <p className="font-display font-semibold text-white">$95,400 <span className="text-xs font-normal text-emerald-400">+18.2%</span></p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-metal-500 hover:text-slate-400 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="valor" stroke="#0ea5e9" strokeWidth={2} fill="url(#cyanGrad)" dot={false} activeDot={{ r: 4, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs text-metal-500 mb-0.5">Embudo de ventas</p>
              <p className="font-display font-semibold text-white">Conversión</p>
            </div>
            <Briefcase size={15} className="text-metal-500" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="etapa" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip contentStyle={{ background: '#17171b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]} maxBarSize={10}>
                  {conversionData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: activity + tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Recent activity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-white text-sm">Actividad Reciente</p>
            <Sparkles size={14} className="text-cyan-400" />
          </div>
          <ul className="space-y-3">
            {recentActivity.map((a, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${a.color} grid place-items-center shrink-0`}>
                  <span className="text-2xs font-bold text-white">{a.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">{a.name}</p>
                  <p className="text-2xs text-metal-500 truncate">{a.action}</p>
                </div>
                <span className="text-2xs text-metal-600 whitespace-nowrap">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tasks snapshot */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-white text-sm">Tareas Pendientes</p>
            <span className="badge badge-rose">{tasks.filter(t => !t.done).length} pendientes</span>
          </div>
          <ul className="space-y-2.5">
            {tasks.map((t, i) => (
              <li key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${t.done ? 'border-white/5 opacity-50' : 'border-white/07 hover:border-white/10 hover:bg-white/02'}`}>
                {t.done
                  ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  : <AlertCircle size={15} className={`shrink-0 ${t.priority === 'alta' ? 'text-rose-400' : t.priority === 'media' ? 'text-amber-400' : 'text-metal-500'}`} />
                }
                <p className={`text-xs flex-1 truncate ${t.done ? 'line-through text-metal-600' : 'text-slate-300'}`}>{t.title}</p>
                <span className="text-2xs text-metal-600 whitespace-nowrap">{t.due}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}
