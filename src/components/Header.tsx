import { motion } from 'framer-motion';
import {
  ShieldCheck,
  UsersRound,
  Eye,
  User,
  HelpCircle,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useCurrentRole } from '../store';
import { CurrencySwitcher } from './CurrencySwitcher';
import type { Role } from '../types';

const ROLE_ICONS: Record<Role, typeof ShieldCheck> = {
  nuevo: User,
  admin: ShieldCheck,
  gerente: UsersRound,
  supervisor: Eye,
  vendedor: User,
};

export function Header({ onOpenTour, onOpenSidebar, onNavigate, notificationSlot }: { onOpenTour: () => void; onOpenSidebar?: () => void; onNavigate?: (p: import('../types').Permission) => void; notificationSlot?: React.ReactNode; }) {
  const current = useCurrentRole();
  const CurrentIcon = ROLE_ICONS[current.id];

  return (
    <header
      data-tour="header"
      className="sticky top-0 z-20 border-b border-tint/[0.06] bg-ink-950/80 backdrop-blur-xl"
    >
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-500/20 to-transparent" />

      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-tint/5 hover:text-metal-100 transition-colors lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={19} />
          </button>
          <motion.div
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900/80 ring-1 ring-accent-500/30 shadow-glow"
          >
            <Sparkles size={18} className="text-metal-100" />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="font-display text-base font-medium text-metal-100 leading-none tracking-tight">
              XiX Tech
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">CRM de Ventas a Crédito</p>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencySwitcher />
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

          {/* Perfil — SOLO LECTURA. Antes esto era un selector que escribia el
              rol en localStorage: la UI te obedecia pero el servidor no, asi que
              podias verte como admin sin serlo, o arrancar como vendedor y
              perder secciones del menu. El rol ahora sale de `memberships`.
              Para cambiarle el rol a alguien: pestana Equipo, o Supabase. */}
          <div
            className="flex items-center gap-2.5 rounded-xl border border-tint/10 bg-ink-850/60 px-2.5 py-1.5"
            data-tour="role-switcher"
            title="Tu rol lo define tu membresia en la organizacion"
          >
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900/80 ring-1 ring-tint/10 text-accent-300 text-xs font-semibold">
              {current.initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-metal-100 leading-none">
                {current.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Perfil activo</p>
            </div>
            <CurrentIcon size={14} className="text-slate-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
