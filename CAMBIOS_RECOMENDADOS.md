# Evaluación & Cambios Recomendados — XiX Tech CRM

## 📊 Resumen Ejecutivo

Tu CRM es una aplicación empresarial robusta pero hay **8 áreas críticas** que pueden mejorar significativamente: rendimiento, mantenibilidad, seguridad, escalabilidad y experiencia de usuario.

**Prioridad Alta:** Cambios que impactan funcionalidad o seguridad.  
**Prioridad Media:** Mejoras de rendimiento y UX.  
**Prioridad Baja:** Deuda técnica y limpieza.

---

## 1️⃣ ARQUITECTURA & PATRÓN DE ESTADO

### Problema Actual
- La tienda central (`store.tsx`) es un **monolito de 400+ líneas** con todo mezclado.
- El contexto de autenticación está separado del estado de negocio → inconsistencias.
- No hay invalidación de caché limpia cuando cambian datos en Supabase.

### Cambios Recomendados

#### a) Dividir la tienda en dominios
```
src/store/
  ├── authStore.tsx      (contexto de usuario + sesión)
  ├── crmStore.tsx       (clientes, bitácora, contactos)
  ├── billingStore.tsx   (facturas, cobros, pagos)
  ├── teamStore.tsx      (equipo, comisiones, metas)
  ├── inventoryStore.tsx (productos, stock)
  └── hooks/
      ├── useCRM.ts
      ├── useBilling.ts
      └── useTeam.ts
```

**Beneficio:** Cada dominio es independiente, fácil de testear y escalar.

#### b) Agregar React Query (TanStack Query)
Reemplazar el estado manual con caché inteligente:

```tsx
// Antes
const { clients, loading } = useStore();

// Después
const { data: clients, isLoading, refetch } = useQuery({
  queryKey: ['clients'],
  queryFn: () => supabase.from('clients').select('*'),
  staleTime: 5 * 60 * 1000, // Revalidar cada 5 min
});
```

**Ventajas:**
- Caché automático y deduplicación de requests
- Manejo de errores y reintentos
- Background refetch transparente
- Sincronización real-time más simple

---

## 2️⃣ SEGURIDAD & AUTENTICACIÓN

### Problema Actual
- ❌ Las variables de entorno están en `.env` sin validación de acceso
- ❌ No hay verificación de permisos en el lado del cliente antes de acciones críticas
- ❌ Los clientes tienen acceso directo a claves de Supabase (modo anon)
- ❌ No hay rate limiting en funciones serverless

### Cambios Recomendados

#### a) Validar permisos en el cliente (pero NO confiar en ello)
```tsx
// Guardia simple pero no es seguridad real
function CanDelete({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { user } = useAuth();
  const canDelete = ROLES[userRole].permissions.includes(permission);
  
  return canDelete ? <>{children}</> : <UnauthorizedUI />;
}
```

#### b) Políticas RLS en Supabase (CRÍTICO)
En Supabase, habilitar Row Level Security:

```sql
-- Ejemplo: Solo gerentes pueden ver/editar clientes
CREATE POLICY "gerentes_can_manage_clients" ON public.clients
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'gerente' OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'gerente' OR auth.jwt() ->> 'role' = 'admin');
```

**Beneficio:** La seguridad vive en la BD, no en el código del cliente.

#### c) Validar en funciones serverless
```typescript
// supabase/functions/send-whatsapp/index.ts
export async function handler(req: Request) {
  const { data: { user } } = await supabase.auth.getUser(req);
  
  if (!user || !['gerente', 'admin'].includes(user.user_metadata.role)) {
    return new Response('Unauthorized', { status: 403 });
  }
  
  // ... resto de lógica
}
```

---

## 3️⃣ RENDIMIENTO & CARGA

### Problema Actual
- ❌ Cargando **toda la BD** en memoria cuando el app arranca (`SEED_CLIENTS`, etc.)
- ❌ Los gráficos en Dashboard usan datos hardcodeados (no reales)
- ❌ No hay virtualización en listas largas (Bitácora, Reportes)
- ❌ Imágenes no optimizadas

### Cambios Recomendados

#### a) Lazy loading & Suspense
```tsx
import { Suspense, lazy } from 'react';

const InventarioTab = lazy(() => import('./InventarioTab'));

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InventarioTab />
    </Suspense>
  );
}
```

#### b) Virtualización para listas largas
Usa `react-window` o `react-virtual`:

```tsx
import { FixedSizeList as List } from 'react-window';

function BitacoraList({ entries }: { entries: BitacoraEntry[] }) {
  return (
    <List height={600} itemCount={entries.length} itemSize={60}>
      {({ index, style }) => (
        <div style={style}>
          <BitacoraEntry entry={entries[index]} />
        </div>
      )}
    </List>
  );
}
```

#### c) Code splitting automático
Vite ya lo hace, pero asegúrate que tus rutas estén lazy:

```tsx
// App.tsx
const routes = [
  { path: '/dashboard', component: lazy(() => import('./pages/Dashboard')) },
  { path: '/crm', component: lazy(() => import('./pages/CRM')) },
  // ...
];
```

---

## 4️⃣ MANTENIBILIDAD & CÓDIGO

### Problema Actual
- ❌ Componentes grandes sin separación de responsabilidades (`Dashboard.tsx` > 300 líneas)
- ❌ Datos hardcodeados mezclados con lógica (`revenueData`, `conversionData`)
- ❌ Sin testes unitarios ni E2E
- ❌ Tipos incompletos en algunas funciones

### Cambios Recomendados

#### a) Extraer datos a archivo separado
```tsx
// src/data/dashboard.ts
export const DASHBOARD_CHARTS = {
  revenue: [
    { mes: 'Ene', valor: 42000 },
    // ...
  ],
  conversion: [
    { etapa: 'Leads', cantidad: 140 },
    // ...
  ],
};

// En componente
import { DASHBOARD_CHARTS } from '@/data/dashboard';

export default function Dashboard() {
  return <AreaChart data={DASHBOARD_CHARTS.revenue} />;
}
```

#### b) Componentes pequeños y reutilizables
```tsx
// Antes: Dashboard.tsx (300 líneas, hace todo)

// Después:
import { DashboardHeader } from './DashboardHeader';
import { KPICards } from './KPICards';
import { RevenueChart } from './RevenueChart';
import { ConversionFunnel } from './ConversionFunnel';
import { RecentActivity } from './RecentActivity';

export default function Dashboard() {
  return (
    <div className="space-y-5">
      <DashboardHeader />
      <KPICards />
      <div className="grid grid-cols-3 gap-4">
        <RevenueChart />
        <ConversionFunnel />
      </div>
      <RecentActivity />
    </div>
  );
}
```

#### c) Agregar tests
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

```tsx
// src/lib/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { assessRisk } from './scoring';

describe('assessRisk', () => {
  it('should mark high-income stable clients as low risk', () => {
    const risk = assessRisk({
      monthlyIncome: 5000,
      employmentTenure: 'gt-2y',
      downPaymentPct: 30,
    });
    expect(risk).toBeLessThan(50);
  });

  it('should flag recent unemployed as high risk', () => {
    const risk = assessRisk({
      monthlyIncome: 1000,
      employmentTenure: 'lt-3m',
      downPaymentPct: 5,
    });
    expect(risk).toBeGreaterThan(70);
  });
});
```

---

## 5️⃣ ESCALABILIDAD & BASE DE DATOS

### Problema Actual
- ❌ El schema de Supabase probablemente sin índices estratégicos
- ❌ No hay paginación en queries (`select('*')` sin límite)
- ❌ Migrations manuales sin versionamiento claro

### Cambios Recomendados

#### a) Agregar índices en Supabase
```sql
-- Acelerar búsquedas comunes
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_agent ON public.clients(assigned_agent);
CREATE INDEX idx_invoices_due ON public.invoices(due_date);
CREATE INDEX idx_bitacora_client ON public.bitacora(client_id);
```

#### b) Paginación & filtros
```tsx
// Hook reutilizable
function useClients({ page = 1, status = null }: { page?: number; status?: ClientStatus | null }) {
  const pageSize = 20;
  
  return useQuery({
    queryKey: ['clients', page, status],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      return query;
    },
  });
}
```

#### c) Migrations con fecha/versión
```
supabase/migrations/
  ├── 20260720031711_001_credinucleo_schema.sql
  ├── 20260721041843_002_xix_tech_features.sql
  ├── 20260722120000_003_add_indexes.sql         ← Nuevo
  └── 20260723180000_004_add_rls_policies.sql    ← Nuevo
```

---

## 6️⃣ UX & FEATURES

### Problema Actual
- ⚠️ Notificaciones no están enlazadas a datos reales
- ⚠️ Reportes usan datos fake (`recentActivity`, `tasks`)
- ⚠️ No hay filtros/búsqueda en CRM (es difícil encontrar un cliente)
- ⚠️ Falta confirmación de acciones peligrosas (borrar cliente)

### Cambios Recomendados

#### a) Búsqueda y filtros en CRM
```tsx
function ClientsView() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | null>(null);
  
  const { data: clients } = useQuery({
    queryKey: ['clients', search, statusFilter],
    queryFn: async () => {
      let query = supabase.from('clients').select('*');
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,cedula.eq.${search}`);
      }
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      
      return query;
    },
  });

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o cédula..." />
      <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      <ClientsList clients={clients} />
    </div>
  );
}
```

#### b) Diálogos de confirmación
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

async function handleDeleteClient(clientId: string) {
  return new Promise((resolve) => {
    AlertDialog.show({
      title: '¿Eliminar cliente?',
      description: 'Esta acción no se puede deshacer.',
      cancel: () => resolve(false),
      confirm: async () => {
        await deleteClient(clientId);
        resolve(true);
      },
    });
  });
}
```

#### c) Sincronización real-time (WebSocket)
```tsx
// Hook para escuchar cambios en tiempo real
function useRealtimeClients() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const subscription = supabase
      .channel('clients:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        (payload) => {
          // Actualizar estado localmente
          if (payload.eventType === 'INSERT') {
            setClients(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setClients(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
          } else if (payload.eventType === 'DELETE') {
            setClients(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return clients;
}
```

---

## 7️⃣ ERRORES & LOGGING

### Problema Actual
- ⚠️ Sin manejo de errores explícito en muchas funciones async
- ⚠️ Los errores de API no se registran
- ⚠️ Sin tracing para debugging en producción

### Cambios Recomendados

#### a) Error boundary global
```tsx
import { useErrorHandler } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.href = '/'}
    >
      <AuthProvider>
        {/* ... */}
      </AuthProvider>
    </ErrorBoundary>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
      <p className="text-metal-400 mb-4">{error.message}</p>
      <button className="btn btn-cyan" onClick={resetErrorBoundary}>
        Reintentar
      </button>
    </div>
  );
}
```

#### b) Logging centralizado
```tsx
// src/lib/logger.ts
export const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
  error: (msg: string, err?: any) => {
    console.error(`[ERROR] ${msg}`, err);
    // Enviar a servicio de logging (Sentry, LogRocket, etc.)
    if (import.meta.env.PROD) {
      reportToSentry(msg, err);
    }
  },
};

// Uso en operaciones críticas
async function addClient(client: Omit<Client, 'id' | 'createdAt'>) {
  try {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    logger.info('Cliente agregado', { clientId: data.id });
    return data;
  } catch (err) {
    logger.error('Error agregando cliente', err);
    throw err;
  }
}
```

---

## 8️⃣ DEVOPS & DEPLOYMENT

### Problema Actual
- ⚠️ Sin CI/CD configurado (puedes desplegar un bug a producción)
- ⚠️ Sin variables de entorno por ambiente
- ⚠️ Sin versionamiento de releases

### Cambios Recomendados

#### a) GitHub Actions para CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      - run: npx wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

#### b) Variables de entorno por ambiente
```
.env.local          (desarrollo local)
.env.staging        (para probar antes de lanzar)
.env.production     (viva)
```

Cargar según `NODE_ENV`:

```typescript
// src/lib/config.ts
export const config = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  API_BASE: import.meta.env.VITE_API_BASE || 'https://api.xixtech.com',
};
```

#### c) Versionamiento de releases
```bash
# Tag cada release con semver
git tag -a v1.2.0 -m "Release v1.2.0: Agregar búsqueda en CRM"
git push origin v1.2.0
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN (Por Fases)

### Fase 1: Seguridad (Semana 1-2)
- [ ] Habilitar RLS en Supabase
- [ ] Agregar validación de permisos en funciones serverless
- [ ] Auditar acceso a datos sensibles

### Fase 2: Rendimiento (Semana 2-3)
- [ ] Instalar React Query
- [ ] Migrar stores a React Query
- [ ] Agregar lazy loading en componentes principales
- [ ] Agregar índices en BD

### Fase 3: Mantenibilidad (Semana 3-4)
- [ ] Splitear componentes grandes
- [ ] Agregar tests unitarios básicos
- [ ] Mejorar tipado en funciones async

### Fase 4: UX (Semana 4-5)
- [ ] Agregar búsqueda/filtros en CRM
- [ ] Diálogos de confirmación en acciones críticas
- [ ] Sincronización real-time opcional

### Fase 5: DevOps (Semana 5-6)
- [ ] Configurar GitHub Actions
- [ ] Setup de ambientes (staging/prod)
- [ ] Documentar deployment process

---

## 📚 Librerías Recomendadas

```bash
npm install @tanstack/react-query       # Caché & sincronización
npm install axios                        # HTTP client con mejor UX que fetch
npm install react-error-boundary         # Error boundaries
npm install react-window                 # Virtualización de listas
npm install sentry-react                 # Error tracking en producción
npm install zustand                      # Estado simple (alternativa a Context)
```

---

## ✅ Checklist Final

- [ ] Código compilable sin warnings
- [ ] Tests pasan (>70% coverage)
- [ ] Ninguna data sensible en logs
- [ ] Performance score > 80 en Lighthouse
- [ ] Documento README actualizado
- [ ] Runbook de deployment

---

**Próximos pasos:** Empezar por Fase 1 (seguridad), luego Fase 2 (rendimiento). El impacto será inmediato en estabilidad y velocidad.
