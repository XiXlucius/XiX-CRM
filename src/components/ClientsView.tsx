import { useState } from 'react';
import {
  Search, Plus, Filter, MoreHorizontal,
  Mail, Phone, ChevronUp, ChevronDown, X,
  Pencil, Trash2, Star, ExternalLink,
} from 'lucide-react';

interface Client {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'Activo' | 'Prospecto' | 'Negociación' | 'Inactivo' | 'Cerrado';
  value: number;
  score: number;
  avatar: string;
  avatarColor: string;
  lastContact: string;
}

const STATUS_BADGE: Record<string, string> = {
  'Activo':       'badge-green',
  'Prospecto':    'badge-cyan',
  'Negociación':  'badge-amber',
  'Inactivo':     'badge-metal',
  'Cerrado':      'badge-violet',
};

const INITIAL: Client[] = [
  { id: 1, name: 'María González',  company: 'Grupo Alfa S.A.',      email: 'mgonzalez@grupoalfa.com', phone: '+58 412 555 0101', status: 'Activo',      value: 48500,  score: 92, avatar: 'MG', avatarColor: 'from-cyan-500 to-blue-600',      lastContact: 'Hoy' },
  { id: 2, name: 'Carlos Méndez',   company: 'Tech Soluciones',      email: 'cmendez@techsol.com',     phone: '+58 414 555 0202', status: 'Negociación', value: 32000,  score: 78, avatar: 'CM', avatarColor: 'from-violet-500 to-purple-600',   lastContact: 'Ayer' },
  { id: 3, name: 'Ana Rodríguez',   company: 'Inversiones AR',       email: 'arodriguez@iar.com',      phone: '+58 416 555 0303', status: 'Activo',      value: 125000, score: 97, avatar: 'AR', avatarColor: 'from-emerald-500 to-teal-600',    lastContact: 'Hace 2d' },
  { id: 4, name: 'Pedro Jiménez',   company: 'Constructora PJ',      email: 'pjimenez@cpj.com',        phone: '+58 424 555 0404', status: 'Prospecto',   value: 18000,  score: 60, avatar: 'PJ', avatarColor: 'from-amber-500 to-orange-600',    lastContact: 'Hace 3d' },
  { id: 5, name: 'Luisa Fernández', company: 'Distribuidora LF',     email: 'lfernandez@dlf.com',      phone: '+58 426 555 0505', status: 'Cerrado',     value: 74000,  score: 88, avatar: 'LF', avatarColor: 'from-rose-500 to-pink-600',       lastContact: 'Hace 1s' },
  { id: 6, name: 'Roberto Silva',   company: 'Retail Silva',         email: 'rsilva@rsilva.com',       phone: '+58 412 555 0606', status: 'Inactivo',    value: 9500,   score: 35, avatar: 'RS', avatarColor: 'from-slate-500 to-slate-600',     lastContact: 'Hace 2s' },
  { id: 7, name: 'Sofía Martínez',  company: 'Marketing SM',         email: 'smartinez@msm.com',       phone: '+58 414 555 0707', status: 'Prospecto',   value: 22000,  score: 65, avatar: 'SM', avatarColor: 'from-fuchsia-500 to-pink-600',    lastContact: 'Hace 4d' },
  { id: 8, name: 'Diego Herrera',   company: 'Logística DH',         email: 'dherrera@ldh.com',        phone: '+58 416 555 0808', status: 'Negociación', value: 55000,  score: 82, avatar: 'DH', avatarColor: 'from-indigo-500 to-blue-600',     lastContact: 'Hace 1d' },
];

type SortKey = 'name' | 'value' | 'score' | 'lastContact';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-white/08 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

export default function ClientsView() {
  const [clients, setClients] = useState<Client[]>(INITIAL);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});

  const statuses = ['Todos', 'Activo', 'Prospecto', 'Negociación', 'Cerrado', 'Inactivo'];

  const filtered = clients
    .filter(c => statusFilter === 'Todos' || c.status === statusFilter)
    .filter(c => [c.name, c.company, c.email].some(f => f.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      const mult = sortAsc ? 1 : -1;
      if (sortKey === 'name') return mult * a.name.localeCompare(b.name);
      if (sortKey === 'value') return mult * (a.value - b.value);
      if (sortKey === 'score') return mult * (a.score - b.score);
      return 0;
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ChevronDown size={12} className="opacity-30" />;

  const openNew = () => {
    setForm({ status: 'Prospecto', score: 50 });
    setShowForm(true);
  };

  const saveClient = () => {
    if (!form.name || !form.company || !form.email) return;
    if (form.id) {
      setClients(cs => cs.map(c => c.id === form.id ? { ...c, ...form } as Client : c));
    } else {
      const initials = form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const colors = ['from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600'];
      setClients(cs => [...cs, {
        ...form,
        id: Date.now(),
        avatar: initials,
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        phone: form.phone ?? '',
        value: Number(form.value ?? 0),
        score: Number(form.score ?? 50),
        lastContact: 'Hoy',
      } as Client]);
    }
    setShowForm(false);
    setForm({});
  };

  const deleteClient = (id: number) => setClients(cs => cs.filter(c => c.id !== id));

  return (
    <div className="h-full overflow-y-auto px-6 py-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-2xs text-metal-500 uppercase tracking-widest mb-1">Base de Datos</p>
          <h1 className="font-display text-2xl font-bold text-white">Clientes</h1>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-500" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, empresa, email..."
            className="input pl-9 py-2"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25' : 'text-metal-400 hover:text-slate-300 hover:bg-white/05'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/06">
                <th className="text-left px-5 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none" onClick={() => toggleSort('value')}>
                  <span className="flex items-center gap-1">Valor <SortIcon k="value" /></span>
                </th>
                <th className="text-left px-4 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none" onClick={() => toggleSort('score')}>
                  <span className="flex items-center gap-1">Score <SortIcon k="score" /></span>
                </th>
                <th className="text-left px-4 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider hidden lg:table-cell">Último contacto</th>
                <th className="text-right px-5 py-3.5 text-2xs font-semibold text-metal-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="table-row-hover border-b border-white/04 group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${c.avatarColor} grid place-items-center shrink-0 shadow-md`}>
                        <span className="text-2xs font-bold text-white">{c.avatar}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-200 text-sm">{c.name}</p>
                        <p className="text-2xs text-metal-500">{c.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono font-semibold text-cyan-300 text-sm">${c.value.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4"><ScoreBar score={c.score} /></td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-xs text-metal-400">{c.lastContact}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => window.open(`mailto:${c.email}`)} className="p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-cyan-400 transition-colors" title="Email">
                        <Mail size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-slate-300 transition-colors" title="Llamar">
                        <Phone size={13} />
                      </button>
                      <button onClick={() => { setForm({ ...c }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-amber-400 transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-rose-400 transition-colors" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-metal-500 text-sm">No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-white/06 flex items-center justify-between">
          <p className="text-2xs text-metal-500">{filtered.length} de {clients.length} clientes</p>
          <span className="badge badge-cyan">{clients.filter(c => c.status === 'Activo').length} activos</span>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-slide-up">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
            <h2 className="font-display font-semibold text-white text-lg mb-5">{form.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <div className="space-y-3">
              {[
                { label: 'Nombre completo', key: 'name', type: 'text', placeholder: 'Juan García' },
                { label: 'Empresa', key: 'company', type: 'text', placeholder: 'Empresa S.A.' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'juan@empresa.com' },
                { label: 'Teléfono', key: 'phone', type: 'tel', placeholder: '+58 414 000 0000' },
                { label: 'Valor potencial ($)', key: 'value', type: 'number', placeholder: '0' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input
                    type={f.type} placeholder={f.placeholder} className="input"
                    value={(form as any)[f.key] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.status ?? 'Prospecto'} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Client['status'] }))}>
                  {['Activo','Prospecto','Negociación','Cerrado','Inactivo'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={saveClient} className="btn-primary flex-1">{form.id ? 'Guardar cambios' : 'Crear cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
