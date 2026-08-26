import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCY_LABELS, CURRENCY_SYMBOLS, canDisplay, type Currency } from '../lib/currency';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const ORDEN: Currency[] = ['USD', 'EUR', 'VES'];

/** Selector de la moneda en la que se ven los montos. No cambia ningún dato:
 *  la deuda sigue estando en dólares, esto solo cambia cómo se muestra. */
export function CurrencySwitcher() {
  const { currency, setCurrency, rates, loading, refreshRate } = useCurrency();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  const actualizar = async () => {
    try {
      await refreshRate();
      toast.success('Tasa del BCV actualizada');
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const sinTasa = !rates.usdToVes;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Moneda en la que se muestran los montos"
        className="btn-ghost px-2.5 sm:px-3"
      >
        <Coins size={16} />
        <span className="font-medium">{CURRENCY_SYMBOLS[currency]}</span>
        <span className="hidden md:inline text-slate-400">{CURRENCY_LABELS[currency]}</span>
        {sinTasa && <AlertCircle size={13} className="text-warning-400" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="card absolute right-0 z-50 mt-2 w-[260px] p-2 shadow-glow-lg"
            >
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ver montos en
              </p>

              {ORDEN.map((c) => {
                const disponible = canDisplay(c, rates);
                return (
                  <button
                    key={c}
                    disabled={!disponible}
                    onClick={() => { setCurrency(c); setOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      currency === c ? 'bg-accent-500/15 text-accent-200' : 'text-metal-100 hover:bg-tint/5'
                    } ${!disponible ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-left font-medium">{CURRENCY_SYMBOLS[c]}</span>
                      {CURRENCY_LABELS[c]}
                    </span>
                    {currency === c && <Check size={14} />}
                  </button>
                );
              })}

              <div className="mt-2 border-t border-tint/5 pt-2">
                {sinTasa ? (
                  <p className="px-2 pb-2 text-[11px] text-warning-400">
                    Sin tasa cargada. Los montos se ven en dólares.
                  </p>
                ) : (
                  <div className="px-2 pb-2 text-[11px] text-slate-500">
                    <p>
                      1 USD = <span className="num text-slate-300">{rates.usdToVes?.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span> Bs
                    </p>
                    {rates.eurToVes && (
                      <p>
                        1 EUR = <span className="num text-slate-300">{rates.eurToVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</span> Bs
                      </p>
                    )}
                    <p className="mt-0.5">
                      {rates.source === 'manual' ? 'Cargada a mano' : 'BCV'} · {rates.rateDate}
                    </p>
                  </div>
                )}
                <button onClick={actualizar} disabled={loading} className="btn-ghost w-full justify-center text-xs">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  Actualizar tasa del BCV
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
