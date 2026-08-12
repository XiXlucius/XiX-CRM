import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { TOUR_STEPS } from '../data';
import { useStore } from '../store';
import type { TourStep } from '../types';

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { role, setTourCompleted } = useStore();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = TOUR_STEPS.filter((s) => s.roles.includes(role));

  const current = steps[index];

  const highlight = useCallback(() => {
    if (!current) return;
    const el = document.querySelector(`[data-tour="${current.target}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [current]);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) highlight();
  }, [open, index, highlight]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => highlight();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, highlight]);

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else finish();
  };
  const prev = () => index > 0 && setIndex(index - 1);
  const finish = () => {
    setTourCompleted(true);
    onClose();
  };

  if (!open || !current) return null;

  const pad = 6;
  const top = rect ? rect.top - pad : 80;
  const left = rect ? rect.left - pad : 0;
  const width = rect ? rect.width + pad * 2 : 0;
  const height = rect ? rect.height + pad * 2 : 0;

  // Position the popover near the highlighted element
  const popoverStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: Math.min(Math.max(top + height + 12, 16), window.innerHeight - 220),
        left: Math.min(Math.max(left, 16), Math.max(window.innerWidth - 360, 16)),
        width: 'min(340px, calc(100vw - 32px))',
      }
    : {
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
      };

  return (
    <>
      {/* Dim overlay with cutout */}
      <div className="fixed inset-0 z-[60] pointer-events-none">
        <div className="absolute inset-0 bg-black/70" />
        {rect && (
          <motion.div
            initial={false}
            animate={{ top, left, width, height }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute rounded-xl ring-2 ring-accent-400 shadow-glow"
            style={{
              backgroundColor: 'rgba(11,19,41,0.001)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
            }}
          />
        )}
      </div>

      {/* Popover */}
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={popoverStyle}
        className="z-[61] card p-5 pointer-events-auto"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-violet-500">
            <Sparkles size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-accent-300">
                Paso {index + 1} de {steps.length}
              </p>
              <button
                onClick={finish}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <h3 className="mt-1 font-display text-base font-semibold text-white">
              {current.title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
              {current.body}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-accent-400' : 'w-1.5 bg-white/15'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button onClick={prev} className="btn-ghost px-2.5 py-1.5">
                <ChevronLeft size={15} />
              </button>
            )}
            <button onClick={next} className="btn-primary px-3.5 py-1.5">
              {index === steps.length - 1 ? (
                <>
                  <Check size={15} /> Finalizar
                </>
              ) : (
                <>
                  Siguiente <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function TourLauncher({ onStart }: { onStart: () => void }) {
  const { tourCompleted, setTourCompleted } = useStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!tourCompleted) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourCompleted]);

  if (!show || tourCompleted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 card p-4 max-w-md w-[calc(100vw-2rem)]"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-violet-500">
            <Sparkles size={19} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-semibold text-white">
              ¿Primera vez en XiX Tech?
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Te ofrecemos un tour guiado de 2 minutos por los módulos clave de tu
              rol. Puedes saltarlo y verlo después.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setShow(false);
                  onStart();
                }}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                <Sparkles size={13} /> Comenzar tour
              </button>
              <button
                onClick={() => {
                  setShow(false);
                  setTourCompleted(true);
                }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
