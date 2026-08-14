import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileBarChart,
  Download,
  FileText,
  Users,
  ReceiptText,
  UsersRound,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Printer,
  CalendarClock,
  Trophy,
  Hourglass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Area,
  Legend,
} from 'recharts';
import { useStore } from '../store';
import {
  clientsToCSV,
  invoicesToCSV,
  teamToCSV,
  productsToCSV,
  downloadCSV,
  printStatement,
} from '../lib/export';
import { Card, SectionHeader, fmtMoney, fmtPct, fmtDate } from './ui';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ReportesTab() {
  const { clients, invoices, team, products, lateFees, partialPayments, renegotiations } = useStore();
  const [range, setRange] = useState<'all' | 'month' | 'week'>('all');

  const filteredInvoices = invoices.filter((i) => {
    if (range === 'all') return true;
    const d = new Date(i.dueDate);
    const now = new Date();
    if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (range === 'week') return (now.getTime() - d.getTime()) < 7 * 86400000;
    return true;
  });

  const portfolio = clients
    .filter((c) => c.status === 'activo' || c.status === 'en_mora')
    .reduce((a, c) => a + c.productCost * (1 - c.downPaymentPct / 100), 0);
  const collected = filteredInvoices.filter((i) => i.status === 'pagada').reduce((a, i) => a + i.amount, 0);
  const outstanding = filteredInvoices.filter((i) => i.status !== 'pagada').reduce((a, i) => a + i.amount, 0);
  const delinquent = clients.filter((c) => c.status === 'en_mora').length;
  const totalCommissions = team
    .filter((m) => m.active)
    .reduce((a, m) => a + (m.achievedMonthly * m.commissionRatePct) / 100, 0);
  const totalLateFees = lateFees.reduce((a, f) => a + f.amount, 0);
  const totalPartial = partialPayments.reduce((a, p) => a + p.amount, 0);

  // ---- Aging buckets ----
  const aging = useMemo(() => {
    const now = Date.now();
    const buckets = [
      { label: '0-7 días', min: 0, max: 7, count: 0, amount: 0 },
      { label: '8-15 días', min: 8, max: 15, count: 0, amount: 0 },
      { label: '16-30 días', min: 16, max: 30, count: 0, amount: 0 },
      { label: '31-60 días', min: 31, max: 60, count: 0, amount: 0 },
      { label: '61+ días', min: 61, max: Infinity, count: 0, amount: 0 },
    ];
    invoices.filter((i) => i.status === 'vencida').forEach((inv) => {
      const daysLate = Math.floor((now - new Date(inv.dueDate).getTime()) / 86400000);
      const bucket = buckets.find((b) => daysLate >= b.min && daysLate <= b.max);
      if (bucket) { bucket.count++; bucket.amount += inv.amount; }
    });
    return buckets;
  }, [invoices]);

  const agingColors = ['#9397ab', '#e0cba3', '#c9ae7d', '#e8b4b4', '#d09090'];

  // ---- Cash flow projection (6 months) ----
  const cashFlow = useMemo(() => {
    const now = new Date();
    const months: { month: string; esperado: number; optimista: number; pesimista: number }[] = [];
    for (let m = 0; m < 6; m++) {
      const target = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const monthName = MONTHS_ES[target.getMonth()];
      let esperado = 0;
      invoices.filter((i) => i.status !== 'pagada').forEach((inv) => {
        const due = new Date(inv.dueDate);
        if (due.getMonth() === target.getMonth() && due.getFullYear() === target.getFullYear()) {
          esperado += inv.amount;
        }
      });
      // Add late fees expected
      esperado += lateFees.filter((f) => {
        const d = new Date(f.appliedAt);
        return d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
      }).reduce((a, f) => a + f.amount, 0);

      months.push({
        month: monthName,
        esperado: Math.round(esperado),
        optimista: Math.round(esperado * 1.15),
        pesimista: Math.round(esperado * 0.7),
      });
    }
    return months;
  }, [invoices, lateFees]);

  // ---- Team performance ranking ----
  const teamRanking = useMemo(() => {
    return team
      .filter((m) => m.role === 'vendedor' && m.active)
      .map((m) => {
        const agentClients = clients.filter((c) => c.assignedAgent === m.name);
        const agentInvoices = invoices.filter((i) =>
          agentClients.some((c) => c.id === i.clientId)
        );
        const collected = agentInvoices
          .filter((i) => i.status === 'pagada')
          .reduce((a, i) => a + i.amount, 0);
        const delinquent = agentClients.filter((c) => c.status === 'en_mora').length;
        const delinquencyPct = agentClients.length > 0
          ? (delinquent / agentClients.length) * 100
          : 0;
        const effectiveness = m.goalMonthly > 0
          ? (collected / m.goalMonthly) * 100
          : 0;
        return {
          ...m,
          collected,
          delinquent,
          delinquencyPct,
          effectiveness: Math.min(effectiveness, 100),
          portfolio: agentClients.length,
        };
      })
      .sort((a, b) => b.collected - a.collected);
  }, [team, clients, invoices]);

  return (
    <div data-tour="reportes" className="space-y-5">
      <SectionHeader
        title="Reportes & Análisis"
        subtitle="Aging de cartera, flujo de caja, desempeño del equipo y mora"
        icon={<FileBarChart size={16} />}
        action={
          <div className="flex gap-1 rounded-xl bg-ink-900/50 p-1">
            {([
              { id: 'all', label: 'Todo' },
              { id: 'month', label: 'Mes' },
              { id: 'week', label: 'Semana' },
            ] as const).map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r.id ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:text-metal-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={<Wallet size={16} />} label="Cartera activa" value={fmtMoney(portfolio)} color="text-accent-300" />
        <KpiTile icon={<TrendingUp size={16} />} label="Cobrado" value={fmtMoney(collected)} color="text-success-500" />
        <KpiTile icon={<AlertTriangle size={16} />} label="Por cobrar" value={fmtMoney(outstanding)} color="text-warning-400" />
        <KpiTile icon={<UsersRound size={16} />} label="Comisiones" value={fmtMoney(totalCommissions)} color="text-violet-400" />
      </div>

      {/* Aging report */}
      <Card className="p-5">
        <SectionHeader
          title="Aging de cartera"
          subtitle="Facturas vencidas agrupadas por días de atraso"
          icon={<Hourglass size={16} />}
        />
        {aging.every((b) => b.count === 0) ? (
          <p className="py-6 text-center text-sm text-slate-500">Sin facturas vencidas</p>
        ) : (
          <>
            <div className="h-[200px] sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aging} margin={{ left: -16, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f424d" vertical={false} />
                  <XAxis dataKey="label" stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#232532', border: '1px solid #3f424d', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#b2b6ca' }}
                    formatter={(val) => fmtMoney(Number(val))}
                  />
                  <Bar dataKey="amount" name="Monto" radius={[6, 6, 0, 0]}>
                    {aging.map((_, i) => (
                      <Cell key={i} fill={agingColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left kicker">
                    <th className="px-3 py-2 font-medium">Bucket</th>
                    <th className="px-3 py-2 font-medium text-right">Facturas</th>
                    <th className="px-3 py-2 font-medium text-right">Monto</th>
                    <th className="px-3 py-2 font-medium text-right">% del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tint/5">
                  {aging.map((b, i) => {
                    const total = aging.reduce((a, x) => a + x.amount, 0);
                    return (
                      <tr key={i} className="table-row">
                        <td className="px-3 py-2 font-medium text-metal-100">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: agingColors[i] }} />
                            {b.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-300">{b.count}</td>
                        <td className="px-3 py-2 text-right num text-metal-100">{fmtMoney(b.amount)}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{total > 0 ? fmtPct((b.amount / total) * 100) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Cash flow projection */}
      <Card className="p-5">
        <SectionHeader
          title="Proyección de flujo de caja"
          subtitle="Ingresos esperados por mes · escenarios optimista y pesimista"
          icon={<CalendarClock size={16} />}
        />
        <div className="h-[220px] sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashFlow} margin={{ left: -16, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gEsperado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b5abfc" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#b5abfc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f424d" vertical={false} />
              <XAxis dataKey="month" stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#232532', border: '1px solid #3f424d', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#b2b6ca' }}
                formatter={(val) => fmtMoney(Number(val))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="esperado" name="Esperado" stroke="#b5abfc" strokeWidth={2} fill="url(#gEsperado)" />
              <Line type="monotone" dataKey="optimista" name="Optimista" stroke="#86b298" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="pesimista" name="Pesimista" stroke="#d09090" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Team performance ranking */}
      <Card className="p-5">
        <SectionHeader
          title="Ranking de desempeño del equipo"
          subtitle="Cobranza efectiva vs. colocación · índice de mora por agente"
          icon={<Trophy size={16} />}
        />
        {teamRanking.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Sin vendedores activos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left kicker">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Vendedor</th>
                  <th className="px-3 py-2 font-medium text-right">Cobranza</th>
                  <th className="px-3 py-2 font-medium text-right">Colocación</th>
                  <th className="px-3 py-2 font-medium text-right">Efectividad</th>
                  <th className="px-3 py-2 font-medium text-right">Clientes</th>
                  <th className="px-3 py-2 font-medium text-right">Mora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tint/5">
                {teamRanking.map((m, i) => (
                  <tr key={m.id} className="table-row">
                    <td className="px-3 py-2">
                      <span className={`grid h-6 w-6 place-items-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-700/20 text-orange-400' : 'text-slate-500'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-metal-100">{m.name}</td>
                    <td className="px-3 py-2 text-right num text-success-500">{fmtMoney(m.collected)}</td>
                    <td className="px-3 py-2 text-right num text-slate-300">{fmtMoney(m.achievedMonthly)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-tint/5">
                          <div className={`h-full rounded-full ${m.effectiveness >= 75 ? 'bg-success-500' : m.effectiveness >= 50 ? 'bg-warning-400' : 'bg-danger-400'}`} style={{ width: `${m.effectiveness}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{fmtPct(m.effectiveness)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{m.portfolio}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`chip ${m.delinquencyPct > 15 ? 'bg-danger/15 text-danger-400' : m.delinquencyPct > 5 ? 'bg-warning/15 text-warning-400' : 'bg-success/15 text-success-500'}`}>
                        {fmtPct(m.delinquencyPct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Late fees summary */}
      <Card className="p-5">
        <SectionHeader
          title="Resumen de mora automática"
          subtitle="$4/semana por factura vencida tras 3 días de gracia"
          icon={<AlertTriangle size={16} />}
        />
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <KpiTile icon={<AlertTriangle size={16} />} label="Total cargos" value={fmtMoney(totalLateFees)} color="text-danger-400" />
          <KpiTile icon={<FileText size={16} />} label="Cargos aplicados" value={`${lateFees.length}`} color="text-warning-400" />
          <KpiTile icon={<Users size={16} />} label="Clientes en mora" value={`${delinquent}`} color="text-danger-400" />
        </div>
        {lateFees.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Sin cargos por mora registrados</p>
        ) : (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left kicker">
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Semana</th>
                  <th className="px-3 py-2 font-medium text-right">Monto</th>
                  <th className="px-3 py-2 font-medium">Aplicado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tint/5">
                {lateFees.slice(0, 20).map((f) => {
                  const client = clients.find((c) => c.id === f.clientId);
                  return (
                    <tr key={f.id} className="table-row">
                      <td className="px-3 py-2 font-medium text-metal-100">{client?.fullName ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">Semana {f.weekNumber}</td>
                      <td className="px-3 py-2 text-right num text-danger-400">+{fmtMoney(f.amount)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(f.appliedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Export cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ExportCard
          icon={<Users size={18} />}
          title="Resumen de cartera"
          desc={`${clients.length} clientes con score, estado y saldo`}
          color="from-accent-500/20 to-accent-500/5 text-accent-300"
          onCSV={() => downloadCSV('cartera_clientes.csv', clientsToCSV(clients))}
          onPDF={() => {
            const top = clients[0];
            if (top) printStatement(top, invoices);
          }}
          pdfLabel="Estado de cuenta"
        />
        <ExportCard
          icon={<ReceiptText size={18} />}
          title="Reporte de cobranza"
          desc={`${filteredInvoices.length} facturas · pagos parciales: ${fmtMoney(totalPartial)}`}
          color="from-success/20 to-success/5 text-success-500"
          onCSV={() => downloadCSV('cobranza.csv', invoicesToCSV(filteredInvoices))}
        />
        <ExportCard
          icon={<UsersRound size={18} />}
          title="Comisiones por agente"
          desc={`${team.length} miembros · ${renegotiations.length} renegociaciones`}
          color="from-violet-500/20 to-violet-500/5 text-violet-400"
          onCSV={() => downloadCSV('comisiones.csv', teamToCSV(team))}
        />
        <ExportCard
          icon={<Boxes size={18} />}
          title="Rotación de inventario"
          desc={`${products.length} productos · stock y rotación`}
          color="from-metal-700/30 to-metal-700/10 text-metal-300"
          onCSV={() => downloadCSV('inventario.csv', productsToCSV(products))}
        />
      </div>

      {/* Delinquency detail */}
      <Card className="p-5">
        <SectionHeader
          title="Reporte de mora"
          subtitle={`${delinquent} clientes en mora`}
          icon={<AlertTriangle size={16} />}
        />
        {clients.filter((c) => c.status === 'en_mora').length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Sin clientes en mora</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left kicker">
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Saldo</th>
                  <th className="px-3 py-2 font-medium">Score</th>
                  <th className="px-3 py-2 font-medium">Cargos mora</th>
                  <th className="px-3 py-2 font-medium">Última nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tint/5">
                {clients.filter((c) => c.status === 'en_mora').map((c) => {
                  const clientLateFees = lateFees.filter((f) => f.clientId === c.id).reduce((a, f) => a + f.amount, 0);
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-3 py-2 font-medium text-metal-100">{c.fullName}</td>
                      <td className="px-3 py-2 text-slate-300">{c.product}</td>
                      <td className="px-3 py-2 num text-danger-400">{fmtMoney(c.productCost * (1 - c.downPaymentPct / 100))}</td>
                      <td className="px-3 py-2 num text-slate-400">{c.riskScore}</td>
                      <td className="px-3 py-2 num text-danger-400">{clientLateFees > 0 ? fmtMoney(clientLateFees) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.bitacora[0] ? fmtDate(c.bitacora[0].date) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="kicker">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-medium text-metal-100">{value}</p>
    </Card>
  );
}

function ExportCard({
  icon, title, desc, color, onCSV, onPDF, pdfLabel,
}: {
  icon: React.ReactNode; title: string; desc: string; color: string;
  onCSV: () => void; onPDF?: () => void; pdfLabel?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-display text-sm font-medium text-metal-100">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onCSV} className="btn-outline flex-1 text-xs">
          <Download size={13} /> CSV
        </button>
        {onPDF && (
          <button onClick={onPDF} className="btn-outline flex-1 text-xs">
            <Printer size={13} /> {pdfLabel ?? 'PDF'}
          </button>
        )}
      </div>
    </Card>
  );
}
