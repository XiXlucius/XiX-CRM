import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, Clock, TrendingUp, Package, Target, X } from 'lucide-react';
import { useStore } from '../store';
import type { AppNotification, Permission } from '../types';

const TYPE_ICONS: Record<string, typeof Bell> = {
  overdue: AlertTriangle,
  due_soon: Clock,
  risk: AlertTriangle,
  stock: Package,
  goal: Target,
  info: Bell,
};

const PRIORITY_STYLES: Record<string, string> = {
  alta: 'border-l-danger/50 bg-danger/5',
  media: 'border-l-warning/50 bg-warning/5',
  baja: 'border-l-accent-500/50 bg-accent-500/5',
};

export function NotificationBell({ onNavigate }: { onNavigate: (p: Permission) => void }) {
  const { notifications, markAllNotificationsRead, markNotificationRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-ink-850/60 text-slate-300 hover:border-accent-500/40 hover:text-white transition-colors"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 card p-0 z-40 max-h-[70vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div>
                <p className="text-sm font-semibold text-white">Notificaciones</p>
                <p className="text-[11px] text-slate-500">{unread} sin leer</p>
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="btn-ghost px-2 py-1 text-xs"
                >
                  <CheckCheck size={13} /> Marcar todas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  <Bell size={22} className="mx-auto mb-2 opacity-40" />
                  Sin notificaciones
                </div>
              ) : (
                notifications.map((n) => <NotificationItem key={n.id} n={n} onRead={markNotificationRead} onNavigate={onNavigate} onClose={() => setOpen(false)} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ n, onRead, onNavigate, onClose }: { n: AppNotification; onRead: (id: string) => void; onNavigate: (p: Permission) => void; onClose: () => void }) {
  const Icon = TYPE_ICONS[n.type] ?? Bell;
  return (
    <button
      onClick={() => {
        onRead(n.id);
        if (n.link) {
          onNavigate(n.link as Permission);
          onClose();
        }
      }}
      className={`w-full text-left border-l-2 px-4 py-3 transition-colors hover:bg-white/[0.03] ${PRIORITY_STYLES[n.priority]} ${!n.read ? '' : 'opacity-60'}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
          n.priority === 'alta' ? 'bg-danger/15 text-danger-400' :
          n.priority === 'media' ? 'bg-warning/15 text-warning-400' :
          'bg-accent-500/15 text-accent-300'
        }`}>
          <Icon size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{n.title}</p>
          <p className="mt-0.5 text-xs text-slate-400 leading-snug">{n.body}</p>
          <p className="mt-1 text-[10px] text-slate-600">
            {new Date(n.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-400" />}
      </div>
    </button>
  );
}
