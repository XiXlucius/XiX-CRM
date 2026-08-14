import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarClock, X, ArrowRight, CircleDot } from 'lucide-react';
import type { Invoice, Client } from '../types';
import { Card, fmtMoney } from './ui';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface DayCobros {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  morosidad: { invoice: Invoice; client: Client | undefined }[];
  regulares: { invoice: Invoice; client: Client | undefined }[];
  totalMorosidad: number;
  totalRegulares: number;
  total: number;
}

interface CobrosCalendarProps {
  invoices: Invoice[];
  clients: Client[];
  onSelectClient: (clientId: string) => void;
}

export function CobrosCalendar({ invoices, clients, onSelectClient }: CobrosCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<DayCobros | null>(null);

  const clientMap = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  // Build a map of dateKey -> invoices due that day (only pending/overdue)
  const byDay = useMemo(() => {
    const map = new Map<string, { invoice: Invoice; client: Client | undefined }[]>();
    invoices
      .filter((i) => i.status !== 'pagada')
      .forEach((inv) => {
        const d = new Date(inv.dueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const arr = map.get(key) ?? [];
        arr.push({ invoice: inv, client: clientMap.get(inv.clientId) });
        map.set(key, arr);
      });
    return map;
  }, [invoices, clientMap]);

  const days = useMemo<DayCobros[]>(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Make Monday = 0
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();
    const cells: DayCobros[] = [];

    // Leading days from previous month
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push(buildDay(d, false, byDay));
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push(buildDay(d, true, byDay));
    }
    // Trailing to fill 6 rows (42 cells) or at least 5 rows
    const target = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < target) {
      const d = new Date(year, month + 1, nextDay++);
      cells.push(buildDay(d, false, byDay));
    }
    return cells;
  }, [cursor, byDay]);

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  // Month summary
  const monthSummary = useMemo(() => {
    const mTotal = days.reduce((a, d) => a + d.totalMorosidad, 0);
    const rTotal = days.reduce((a, d) => a + d.totalRegulares, 0);
    const mCount = days.reduce((a, d) => a + d.morosidad.length, 0);
    const rCount = days.reduce((a, d) => a + d.regulares.length, 0);
    return { mTotal, rTotal, mCount, rCount };
  }, [days]);

  return (
    <div data-tour="cobros-calendar">
      <Card className="p-3 sm:p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300">
              <CalendarClock size={18} />
            </div>
            <div>
              <h3 className="font-display text-lg font-medium text-metal-100">
                {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              </h3>
              <p className="text-xs text-slate-500">Calendario de cobros</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-lg border border-tint/10 text-slate-400 hover:border-accent-500/40 hover:text-metal-100 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToday} className="btn-ghost px-3 py-1.5 text-xs">Hoy</button>
            <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-lg border border-tint/10 text-slate-400 hover:border-accent-500/40 hover:text-metal-100 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Legend + month summary */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-danger-500" /> Morosidad
            <span className="num text-danger-400">{fmtMoney(monthSummary.mTotal)}</span>
            <span className="text-slate-600">({monthSummary.mCount})</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-500" /> Regulares
            <span className="num text-accent-300">{fmtMoney(monthSummary.rTotal)}</span>
            <span className="text-slate-600">({monthSummary.rCount})</span>
          </span>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((day, i) => (
            <DayCell key={i} day={day} onClick={() => day.total > 0 && setSelectedDay(day)} />
          ))}
        </div>
      </Card>

      {/* Day detail popover/modal */}
      <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} onSelectClient={onSelectClient} />
    </div>
  );
}

// ---------- Day cell ----------

function DayCell({ day, onClick }: { day: DayCobros; onClick: () => void }) {
  const hasActivity = day.total > 0;
  const hasMorosidad = day.totalMorosidad > 0;
  const hasRegulares = day.totalRegulares > 0;

  return (
    <button
      onClick={onClick}
      disabled={!hasActivity}
      className={`relative flex flex-col items-stretch rounded-lg border p-1 sm:p-1.5 min-h-[64px] sm:min-h-[88px] transition-all ${
        !day.isCurrentMonth
          ? 'border-transparent bg-transparent opacity-40'
          : day.isToday
          ? 'border-accent-500/40 bg-accent-500/5'
          : hasActivity
          ? 'border-tint/10 bg-ink-900/40 hover:border-accent-500/30 hover:bg-ink-900/70'
          : 'border-tint/5 bg-ink-900/20'
      } ${hasActivity ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Date number */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${day.isToday ? 'text-accent-300' : day.isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>
          {day.date.getDate()}
        </span>
        {day.isToday && <CircleDot size={10} className="text-accent-400" />}
      </div>

      {/* Tags */}
      {hasActivity && (
        <div className="mt-1 flex flex-col gap-1">
          {hasMorosidad && (
            <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger-400 leading-tight">
              {day.morosidad.length} Mora
            </span>
          )}
          {hasRegulares && (
            <span className="rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-300 leading-tight">
              {day.regulares.length} Cobros
            </span>
          )}
          {/* Total tag */}
          <span className="mt-auto rounded-md bg-tint/5 px-1.5 py-0.5 text-[10px] num text-slate-400 leading-tight">
            {fmtMoneyCompact(day.total)}
          </span>
        </div>
      )}
    </button>
  );
}

// ---------- Day detail modal ----------

function DayDetailModal({ day, onClose, onSelectClient }: {
  day: DayCobros | null;
  onClose: () => void;
  onSelectClient: (clientId: string) => void;
}) {
  if (!day) return null;
  const dateLabel = day.date.toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-lg card p-0 overflow-hidden max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-tint/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300">
                <CalendarClock size={18} />
              </div>
              <div>
                <p className="font-display text-base font-medium text-metal-100 capitalize">{dateLabel}</p>
                <p className="text-xs text-slate-500">{day.total} cobros · {fmtMoney(day.total)}</p>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-tint/5 hover:text-metal-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-y-auto divide-y divide-tint/5">
            {/* Morosidad */}
            <DaySection
              title="Cobros de Morosidad"
              icon={<AlertTriangle size={14} />}
              count={day.morosidad.length}
              total={day.totalMorosidad}
              accent="danger"
              items={day.morosidad}
              onSelectClient={onSelectClient}
              onClose={onClose}
            />
            {/* Regulares */}
            <DaySection
              title="Cobros Regulares"
              icon={<CalendarClock size={14} />}
              count={day.regulares.length}
              total={day.totalRegulares}
              accent="accent"
              items={day.regulares}
              onSelectClient={onSelectClient}
              onClose={onClose}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function DaySection({ title, icon, count, total, accent, items, onSelectClient, onClose }: {
  title: string;
  icon: React.ReactNode;
  count: number;
  total: number;
  accent: 'danger' | 'accent';
  items: { invoice: Invoice; client: Client | undefined }[];
  onSelectClient: (clientId: string) => void;
  onClose: () => void;
}) {
  const headerColor = accent === 'danger' ? 'text-danger-400' : 'text-accent-300';
  const badgeBg = accent === 'danger' ? 'bg-danger/15 text-danger-400' : 'bg-accent-500/15 text-accent-300';
  const dotColor = accent === 'danger' ? 'bg-danger-500' : 'bg-accent-500';

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-sm font-semibold ${headerColor}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
            {icon} {title}
          </span>
          <span className={`chip text-[10px] ${badgeBg}`}>{count}</span>
        </div>
        <span className="num text-sm text-metal-100">{fmtMoney(total)}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-slate-600 py-2">Sin cobros en esta categoría</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(({ invoice, client }) => (
            <button
              key={invoice.id}
              onClick={() => {
                if (invoice.clientId) {
                  onSelectClient(invoice.clientId);
                  onClose();
                }
              }}
              className="group flex w-full items-center justify-between rounded-lg border border-tint/5 bg-ink-900/40 px-3 py-2.5 text-left transition-colors hover:border-accent-500/30 hover:bg-ink-900/70"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${badgeBg}`}>
                  <span className="text-[10px] font-bold">
                    {client?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-metal-100 truncate group-hover:text-accent-200 transition-colors">
                    {invoice.clientName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {invoice.isDownPayment ? 'Inicial' : `Cuota ${invoice.installmentNumber}/${invoice.totalInstallments}`}
                    {invoice.status === 'vencida' && <span className="ml-1.5 text-danger-400">· vencida</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="num text-sm text-metal-100">{fmtMoney(invoice.amount)}</span>
                <ArrowRight size={13} className="text-slate-600 group-hover:text-accent-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers ----------

function buildDay(date: Date, isCurrentMonth: boolean, byDay: Map<string, { invoice: Invoice; client: Client | undefined }[]>): DayCobros {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const items = byDay.get(key) ?? [];
  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

  const morosidad: { invoice: Invoice; client: Client | undefined }[] = [];
  const regulares: { invoice: Invoice; client: Client | undefined }[] = [];

  items.forEach((item) => {
    const isMorosa = item.invoice.status === 'vencida' || item.client?.status === 'en_mora';
    if (isMorosa) morosidad.push(item);
    else regulares.push(item);
  });

  const totalMorosidad = morosidad.reduce((a, x) => a + x.invoice.amount, 0);
  const totalRegulares = regulares.reduce((a, x) => a + x.invoice.amount, 0);

  return {
    date,
    isCurrentMonth,
    isToday,
    morosidad,
    regulares,
    totalMorosidad,
    totalRegulares,
    total: totalMorosidad + totalRegulares,
  };
}

function fmtMoneyCompact(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
