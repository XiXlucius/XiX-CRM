import { useState } from 'react';
import { Plus, X, MoreHorizontal, DollarSign, Calendar, User, Flag } from 'lucide-react';

type Stage = 'leads' | 'contacto' | 'demo' | 'propuesta' | 'negociacion' | 'cerrado';

interface Deal {
  id: number;
  title: string;
  company: string;
  value: number;
  probability: number;
  assignee: string;
  avatarColor: string;
  dueDate: string;
  priority: 'alta' | 'media' | 'baja';
  stage: Stage;
}

const STAGES: { id: Stage; label: string; color: string; badge: string }[] = [
  { id: 'leads',       label: 'Leads',        color: 'border-t-cyan-500/50',    badge: 'badge-cyan' },
  { id: 'contacto',    label: 'Contacto',     color: 'border-t-blue-500/50',    badge: 'badge-blue' },
  { id: 'demo',        label: 'Demo',         color: 'border-t-violet-500/50',  badge: 'badge-violet' },
  { id: 'propuesta',   label: 'Propuesta',    color: 'border-t-amber-500/50',   badge: 'badge-amber' },
  { id: 'negociacion', label: 'Negociación',  color: 'border-t-orange-500/50',  badge: 'badge-amber' },
  { id: 'cerrado',     label: 'Cerrado',      color: 'border-t-emerald-500/50', badge: 'badge-green' },
];

const PRIORITY_COLOR = { alta: 'text-rose-400', media: 'text-amber-400', baja: 'text-metal-500' };

const INITIAL_DEALS: Deal[] = [
  { id: 1,  title: 'Licencias Enterprise',    company: 'Grupo Alfa',         value: 48500,  probability: 80, assignee: 'MG', avatarColor: 'from-cyan-500 to-blue-600',      dueDate: '28 Jul', priority: 'alta',  stage: 'negociacion' },
  { id: 2,  title: 'Consultoría Anual',        company: 'Tech Soluciones',    value: 32000,  probability: 65, assignee: 'CM', avatarColor: 'from-violet-500 to-purple-600',   dueDate: '02 Ago', priority: 'media', stage: 'demo' },
  { id: 3,  title: 'Renovación Plataforma',    company: 'Inversiones AR',     value: 125000, probability: 90, assignee: 'AR', avatarColor: 'from-emerald-500 to-teal-600',    dueDate: '15 Jul', priority: 'alta',  stage: 'cerrado' },
  { id: 4,  title: 'Setup Inicial',            company: 'Constructora PJ',    value: 18000,  probability: 40, assignee: 'PJ', avatarColor: 'from-amber-500 to-orange-600',    dueDate: '10 Ago', priority: 'baja',  stage: 'contacto' },
  { id: 5,  title: 'Software de Logística',    company: 'Distribuidora LF',   value: 55000,  probability: 72, assignee: 'LF', avatarColor: 'from-rose-500 to-pink-600',       dueDate: '05 Ago', priority: 'alta',  stage: 'propuesta' },
  { id: 6,  title: 'Plan Starter',             company: 'Retail Silva',       value: 9500,   probability: 25, assignee: 'RS', avatarColor: 'from-slate-500 to-slate-600',     dueDate: '20 Ago', priority: 'baja',  stage: 'leads' },
  { id: 7,  title: 'Campaña Digital',          company: 'Marketing SM',       value: 22000,  probability: 50, assignee: 'SM', avatarColor: 'from-fuchsia-500 to-pink-600',    dueDate: '12 Ago', priority: 'media', stage: 'leads' },
  { id: 8,  title: 'ERP Módulo Ventas',        company: 'Logística DH',       value: 74000,  probability: 68, assignee: 'DH', avatarColor: 'from-indigo-500 to-blue-600',     dueDate: '30 Jul', priority: 'alta',  stage: 'demo' },
  { id: 9,  title: 'Automatización RR.HH.',   company: 'Empresa Beta',        value: 31000,  probability: 55, assignee: 'EB', avatarColor: 'from-teal-500 to-cyan-600',       dueDate: '08 Ago', priority: 'media', stage: 'propuesta' },
  { id: 10, title: 'Integración API',          company: 'Startup Gamma',      value: 16000,  probability: 35, assignee: 'SG', avatarColor: 'from-lime-500 to-green-600',      dueDate: '18 Ago', priority: 'baja',  stage: 'contacto' },
];

export default function PipelineView() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [showAdd, setShowAdd] = useState<Stage | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newValue, setNewValue] = useState('');

  const byStage = (stage: Stage) => deals.filter(d => d.stage === stage);
  const stageTotal = (stage: Stage) => byStage(stage).reduce((s, d) => s + d.value, 0);

  const handleDragStart = (id: number) => setDragging(id);
  const handleDrop = (stage: Stage) => {
    if (dragging !== null) {
      setDeals(ds => ds.map(d => d.id === dragging ? { ...d, stage } : d));
    }
    setDragging(null);
    setDragOver(null);
  };

  const addDeal = (stage: Stage) => {
    if (!newTitle.trim()) return;
    const colors = ['from-cyan-500 to-blue-600', 'from-violet-500 to-purple-600', 'from-emerald-500 to-teal-600'];
    setDeals(ds => [...ds, {
      id: Date.now(), title: newTitle, company: newCompany || 'Sin empresa',
      value: Number(newValue) || 0, probability: 30,
      assignee: newTitle.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      dueDate: '-', priority: 'media', stage,
    }]);
    setNewTitle(''); setNewCompany(''); setNewValue(''); setShowAdd(null);
  };

  const totalPipeline = deals.reduce((s, d) => s + d.value * (d.probability / 100), 0);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="px-6 py-6 flex items-end justify-between shrink-0">
        <div>
          <p className="text-2xs text-metal-500 uppercase tracking-widest mb-1">Ventas</p>
          <h1 className="font-display text-2xl font-bold text-white">Pipeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2">
            <p className="text-2xs text-metal-500">Pipeline ponderado</p>
            <p className="font-mono font-bold text-cyan-300">${totalPipeline.toLocaleString('es', { maximumFractionDigits: 0 })}</p>
          </div>
          <span className="badge badge-cyan">{deals.length} oportunidades</span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${STAGES.length * 240}px` }}>
          {STAGES.map(stage => {
            const cards = byStage(stage.id);
            const isOver = dragOver === stage.id;
            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-2xl border transition-all duration-200 ${isOver ? 'border-cyan-500/30 bg-cyan-500/05' : 'border-white/06 bg-white/[0.018]'}`}
                style={{ minWidth: 220, width: 220 }}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Column header */}
                <div className={`px-4 py-3 border-t-2 rounded-t-2xl ${stage.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{stage.label}</span>
                    <span className={`badge ${stage.badge} text-2xs px-2 py-0`}>{cards.length}</span>
                  </div>
                  <p className="text-2xs font-mono text-metal-500 mt-0.5">${stageTotal(stage.id).toLocaleString()}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {cards.map(deal => (
                    <div
                      key={deal.id}
                      className={`kanban-card p-3.5 ${dragging === deal.id ? 'opacity-40 scale-95' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(deal.id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-semibold text-slate-200 leading-tight">{deal.title}</p>
                        <Flag size={11} className={`shrink-0 mt-0.5 ${PRIORITY_COLOR[deal.priority]}`} />
                      </div>
                      <p className="text-2xs text-metal-500 mb-3">{deal.company}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-300">${deal.value.toLocaleString()}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-12 rounded-full bg-white/08 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${deal.probability}%` }} />
                          </div>
                          <span className="text-2xs text-metal-500">{deal.probability}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/06">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${deal.avatarColor} grid place-items-center`}>
                            <span className="text-[8px] font-bold text-white">{deal.assignee}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-metal-600">
                          <Calendar size={10} />
                          <span className="text-2xs">{deal.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add card */}
                  {showAdd === stage.id ? (
                    <div className="glass-card p-3 space-y-2">
                      <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addDeal(stage.id); if (e.key === 'Escape') setShowAdd(null); }} placeholder="Título del deal" className="input py-2 text-xs" autoFocus />
                      <input value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Empresa" className="input py-2 text-xs" />
                      <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Valor $" type="number" className="input py-2 text-xs" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowAdd(null)} className="btn-ghost flex-1 py-1.5 text-xs">Cancelar</button>
                        <button onClick={() => addDeal(stage.id)} className="btn-primary flex-1 py-1.5 text-xs">Agregar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAdd(stage.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-2xs text-metal-600 hover:text-slate-400 hover:bg-white/04 transition-all border border-dashed border-white/06 hover:border-white/10">
                      <Plus size={12} /> Agregar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
