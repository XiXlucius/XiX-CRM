import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CalendarDays } from 'lucide-react';

// ---------- Status helpers ----------

export const STATUS_STYLES: Record<string, string> = {
  prospecto: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30',
  en_revision: 'bg-warning/15 text-warning-400 ring-1 ring-warning/30',
  aprobado: 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-400/30',
  activo: 'bg-success/15 text-success-500 ring-1 ring-success-500/30',
  en_mora: 'bg-danger/15 text-danger-400 ring-1 ring-danger/30',
  rechazado: 'bg-metal-700/30 text-metal-400 ring-1 ring-metal-600/30',
  pagada: 'bg-success/15 text-success-500 ring-1 ring-success-500/30',
  pendiente: 'bg-warning/15 text-warning-400 ring-1 ring-warning/30',
  vencida: 'bg-danger/15 text-danger-400 ring-1 ring-danger/30',
};

export const STATUS_LABELS: Record<string, string> = {
  prospecto: 'Prospecto',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  activo: 'Activo',
  en_mora: 'En mora',
  rechazado: 'Rechazado',
  pagada: 'Pagada',
  pendiente: 'Pendiente',
  vencida: 'Vencida',
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`chip ${STATUS_STYLES[status] ?? 'bg-slate-500/15 text-slate-300'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ---------- Card ----------

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>
  );
}

// ---------- Section header ----------

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-ink-900/60 text-accent-300 ring-1 ring-accent-500/20 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-lg font-medium text-metal-100 tracking-tight sm:text-xl">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ---------- Modal ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={`relative w-full ${sizes[size]} card max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl sm:max-h-[90vh]`}
          >
            {/* Subtle top gradient line */}
            <div className="absolute top-0 left-6 right-6 h-px z-20 bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />
            {/* Encabezado sticky: el botón de cerrar siempre queda visible aunque el contenido sea largo */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--color-surface)] px-4 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
              <h3 className="font-display text-lg font-medium text-metal-100">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-tint/5 hover:text-metal-100 transition-all duration-200 hover:scale-110"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pb-6 sm:px-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-ink-900/60 text-slate-500 ring-1 ring-tint/5">
        {icon}
      </div>
      <p className="font-medium text-slate-300">{title}</p>
      {body && <p className="text-sm text-slate-500 mt-1 max-w-sm">{body}</p>}
    </div>
  );
}

// ---------- Formatters ----------

export const fmtMoney = (n: number) =>
  '$' + n.toLocaleString('es-VE', { maximumFractionDigits: 2 });

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;

/**
 * Number input that allows the user to clear the field completely.
 * The native <input type="number"> refuses to become empty (browsers
 * coerce "" to 0). This component tracks a raw string and only emits
 * a number once a real digit is typed, so deleting every digit leaves
 * the field empty instead of snapping to 0.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className = 'input',
  placeholder,
  stepper = true,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  /** Muestra las flechas de subir/bajar. */
  stepper?: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const shown = raw === null ? (value === 0 ? '' : value) : raw;

  const clamp = (v: number) => {
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  // Se redondea a 4 decimales para que sumar pasos de 0.1 no produzca
  // 0.30000000000000004 (aritmética de punto flotante).
  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    setRaw(null);
    onChange(clamp(Number((base + dir * step).toFixed(4))));
  };

  const field = (
    <input
      type="number"
      inputMode="decimal"
      className={`${className}${stepper ? ' pr-8' : ''}`}
      value={shown}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        if (next === '') {
          onChange(0);
          return;
        }
        const parsed = Number(next);
        if (Number.isNaN(parsed)) return;
        onChange(clamp(parsed));
      }}
      onBlur={() => setRaw(null)}
    />
  );

  if (!stepper) return field;

  const atMax = max !== undefined && value >= max;
  const atMin = min !== undefined && value <= min;

  return (
    <div className="relative">
      {field}
      {/* Flechas propias, en lugar de las grises del navegador. */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-px">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Aumentar"
          disabled={atMax}
          onClick={() => bump(1)}
          className={`nt-step ${atMax ? 'opacity-25 pointer-events-none' : ''}`}
        >
          <ChevronUp size={12} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Disminuir"
          disabled={atMin}
          onClick={() => bump(-1)}
          className={`nt-step ${atMin ? 'opacity-25 pointer-events-none' : ''}`}
        >
          <ChevronDown size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
  });

// ---------- Date picker (calendario propio con el look del CRM) ----------
//
// El <input type="date"> nativo abre el calendario del sistema operativo o del
// navegador — no hay CSS que le cambie los colores. Este componente reemplaza
// esa ventana con un popover propio, en la misma línea visual que el resto del
// CRM (glass-card, acento morado, glow en el día seleccionado), para que se
// vea integrado en vez de "roto" en medio de la app.

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Lunes = 0
  const totalDays = lastDay.getDate();
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month, totalDays + nextDay), isCurrentMonth: false });
    nextDay++;
  }
  return cells;
}

const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
}: {
  value: string; // ISO 'YYYY-MM-DD' o ''
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPicker = () => {
    const d = value ? new Date(`${value}T00:00:00`) : new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    setOpen(true);
  };

  const today = new Date();
  const todayISO = toISO(today);
  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const label = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
    : placeholder;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`input flex items-center justify-between gap-2 text-left ${!value ? 'text-slate-500' : ''}`}
      >
        <span className="capitalize truncate">{label}</span>
        <CalendarDays size={15} className="text-accent-400 shrink-0" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="card absolute z-[70] mt-1.5 w-[280px] p-3 shadow-glow-lg"
          >
            {/* Encabezado de mes */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-tint/10 text-slate-400 hover:border-accent-500/40 hover:text-metal-100 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-metal-100 capitalize">
                {cursor.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="grid h-7 w-7 place-items-center rounded-lg border border-tint/10 text-slate-400 hover:border-accent-500/40 hover:text-metal-100 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAY_LETTERS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold uppercase text-slate-600 py-1">{d}</div>
              ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map(({ date, isCurrentMonth }, i) => {
                const iso = toISO(date);
                const isSelected = value === iso;
                const isToday = todayISO === iso;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(iso); setOpen(false); }}
                    className={`h-8 rounded-lg text-xs transition-all ${
                      !isCurrentMonth
                        ? 'text-slate-700 hover:bg-tint/5'
                        : isSelected
                        ? 'bg-accent-500 text-white font-semibold shadow-glow'
                        : isToday
                        ? 'border border-accent-500/40 text-accent-300'
                        : 'text-slate-300 hover:bg-accent-500/15 hover:text-accent-200'
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Atajos */}
            <div className="mt-2 pt-2 border-t border-tint/5 flex items-center justify-between">
              <button type="button" onClick={() => { onChange(todayISO); setOpen(false); }} className="btn-ghost text-2xs px-2 py-1">
                Hoy
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="text-2xs text-slate-500 hover:text-danger-400 transition-colors px-2 py-1"
                >
                  Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
