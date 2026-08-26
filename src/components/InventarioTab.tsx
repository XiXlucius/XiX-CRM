import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  TrendingUp,
  PackageX,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useStore } from '../store';
import type { Product } from '../types';
import { Card, SectionHeader, Modal, EmptyState, fmtMoney, fmtPct, NumberInput, MoneyInput } from './ui';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

type QuickFilter = 'all' | 'available' | 'low' | 'out';

export function InventarioTab() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const toast = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<QuickFilter>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => ({
    all: products.length,
    available: products.filter((p) => p.stock > 5).length,
    low: products.filter((p) => p.stock > 0 && p.stock <= 5).length,
    out: products.filter((p) => p.stock === 0).length,
  }), [products]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => {
      const matches =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const stockOk =
        quick === 'all' ? true :
        quick === 'available' ? p.stock > 5 :
        quick === 'low' ? p.stock > 0 && p.stock <= 5 :
        p.stock === 0;
      return matches && stockOk;
    });
  }, [products, query, quick]);

  const chartData = useMemo(
    () =>
      products.map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
        Vendido: p.sold,
        Stock: p.stock,
      })),
    [products],
  );

  const alerts = useMemo(
    () =>
      products
        .map((p) => ({ p, rate: p.sold + p.stock > 0 ? p.sold / (p.sold + p.stock) : 0 }))
        .filter((a) => a.rate >= 0.8 && a.p.stock <= 5)
        .sort((a, b) => b.rate - a.rate),
    [products],
  );

  return (
    <div data-tour="inventario" className="space-y-5">
      <SectionHeader
        title="Inventario & Rotación"
        subtitle={`${products.length} productos · ${alerts.length} alertas de quiebre`}
        icon={<Boxes size={16} />}
        action={
          <button onClick={() => setAdding(true)} className="btn-primary">
            <Plus size={15} /> <span className="hidden sm:inline">Nuevo producto</span>
          </button>
        }
      />

      {/* Search + quick filters */}
      <Card className="p-3 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU, categoría o estado..."
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: 'Todos los productos', icon: Package, count: counts.all, color: 'text-accent-300' },
            { id: 'available', label: 'Disponibles', icon: CheckCircle2, count: counts.available, color: 'text-success-500' },
            { id: 'low', label: 'Bajo stock', icon: TrendingUp, count: counts.low, color: 'text-warning-400' },
            { id: 'out', label: 'Agotados', icon: PackageX, count: counts.out, color: 'text-danger-400' },
          ] as const).map((f) => {
            const Icon = f.icon;
            const active = quick === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setQuick(f.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'border-accent-500/40 bg-accent-500/10 text-metal-100'
                    : 'border-tint/10 text-slate-400 hover:border-tint/20 hover:text-metal-100'
                }`}
              >
                <Icon size={14} className={active ? 'text-accent-300' : f.color} />
                {f.label}
                <span className={`chip text-[10px] ${active ? 'bg-accent-500/20 text-accent-200' : 'bg-tint/5 text-slate-500'}`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Stock alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-danger/30 bg-danger/5 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-danger-400" />
            <p className="text-sm font-semibold text-danger-400">
              Riesgo de quiebre de stock
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map(({ p, rate }) => (
              <span key={p.id} className="chip bg-danger/10 text-danger-400 ring-1 ring-danger/20">
                {p.name} · {fmtPct(rate * 100)} rotación · {p.stock} en stock
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Rotation chart */}
      <Card className="p-4 sm:p-5">
        <SectionHeader
          title="Gráfico de rotación"
          subtitle="Cantidad vendida vs. stock actual por producto"
          icon={<TrendingUp size={16} />}
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -12, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f424d" vertical={false} />
              <XAxis dataKey="name" stroke="#75798c" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={70} interval={0} />
              <YAxis stroke="#75798c" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#232532',
                  border: '1px solid #3f424d',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Vendido" fill="#9184d9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Stock" fill="#d2cefd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Boxes size={22} />} title="Sin productos que coincidan" body="Ajusta el filtro o agrega un producto." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p) => {
              const total = p.sold + p.stock;
              const rate = total > 0 ? p.sold / total : 0;
              const finalPrice = p.basePrice * (1 + p.taxPct / 100) * (1 - p.discountPct / 100);
              const risk = rate >= 0.8 && p.stock <= 5;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card hover className="p-4 h-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="num text-[11px] text-slate-500">{p.sku}</p>
                        <p className="font-medium text-metal-100">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.category}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditing(p)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-tint/5 hover:text-metal-100 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          disabled={deletingId === p.id}
                          onClick={async () => {
                            setDeletingId(p.id);
                            try {
                              await deleteProduct(p.id);
                              toast.success('Producto eliminado');
                            } catch (err) {
                              toast.error(friendlyError(err));
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-danger/10 hover:text-danger-400 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-ink-900/40 px-2.5 py-2">
                        <p className="text-[10px] uppercase text-slate-500">Precio base</p>
                        <p className="num text-slate-200">{fmtMoney(p.basePrice)}</p>
                      </div>
                      <div className="rounded-lg bg-ink-900/40 px-2.5 py-2">
                        <p className="text-[10px] uppercase text-slate-500">Precio final</p>
                        <p className="num text-metal-100">{fmtMoney(finalPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-ink-900/40 px-2.5 py-2">
                        <p className="text-[10px] uppercase text-slate-500">Stock</p>
                        <p className={`num ${p.stock === 0 ? 'text-danger-400' : p.stock <= 5 ? 'text-warning-400' : 'text-success-500'}`}>
                          {p.stock}
                        </p>
                      </div>
                      <div className="rounded-lg bg-ink-900/40 px-2.5 py-2">
                        <p className="text-[10px] uppercase text-slate-500">Vendido</p>
                        <p className="num text-accent-300">{p.sold}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500">Rotación</span>
                        <span className={risk ? 'text-danger-400 font-medium' : 'text-slate-400'}>
                          {fmtPct(rate * 100)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rate * 100}%` }}
                          className={`h-full rounded-full ${risk ? 'bg-danger-500' : rate >= 0.6 ? 'bg-warning-500' : 'bg-gradient-to-r from-accent-600 to-violet-500'}`}
                        />
                      </div>
                      {risk && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-danger-400">
                          <AlertTriangle size={11} /> Riesgo de quiebre de stock
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <ProductModal
        open={!!editing || adding}
        product={editing}
        onClose={() => {
          setEditing(null);
          setAdding(false);
        }}
        onSave={async (data) => {
          try {
            if (editing) await updateProduct(editing.id, data);
            else await addProduct(data as Omit<Product, 'id'>);
            toast.success(editing ? 'Producto actualizado' : 'Producto creado');
            setEditing(null);
            setAdding(false);
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
      />
    </div>
  );
}

function ProductModal({
  open,
  product,
  onClose,
  onSave,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (data: Partial<Product> | Omit<Product, 'id'>) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: '',
    basePrice: 1000,
    taxPct: 16,
    discountPct: 0,
    stock: 10,
    sold: 0,
  });

  useMemo(() => {
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        taxPct: product.taxPct,
        discountPct: product.discountPct,
        stock: product.stock,
        sold: product.sold,
      });
    } else {
      setForm({ sku: '', name: '', category: '', basePrice: 1000, taxPct: 16, discountPct: 0, stock: 10, sold: 0 });
    }
  }, [product, open]);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.sku) return;
    setSubmitting(true);
    try {
      await onSave(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">SKU</label>
            <input className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="ELC-XXX-00" />
          </div>
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Categoría</label>
            <input className="input" value={form.category} onChange={(e) => set('category', e.target.value)} />
          </div>
          <div>
            <label className="label">Precio base</label>
            <MoneyInput valueUsd={form.basePrice} onChangeUsd={(v) => set('basePrice', v)} min={0} />
          </div>
          <div>
            <label className="label">IVA (%)</label>
            <NumberInput value={form.taxPct} onChange={(v) => set('taxPct', v)} min={0} max={100} step={0.5} />
          </div>
          <div>
            <label className="label">Descuento (%)</label>
            <NumberInput value={form.discountPct} onChange={(v) => set('discountPct', v)} min={0} max={100} step={0.5} />
          </div>
          <div>
            <label className="label">Stock</label>
            <NumberInput value={form.stock} onChange={(v) => set('stock', v)} min={0} />
          </div>
          <div>
            <label className="label">Vendido</label>
            <NumberInput value={form.sold} onChange={(v) => set('sold', v)} min={0} />
          </div>
        </div>
        <div className="rounded-xl bg-accent-500/5 p-3 ring-1 ring-accent-500/20">
          <p className="text-xs text-slate-400">Precio final con IVA y descuento:</p>
          <p className="mt-1 font-display text-xl font-medium text-metal-100">
            {fmtMoney(form.basePrice * (1 + form.taxPct / 100) * (1 - form.discountPct / 100))}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={submitting}>Cancelar</button>
          <button onClick={submit} className="btn-primary" disabled={submitting}>
            {submitting ? <Loader2 size={15} className="animate-spin" /> : `${product ? 'Guardar' : 'Agregar'} producto`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
