import { useState } from 'react';
import {
  LayoutDashboard, Users, GraduationCap, MessageSquare, UsersRound,
  ReceiptText, Boxes, Settings, FileBarChart, History,
  ChevronLeft, ChevronRight, LogOut, Zap,
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
  Boxes,
  Settings,
  FileBarChart,
  History,
};

interface Props {
  active: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export default function Sidebar({ active, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const currentRole = useCurrentRole();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'XX';

  const visibleItems = NAV_ITEMS.filter((item) =>
    currentRole.permissions.includes(item.id),
  );

  return (
    <aside
      data-tour="sidebar"
      className={`sidebar flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="relative h-8 w-8 shrink-0 grid place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 shadow-glow-cyan">
          <Zap size={15} className="text-white" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-neon-cyan ring-2 ring-obsidian-950" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="font-display font-bold text-sm text-white leading-none">XiX Tech</p>
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
              onClick={() => onNavigate(id)}
              className={`nav-item w-full ${active === id ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className={`shrink-0 transition-colors ${active === id ? 'text-cyan-300' : 'text-metal-500'}`} />
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
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center shrink-0">
              <span className="text-2xs font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
              <p className="text-2xs text-metal-500">{currentRole.label}</p>
            </div>
            <button onClick={logout} className="p-1.5 rounded-lg hover:bg-white/5 text-metal-500 hover:text-slate-300 transition-colors" title="Cerrar sesión">
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
          className="mt-1 w-full flex items-center justify-center rounded-xl p-2 text-metal-600 hover:text-slate-400 hover:bg-white/5 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
