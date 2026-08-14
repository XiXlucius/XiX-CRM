import { useMemo, useState } from 'react';
import { Calculator, TrendingDown, Calendar, Equal } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  computeAmortization,
  computeEqualInstallments,
  financedAmount,
} from '../store';
import type { PaymentFrequency } from '../types';
import { fmtMoney } from './ui';

export function AmortizationCalculator({
  cost,
  downPct,
  rate,
  termMonths,
  frequency,
  equalInstallments = false,
  numInstallments,
}: {
  cost: number;
  downPct: number;
  rate: number;
  termMonths: number;
  frequency: PaymentFrequency;
  equalInstallments?: boolean;
  numInstallments?: number;
}) {
  const [showChart, setShowChart] = useState(true);

  const financed = financedAmount(cost, downPct);
  const downAmount = cost - financed;

  const rows = useMemo(() => {
    if (equalInstallments && numInstallments && numInstallments > 0) {
      return computeEqualInstallments(financed, rate, numInstallments, frequency);
    }
    return computeAmortization(financed, rate, termMonths, frequency);
  }, [financed, rate, termMonths, frequency, equalInstallments, numInstallments]);

  const totalPaid = rows.reduce((a, r) => a + r.payment, 0);
  const totalInterest = rows.reduce((a, r) => a + r.interest, 0);
  const periodsPerYear =
    frequency === 'semanal' ? 52 : frequency === 'quincenal' ? 24 : 12;
  const totalPeriods = equalInstallments
    ? numInstallments ?? 0
    : Math.round((termMonths / 12) * periodsPerYear);
  const payment = rows[0]?.payment ?? 0;
  const allEqual =
    equalInstallments &&
    rows.length > 0 &&
    rows.every((r) => Math.abs(r.payment - rows[0].payment) < 0.01);

  const chartData = rows.map((r) => ({
    n: `C${r.number}`,
    principal: r.principal,
    interest: r.interest,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Inicial" value={fmtMoney(downAmount)} hint={`${downPct}% del costo`} />
        <SummaryTile label="Monto financiado" value={fmtMoney(financed)} hint={`Costo ${fmtMoney(cost)}`} />
        <SummaryTile
          label="Cuota"
          value={fmtMoney(payment)}
          hint={`${frequency} · ${totalPeriods} cuotas${allEqual ? ' (iguales)' : ''}`}
          highlight
        />
        <SummaryTile label="Interés total" value={fmtMoney(totalInterest)} hint={`Tasa ${rate}% anual`} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TrendingDown size={15} className="text-accent-400" />
          Total a pagar: <span className="num text-metal-100">{fmtMoney(totalPaid + downAmount)}</span>
        </div>
        <button
          onClick={() => setShowChart((v) => !v)}
          className="btn-ghost px-2.5 py-1.5 text-xs"
        >
          <Calendar size={13} /> {showChart ? 'Ocultar gráfico' : 'Ver gráfico'}
        </button>
      </div>

      {showChart && (
        <div className="h-48 rounded-xl border border-tint/5 bg-ink-900/40 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -18, right: 4, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f424d" vertical={false} />
              <XAxis dataKey="n" stroke="#75798c" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#75798c" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#232532',
                  border: '1px solid #3f424d',
                  borderRadius: 10,
                  fontSize: 11,
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="principal" stackId="a" fill="#9184d9" radius={[0, 0, 0, 0]} />
              <Bar dataKey="interest" stackId="a" fill="#d2cefd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto rounded-xl border border-tint/5">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-ink-850 backdrop-blur-sm">
            <tr className="text-left kicker">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Cuota</th>
              <th className="px-3 py-2.5 font-medium">Capital</th>
              <th className="px-3 py-2.5 font-medium">Interés</th>
              <th className="px-3 py-2.5 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tint/5">
            {rows.map((r) => (
              <tr key={r.number} className="table-row">
                <td className="px-3 py-2 num text-slate-400">{r.number}</td>
                <td className="px-3 py-2 num text-metal-100">{fmtMoney(r.payment)}</td>
                <td className="px-3 py-2 num text-accent-300">{fmtMoney(r.principal)}</td>
                <td className="px-3 py-2 num text-violet-400">{fmtMoney(r.interest)}</td>
                <td className="px-3 py-2 num text-right text-slate-300">{fmtMoney(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {allEqual && (
        <p className="flex items-center gap-1.5 text-xs text-success-500">
          <Equal size={12} /> Todas las cuotas son exactamente iguales: {fmtMoney(payment)}
        </p>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-accent-500/30 bg-accent-500/10'
          : 'border-tint/5 bg-ink-900/40'
      }`}
    >
      <p className="kicker">{label}</p>
      <p className="mt-1 font-display text-lg font-medium text-metal-100">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export { Calculator };
