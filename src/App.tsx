import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './store';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import Sidebar, { type NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { NotificationBell } from './components/NotificationBell';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingTour } from './components/OnboardingTour';
import { DashboardTab } from './components/DashboardTab';
import { CrmTab } from './components/CrmTab';
import { CursoTab } from './components/CursoTab';
import { PlaybookTab } from './components/PlaybookTab';
import { EquipoTab } from './components/EquipoTab';
import { FacturacionTab } from './components/FacturacionTab';
import { InventarioTab } from './components/InventarioTab';
import { ConfigTab } from './components/ConfigTab';
import { ReportesTab } from './components/ReportesTab';
import { AuditoriaTab } from './components/AuditoriaTab';
import { Loader2 } from 'lucide-react';

function parseOobCode(): { mode: string; oobCode: string } | null {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');
  if (mode && oobCode) return { mode, oobCode };
  const hash = window.location.hash.slice(1);
  const hashParams = new URLSearchParams(hash);
  const hashType = hashParams.get('type');
  const hashToken = hashParams.get('access_token');
  if (hashType === 'recovery' && hashToken) return { mode: 'resetPassword', oobCode: hashToken };
  return null;
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tourOpen, setTourOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [crmInitialClient, setCrmInitialClient] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (tab: NavTab) => {
    setActiveTab(tab);
    setCrmInitialClient(null);
  };

  const selectClient = (id: string) => {
    setCrmInitialClient(id);
    setActiveTab('crm');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={activeTab} onNavigate={navigate} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header
          onOpenTour={() => setTourOpen(true)}
          notificationSlot={<NotificationBell onNavigate={navigate} />}
        />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {activeTab === 'dashboard'  && <DashboardTab />}
          {activeTab === 'crm'        && <CrmTab initialClientId={crmInitialClient} />}
          {activeTab === 'courses'    && <CursoTab />}
          {activeTab === 'playbook'   && <PlaybookTab />}
          {activeTab === 'equipo'     && <EquipoTab />}
          {activeTab === 'facturacion'&& <FacturacionTab onSelectClient={selectClient} />}
          {activeTab === 'inventario' && <InventarioTab />}
          {activeTab === 'config'     && <ConfigTab />}
          {activeTab === 'reportes'   && <ReportesTab />}
          {activeTab === 'auditoria'  && <AuditoriaTab />}
        </main>
      </div>

      <CommandPalette onNavigate={navigate} onSelectClient={selectClient} />
      <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const oob = parseOobCode();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-600 grid place-items-center shadow-glow-cyan mb-4">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
          <p className="text-sm text-metal-500 animate-pulse">Cargando XiX Tech...</p>
        </div>
      </div>
    );
  }

  if (oob?.mode === 'resetPassword') return <ResetPasswordScreen oobCode={oob.oobCode} />;
  if (!user) return <AuthScreen />;
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
