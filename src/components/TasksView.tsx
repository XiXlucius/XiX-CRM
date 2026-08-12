import { useState } from 'react';
import {
  Plus, CheckCircle2, Circle, Trash2, Flag,
  Calendar, User, Filter, X, Clock,
} from 'lucide-react';

type Priority = 'alta' | 'media' | 'baja';
type Category = 'Llamada' | 'Email' | 'Reunión' | 'Propuesta' | 'Seguimiento' | 'Admin';

interface Task {
  id: number;
  title: string;
  category: Category;
  priority: Priority;
  assignee: string;
  avatarColor: string;
  dueDate: string;
  done: boolean;
  notes?: string;
}

const CATEGORY_BADGE: Record<Category, string> = {
  'Llamada':     'badge-cyan',
  'Email':       'badge-blue',
  'Reunión':     'badge-violet',
  'Propuesta':   'badge-amber',
  'Seguimiento': 'badge-metal',
  'Admin':       'badge-metal',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  alta:  'text-rose-400',
  media: 'text-amber-400',
  baja:  'text-metal-500',
};
const PRIORITY_BADGE: Record<Priority, string> = {
  alta:  'badge-rose',
  media: 'badge-amber',
  baja:  'badge-metal',
};

const INITIAL: Task[] = [
  { id: 1,  title: 'Llamada de seguimiento con María González',    category: 'Llamada',     priority: 'alta',  assignee: 'MG', avatarColor: 'from-cyan-500 to-blue-600',      dueDate: 'Hoy',     done: false, notes: 'Confirmar renovación del contrato anual.' },
  { id: 2,  title: 'Preparar demo para Grupo Alfa',                category: 'Reunión',     priority: 'alta',  assignee: 'CM', avatarColor: 'from-violet-500 to-purple-600',   dueDate: 'Mañana',  done: false },
  { id: 3,  title: 'Enviar propuesta actualizada a Logística DH',  category: 'Propuesta',   priority: 'alta',  assignee: 'AR', avatarColor: 'from-emerald-500 to-teal-600',    dueDate: '29 Jul',  done: false },
  { id: 4,  title: 'Reunión de kick-off con Inversiones AR',       category: 'Reunión',     priority: 'media', assignee: 'PJ', avatarColor: 'from-amber-500 to-orange-600',    dueDate: '30 Jul',  done: false },
  { id: 5,  title: 'Responder email de Constructora PJ',           category: 'Email',       priority: 'media', assignee: 'LF', avatarColor: 'from-rose-500 to-pink-600',       dueDate: 'Hoy',     done: false },
  { id: 6,  title: 'Actualizar CRM con notas del pipeline',        category: 'Admin',       priority: 'baja',  assignee: 'DH', avatarColor: 'from-indigo-500 to-blue-600',     dueDate: '01 Ago',  done: false },
  { id: 7,  title: 'Seguimiento a Retail Silva - propuesta B',     category: 'Seguimiento', priority: 'media', assignee: 'RS', avatarColor: 'from-slate-500 to-slate-600',     dueDate: '02 Ago',  done: true },
  { id: 8,  title: 'Onboarding llamada con Empresa Beta',          category: 'Llamada',     priority: 'alta',  assignee: 'EB', avatarColor: 'from-teal-500 to-cyan-600',       dueDate: '03 Ago',  done: true },
];

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'completadas'>('pendientes');
  const [priorityFilter, setPriorityFilter] = useState<'todas' | Priority>('todas');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Task>>({ priority: 'media', category: 'Llamada' });

  const toggle = (id: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove  = (id: number) => setTasks(ts => ts.filter(t => t.id !== id));

  const visible = tasks.filter(t => {
    if (filter === 'pendientes' && t.done) return false;
    if (filter === 'completadas' && !t.done) return false;
    if (priorityFilter !== 'todas' && t.priority !== priorityFilter) return false;
    return true;
  });

  const pending = tasks.filter(t => !t.done).length;
  const done    = tasks.filter(t =>  t.done).length;
  const progress = Math.round((done / (tasks.length || 1)) * 100);

  const saveTask = () => {
    if (!form.title?.trim()) return;
    const initials = (form.title ?? 'NN').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const colors = ['from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600'];
    setTasks(ts => [...ts, {
      id: Date.now(), done: false,
      title: form.title!, category: (form.category ?? 'Admin') as Category,
      priority: (form.priority ?? 'media') as Priority,
      assignee: initials,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      dueDate: form.dueDate ?? 'Sin fecha',
      notes: form.notes,
    }]);
    setForm({ priority: 'media', category: 'Llamada' });
    setShowForm(false);
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-2xs text-metal-500 uppercase tracking-widest mb-1">Gestión</p>
          <h1 className="font-display text-2xl font-bold text-white">Tareas</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={15} /> Nueva tarea
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="glass-card stat-card-cyan p-4 text-center">
          <p className="font-mono font-bold text-2xl text-cyan-300">{pending}</p>
          <p className="text-2xs text-metal-500 mt-1">Pendientes</p>
        </div>
        <div className="glass-card stat-card-green p-4 text-center">
          <p className="font-mono font-bold text-2xl text-emerald-400">{done}</p>
          <p className="text-2xs text-metal-500 mt-1">Completadas</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xs text-metal-500">Progreso</p>
            <p className="text-xs font-bold text-white">{progress}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-white/08 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-3 mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {(['todas', 'pendientes', 'completadas'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25' : 'text-metal-400 hover:text-slate-300 hover:bg-white/05'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <Flag size={12} className="text-metal-500" />
          {(['todas', 'alta', 'media', 'baja'] as const).map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={`px-2.5 py-1 rounded-lg text-2xs font-medium capitalize transition-all ${priorityFilter === p ? 'bg-white/08 text-slate-200' : 'text-metal-500 hover:text-slate-400'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="glass-card p-8 text-center text-metal-500 text-sm">No hay tareas en esta vista</div>
        )}
        {visible.map(task => (
          <div key={task.id} className={`glass-card px-5 py-4 flex items-center gap-4 group transition-all ${task.done ? 'opacity-55' : ''}`}>
            <button onClick={() => toggle(task.id)} className="shrink-0 transition-all hover:scale-110">
              {task.done
                ? <CheckCircle2 size={18} className="text-emerald-500" />
                : <Circle size={18} className="text-metal-600 hover:text-cyan-400 transition-colors" />
              }
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className={`text-sm font-medium ${task.done ? 'line-through text-metal-500' : 'text-slate-200'}`}>{task.title}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${CATEGORY_BADGE[task.category]} text-2xs`}>{task.category}</span>
                <span className={`badge ${PRIORITY_BADGE[task.priority]} text-2xs`}>{task.priority}</span>
                <span className="flex items-center gap-1 text-2xs text-metal-500"><Clock size={10} />{task.dueDate}</span>
                {task.notes && <span className="text-2xs text-metal-600 truncate max-w-[200px]">{task.notes}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${task.avatarColor} grid place-items-center`}>
                <span className="text-[8px] font-bold text-white">{task.assignee}</span>
              </div>
              <button onClick={() => remove(task.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/08 text-metal-500 hover:text-rose-400 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-card w-full max-w-md p-6 relative animate-slide-up">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/08 text-metal-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
            <h2 className="font-display font-semibold text-white text-lg mb-5">Nueva tarea</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Título</label>
                <input type="text" className="input" placeholder="Descripción de la tarea" value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={form.category ?? 'Llamada'} onChange={e => setForm(p => ({ ...p, category: e.target.value as Category }))}>
                    {['Llamada','Email','Reunión','Propuesta','Seguimiento','Admin'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select className="input" value={form.priority ?? 'media'} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                    {(['alta','media','baja'] as Priority[]).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Fecha límite</label>
                <input type="text" className="input" placeholder="Ej: 30 Jul, Mañana, etc." value={form.dueDate ?? ''} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Notas adicionales..." value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={saveTask} className="btn-primary flex-1">Crear tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
