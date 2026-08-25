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
  Trash2,
} from 'lucide-react';
import { useStore, useCurrentRole } from '../store';
import type { Invoice, InvoiceStatus, Permission } from '../types';
import { Card, SectionHeader, StatusChip, Modal, EmptyState, fmtMoney, fmtDate, fmtDateShort, DatePicker, NumberInput } from './ui';
import { effectiveStatus } from '../lib/aging';
import { CobrosCalendar } from './CobrosCalendar';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const STATUS_ICONS: Record<InvoiceStatus, typeof CheckCircle2> = {
  pagada: CheckCircle2,
  pendiente: Clock,
  vencida: AlertCircle,
};

export function FacturacionTab({ onSelectClient }: { onSelectClient?: (clientId: string) => void }) {
  const { invoices: rawInvoices, clients, markInvoicePaid, addInvoice, deleteInvoice } = useStore();
  const toast = useToast();
  const role = useCurrentRole();
  const canDelete = role.id === 'admin';

  // El estado `'vencida'` no se guarda nunca en la base — se deduce de la fecha.
  // Se normaliza aquí una sola vez para que el filtro, los contadores y las
  // tarjetas de abajo funcionen sin tener que repetir el cálculo en cada uno.
  // Ver src/lib/aging.ts.
  const invoices = useMemo(() => {
    const now = new Date();
    return rawInvoices.map((i) => ({ ...i, status: effectiveStatus(i, now) }));
  }, [rawInvoices]);
  // Por defecto se muestran solo las que faltan por cobrar. Al marcar una
  // factura como pagada desaparece del cronograma, pero no se pierde: sigue
  // disponible en el filtro "Pagadas" y en el historial del cliente.
  const [filter, setFilter] = useState<InvoiceStatus | 'all' | 'por_cobrar'>('por_cobrar');
  const [adding, setAdding] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);

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

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await deleteInvoice(confirmDelete.id);
      toast.success('Factura eliminada');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) onSelectClient(clientId);
  };

  const filtered = useMemo(() => {
    const sorted = [...invoices].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );
    if (filter === 'all') return sorted;
    if (filter === 'por_cobrar') return sorted.filter((i) => i.status !== 'pagada');
    return sorted.filter((i) => i.status === filter);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<CheckCircle2 size={16} />} label="Pagadas" value={`${stats.pagada}`} sub={fmtMoney(stats.collected)} color="text-success-500" />
        <StatTile icon={<Clock size={16} />} label="Pendientes" value={`${stats.pendiente}`} sub={fmtMoney(stats.outstanding)} color="text-warning-400" />
        <StatTile icon={<AlertCircle size={16} />} label="Vencidas" value={`${stats.vencida}`} sub="Requiere acción" color="text-danger-400" />
        <StatTile icon={<Banknote size={16} />} label="Total facturas" value={`${stats.total}`} sub={`${stats.collected + stats.outstanding > 0 ? fmtMoney(stats.collected + stats.outstanding) : '—'}`} color="text-accent-300" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'por_cobrar', label: 'Por cobrar' },
          { id: 'pendiente', label: 'Pendientes' },
          { id: 'vencida', label: 'Vencidas' },
          { id: 'pagada', label: 'Pagadas' },
          { id: 'all', label: 'Todas' },
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
      <Card className="p-4 sm:p-5">
        <SectionHeader
          title="Cronograma de cobranzas"
          subtitle={filter === 'por_cobrar' ? 'Solo lo que falta por cobrar — agrupado por semana' : 'Agrupado por semana'}
          icon={<Calendar size={16} />}
        />
        {grouped.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={22} />}
            title={filter === 'por_cobrar' ? 'No queda nada por cobrar' : 'Sin facturas en este filtro'}
            body={filter === 'por_cobrar' ? 'Las facturas ya cobradas están en el filtro "Pagadas".' : undefined}
          />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {g.items.map((inv) => (
                    <InvoiceCard
                      key={inv.id}
                      invoice={inv}
                      paying={payingId === inv.id}
                      onPay={() => handlePay(inv.id)}
                      onDelete={canDelete ? () => setConfirmDelete(inv) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Interactive cobros calendar */}
      <CobrosCalendar invoices={invoices} clients={clients} onSelectClient={handleSelectClient} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar factura" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <p className="text-sm text-metal-100">
              ¿Seguro que quieres eliminar esta factura de{' '}
              <span className="font-medium">{confirmDelete.clientName}</span>?
            </p>
            <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
              <p className="num text-lg text-metal-100">{fmtMoney(confirmDelete.amount)}</p>
              <p className="text-[11px] text-slate-500">
                {confirmDelete.isDownPayment
                  ? 'Inicial'
                  : `Cuota ${confirmDelete.installmentNumber}/${confirmDelete.totalInstallments}`}{' '}
                · vence {fmtDate(confirmDelete.dueDate)}
              </p>
            </div>
            <p className="text-xs text-warning-400">
              Esto no se puede deshacer. Si solo quieres sacarla de las cuentas por cobrar,
              márcala como pagada en vez de eliminarla.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost" disabled={!!deletingId}>
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={!!deletingId}
                className="btn-primary bg-danger/80 hover:bg-danger disabled:opacity-50"
              >
                {deletingId ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

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

function InvoiceCard({ invoice, onPay, paying, onDelete }: { invoice: Invoice; onPay: () => void; paying?: boolean; onDelete?: () => void }) {
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
        <div className="flex items-center gap-1">
          <StatusChip status={invoice.status} />
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar factura"
              aria-label="Eliminar factura"
              className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-danger/10 hover:text-danger-400"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="num text-lg text-metal-100">{fmtMoney(invoice.amount)}</p>
          <p className="text-[11px] text-slate-500">
            {invoice.status === 'pagada' && invoice.paidDate
              ? `Cobrada ${fmtDateShort(invoice.paidDate)}`
              : `Vence ${fmtDateShort(invoice.dueDate)}`}
          </p>
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
            <NumberInput value={form.amount} onChange={(v) => set('amount', v)} min={0} />
          </div>
          <div>
            <label className="label">Fecha de vencimiento</label>
            <DatePicker value={form.dueDate} onChange={(iso) => set('dueDate', iso)} />
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
                <NumberInput value={form.installmentNumber} onChange={(v) => set('installmentNumber', v)} min={1} />
              </div>
              <div>
                <label className="label">Total cuotas</label>
                <NumberInput value={form.totalInstallments} onChange={(v) => set('totalInstallments', v)} min={1} />
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
