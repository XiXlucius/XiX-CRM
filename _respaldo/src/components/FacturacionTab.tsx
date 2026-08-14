import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReceiptText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  Banknote,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store';
import type { Invoice, InvoiceStatus, Permission } from '../types';
import { Card, SectionHeader, StatusChip, Modal, EmptyState, fmtMoney, fmtDate, fmtDateShort } from './ui';
import { CobrosCalendar } from './CobrosCalendar';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const STATUS_ICONS: Record<InvoiceStatus, typeof CheckCircle2> = {
  pagada: CheckCircle2,
  pendiente: Clock,
  vencida: AlertCircle,
};

export function FacturacionTab({ onSelectClient }: { onSelectClient?: (clientId: string) => void }) {
  const { invoices, clients, markInvoicePaid, addInvoice } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [adding, setAdding] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePay = async (id: string) => {
    setPayingId(id);
    try {
      await markInvoicePaid(id);
      toast.success('Factura marcada como pagada');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setPayingId(null);
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) onSelectClient(clientId);
  };

  const filtered = useMemo(() => {
    const sorted = [...invoices].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    return filter === 'all' ? sorted : sorted.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const stats = useMemo(() => {
    return {
      total: invoices.length,
      pagada: invoices.filter((i) => i.status === 'pagada').length,
      pendiente: invoices.filter((i) => i.status === 'pendiente').length,
      vencida: invoices.filter((i) => i.status === 'vencida').length,
      collected: invoices.filter((i) => i.status === 'pagada').reduce((a, i) => a + i.amount, 0),
      outstanding: invoices.filter((i) => i.status !== 'pagada').reduce((a, i) => a + i.amount, 0),
    };
  }, [invoices]);

  // Group by week for the planner
  const grouped = useMemo(() => {
    const groups: { label: string; items: Invoice[] }[] = [];
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    sorted.forEach((inv) => {
      const d = new Date(inv.dueDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const label = weekStart.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
      const g = groups.find((g) => g.label === label);
      if (g) g.items.push(inv);
      else groups.push({ label, items: [inv] });
    });
    return groups;
  }, [filtered]);

  return (
    <div data-tour="facturacion" className="space-y-5">
      <SectionHeader
        title="Facturación & Cobranzas"
        subtitle="Cronograma de cuotas y estado de pagos"
        icon={<ReceiptText size={16} />}
        action={
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={15} /> <span className="hidden sm:inline">Nueva factura</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<CheckCircle2 size={16} />} label="Pagadas" value={`${stats.pagada}`} sub={fmtMoney(stats.collected)} color="text-success-500" />
        <StatTile icon={<Clock size={16} />} label="Pendientes" value={`${stats.pendiente}`} sub={fmtMoney(stats.outstanding)} color="text-warning-400" />
        <StatTile icon={<AlertCircle size={16} />} label="Vencidas" value={`${stats.vencida}`} sub="Requiere acción" color="text-danger-400" />
        <StatTile icon={<Banknote size={16} />} label="Total facturas" value={`${stats.total}`} sub={`${stats.collected + stats.outstanding > 0 ? fmtMoney(stats.collected + stats.outstanding) : '—'}`} color="text-accent-300" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all', label: 'Todas' },
          { id: 'pagada', label: 'Pagadas' },
          { id: 'pendiente', label: 'Pendientes' },
          { id: 'vencida', label: 'Vencidas' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip transition-colors ${
              filter === f.id ? 'bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/30' : 'bg-tint/5 text-slate-400 hover:text-metal-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Planner timeline */}
      <Card className="p-5">
        <SectionHeader title="Cronograma de cobranzas" subtitle="Agrupado por semana" icon={<Calendar size={16} />} />
        {grouped.length === 0 ? (
          <EmptyState icon={<ReceiptText size={22} />} title="Sin facturas en este filtro" />
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                    Semana del {g.label}
                  </span>
                  <span className="h-px flex-1 bg-tint/5" />
                  <span className="text-xs text-slate-500">{g.items.length} facturas</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {g.items.map((inv) => (
                    <InvoiceCard key={inv.id} invoice={inv} paying={payingId === inv.id} onPay={() => handlePay(inv.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Interactive cobros calendar */}
      <CobrosCalendar invoices={invoices} clients={clients} onSelectClient={handleSelectClient} />

      <InvoiceFormModal
        open={adding}
        onClose={() => setAdding(false)}
        clients={clients}
        onSave={async (data) => {
          try {
            await addInvoice(data);
            toast.success('Factura creada');
            setAdding(false);
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}

function StatTile({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={color}>{icon}</span>
        <span className="kicker">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-medium text-metal-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
    </Card>
  );
}

function InvoiceCard({ invoice, onPay, paying }: { invoice: Invoice; onPay: () => void; paying?: boolean }) {
  const Icon = STATUS_ICONS[invoice.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 ${
        invoice.status === 'vencida'
          ? 'border-danger/30 bg-danger/5'
          : invoice.status === 'pagada'
          ? 'border-success-500/20 bg-success/5'
          : 'border-tint/5 bg-ink-900/40'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${
            invoice.status === 'pagada' ? 'bg-success/15 text-success-500' :
            invoice.status === 'vencida' ? 'bg-danger/15 text-danger-400' :
            'bg-warning/15 text-warning-400'
          }`}>
            <Icon size={15} />
          </span>
          <div>
            <p className="text-sm font-medium text-metal-100">{invoice.clientName}</p>
            <p className="text-[11px] text-slate-500">
              {invoice.isDownPayment ? 'Inicial' : `Cuota ${invoice.installmentNumber}/${invoice.totalInstallments}`}
            </p>
          </div>
        </div>
        <StatusChip status={invoice.status} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="num text-lg text-metal-100">{fmtMoney(invoice.amount)}</p>
          <p className="text-[11px] text-slate-500">Vence {fmtDateShort(invoice.dueDate)}</p>
        </div>
        {invoice.status !== 'pagada' && (
          <button onClick={onPay} disabled={paying} className="btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-50">
            {paying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Marcar pagada
          </button>
        )}
      </div>
    </motion.div>
  );
}

function InvoiceFormModal({
  open,
  onClose,
  clients,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  clients: { id: string; fullName: string }[];
  onSave: (data: Omit<Invoice, 'id'>) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? '',
    amount: 100,
    dueDate: new Date().toISOString().slice(0, 10),
    isDownPayment: true,
    installmentNumber: 1,
    totalInstallments: 1,
  });

  const set = (k: keyof typeof form, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const client = clients.find((c) => c.id === form.clientId);
    if (!client) return;
    setSubmitting(true);
    try {
      await onSave({
        clientId: form.clientId,
        clientName: client.fullName,
        amount: form.amount,
        dueDate: new Date(form.dueDate).toISOString(),
        paidDate: null,
        status: 'pendiente',
        isDownPayment: form.isDownPayment,
        installmentNumber: form.installmentNumber,
        totalInstallments: form.totalInstallments,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva factura" size="md">
      <div className="space-y-3">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Monto ($)</label>
            <input type="number" className="input" value={form.amount} onChange={(e) => set('amount', +e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input type="date" className="input" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.isDownPayment ? '1' : '0'} onChange={(e) => set('isDownPayment', e.target.value === '1')}>
              <option value="1">Inicial</option>
              <option value="0">Cuota</option>
            </select>
          </div>
          {!form.isDownPayment && (
            <>
              <div>
                <label className="label">Nº de cuota</label>
                <input type="number" className="input" value={form.installmentNumber} onChange={(e) => set('installmentNumber', +e.target.value)} />
              </div>
              <div>
                <label className="label">Total cuotas</label>
                <input type="number" className="input" value={form.totalInstallments} onChange={(e) => set('totalInstallments', +e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Cancelar</button>
          <button onClick={submit} className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <><FileText size={15} /> Crear factura</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
