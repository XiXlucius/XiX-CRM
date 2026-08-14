import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Heart,
  Brain,
  Lightbulb,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Headphones,
  ArrowRight,
} from 'lucide-react';
import { OBJECTIONS, ROLEPLAY_TREE } from '../educationData';
import type { Objection, RESPhase, RoleplayNode, RoleplayOption } from '../types';
import { Card, SectionHeader, EmptyState } from './ui';

const PHASE_META: Record<RESPhase, { label: string; icon: typeof Heart; color: string; bg: string }> = {
  relacion: { label: 'Relación', icon: Heart, color: 'text-metal-300', bg: 'from-metal-700/25 to-metal-700/10' },
  educacion: { label: 'Educación', icon: Brain, color: 'text-accent-300', bg: 'from-accent-500/20 to-accent-500/5' },
  solucion: { label: 'Solución', icon: Lightbulb, color: 'text-success-500', bg: 'from-success/20 to-success/5' },
};

const DIFFICULTY_STYLES: Record<string, string> = {
  frecuente: 'bg-metal-700/20 text-metal-300',
  compleja: 'bg-warning/15 text-warning-400',
  agresiva: 'bg-danger/15 text-danger-400',
};

export function PlaybookTab() {
  const [tab, setTab] = useState<'library' | 'simulator'>('library');

  return (
    <div data-tour="playbook" className="space-y-5">
      <SectionHeader
        title="Playbook · Manejo de objeciones"
        subtitle="Metodología R.E.S. y simulador de roleplay"
        icon={<MessageSquare size={16} />}
      />

      <div className="flex gap-1 rounded-xl bg-ink-900/50 p-1 w-full sm:w-auto sm:inline-flex">
        {([
          { id: 'library', label: 'Biblioteca R.E.S.', icon: BookIcon },
          { id: 'simulator', label: 'Simulador de roleplay', icon: PlayIcon },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:text-metal-100'
            }`}
          >
            <t.icon /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'library' ? (
          <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ObjectionLibrary />
          </motion.div>
        ) : (
          <motion.div key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RoleplaySimulator />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BookIcon() { return <MessageSquare size={15} />; }
function PlayIcon() { return <Play size={15} />; }

// ---------- Objection library ----------

function ObjectionLibrary() {
  const [expanded, setExpanded] = useState<string | null>(OBJECTIONS[0]?.id ?? null);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300">
            <Lightbulb size={18} />
          </div>
          <div>
            <p className="font-display text-sm font-medium text-metal-100">El método R.E.S.</p>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              Tres fases para convertir resistencia en colaboración: <span className="text-metal-300">Relación</span> (empatizar),
              <span className="text-accent-300"> Educación</span> (reencuadrar) y
              <span className="text-success-500"> Solución</span> (ofrecer una opción concreta).
            </p>
          </div>
        </div>
      </Card>

      {OBJECTIONS.map((o) => (
        <Card key={o.id} className="overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
            className="w-full text-left p-4 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-metal-100">{o.text}</p>
              <p className="mt-1 text-xs text-slate-500">{o.context}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`chip ${DIFFICULTY_STYLES[o.difficulty]}`}>{o.difficulty}</span>
              <ArrowRight size={15} className={`text-slate-500 transition-transform ${expanded === o.id ? 'rotate-90' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {expanded === o.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {o.resSteps.map((step, i) => {
                    const meta = PHASE_META[step.phase];
                    const Icon = meta.icon;
                    return (
                      <div key={i} className={`rounded-xl bg-gradient-to-br ${meta.bg} p-4 ring-1 ring-tint/5`}>
                        <div className="flex items-center gap-2">
                          <span className={`grid h-7 w-7 place-items-center rounded-lg bg-ink-900/40 ${meta.color}`}>
                            <Icon size={14} />
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-slate-500">· {step.technique}</span>
                          </div>
                        </div>
                        <p className="mt-2.5 text-sm text-slate-200 italic leading-relaxed">
                          "{step.script}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  );
}

// ---------- Roleplay simulator ----------

type HistoryItem = { node: RoleplayNode; choice?: RoleplayOption };

function RoleplaySimulator() {
  const [currentId, setCurrentId] = useState<string>('start');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | 'retry' | null>(null);

  const node = ROLEPLAY_TREE[currentId];

  const choose = (opt: RoleplayOption) => {
    setFeedback(opt.feedback);
    setHistory((h) => [...h, { node, choice: opt }]);
    setTimeout(() => {
      const next = ROLEPLAY_TREE[opt.next];
      setHistory((h) => [...h, { node: next }]);
      setCurrentId(opt.next);
      setFeedback(null);
      if (next.outcome) setOutcome(next.outcome);
    }, 1400);
  };

  const restart = () => {
    setCurrentId('start');
    setHistory([{ node: ROLEPLAY_TREE.start }]);
    setFeedback(null);
    setOutcome(null);
  };

  if (!node) return null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display text-sm font-medium text-metal-100">Simulador de roleplay</p>
            <p className="text-xs text-slate-500">Practica el método R.E.S. en tiempo real</p>
          </div>
          <button onClick={restart} className="btn-ghost text-xs">
            <RotateCcw size={14} /> Reiniciar
          </button>
        </div>

        {/* Conversation */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {history.length === 0 && (
            <div className="text-center py-6">
              <button onClick={() => setHistory([{ node: ROLEPLAY_TREE.start }])} className="btn-primary">
                <Play size={15} /> Iniciar conversación
              </button>
            </div>
          )}
          {history.map((item, i) => (
            <div key={i}>
              <ChatBubble node={item.node} />
              {item.choice && (
                <div className="mt-2 flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-accent-500/15 px-4 py-2.5 ring-1 ring-accent-500/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Headphones size={11} className="text-accent-300" />
                      <span className="text-[10px] uppercase tracking-wider text-accent-300">Agente</span>
                      {item.choice.resPhase && (
                        <span className={`text-[10px] ${PHASE_META[item.choice.resPhase].color}`}>
                          · R.E.S. {PHASE_META[item.choice.resPhase].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200">{item.choice.text}</p>
                    <div className="mt-1.5">
                      <QualityTag quality={item.choice.quality} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-xl bg-ink-850 p-3 ring-1 ring-accent-500/20"
            >
              <p className="text-xs text-slate-300">{feedback}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        {node.options && !feedback && history.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="kicker">Tu respuesta como agente:</p>
            {node.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => choose(opt)}
                className="w-full text-left rounded-xl border border-tint/10 bg-ink-900/40 px-4 py-3 text-sm text-slate-200 hover:border-accent-500/40 hover:bg-accent-500/5 transition-colors"
              >
                {opt.text}
              </button>
            ))}
          </div>
        )}

        {/* Outcome */}
        <AnimatePresence>
          {outcome && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-4 rounded-xl p-4 text-center ${
                outcome === 'win'
                  ? 'bg-success/10 ring-1 ring-success-500/30'
                  : outcome === 'retry'
                  ? 'bg-warning/10 ring-1 ring-warning/30'
                  : 'bg-danger/10 ring-1 ring-danger/30'
              }`}
            >
              <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${
                outcome === 'win' ? 'bg-success/20 text-success-500' :
                outcome === 'retry' ? 'bg-warning/20 text-warning-400' :
                'bg-danger/20 text-danger-400'
              }`}>
                {outcome === 'win' ? <CheckCircle2 size={24} /> :
                 outcome === 'retry' ? <AlertCircle size={24} /> :
                 <XCircle size={24} />}
              </div>
              <p className="mt-2 font-display text-base font-medium text-metal-100">
                {outcome === 'win' ? '¡Venta cerrada!' : outcome === 'retry' ? 'Cliente se cerró' : 'Conversación perdida'}
              </p>
              <p className="mt-1 text-sm text-slate-400">{node.feedback}</p>
              <button onClick={restart} className="mt-4 btn-primary">
                <RotateCcw size={15} /> Intentar de nuevo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function ChatBubble({ node }: { node: RoleplayNode }) {
  if (node.speaker === 'cliente') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-ink-900/60 px-4 py-2.5 ring-1 ring-tint/5">
          <div className="flex items-center gap-1.5 mb-1">
            <User size={11} className="text-slate-400" />
            <span className="kicker">Cliente</span>
          </div>
          <p className="text-sm text-slate-200">{node.text}</p>
        </div>
      </div>
    );
  }
  return null;
}

function QualityTag({ quality }: { quality: 'optima' | 'aceptable' | 'pobre' }) {
  const styles = {
    optima: 'bg-success/15 text-success-500',
    aceptable: 'bg-warning/15 text-warning-400',
    pobre: 'bg-danger/15 text-danger-400',
  };
  const labels = { optima: 'Óptima', aceptable: 'Aceptable', pobre: 'Pobre' };
  return <span className={`chip text-[10px] ${styles[quality]}`}>{labels[quality]}</span>;
}
