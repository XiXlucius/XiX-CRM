import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// ---------- Status helpers ----------

export const STATUS_STYLES: Record<string, string> = {
  prospecto: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30',
  en_revision: 'bg-warning/15 text-warning-400 ring-1 ring-warning/30',
  aprobado: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
  activo: 'bg-success/15 text-success-500 ring-1 ring-success-500/30',
  en_mora: 'bg-danger/15 text-danger-400 ring-1 ring-danger/30',
  rechazado: 'bg-rose-900/30 text-rose-300 ring-1 ring-rose-500/30',
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
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500/15 to-violet-500/10 text-accent-300 ring-1 ring-accent-500/20 shadow-sm">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-xl font-semibold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className={`relative w-full ${sizes[size]} card max-h-[88vh] overflow-y-auto p-6`}
          >
            {/* Subtle top gradient line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200 hover:scale-110"
              >
                <X size={18} />
              </button>
            </div>
            {children}
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
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] text-slate-500 ring-1 ring-white/5">
        {icon}
      </div>
      <p className="font-medium text-slate-300">{title}</p>
      {body && <p className="text-sm text-slate-500 mt-1 max-w-sm">{body}</p>}
    </div>
  );
}

// ---------- Animated number ----------

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.4, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="font-mono tabular-nums"
    >
      {prefix}
      {value.toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </motion.span>
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
  step,
  className = 'input',
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const shown = raw === null ? (value === 0 ? '' : value) : raw;
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
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
        let v = parsed;
        if (min !== undefined) v = Math.max(min, v);
        if (max !== undefined) v = Math.min(max, v);
        onChange(v);
      }}
      onBlur={() => setRaw(null)}
    />
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
