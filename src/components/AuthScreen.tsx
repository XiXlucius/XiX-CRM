import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Zap, Mail, Lock, UserPlus, LogIn, Loader2,
  AlertCircle, KeyRound, ArrowLeft, CheckCircle2, User, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordRequirements } from './PasswordRequirements';

type Mode = 'login' | 'signup' | 'forgot';

const ROLES = ['Agente de ventas', 'Supervisor', 'Administrador', 'Cobrador'];

const SUPA_ERRORS: Record<string, string> = {
  'Invalid login credentials':           'Credenciales inválidas. Verifica email y contraseña.',
  'User already registered':             'Ese correo ya está registrado.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Email rate limit exceeded':           'Demasiados intentos. Espera unos minutos.',
  'Email not confirmed':                 'Tu cuenta no está confirmada. Contacta al administrador.',
};

function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    return SUPA_ERRORS[err.message] ?? err.message;
  }
  return 'Error inesperado. Intenta de nuevo.';
}

export function AuthScreen() {
  const { login, signup, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState(ROLES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearMessages = () => { setError(null); setInfo(null); };
  const goTo = (m: Mode) => { setMode(m); clearMessages(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'signup') {
        await signup(email, password, nombreCompleto, rol);
      } else {
        await resetPassword(email);
        setInfo('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: decorative panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-obsidian-950 to-obsidian-950" />
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-cyan-500/08 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 h-56 w-56 rounded-full bg-violet-500/08 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 grid place-items-center shadow-glow-cyan">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-white text-sm tracking-wide">XiX Tech</span>
        </div>

        <div className="relative space-y-6">
          <div>
            <p className="text-2xs text-cyan-400/70 uppercase tracking-widest mb-3">CRM de Ventas a Crédito</p>
            <h2 className="font-display text-4xl font-bold text-white leading-tight">
              Gestiona tus ventas<br />con precisión.
            </h2>
            <p className="mt-3 text-sm text-metal-400 max-w-xs leading-relaxed">
              Pipeline inteligente, seguimiento de clientes y métricas en tiempo real — todo en un solo lugar.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { label: 'Pipeline Kanban', sub: 'Visualiza cada etapa del ciclo de venta' },
              { label: 'CRM Unificado',  sub: 'Historial completo de cada cliente' },
              { label: 'Reportes Live',  sub: 'Métricas actualizadas en tiempo real' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border border-cyan-500/30 grid place-items-center shrink-0">
                  <ChevronRight size={10} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">{f.label}</p>
                  <p className="text-2xs text-metal-500">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-2xs text-metal-700">© 2025 XiX Tech. Todos los derechos reservados.</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[380px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 grid place-items-center shadow-glow-cyan">
              <Zap size={18} className="text-white" />
            </div>
            <p className="mt-2 font-display font-bold text-white">XiX Tech CRM</p>
          </div>

          {mode === 'forgot' ? (
            <>
              <button onClick={() => goTo('login')} className="flex items-center gap-1.5 text-xs text-metal-500 hover:text-slate-300 transition-colors mb-6">
                <ArrowLeft size={13} /> Volver al inicio de sesión
              </button>
              <h1 className="font-display text-xl font-bold text-white mb-1">Recuperar contraseña</h1>
              <p className="text-sm text-metal-500 mb-6">Ingresa tu correo y te enviaremos un enlace.</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold text-white mb-1">
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
              </h1>
              <p className="text-sm text-metal-500 mb-5">
                {mode === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Regístrate para acceder al CRM.'}
              </p>
              <div className="flex gap-1 rounded-xl bg-white/04 border border-white/06 p-1 mb-6">
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} onClick={() => goTo(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === t ? 'bg-white/08 text-white' : 'text-metal-500 hover:text-slate-300'}`}>
                    {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                  </button>
                ))}
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Nombre completo</label>
                <input type="text" required className="input" disabled={loading} value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)} placeholder="Juan García" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" disabled={loading} value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" />
            </div>
            {mode !== 'forgot' && (
              <div>
                <label className="label">Contraseña</label>
                <input type="password" required minLength={6} className="input" disabled={loading} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                {mode === 'signup' && <PasswordRequirements value={password} />}
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label className="label">Rol</label>
                <select className="input" value={rol} onChange={e => setRol(e.target.value)} disabled={loading}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => goTo('forgot')} className="text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/08 p-3 text-xs text-rose-300">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {info && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/08 p-3 text-xs text-emerald-300">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  <span>{info}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Procesando...</>
              ) : mode === 'login' ? (
                <><LogIn size={15} /> Entrar al CRM</>
              ) : mode === 'signup' ? (
                <><UserPlus size={15} /> Crear cuenta</>
              ) : (
                <><Mail size={15} /> Enviar enlace de recuperación</>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-2xs text-metal-700">Protegido con Supabase Auth · TLS 256-bit</p>
        </motion.div>
      </div>
    </div>
  );
}
