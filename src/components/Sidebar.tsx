import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, MessageSquare, UsersRound,
  ReceiptText, Boxes, Settings, FileBarChart, History, Route,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore, useCurrentRole } from '../store';
import { NAV_ITEMS } from '../data';
import type { Permission } from '../types';

export type NavTab = Permission;

const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  MessageSquare,
  UsersRound,
  ReceiptText,
  Route,
  Boxes,
  Settings,
  FileBarChart,
  History,
};

interface Props {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ active, onNavigate, open, onClose }: Props) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('xixtech_sidebar_collapsed') === '1');
  const { user, logout } = useAuth();
  const currentRole = useCurrentRole();

  useEffect(() => {
    localStorage.setItem('xixtech_sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // Drawer móvil: cerrar con Escape y bloquear scroll del body mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const navigate = (tab: NavTab) => {
    onNavigate(tab);
    onClose();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'XX';

  const visibleItems = NAV_ITEMS.filter((item) =>
    currentRole.permissions.includes(item.id),
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        data-tour="sidebar"
        className={`sidebar flex flex-col h-full z-40 fixed inset-y-0 left-0 w-[260px] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:transition-[width] lg:duration-300 ${
          collapsed ? 'lg:w-[60px]' : 'lg:w-[220px]'
        }`}
      >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        {/* § 6.6 — logo de constelación con halo pulsante */}
        <div
          className="relative h-8 w-8 shrink-0 grid place-items-center rounded-xl"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-700))',
            boxShadow: '0 0 18px 3px rgba(145,132,217,0.7)',
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="ntConstellation">
            <path d="M4 19 L10.5 8.5"   stroke="#f4f3ff" strokeWidth="1.1" opacity="0.8" />
            <path d="M10.5 8.5 L17 12.5" stroke="#f4f3ff" strokeWidth="1.1" opacity="0.7" />
            <path d="M17 12.5 L20.5 5"   stroke="#f4f3ff" strokeWidth="1.1" opacity="0.6" />
            <path d="M10.5 8.5 L6.5 4"   stroke="#f4f3ff" strokeWidth="1.1" opacity="0.55" />
            <circle cx="4"    cy="19"   r="1.4" fill="#ffffff" />
            <circle cx="10.5" cy="8.5"  r="2.2" fill="#ffffff" />
            <circle cx="17"   cy="12.5" r="1.6" fill="#ffffff" />
            <circle cx="20.5" cy="5"    r="1.2" fill="#ffffff" />
            <circle cx="6.5"  cy="4"    r="1.2" fill="#ffffff" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent-400 ring-2 ring-obsidian-950" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="font-display font-medium text-sm leading-none ntNeonBg ntNeonAnim">XiX Tech</p>
            <p className="text-2xs text-metal-500 mt-0.5">CRM Platform</p>
          </div>
        )}
      </div>

      <div className="divider mx-3 mb-3" />

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ id, label, icon }) => {
          const Icon = ICONS[icon] ?? LayoutDashboard;
          return (
            <button
              key={id}
              data-tour={id}
              onClick={() => navigate(id)}
              className={`nav-item w-full ${active === id ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className={`shrink-0 transition-colors ${active === id ? 'text-accent-300' : 'text-metal-500'}`} />
              {!collapsed && <span className="animate-fade-in">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-2">
        <div className="divider mb-2" />
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="h-7 w-7 rounded-full bg-ink-900/80 ring-1 ring-tint/10 grid place-items-center shrink-0">
              <span className="text-2xs font-bold text-metal-100">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
              <p className="text-2xs text-metal-500">{currentRole.label}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-tint/5 text-metal-500 hover:text-slate-300 transition-colors" title="Cerrar sesión">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button onClick={logout} className="nav-item w-full justify-center px-0" title="Cerrar sesión">
            <LogOut size={15} className="text-metal-500" />
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-1 w-full flex items-center justify-center rounded-xl p-2 text-metal-600 hover:text-slate-400 hover:bg-tint/5 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      </aside>
    </>
  );
}
