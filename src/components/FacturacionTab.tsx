import { useMemo, useState } from 'react';
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
import { Card, SectionHeader, Modal, EmptyState, fmtMoney, fmtDate, DatePicker, NumberInput } from './ui';
import { effectiveStatus } from '../lib/aging';
import { CobrosCalendar } from './CobrosCalendar';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

export function FacturacionTab({ onSelectClient }: { onSelectClient?: (clientId: string) => void }) {
  const { invoices: rawInvoices, clients, markInvoicePaid, addInvoice, deleteInvoice, updateInvoiceDueDate, templates, sendWhatsApp } = useStore();
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
  const [dateEdit, setDateEdit] = useState<Invoice | null>(null);
  const [newDate, setNewDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);

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

  // El DatePicker trabaja con 'YYYY-MM-DD'; la base guarda ISO completo.
  const openDateEdit = (inv: Invoice) => {
    setNewDate(inv.dueDate.slice(0, 10));
    setDateEdit(inv);
  };

  const handleSaveDate = async () => {
    if (!dateEdit || !newDate) return;
    setSavingDate(true);
    try {
      // Se ancla a mediodía local para que ningún huso horario la corra un día.
      const [y, m, d] = newDate.split('-').map(Number);
      const iso = new Date(y, m - 1, d, 12, 0, 0).toISOString();
      await updateInvoiceDueDate(dateEdit.id, iso);
      toast.success('Fecha de cobro actualizada');
      setDateEdit(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSavingDate(false);
    }
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

  // Progreso por cliente: cuántas cuotas se le asignaron, cuántas lleva pagadas
  // y cuánto le falta. Es el "¿dónde queda cada cuota?" de un vistazo, sin
  // tener que abrir a cada persona.
  const porCliente = useMemo(() => {
    const map = new Map<string, {
      clientId: string; nombre: string;
      cuotas: typeof invoices; pagadas: number; total: number;
      saldo: number; vencidas: number; proxima: string | null;
    }>();
    for (const inv of invoices) {
      const key = inv.clientId || inv.clientName;
      let e = map.get(key);
      if (!e) {
        e = { clientId: inv.clientId, nombre: inv.clientName, cuotas: [], pagadas: 0, total: 0, saldo: 0, vencidas: 0, proxima: null };
        map.set(key, e);
      }
      e.cuotas.push(inv);
    }
    for (const e of map.values()) {
      // La inicial no cuenta como cuota del plan: se muestra aparte.
      const plan = e.cuotas.filter((i) => !i.isDownPayment);
      e.total = plan.length ? Math.max(...plan.map((i) => i.totalInstallments)) : e.cuotas.length;
      e.pagadas = e.cuotas.filter((i) => i.status === 'pagada').length;
      e.saldo = e.cuotas.filter((i) => i.status !== 'pagada').reduce((a, i) => a + i.amount, 0);
      e.vencidas = e.cuotas.filter((i) => i.status === 'vencida').length;
      const pend = e.cuotas
        .filter((i) => i.status !== 'pagada')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      e.proxima = pend[0]?.dueDate ?? null;
    }
    return [...map.values()].sort((a, b) => {
      if (a.vencidas !== b.vencidas) return b.vencidas - a.vencidas; // morosos primero
      return b.saldo - a.saldo;
    });
  }, [invoices]);

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

      {/* Progreso de cuotas por cliente */}
      <Card className="p-4 sm:p-5">
        <SectionHeader
          title="Cuotas por cliente"
          subtitle="Cuántas se asignaron, cuántas van pagadas y cuánto falta"
          icon={<Calendar size={16} />}
        />
        {porCliente.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={22} />}
            title="Todavía no hay cuotas"
            body="Al registrar un cliente su plan de pagos se crea solo y aparece aquí."
          />
        ) : (
          <div className="space-y-2">
            {porCliente.map((c) => {
              const pct = c.total > 0 ? Math.min(100, (c.pagadas / c.total) * 100) : 0;
              const saldado = c.saldo <= 0;
              return (
                <button
                  key={c.clientId || c.nombre}
                  onClick={() => c.clientId && handleSelectClient(c.clientId)}
                  className="group w-full rounded-xl border border-tint/5 bg-ink-900/40 p-3 text-left transition-colors hover:border-accent-500/30 hover:bg-ink-900/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-metal-100 group-hover:text-accent-200 transition-colors">
                        {c.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {c.pagadas} de {c.total} {c.total === 1 ? 'cuota' : 'cuotas'} pagadas
                        {c.vencidas > 0 && (
                          <span className="ml-1.5 text-danger-400">· {c.vencidas} vencida{c.vencidas > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`num ${saldado ? 'text-success-500' : 'text-metal-100'}`}>
                        {saldado ? 'Saldado' : fmtMoney(c.saldo)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {saldado ? 'sin deuda' : 'por cobrar'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.vencidas > 0 ? 'bg-danger-400' : saldado ? 'bg-success-500' : 'bg-accent-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Calendario: aquí se ven los días de cobro. Al tocar un día salen los
          clientes, y al tocar un cliente sale su tarjeta con las acciones. */}
      <CobrosCalendar
        invoices={filtered}
        clients={clients}
        onSelectClient={handleSelectClient}
        payingId={payingId}
        onPay={handlePay}
        onDelete={canDelete ? (inv) => setConfirmDelete(inv) : undefined}
        onChangeDate={canDelete ? openDateEdit : undefined}
        templates={templates}
        onSendWhatsApp={sendWhatsApp}
      />

      <Modal open={!!dateEdit} onClose={() => setDateEdit(null)} title="Cambiar fecha de cobro" size="sm">
        {dateEdit && (
          <div className="space-y-4">
            <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
              <p className="font-medium text-metal-100">{dateEdit.clientName}</p>
              <p className="text-[11px] text-slate-500">
                {dateEdit.isDownPayment
                  ? 'Inicial'
                  : `Cuota ${dateEdit.installmentNumber}/${dateEdit.totalInstallments}`}{' '}
                · {fmtMoney(dateEdit.amount)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Vence actualmente el {fmtDate(dateEdit.dueDate)}
              </p>
            </div>
            <div>
              <label className="label">Nueva fecha de cobro</label>
              <DatePicker value={newDate} onChange={setNewDate} />
            </div>
            <p className="text-xs text-warning-400">
              Mover la fecha cambia cuándo esta cuota entra en mora. El cambio queda
              registrado en Auditoría con la fecha anterior.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDateEdit(null)} className="btn-ghost" disabled={savingDate}>
                Cancelar
              </button>
              <button onClick={handleSaveDate} className="btn-primary" disabled={savingDate || !newDate}>
                {savingDate ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />}
                Guardar fecha
              </button>
            </div>
          </div>
        )}
      </Modal>

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
