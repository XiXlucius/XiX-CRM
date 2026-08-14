import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Circle,
  Lock,
  Trophy,
  Award,
  Medal,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Star,
  Clock,
} from 'lucide-react';
import { useStore } from '../store';
import { COURSES, BADGES } from '../educationData';
import type { Course, QuizQuestion } from '../types';
import { Card, SectionHeader, Modal, EmptyState, fmtPct } from './ui';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const CATEGORY_COLORS: Record<string, string> = {
  ventas: 'bg-ink-900/60 ring-1 ring-accent-500/20 text-accent-300',
  cobranza: 'bg-ink-900/60 ring-1 ring-warning/20 text-warning-400',
  producto: 'bg-ink-900/60 ring-1 ring-tint/10 text-metal-300',
  objeciones: 'bg-ink-900/60 ring-1 ring-accent-500/20 text-accent-300',
};

const LEVEL_LABELS: Record<string, string> = {
  inicial: 'Inicial',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

function getBadgeIcon(name: string) {
  const map: Record<string, typeof Trophy> = {
    Sparkles, Award, Medal, Trophy,
  };
  return map[name] ?? Award;
}

export function CursoTab() {
  const { progress } = useStore();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const earnedBadges = useMemo(() => {
    const best = Math.max(0, ...progress.map((p) => p.bestScore));
    return BADGES.filter((b) => best >= b.threshold);
  }, [progress]);

  const totalLessons = COURSES.reduce((a, c) => a + c.lessons.length, 0);
  const completedLessons = progress.reduce((a, p) => a + p.completedLessons.length, 0);

  return (
    <div data-tour="courses" className="space-y-5">
      <SectionHeader
        title="Academia · Formación de agentes"
        subtitle="Cursos interactivos con quizzes y certificaciones"
        icon={<GraduationCap size={16} />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={<BookOpen size={16} />} label="Cursos" value={`${COURSES.length}`} accent="text-accent-300" />
        <StatTile icon={<CheckCircle2 size={16} />} label="Lecciones" value={`${completedLessons}/${totalLessons}`} accent="text-success-500" />
        <StatTile icon={<Trophy size={16} />} label="Insignias" value={`${earnedBadges.length}/${BADGES.length}`} accent="text-warning-400" />
        <StatTile icon={<Star size={16} />} label="Mejor puntaje" value={progress.length ? fmtPct(Math.max(...progress.map((p) => p.bestScore))) : '—'} accent="text-violet-400" />
      </div>

      {/* Badges */}
      <Card className="p-5">
        <SectionHeader title="Insignias de rendimiento" subtitle="Se desbloquean al superar puntajes en quizzes" icon={<Award size={16} />} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const earned = earnedBadges.some((eb) => eb.id === b.id);
            const Icon = getBadgeIcon(b.icon);
            return (
              <motion.div
                key={b.id}
                whileHover={{ y: -2 }}
                className={`relative rounded-2xl border p-4 text-center transition-colors ${
                  earned
                    ? 'border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5'
                    : 'border-tint/5 bg-ink-900/40 opacity-60'
                }`}
              >
                <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${earned ? 'bg-warning/20 text-warning-400' : 'bg-tint/5 text-slate-500'}`}>
                  {earned ? <Icon size={22} /> : <Lock size={18} />}
                </div>
                <p className="mt-2 text-sm font-medium text-metal-100">{b.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{b.description}</p>
                <span className="mt-2 inline-block chip bg-tint/5 text-slate-400">≥ {b.threshold}%</span>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Courses */}
      <div className="grid sm:grid-cols-2 gap-4">
        {COURSES.map((c, i) => {
          const prog = progress.find((p) => p.courseId === c.id);
          const lessonsDone = prog?.completedLessons.length ?? 0;
          const pct = (lessonsDone / c.lessons.length) * 100;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card hover className="p-5 h-full flex flex-col">
                <div className="flex items-start justify-between">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${CATEGORY_COLORS[c.category]}`}>
                    <GraduationCap size={20} />
                  </div>
                  <span className="chip bg-tint/5 text-slate-400">
                    {LEVEL_LABELS[c.level]}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-base font-medium text-metal-100">{c.title}</h3>
                <p className="mt-1 text-sm text-slate-400 leading-relaxed flex-1">{c.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen size={12} /> {c.lessons.length} lecciones</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {c.durationMin} min</span>
                  {prog && prog.bestScore > 0 && (
                    <span className="flex items-center gap-1 text-success-500"><Star size={12} /> {fmtPct(prog.bestScore)}</span>
                  )}
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-accent-600 to-violet-500"
                  />
                </div>
                <button
                  onClick={() => setSelectedCourse(c)}
                  className="mt-4 btn-outline w-full"
                >
                  {pct > 0 ? 'Continuar' : 'Comenzar'} <ChevronRight size={15} />
                </button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <CoursePlayer course={selectedCourse} onClose={() => setSelectedCourse(null)} />
    </div>
  );
}

// ---------- Course player ----------

function CoursePlayer({ course, onClose }: { course: Course | null; onClose: () => void }) {
  const { progress, completeLesson, recordQuizAttempt } = useStore();
  const toast = useToast();
  const [lessonIdx, setLessonIdx] = useState(0);
  const [mode, setMode] = useState<'lessons' | 'quiz'>('lessons');

  if (!course) return null;
  const prog = progress.find((p) => p.courseId === course.id);
  const lessonsDone = prog?.completedLessons ?? [];

  const handleCompleteLesson = async () => {
    try {
      await completeLesson(course.id, course.lessons[lessonIdx].id);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const handleQuizComplete = async (score: number) => {
    try {
      await recordQuizAttempt(course.id, score);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  return (
    <Modal open={!!course} onClose={onClose} title={course.title} size="xl">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-xl bg-ink-900/50 p-1">
          {([
            { id: 'lessons', label: `Lecciones (${course.lessons.length})` },
            { id: 'quiz', label: `Quiz (${course.quiz.questions.length})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === t.id ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:text-metal-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'lessons' ? (
          <div className="space-y-3">
            {/* Lesson nav */}
            <div className="flex flex-wrap gap-1.5">
              {course.lessons.map((l, i) => {
                const done = lessonsDone.includes(l.id);
                const active = i === lessonIdx;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLessonIdx(i)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      active ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:bg-tint/5'
                    }`}
                  >
                    {done ? <CheckCircle2 size={13} className="text-success-500" /> : <Circle size={13} />}
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={lessonIdx}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="rounded-xl border border-tint/5 bg-ink-900/40 p-5"
              >
                <h4 className="font-display text-lg font-medium text-metal-100">
                  {course.lessons[lessonIdx].title}
                </h4>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {course.lessons[lessonIdx].body}
                </p>
                <div className="mt-4 rounded-xl bg-accent-500/10 p-3 ring-1 ring-accent-500/20">
                  <p className="text-xs uppercase tracking-wider text-accent-300">Idea clave</p>
                  <p className="mt-1 text-sm text-metal-100">{course.lessons[lessonIdx].keyTakeaway}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setLessonIdx((i) => Math.max(0, i - 1))}
                disabled={lessonIdx === 0}
                className="btn-ghost"
              >
                Anterior
              </button>
              <button
                onClick={handleCompleteLesson}
                className="btn-outline"
              >
                <CheckCircle2 size={14} /> Marcar completada
              </button>
              <button
                onClick={() => setLessonIdx((i) => Math.min(course.lessons.length - 1, i + 1))}
                disabled={lessonIdx === course.lessons.length - 1}
                className="btn-ghost"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : (
          <QuizRunner
            questions={course.quiz.questions}
            bestScore={prog?.bestScore ?? 0}
            attempts={prog?.attempts ?? 0}
            onComplete={handleQuizComplete}
          />
        )}
      </div>
    </Modal>
  );
}

// ---------- Quiz runner ----------

function QuizRunner({
  questions,
  bestScore,
  attempts,
  onComplete,
}: {
  questions: QuizQuestion[];
  bestScore: number;
  attempts: number;
  onComplete: (score: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const score = Math.round(
    (answers.filter((a, i) => a === questions[i].correctIndex).length / questions.length) * 100,
  );

  const submit = () => {
    if (selected === null) return;
    setShowFeedback(true);
  };

  const next = () => {
    const newAnswers = [...answers, selected ?? -1];
    setAnswers(newAnswers);
    setSelected(null);
    setShowFeedback(false);
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
    } else {
      const finalScore = Math.round(
        (newAnswers.filter((a, i) => a === questions[i].correctIndex).length / questions.length) * 100,
      );
      onComplete(finalScore);
      setDone(true);
    }
  };

  const restart = () => {
    setIdx(0);
    setAnswers([]);
    setSelected(null);
    setShowFeedback(false);
    setDone(false);
  };

  if (done) {
    const passed = score >= 70;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${passed ? 'bg-success/20 text-success-500' : 'bg-warning/20 text-warning-400'}`}>
          {passed ? <Trophy size={28} /> : <RotateCcw size={26} />}
        </div>
        <p className="mt-4 font-display text-3xl font-medium text-metal-100">{fmtPct(score)}</p>
        <p className="mt-1 text-sm text-slate-400">
          {passed ? '¡Felicitaciones, aprobaste!' : 'Sigue practicando para mejorar.'}
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>Mejor: {fmtPct(Math.max(bestScore, score))}</span>
          <span>Intentos: {attempts + 1}</span>
        </div>
        <button onClick={restart} className="mt-5 btn-primary">
          <RotateCcw size={15} /> Intentar de nuevo
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Pregunta {idx + 1} de {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i < idx ? 'w-4 bg-success-500' : i === idx ? 'w-5 bg-accent-400' : 'w-1.5 bg-tint/15'}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
        >
          <p className="font-display text-base font-medium text-metal-100">{q.prompt}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isSelected = selected === i;
              let style = 'border-tint/10 bg-ink-900/40 hover:border-accent-500/40';
              if (showFeedback && isCorrect) style = 'border-success-500/40 bg-success/10';
              else if (showFeedback && isSelected && !isCorrect) style = 'border-danger/40 bg-danger/10';
              else if (isSelected) style = 'border-accent-500/50 bg-accent-500/10';
              return (
                <button
                  key={i}
                  disabled={showFeedback}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ${style}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${
                      showFeedback && isCorrect ? 'bg-success-500 text-metal-100' :
                      showFeedback && isSelected && !isCorrect ? 'bg-danger-500 text-metal-100' :
                      isSelected ? 'bg-accent-500 text-metal-100' : 'bg-tint/5 text-slate-400'
                    }`}>
                      {showFeedback && isCorrect ? <CheckCircle2 size={13} /> :
                       showFeedback && isSelected && !isCorrect ? <Icons.X size={13} /> :
                       String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-slate-200">{opt}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl bg-ink-850 p-3 ring-1 ring-tint/5"
            >
              <p className={`text-xs font-medium ${selected === q.correctIndex ? 'text-success-500' : 'text-danger-400'}`}>
                {selected === q.correctIndex ? '¡Correcto!' : 'Respuesta incorrecta'}
              </p>
              <p className="mt-1 text-sm text-slate-300">{q.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        {!showFeedback ? (
          <button onClick={submit} disabled={selected === null} className="btn-primary">
            Confirmar
          </button>
        ) : (
          <button onClick={next} className="btn-primary">
            {idx < questions.length - 1 ? 'Siguiente' : 'Ver resultado'}
          </button>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={accent}>{icon}</span>
        <span className="kicker">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-medium text-metal-100">{value}</p>
    </Card>
  );
}
