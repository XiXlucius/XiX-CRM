import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Mail, UserPlus, LogIn, Loader2,
  AlertCircle, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordRequirements } from './PasswordRequirements';
import { ParticleField } from './ParticleField';
import { friendlyError } from '../lib/errors';
import { validatePassword } from '../lib/validation';

type Mode = 'login' | 'signup' | 'forgot';

const ROLES = ['Agente de ventas', 'Supervisor', 'Administrador', 'Cobrador'];

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
    if (mode === 'signup') {
      const missing = validatePassword(password);
      if (missing.length > 0) {
        setError(`La contraseña necesita: ${missing.join(', ').toLowerCase()}.`);
        return;
      }
    }
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
      {/* Left: editorial cover — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[60%] relative flex-col justify-between p-[56px] overflow-hidden bg-obsidian-950">
        <ParticleField density={0.8} intensity={40} />

        <div className="relative font-display text-[18px] font-medium text-metal-100">
          XiX Tech
        </div>

        <div className="relative">
          <p className="kicker mb-3">CRM de Ventas a Crédito</p>
          <h1 className="font-display font-medium text-metal-100 text-[clamp(46px,6vw,96px)] leading-[0.9] tracking-[-0.05em]">
            Gestiona tus ventas<br />con precisión.
          </h1>
          <p className="mt-[40px] text-[15px] text-metal-300 max-w-[38ch] leading-relaxed">
            Pipeline inteligente, seguimiento de clientes y métricas en tiempo real — todo en un solo lugar.
          </p>
        </div>

        <p className="relative text-[11px] text-metal-500">© 2025 XiX Tech. Todos los derechos reservados.</p>
      </div>

      {/* Right: form — la columna es la superficie, sin tarjeta flotante */}
      <div className="flex-1 flex items-center justify-center p-6 bg-obsidian-800">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[320px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <p className="font-display text-[18px] font-medium text-metal-100">XiX Tech CRM</p>
          </div>

          {mode === 'forgot' ? (
            <>
              <button onClick={() => goTo('login')} className="flex items-center gap-1.5 text-xs text-metal-500 hover:text-metal-200 transition-colors mb-6">
                <ArrowLeft size={13} /> Volver al inicio de sesión
              </button>
              <h2 className="font-display text-xl font-medium text-metal-100 mb-1">Recuperar contraseña</h2>
              <p className="text-sm text-metal-500 mb-6">Ingresa tu correo y te enviaremos un enlace.</p>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-medium text-metal-100 mb-1">
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
              </h2>
              <p className="text-sm text-metal-500 mb-5">
                {mode === 'login' ? 'Ingresa tus credenciales para continuar.' : 'Regístrate para acceder al CRM.'}
              </p>
              <div className="seg mb-6">
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} type="button" onClick={() => goTo(t)} className={`seg-opt ${mode === t ? 'active' : ''}`}>
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
                <input
                  type="password"
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  className="input"
                  disabled={loading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                />
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
                <button type="button" onClick={() => goTo('forgot')} className="text-xs text-accent hover:text-accent-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-1.5 text-[12px]" style={{ color: '#d09090' }}>
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {info && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-1.5 text-[12px]" style={{ color: '#86b298' }}>
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                  <span>{info}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading} className="btn-primary btn-block">
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn size={15} /> Entrar al CRM</>
              ) : mode === 'signup' ? (
                <><UserPlus size={15} /> Crear cuenta</>
              ) : (
                <><Mail size={15} /> Enviar enlace de recuperación</>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-metal-500">Protegido con Supabase Auth · TLS 256-bit</p>
        </motion.div>
      </div>
    </div>
  );
}
