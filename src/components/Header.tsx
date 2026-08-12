import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  ShieldCheck,
  UsersRound,
  Eye,
  User,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ROLES } from '../data';
import { useStore, useCurrentRole } from '../store';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

const ADMIN_EMAIL = 'xix6urn@gmail.com';

const ROLE_ICONS: Record<Role, typeof ShieldCheck> = {
  admin: ShieldCheck,
  gerente: UsersRound,
  supervisor: Eye,
  vendedor: User,
};

export function Header({ onOpenTour, onNavigate, notificationSlot }: { onOpenTour: () => void; onNavigate?: (p: import('../types').Permission) => void; notificationSlot?: React.ReactNode; }) {
  const { role, setRole } = useStore();
  const current = useCurrentRole();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canSwitchRole = user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const CurrentIcon = ROLE_ICONS[current.id];

  return (
    <header
      data-tour="header"
      className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl"
    >
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />

      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-violet-500 shadow-glow"
          >
            <Sparkles size={18} className="text-white" />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="font-display text-base font-semibold text-white leading-none tracking-tight">
              XiX Tech
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">CRM de Ventas a Crédito</p>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenTour}
            className="btn-ghost hidden sm:inline-flex"
            data-tour="tour-btn"
          >
            <HelpCircle size={16} />
            <span className="hidden md:inline">Tour guiado</span>
          </motion.button>

          {notificationSlot}

          {/* Role switcher */}
          <div className="relative" ref={ref} data-tour="role-switcher">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-ink-850/60 px-2.5 py-1.5 hover:border-accent-500/40 transition-all duration-200"
            >
              <div
                className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${current.color} text-white text-xs font-semibold shadow-sm`}
              >
                {current.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-white leading-none">
                  {current.label}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Perfil activo</p>
              </div>
              <ChevronDown
                size={15}
                className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </motion.button>

            <AnimatePresence>
              {open && canSwitchRole && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 card p-2 z-40"
                >
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                    Cambiar perfil
                  </p>
                  {ROLES.map((r) => {
                    const Icon = ROLE_ICONS[r.id];
                    const active = r.id === role;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setRole(r.id);
                          setOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
                          active ? 'bg-accent-500/10 ring-1 ring-accent-500/20' : 'hover:bg-white/5'
                        }`}
                      >
                        <div
                          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${r.color} text-white text-[11px] font-semibold shadow-sm`}
                        >
                          {r.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon size={13} className="text-slate-400" />
                            <p className="text-sm font-medium text-white">{r.label}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            {r.description}
                          </p>
                        </div>
                        {active && (
                          <Check size={15} className="text-accent-400 mt-1.5" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
