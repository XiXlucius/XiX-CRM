import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Boxes, ReceiptText, UsersRound, CornerDownLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import type { Permission } from '../types';

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette({ onNavigate, onSelectClient }: { onNavigate: (p: Permission) => void; onSelectClient: (id: string) => void }) {
  const { clients, products, invoices, team } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    const clientResults: SearchResult[] = clients
      .filter((c) => !q || c.fullName.toLowerCase().includes(q) || c.cedula.toLowerCase().includes(q) || c.product.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({
        id: `client-${c.id}`,
        label: c.fullName,
        sub: `${c.cedula} · ${c.product}`,
        icon: <Users size={15} />,
        category: 'Clientes',
        action: () => { onSelectClient(c.id); onNavigate('crm'); setOpen(false); },
      }));
    const productResults: SearchResult[] = products
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({
        id: `product-${p.id}`,
        label: p.name,
        sub: `${p.sku} · Stock ${p.stock}`,
        icon: <Boxes size={15} />,
        category: 'Productos',
        action: () => { onNavigate('inventario'); setOpen(false); },
      }));
    const invoiceResults: SearchResult[] = invoices
      .filter((i) => !q || i.clientName.toLowerCase().includes(q))
      .slice(0, 4)
      .map((i) => ({
        id: `invoice-${i.id}`,
        label: `${i.clientName} — $${i.amount.toFixed(2)}`,
        sub: `${i.status} · ${new Date(i.dueDate).toLocaleDateString('es-VE')}`,
        icon: <ReceiptText size={15} />,
        category: 'Facturas',
        action: () => { onNavigate('facturacion'); setOpen(false); },
      }));
    const teamResults: SearchResult[] = team
      .filter((m) => !q || m.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((m) => ({
        id: `team-${m.id}`,
        label: m.name,
        sub: m.role,
        icon: <UsersRound size={15} />,
        category: 'Equipo',
        action: () => { onNavigate('equipo'); setOpen(false); },
      }));
    const navResults: SearchResult[] = [
      { id: 'nav-dashboard', label: 'Dashboard', sub: 'KPIs y mapa', icon: <Search size={15} />, category: 'Navegación', action: () => { onNavigate('dashboard'); setOpen(false); } },
      { id: 'nav-crm', label: 'CRM Clientes', sub: 'Cartera y solicitudes', icon: <Users size={15} />, category: 'Navegación', action: () => { onNavigate('crm'); setOpen(false); } },
      { id: 'nav-pagados', label: 'Clientes pagados', sub: 'Créditos saldados', icon: <Users size={15} />, category: 'Navegación', action: () => { onNavigate('pagados'); setOpen(false); } },
      { id: 'nav-facturacion', label: 'Facturación', sub: 'Cobranzas', icon: <ReceiptText size={15} />, category: 'Navegación', action: () => { onNavigate('facturacion'); setOpen(false); } },
      { id: 'nav-inventario', label: 'Inventario', sub: 'Catálogo y rotación', icon: <Boxes size={15} />, category: 'Navegación', action: () => { onNavigate('inventario'); setOpen(false); } },
    ].filter((r) => !q || r.label.toLowerCase().includes(q));

    return [...clientResults, ...productResults, ...invoiceResults, ...teamResults, ...navResults];
  }, [query, clients, products, invoices, team, onNavigate, onSelectClient]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[activeIdx]?.action();
    }
  };

  let lastCategory = '';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[14vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#292b31]/50"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[min(560px,92vw)] card rounded-2xl p-0 overflow-hidden shadow-lg"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Search size={16} className="text-metal-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar clientes, productos, facturas, equipo o navegar..."
                className="flex-1 bg-transparent text-[15px] text-metal-100 placeholder:text-metal-500 focus:outline-none"
              />
              <kbd className="hidden sm:inline num rounded bg-metal-700 px-1.5 py-0.5 text-[10px] text-metal-400">ESC</kbd>
            </div>

            <div className="divider" />

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="py-8 text-center text-sm text-metal-500">Sin resultados para "{query}"</p>
              ) : (
                results.map((r, i) => {
                  const showCat = r.category !== lastCategory;
                  lastCategory = r.category;
                  return (
                    <div key={r.id}>
                      {showCat && (
                        <p className="kicker px-3.5 pt-2 pb-1">{r.category}</p>
                      )}
                      <button
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={r.action}
                        className={`flex w-full items-center gap-3 min-h-[40px] px-3.5 rounded-lg text-left transition-colors border-l-2 ${
                          activeIdx === i
                            ? 'bg-accent-500/10 border-l-accent text-accent-300'
                            : 'border-l-transparent hover:bg-tint/5'
                        }`}
                      >
                        <span className={activeIdx === i ? 'text-accent-300' : 'text-metal-400'}>
                          {r.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${activeIdx === i ? 'text-accent-300' : 'text-metal-100'}`}>{r.label}</p>
                          <p className="text-xs text-metal-500 truncate">{r.sub}</p>
                        </div>
                        {activeIdx === i && <CornerDownLeft size={14} className="text-accent-300" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="divider" />

            <div className="flex items-center justify-between px-4 py-2 text-[10px] text-metal-500">
              <span>↑↓ navegar · ↵ seleccionar</span>
              <span className="flex items-center gap-1"><kbd className="num rounded bg-metal-700 px-1">⌘K</kbd> paleta</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
