import { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './store';
import { OrgProvider } from './context/OrgContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthScreen } from './components/AuthScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import Sidebar, { type NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { NotificationBell } from './components/NotificationBell';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingTour } from './components/OnboardingTour';
import { ParticleField } from './components/ParticleField';
import { DashboardTab } from './components/DashboardTab';
import { CrmTab } from './components/CrmTab';
import { CursoTab } from './components/CursoTab';
import { PlaybookTab } from './components/PlaybookTab';
import { EquipoTab } from './components/EquipoTab';
import { FacturacionTab } from './components/FacturacionTab';
import { RutaCobroTab } from './components/RutaCobroTab';
import { InventarioTab } from './components/InventarioTab';
import { ConfigTab } from './components/ConfigTab';
import { ReportesTab } from './components/ReportesTab';
import { AuditoriaTab } from './components/AuditoriaTab';
import { Loader2, AlertTriangle, RotateCw } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <>
      {/* Nocturne: reemplaza el gradiente + rejilla que pintaba body::before */}
      <ParticleField variant="app" />

      <div className="flex h-screen overflow-hidden">
        <Sidebar active={activeTab} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Header
            onOpenTour={() => setTourOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
            notificationSlot={<NotificationBell onNavigate={navigate} />}
          />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-6">
            {/* § 6.2 — el bloque completo entra desde la derecha en cada cambio
                de pestaña. La `key` es lo que vuelve a disparar la animación. */}
            <div key={activeTab} className="ntInR">
            {activeTab === 'dashboard'  && <DashboardTab />}
            {activeTab === 'crm'        && <CrmTab initialClientId={crmInitialClient} />}
            {activeTab === 'courses'    && <CursoTab />}
            {activeTab === 'playbook'   && <PlaybookTab />}
            {activeTab === 'equipo'     && <EquipoTab />}
            {activeTab === 'facturacion'&& <FacturacionTab onSelectClient={selectClient} />}
            {activeTab === 'ruta'       && <RutaCobroTab />}
            {activeTab === 'inventario' && <InventarioTab />}
            {activeTab === 'config'     && <ConfigTab />}
            {activeTab === 'reportes'   && <ReportesTab />}
            {activeTab === 'auditoria'  && <AuditoriaTab />}
            </div>
          </main>
        </div>

        <CommandPalette onNavigate={navigate} onSelectClient={selectClient} />
        <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />
      </div>
    </>
  );
}

function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto h-12 w-12 rounded-lg border grid place-items-center mb-4" style={{ borderColor: '#d09090' }}>
          <AlertTriangle size={22} style={{ color: '#d09090' }} />
        </div>
        <p className="font-display text-lg font-medium text-metal-100 mb-1">No se pudieron cargar los datos</p>
        <p className="text-sm text-metal-500 mb-6">{message}</p>
        <button onClick={onRetry} className="btn-primary">
          <RotateCw size={15} /> Reintentar
        </button>
      </div>
    </div>
  );
}

function AppGate() {
  const { loadError, retryLoad } = useStore();
  if (loadError) return <LoadErrorScreen message={loadError} onRetry={retryLoad} />;
  return <AppShell />;
}

function AppInner() {
  const { user, loading } = useAuth();
  const oob = parseOobCode();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg border border-accent grid place-items-center mb-4">
            <Loader2 size={22} className="text-accent animate-spin" />
          </div>
          <p className="text-sm text-metal-500">Cargando XiX Tech...</p>
        </div>
      </div>
    );
  }

  if (oob?.mode === 'resetPassword') return <ResetPasswordScreen oobCode={oob.oobCode} />;
  if (!user) return <AuthScreen />;
  return (
    <StoreProvider>
      <OrgProvider>
        <AppGate />
      </OrgProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
