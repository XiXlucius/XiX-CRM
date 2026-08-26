import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  EMPTY_RATES, setDisplayCurrency, setRates,
  type Currency, type Rates,
} from '../lib/currency';

interface CurrencyValue {
  /** Moneda en la que se están MOSTRANDO los montos. */
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Rates;
  loading: boolean;
  /** Vuelve a leer la tasa del BCV desde el servidor. */
  refreshRate: () => Promise<void>;
  /** Guarda una tasa escrita a mano (respaldo si el BCV falla). */
  saveManualRate: (usdToVes: number, eurToVes?: number | null) => Promise<void>;
}

const Ctx = createContext<CurrencyValue | null>(null);

const STORAGE_KEY = 'xixtech_display_currency';

function readStored(): Currency {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'EUR' || v === 'VES' ? v : 'USD';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(readStored);
  const [rates, setRatesState] = useState<Rates>(EMPTY_RATES);
  const [loading, setLoading] = useState(true);

  // El módulo de moneda tiene que conocer la elección antes de que se
  // dibuje cualquier monto.
  setDisplayCurrency(currency);
  setRates(rates);

  const loadLatest = useCallback(async () => {
    // Se toma la más reciente disponible: si el BCV no publicó hoy
    // (fin de semana, feriado), sirve la del último día hábil.
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate_date, source, usd_to_ves, eur_to_ves')
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setRatesState(EMPTY_RATES);
      setRates(EMPTY_RATES);
      return;
    }
    const r: Rates = {
      usdToVes: data.usd_to_ves != null ? Number(data.usd_to_ves) : null,
      eurToVes: data.eur_to_ves != null ? Number(data.eur_to_ves) : null,
      rateDate: data.rate_date ?? null,
      source: data.source ?? null,
    };
    setRatesState(r);
    setRates(r);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      await loadLatest();
      if (vivo) setLoading(false);
    })();
    return () => { vivo = false; };
  }, [loadLatest]);

  const setCurrency = useCallback((c: Currency) => {
    localStorage.setItem(STORAGE_KEY, c);
    setDisplayCurrency(c);
    setCurrencyState(c);
  }, []);

  const refreshRate = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('tasa-bcv', { method: 'GET' });
      if (error) throw error;
      await loadLatest();
    } finally {
      setLoading(false);
    }
  }, [loadLatest]);

  const saveManualRate = useCallback(async (usdToVes: number, eurToVes?: number | null) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('tasa-bcv', {
        body: { usd_to_ves: usdToVes, eur_to_ves: eurToVes ?? null },
      });
      if (error) throw error;
      await loadLatest();
    } finally {
      setLoading(false);
    }
  }, [loadLatest]);

  const value = useMemo<CurrencyValue>(
    () => ({ currency, setCurrency, rates, loading, refreshRate, saveManualRate }),
    [currency, setCurrency, rates, loading, refreshRate, saveManualRate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrency(): CurrencyValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCurrency debe usarse dentro de CurrencyProvider');
  return v;
}
