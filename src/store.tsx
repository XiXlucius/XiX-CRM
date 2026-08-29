import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Role,
  Client,
  TeamMember,
  Invoice,
  Product,
  CourseProgress,
  AmortizationRow,
  PaymentFrequency,
  BitacoraEntry,
  AppNotification,
  AuditEntry,
  ClientDocument,
  MessageTemplate,
  PartialPayment,
  Renegotiation,
  LateFee,
} from './types';
import {
  ROLES,
  SEED_CLIENTS,
  SEED_TEAM,
  SEED_INVOICES,
  SEED_PRODUCTS,
} from './data';
import { supabase } from './lib/supabase';
import { useOrg } from './context/OrgContext';
import { logAudit } from './lib/audit';
import { assessRisk, DEFAULT_SETTINGS, type BusinessSettings } from './lib/scoring';
import { isOverdue, daysOverdue, effectiveClientStatus, parseLocalDate, toStoredDueDate } from './lib/aging';

/**
 * Fecha en que se activaron las multas automáticas por atraso.
 *
 * Hasta esta fecha el sistema NUNCA aplicó un recargo: la función que los calcula
 * filtraba por un estado de factura que no se asignaba en ninguna parte. Al
 * arreglarlo, se decidió no cobrar retroactivamente el atraso ya acumulado —
 * ningún cliente debe recibir una multa por semanas que nadie le notificó.
 *
 * Solo se cobran las semanas de atraso posteriores a esta fecha.
 * No la muevas hacia atrás: eso sí generaría cobros retroactivos.
 */
const LATE_FEE_START_MS = new Date('2026-08-16T00:00:00').getTime();
import { friendlyError } from './lib/errors';

// ============================================================
// Types
// ============================================================

interface PersistState {
  role: Role;
  clients: Client[];
  team: TeamMember[];
  invoices: Invoice[];
  products: Product[];
  progress: CourseProgress[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  settings: BusinessSettings;
  tourCompleted: boolean;
  documents: ClientDocument[];
  templates: MessageTemplate[];
  partialPayments: PartialPayment[];
  renegotiations: Renegotiation[];
  lateFees: LateFee[];
}

interface StoreValue extends PersistState {
  user: { id: string; email: string } | null;
  loading: boolean;
  loadError: string | null;
  retryLoad: () => void;
  setRole: (r: Role) => void;
  addClient: (c: Omit<Client, 'id' | 'createdAt' | 'bitacora'>) => Promise<Client>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addBitacora: (clientId: string, entry: Omit<BitacoraEntry, 'id' | 'date'>) => Promise<void>;
  toggleTeamActive: (id: string) => Promise<void>;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => Promise<void>;
  addTeamMember: (m: Omit<TeamMember, 'id' | 'joinedAt'>) => Promise<void>;
  markInvoicePaid: (id: string) => Promise<void>;
  addInvoice: (i: Omit<Invoice, 'id'>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateInvoiceDueDate: (id: string, dueDateISO: string) => Promise<void>;
  generateSchedule: (clientId: string) => Promise<void>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  recordQuizAttempt: (courseId: string, score: number) => Promise<void>;
  completeLesson: (courseId: string, lessonId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
  updateSettings: (patch: Partial<BusinessSettings>) => Promise<void>;
  setTourCompleted: (v: boolean) => void;
  uploadDocument: (clientId: string, file: File, type: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addTemplate: (t: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateTemplate: (id: string, patch: Partial<MessageTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  addPartialPayment: (invoiceId: string, amount: number, paymentDate: string, note: string) => Promise<void>;
  addRenegotiation: (clientId: string, newTermMonths: number, newInterestRate: number, newFrequency: PaymentFrequency, reason: string) => Promise<void>;
  applyLateFees: () => Promise<void>;
  sendWhatsApp: (phone: string, message: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const emptyState: PersistState = {
  role: 'vendedor',
  clients: [],
  team: [],
  invoices: [],
  products: [],
  progress: [],
  notifications: [],
  audit: [],
  settings: DEFAULT_SETTINGS,
  tourCompleted: false,
  documents: [],
  templates: [],
  partialPayments: [],
  renegotiations: [],
  lateFees: [],
};

// ============================================================
// Mappers: DB row <-> domain
// ============================================================

const mapClient = (r: Record<string, unknown>): Client => ({
  id: r.id as string,
  fullName: r.full_name as string,
  cedula: r.cedula as string,
  phone: r.phone as string,
  email: r.email as string,
  municipality: r.municipality as Client['municipality'],
  address: r.address as string,
  product: r.product as string,
  productCost: Number(r.product_cost),
  downPaymentPct: Number(r.down_payment_pct),
  interestRate: Number(r.interest_rate),
  frequency: r.frequency as PaymentFrequency,
  termMonths: Number(r.term_months),
  status: r.status as Client['status'],
  assignedAgent: r.assigned_agent as string,
  createdAt: r.created_at as string,
  bitacora: [],
  riskScore: Number(r.risk_score ?? 50),
  monthlyIncome: Number(r.monthly_income ?? 0),
  employmentTenure: (r.employment_tenure as Client['employmentTenure']) ?? '6m-1y',
  hasPhysicalId: (r.has_physical_id as boolean) ?? true,
  firstPaymentDate: (r.first_payment_date as string | null) ?? null,
  latitude: (r.latitude as number | null) ?? null,
  longitude: (r.longitude as number | null) ?? null,
  items: Array.isArray(r.items) ? (r.items as Client['items']) : undefined,
});

const mapDocument = (r: Record<string, unknown>): ClientDocument => ({
  id: r.id as string,
  clientId: r.client_id as string,
  name: r.name as string,
  type: r.type as string,
  storagePath: r.storage_path as string,
  mimeType: r.mime_type as string,
  sizeBytes: Number(r.size_bytes),
  createdAt: r.created_at as string,
});

const mapTemplate = (r: Record<string, unknown>): MessageTemplate => ({
  id: r.id as string,
  name: r.name as string,
  channel: r.channel as MessageTemplate['channel'],
  clientStatus: r.client_status as string,
  subject: r.subject as string,
  body: r.body as string,
  createdAt: r.created_at as string,
});

const mapPartialPayment = (r: Record<string, unknown>): PartialPayment => ({
  id: r.id as string,
  invoiceId: r.invoice_id as string,
  amount: Number(r.amount),
  paymentDate: r.payment_date as string,
  note: r.note as string,
  createdAt: r.created_at as string,
});

const mapRenegotiation = (r: Record<string, unknown>): Renegotiation => ({
  id: r.id as string,
  clientId: r.client_id as string,
  oldTermMonths: Number(r.old_term_months),
  newTermMonths: Number(r.new_term_months),
  oldInterestRate: Number(r.old_interest_rate),
  newInterestRate: Number(r.new_interest_rate),
  oldFrequency: r.old_frequency as PaymentFrequency,
  newFrequency: r.new_frequency as PaymentFrequency,
  outstandingBalance: Number(r.outstanding_balance),
  reason: r.reason as string,
  createdAt: r.created_at as string,
});

const mapLateFee = (r: Record<string, unknown>): LateFee => ({
  id: r.id as string,
  clientId: r.client_id as string,
  invoiceId: (r.invoice_id as string) ?? null,
  amount: Number(r.amount),
  weekNumber: Number(r.week_number),
  appliedAt: r.applied_at as string,
  createdAt: r.created_at as string,
});


/**
 * Resuelve la organización del usuario.
 *
 * ANTES esto creaba una organización NUEVA por cada persona que se registrara y
 * la ponía de admin de la suya — cada usuario terminaba con su propio CRM vacío
 * y aislado.
 *
 * AHORA delega en `join_default_org()`, una función SECURITY DEFINER del
 * servidor (ver MIGRACION-USUARIO-NUEVO.sql): mete al usuario en la
 * organización existente con el rol `nuevo`, que no tiene ningún permiso. Solo
 * crea una organización si no hay ninguna todavía, y en ese caso el primer
 * usuario del sistema es el admin.
 *
 * La lógica vive en el servidor a propósito: si estuviera aquí, cualquiera
 * podría saltársela desde la consola del navegador.
 */
async function ensureOrgId(_uid: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_default_org');
  if (error) throw error;
  if (!data) throw new Error('No se pudo resolver la organización del usuario');
  return data as string;
}

const mapTeam = (r: Record<string, unknown>): TeamMember => ({
  id: r.id as string,
  name: r.name as string,
  role: r.role as Role,
  email: r.email as string,
  phone: r.phone as string,
  active: r.active as boolean,
  goalMonthly: Number(r.goal_monthly),
  achievedMonthly: Number(r.achieved_monthly),
  commissionRatePct: Number(r.commission_rate_pct),
  activePortfolio: Number(r.active_portfolio),
  delinquencyPct: Number(r.delinquency_pct),
  joinedAt: r.joined_at as string,
  originLat: r.origin_lat != null ? Number(r.origin_lat) : null,
  originLng: r.origin_lng != null ? Number(r.origin_lng) : null,
});

const mapInvoice = (r: Record<string, unknown>): Invoice => ({
  id: r.id as string,
  clientId: (r.client_id as string) ?? '',
  clientName: r.client_name as string,
  amount: Number(r.amount),
  dueDate: r.due_date as string,
  paidDate: (r.paid_date as string) ?? null,
  status: r.status as Invoice['status'],
  isDownPayment: r.is_down_payment as boolean,
  installmentNumber: Number(r.installment_number),
  totalInstallments: Number(r.total_installments),
});

const mapProduct = (r: Record<string, unknown>): Product => ({
  id: r.id as string,
  sku: r.sku as string,
  name: r.name as string,
  category: r.category as string,
  basePrice: Number(r.base_price),
  taxPct: Number(r.tax_pct),
  discountPct: Number(r.discount_pct),
  stock: Number(r.stock),
  sold: Number(r.sold),
});

const mapProgress = (r: Record<string, unknown>): CourseProgress => ({
  courseId: r.course_id as string,
  completedLessons: (r.completed_lessons as string[]) ?? [],
  bestScore: Number(r.best_score),
  attempts: Number(r.attempts),
});

const mapNotification = (r: Record<string, unknown>): AppNotification => ({
  id: r.id as string,
  type: r.type as string,
  title: r.title as string,
  body: r.body as string,
  priority: r.priority as AppNotification['priority'],
  read: r.read as boolean,
  link: r.link as string,
  createdAt: r.created_at as string,
});

const mapAudit = (r: Record<string, unknown>): AuditEntry => ({
  id: r.id as string,
  userEmail: r.user_email as string,
  action: r.action as string,
  entity: r.entity as string,
  entityId: r.entity_id as string,
  oldValue: (r.old_value as Record<string, unknown>) ?? null,
  newValue: (r.new_value as Record<string, unknown>) ?? null,
  createdAt: r.created_at as string,
});

// ============================================================
// Provider
// ============================================================

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistState>(emptyState);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tourCompleted, setTourCompletedState] = useState(false);
  const lastUidRef = useRef<string | null>(null);

  // ---- Load all data for the authenticated user ----
  const loadAll = useCallback(async (uid: string) => {
    lastUidRef.current = uid;
    setLoading(true);
    setLoadError(null);
    try {
      const resolvedOrgId = await ensureOrgId(uid);
      setOrgId(resolvedOrgId);
      const [clients, team, invoices, products, progress, notifications, audit, settings, documents, templates, partialPayments, renegotiations, lateFees] =
        await Promise.all([
          supabase.from('clients').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
          supabase.from('team_members').select('*').eq('org_id', resolvedOrgId).order('joined_at', { ascending: false }),
          supabase.from('invoices').select('*').eq('org_id', resolvedOrgId).order('due_date', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
          supabase.from('course_progress').select('*').eq('org_id', resolvedOrgId),
          supabase.from('notifications').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }).limit(50),
          supabase.from('audit_log').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }).limit(100),
          supabase.from('business_settings').select('*').eq('org_id', resolvedOrgId).maybeSingle(),
          supabase.from('client_documents').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
          supabase.from('message_templates').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
          supabase.from('partial_payments').select('*').eq('org_id', resolvedOrgId).order('payment_date', { ascending: false }),
          supabase.from('renegotiations').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
          supabase.from('late_fees').select('*').eq('org_id', resolvedOrgId).order('created_at', { ascending: false }),
        ]);

      for (const res of [clients, team, invoices, products, progress, notifications, audit, settings, documents, templates, partialPayments, renegotiations, lateFees]) {
        if (res.error) throw res.error;
      }

      // Load bitacora for each client
      const clientRows = (clients.data ?? []) as Record<string, unknown>[];
      const clientsWithBitacora: Client[] = await Promise.all(
        clientRows.map(async (r) => {
          const { data: bit, error: bitError } = await supabase
            .from('bitacora_entries')
            .select('*')
            .eq('client_id', r.id)
            .order('created_at', { ascending: false });
          if (bitError) throw bitError;
          const c = mapClient(r);
          c.bitacora = (bit ?? []).map((b) => ({
            id: b.id,
            date: b.created_at,
            author: b.author,
            channel: b.channel,
            note: b.note,
            outcome: b.outcome,
          }));
          return c;
        }),
      );

      setState({
        role: (localStorage.getItem('credinucleo_role') as Role) || 'vendedor',
        clients: clientsWithBitacora,
        team: (team.data ?? []).map(mapTeam),
        invoices: (invoices.data ?? []).map(mapInvoice),
        products: (products.data ?? []).map(mapProduct),
        progress: (progress.data ?? []).map(mapProgress),
        notifications: (notifications.data ?? []).map(mapNotification),
        audit: (audit.data ?? []).map(mapAudit),
        settings: settings.data ? (settings.data as unknown as BusinessSettings) : DEFAULT_SETTINGS,
        documents: (documents.data ?? []).map(mapDocument),
        templates: (templates.data ?? []).map(mapTemplate),
        partialPayments: (partialPayments.data ?? []).map(mapPartialPayment),
        renegotiations: (renegotiations.data ?? []).map(mapRenegotiation),
        lateFees: (lateFees.data ?? []).map(mapLateFee),
        tourCompleted,
      });
      setLoading(false);
    } catch (err) {
      setLoadError(friendlyError(err));
      setLoading(false);
    }
  }, [tourCompleted]);

  const retryLoad = useCallback(() => {
    if (lastUidRef.current) loadAll(lastUidRef.current);
  }, [loadAll]);

  // ---- Auth state ----
  useEffect(() => {
    let mounted = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          await loadAll(session.user.id);
        } else {
          setUser(null);
          setState(emptyState);
          setLoading(false);
        }
      })();
    });
    return () => { mounted = false; };
  }, [loadAll]);

  // ---- Seed demo data for a new user ----
  const seedDemoData = useCallback(async (uid: string) => {
    const orgId = await ensureOrgId(uid);

    // Solo el admin siembra los datos de ejemplo. Un usuario que acaba de
    // registrarse entra con rol `nuevo` y sin permisos: si intentara sembrar,
    // cada insert rebotaría contra RLS y le mostraríamos un error que no le
    // corresponde. Además sembraría la organización de OTRA persona.
    const { data: membership } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', uid)
      .eq('active', true)
      .limit(1)
      .maybeSingle();
    if (membership?.role !== 'admin') return;

    // Insert seed clients
    const clientRows = SEED_CLIENTS.map((c) => ({
      user_id: uid,
      org_id: orgId,
      full_name: c.fullName,
      cedula: c.cedula,
      phone: c.phone,
      email: c.email,
      municipality: c.municipality,
      address: c.address,
      product: c.product,
      product_cost: c.productCost,
      down_payment_pct: c.downPaymentPct,
      interest_rate: c.interestRate,
      frequency: c.frequency,
      term_months: c.termMonths,
      status: c.status,
      assigned_agent: c.assignedAgent,
      risk_score: c.riskScore,
      monthly_income: c.monthlyIncome,
      employment_tenure: c.employmentTenure ?? '6m-1y',
      has_physical_id: c.hasPhysicalId ?? true,
    }));
    const { data: insertedClients, error: seedClientsErr } = await supabase.from('clients').insert(clientRows).select('id, full_name');
    if (seedClientsErr) throw seedClientsErr;
    // Insert bitacora for each seed client
    for (let i = 0; i < SEED_CLIENTS.length; i++) {
      const sc = SEED_CLIENTS[i];
      const newId = insertedClients?.[i]?.id;
      if (!newId) continue;
      for (const b of sc.bitacora) {
        const { error: bitErr } = await supabase.from('bitacora_entries').insert({
          client_id: newId,
          user_id: uid,
      org_id: orgId,
          author: b.author,
          channel: b.channel,
          note: b.note,
          outcome: b.outcome,
        });
        if (bitErr) throw bitErr;
      }
    }
    // Insert seed invoices, linking to new client ids
    const invoiceRows = SEED_INVOICES.map((inv) => {
      const matchClient = SEED_CLIENTS.find((c) => c.fullName === inv.clientName);
      const newClientId = matchClient
        ? insertedClients?.find((c) => c.full_name === matchClient.fullName)?.id
        : null;
      return {
        user_id: uid,
      org_id: orgId,
        client_id: newClientId ?? null,
        client_name: inv.clientName,
        amount: inv.amount,
        due_date: inv.dueDate,
        paid_date: inv.paidDate,
        status: inv.status,
        is_down_payment: inv.isDownPayment,
        installment_number: inv.installmentNumber,
        total_installments: inv.totalInstallments,
      };
    });
    const { error: invErr } = await supabase.from('invoices').insert(invoiceRows);
    if (invErr) throw invErr;
    // Insert seed team
    const { error: teamErr } = await supabase.from('team_members').insert(
      SEED_TEAM.map((m) => ({
        user_id: uid,
      org_id: orgId,
        name: m.name,
        role: m.role,
        email: m.email,
        phone: m.phone,
        active: m.active,
        goal_monthly: m.goalMonthly,
        achieved_monthly: m.achievedMonthly,
        commission_rate_pct: m.commissionRatePct,
        active_portfolio: m.activePortfolio,
        delinquency_pct: m.delinquencyPct,
      })),
    );
    if (teamErr) throw teamErr;
    // Insert seed products
    const { error: prodErr } = await supabase.from('products').insert(
      SEED_PRODUCTS.map((p) => ({
        user_id: uid,
      org_id: orgId,
        sku: p.sku,
        name: p.name,
        category: p.category,
        base_price: p.basePrice,
        tax_pct: p.taxPct,
        discount_pct: p.discountPct,
        stock: p.stock,
        sold: p.sold,
      })),
    );
    if (prodErr) throw prodErr;
    // Insert default settings
    const { error: settingsErr } = await supabase.from('business_settings').insert({ user_id: uid,
      org_id: orgId, ...DEFAULT_SETTINGS });
    if (settingsErr) throw settingsErr;
  }, []);

  // Expose seedDemoData via a custom event so AuthScreen can trigger it
  useEffect(() => {
    const handler = async (e: Event) => {
      const uid = (e as CustomEvent).detail as string;
      try {
        await seedDemoData(uid);
      } catch (err) {
        // Sembrado falló (parcial o total): igual cargamos lo que haya
        // quedado en vez de dejar al usuario recién registrado sin CRM.
        console.error('seedDemoData failed:', friendlyError(err));
      }
      await loadAll(uid);
    };
    window.addEventListener('credinucleo:seed', handler);
    return () => window.removeEventListener('credinucleo:seed', handler);
  }, [seedDemoData, loadAll]);

  // ---- Actions ----
  /** @deprecated El rol real vive en `memberships` y se lee con `useOrg()`.
   *  Esto ya no lo consume ninguna pantalla — la interfaz usa `useCurrentRole()`,
   *  que ahora pregunta al servidor. Se conserva solo para no romper el tipo del
   *  contexto; puede borrarse junto con `role` en una limpieza posterior. */
  const setRole = (r: Role) => {
    localStorage.setItem('credinucleo_role', r);
    setState((s) => ({ ...s, role: r }));
  };

  const addClient: StoreValue['addClient'] = async (c) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) throw new Error('No session');
    const assessment = assessRisk(c, state.settings);
    const row = {
      user_id: u.id,
        org_id: orgId,
      full_name: c.fullName,
      cedula: c.cedula,
      phone: c.phone,
      email: c.email,
      municipality: c.municipality,
      address: c.address,
      product: c.product,
      product_cost: c.productCost,
      down_payment_pct: c.downPaymentPct,
      interest_rate: c.interestRate,
      frequency: c.frequency,
      term_months: c.termMonths,
      status: c.status,
      assigned_agent: c.assignedAgent,
      risk_score: assessment.score,
      monthly_income: c.monthlyIncome,
      employment_tenure: c.employmentTenure ?? '6m-1y',
      has_physical_id: c.hasPhysicalId ?? true,
      first_payment_date: c.firstPaymentDate ?? null,
      latitude: c.latitude ?? null,
      longitude: c.longitude ?? null,
      items: c.items ?? null,
    };
    const { data, error } = await supabase.from('clients').insert(row).select('*').single();
    if (error) throw error;
    const newClient = mapClient(data as Record<string, unknown>);
    newClient.bitacora = [];
    setState((s) => ({ ...s, clients: [newClient, ...s.clients] }));
    await logAudit('create', 'client', newClient.id, null, row);

    // Las cuotas se crean solas: el vendedor no tiene que entrar al cliente y
    // pulsar "Generar plan de pagos" para que aparezcan en Facturación.
    // No se genera si la venta está prohibida (score 0) o si fue rechazado —
    // en esos casos no hay nada que cobrar.
    const prohibida = assessment.score === 0;
    if (!prohibida && newClient.status !== 'rechazado' && newClient.productCost > 0) {
      try {
        await insertScheduleFor(newClient, false);
      } catch (err) {
        // El cliente ya quedó guardado; que falle el plan no debe deshacer eso.
        console.error('No se pudo generar el plan de cuotas automáticamente', err);
      }
    }
    return newClient;
  };

  const updateClient: StoreValue['updateClient'] = async (id, patch) => {
    const old = state.clients.find((c) => c.id === id);
    const dbPatch: Record<string, unknown> = {};
    if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
    if (patch.cedula !== undefined) dbPatch.cedula = patch.cedula;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.municipality !== undefined) dbPatch.municipality = patch.municipality;
    if (patch.address !== undefined) dbPatch.address = patch.address;
    if (patch.product !== undefined) dbPatch.product = patch.product;
    if (patch.productCost !== undefined) dbPatch.product_cost = patch.productCost;
    if (patch.downPaymentPct !== undefined) dbPatch.down_payment_pct = patch.downPaymentPct;
    if (patch.interestRate !== undefined) dbPatch.interest_rate = patch.interestRate;
    if (patch.frequency !== undefined) dbPatch.frequency = patch.frequency;
    if (patch.termMonths !== undefined) dbPatch.term_months = patch.termMonths;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.assignedAgent !== undefined) dbPatch.assigned_agent = patch.assignedAgent;
    if (patch.riskScore !== undefined) dbPatch.risk_score = patch.riskScore;
    if (patch.monthlyIncome !== undefined) dbPatch.monthly_income = patch.monthlyIncome;
    if (patch.employmentTenure !== undefined) dbPatch.employment_tenure = patch.employmentTenure;
    if (patch.hasPhysicalId !== undefined) dbPatch.has_physical_id = patch.hasPhysicalId;
    if (patch.firstPaymentDate !== undefined) dbPatch.first_payment_date = patch.firstPaymentDate;
    if (patch.latitude !== undefined) dbPatch.latitude = patch.latitude;
    if (patch.longitude !== undefined) dbPatch.longitude = patch.longitude;
    if (patch.items !== undefined) dbPatch.items = patch.items;

    // Recalcular el score si cambió algo que lo afecta. Antes solo se guardaba
    // risk_score si el llamador lo pasaba explícito, así que editar el ingreso o
    // la antigüedad de un cliente dejaba su puntaje congelado en el valor que
    // tenía al registrarse. Se recalcula sobre el cliente YA con el patch aplicado.
    const SCORING_FIELDS = [
      'monthlyIncome', 'employmentTenure', 'hasPhysicalId', 'downPaymentPct',
      'productCost', 'interestRate', 'frequency', 'termMonths', 'status',
    ] as const;
    const scoringChanged = SCORING_FIELDS.some((k) => patch[k] !== undefined);
    let recomputed: number | undefined;
    if (old && scoringChanged && patch.riskScore === undefined) {
      // Con el estado de mora derivado, no el guardado: si no, el factor de
      // historial de pago puntúa como si el cliente nunca hubiera fallado.
      const withStatus = { ...old, status: effectiveClientStatus(old, state.invoices), ...patch };
      recomputed = assessRisk(withStatus, state.settings).score;
      dbPatch.risk_score = recomputed;
    }

    const { error } = await supabase.from('clients').update(dbPatch).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) =>
        c.id === id
          ? { ...c, ...patch, ...(recomputed !== undefined ? { riskScore: recomputed } : {}) }
          : c,
      ),
    }));
    await logAudit('update', 'client', id, old ? { status: old.status } : null, dbPatch);
  };

  const deleteClient: StoreValue['deleteClient'] = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, clients: s.clients.filter((c) => c.id !== id) }));
    await logAudit('delete', 'client', id, null, null);
  };

  const addBitacora: StoreValue['addBitacora'] = async (clientId, entry) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('bitacora_entries').insert({
      client_id: clientId,
      user_id: u?.id,
      org_id: orgId,
      author: entry.author,
      channel: entry.channel,
      note: entry.note,
      outcome: entry.outcome,
    }).select('*').single();
    if (error) throw error;
    const newEntry: BitacoraEntry = {
      id: data.id,
      date: data.created_at,
      author: data.author,
      channel: data.channel,
      note: data.note,
      outcome: data.outcome,
    };
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId ? { ...c, bitacora: [newEntry, ...c.bitacora] } : c,
      ),
    }));
  };

  const toggleTeamActive: StoreValue['toggleTeamActive'] = async (id) => {
    const m = state.team.find((t) => t.id === id);
    const newVal = !m?.active;
    const { error } = await supabase.from('team_members').update({ active: newVal }).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      team: s.team.map((t) => (t.id === id ? { ...t, active: newVal } : t)),
    }));
    await logAudit('toggle_active', 'team_member', id, { active: m?.active }, { active: newVal });
  };

  const updateTeamMember: StoreValue['updateTeamMember'] = async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.role !== undefined) dbPatch.role = patch.role;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.active !== undefined) dbPatch.active = patch.active;
    if (patch.goalMonthly !== undefined) dbPatch.goal_monthly = patch.goalMonthly;
    if (patch.achievedMonthly !== undefined) dbPatch.achieved_monthly = patch.achievedMonthly;
    if (patch.commissionRatePct !== undefined) dbPatch.commission_rate_pct = patch.commissionRatePct;
    if (patch.activePortfolio !== undefined) dbPatch.active_portfolio = patch.activePortfolio;
    if (patch.delinquencyPct !== undefined) dbPatch.delinquency_pct = patch.delinquencyPct;
    if (patch.originLat !== undefined) dbPatch.origin_lat = patch.originLat;
    if (patch.originLng !== undefined) dbPatch.origin_lng = patch.originLng;
    const { error } = await supabase.from('team_members').update(dbPatch).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      team: s.team.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
    await logAudit('update', 'team_member', id, null, dbPatch);
  };

  const addTeamMember: StoreValue['addTeamMember'] = async (m) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('team_members').insert({
      user_id: u?.id,
      org_id: orgId,
      name: m.name,
      role: m.role,
      email: m.email,
      phone: m.phone,
      active: m.active,
      goal_monthly: m.goalMonthly,
      achieved_monthly: m.achievedMonthly,
      commission_rate_pct: m.commissionRatePct,
      active_portfolio: m.activePortfolio,
      delinquency_pct: m.delinquencyPct,
    }).select('*').single();
    if (error) throw error;
    const newMember = mapTeam(data as Record<string, unknown>);
    setState((s) => ({ ...s, team: [newMember, ...s.team] }));
    await logAudit('create', 'team_member', newMember.id, null, m);
  };

  const markInvoicePaid: StoreValue['markInvoicePaid'] = async (id) => {
    const paidDate = new Date().toISOString();
    const { error } = await supabase.from('invoices').update({ status: 'pagada', paid_date: paidDate }).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) =>
        i.id === id ? { ...i, status: 'pagada', paidDate } : i,
      ),
    }));
    await logAudit('pay_invoice', 'invoice', id, null, { status: 'pagada' });
  };

  const addInvoice: StoreValue['addInvoice'] = async (i) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('invoices').insert({
      user_id: u?.id,
      org_id: orgId,
      client_id: i.clientId || null,
      client_name: i.clientName,
      amount: i.amount,
      due_date: i.dueDate,
      paid_date: i.paidDate,
      status: i.status,
      is_down_payment: i.isDownPayment,
      installment_number: i.installmentNumber,
      total_installments: i.totalInstallments,
    }).select('*').single();
    if (error) throw error;
    const newInvoice = mapInvoice(data as Record<string, unknown>);
    setState((s) => ({ ...s, invoices: [newInvoice, ...s.invoices] }));
  };

  /** Borra una factura de forma permanente. Solo el administrador puede
   *  hacerlo desde la interfaz — se registra en auditoría con los datos
   *  que tenía, para poder reconstruirla si hizo falta. */
  const deleteInvoice: StoreValue['deleteInvoice'] = async (id) => {
    const previous = state.invoices.find((i) => i.id === id) ?? null;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }));
    await logAudit('delete', 'invoice', id, previous ? { ...previous } as Record<string, unknown> : null, null);
  };

  /** Mueve la fecha de vencimiento de una cuota. Solo el administrador lo ve en
   *  la interfaz. Queda en auditoría con la fecha vieja y la nueva, porque
   *  correr un vencimiento cambia cuándo entra en mora. */
  const updateInvoiceDueDate: StoreValue['updateInvoiceDueDate'] = async (id, dueDateISO) => {
    const previous = state.invoices.find((i) => i.id === id) ?? null;
    const { error } = await supabase.from('invoices').update({ due_date: dueDateISO }).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => (i.id === id ? { ...i, dueDate: dueDateISO } : i)),
    }));
    await logAudit(
      'update_due_date', 'invoice', id,
      previous ? { dueDate: previous.dueDate } : null,
      { dueDate: dueDateISO },
    );
  };

  // ---- Auto-generate invoice schedule from amortization ----
  /** Crea el plan de cuotas de un cliente. Recibe el cliente completo (no su id)
   *  porque al registrarlo todavía no está en el estado de React.
   *  `activate` pasa el cliente a 'activo'; al crearlo se respeta el estado que
   *  eligió el vendedor. */
  const insertScheduleFor = async (client: Client, activate: boolean) => {
    const clientId = client.id;
    const { data: { user: u } } = await supabase.auth.getUser();
    const rows = computeAmortization(
      financedAmount(client.productCost, client.downPaymentPct),
      client.interestRate,
      client.termMonths,
      client.frequency,
    );
    const today = new Date();
    // Anchor date: the first cobro date the salesperson picked.
    // Falls back to today if none was set.
    // `new Date('2026-09-10')` es medianoche UTC = 9 de septiembre 20:00 en
    // Caracas. Anclaba todo el plan un día antes. Ver src/lib/aging.ts.
    const anchor = client.firstPaymentDate ? parseLocalDate(client.firstPaymentDate) : today;
    // Down payment invoice (due today, separate from the installment plan)
    const downAmount = client.productCost * (client.downPaymentPct / 100);
    const invoicesToInsert: Record<string, unknown>[] = [];
    if (downAmount > 0) {
      invoicesToInsert.push({
        user_id: u?.id,
      org_id: orgId,
        client_id: clientId,
        client_name: client.fullName,
        amount: round2(downAmount),
        due_date: toStoredDueDate(today),
        status: 'pendiente',
        is_down_payment: true,
        installment_number: 1,
        total_installments: 1,
      });
    }
    rows.forEach((row, i) => {
      const due = nextDueDate(anchor, i, client.frequency);
      invoicesToInsert.push({
        user_id: u?.id,
      org_id: orgId,
        client_id: clientId,
        client_name: client.fullName,
        amount: row.payment,
        due_date: toStoredDueDate(due),
        status: 'pendiente',
        is_down_payment: false,
        installment_number: i + 1,
        total_installments: rows.length,
      });
    });
    if (invoicesToInsert.length === 0) return;
    const { data: inserted, error: insErr } = await supabase.from('invoices').insert(invoicesToInsert).select('*');
    if (insErr) throw insErr;
    if (activate) {
      const { error: statusErr } = await supabase.from('clients').update({ status: 'activo' }).eq('id', clientId);
      if (statusErr) throw statusErr;
    }
    const newInvoices = ((inserted as Record<string, unknown>[]) ?? []).map(mapInvoice);
    setState((s) => ({
      ...s,
      invoices: [...newInvoices, ...s.invoices],
      clients: activate
        ? s.clients.map((c) => (c.id === clientId ? { ...c, status: 'activo' } : c))
        : s.clients,
    }));
    await logAudit('generate_schedule', 'invoices', clientId, null, { count: invoicesToInsert.length });
  };

  const generateSchedule: StoreValue['generateSchedule'] = async (clientId) => {
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) return;
    // Sin esto, volver a pulsar el botón duplicaba todas las cuotas.
    if (state.invoices.some((i) => i.clientId === clientId)) {
      throw new Error('Este cliente ya tiene un plan de cuotas generado.');
    }
    await insertScheduleFor(client, true);
  };

  const addProduct: StoreValue['addProduct'] = async (p) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('products').insert({
      user_id: u?.id,
      org_id: orgId,
      sku: p.sku,
      name: p.name,
      category: p.category,
      base_price: p.basePrice,
      tax_pct: p.taxPct,
      discount_pct: p.discountPct,
      stock: p.stock,
      sold: p.sold,
    }).select('*').single();
    if (error) throw error;
    const newProduct = mapProduct(data as Record<string, unknown>);
    setState((s) => ({ ...s, products: [newProduct, ...s.products] }));
    await logAudit('create', 'product', newProduct.id, null, p);
  };

  const updateProduct: StoreValue['updateProduct'] = async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.sku !== undefined) dbPatch.sku = patch.sku;
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.basePrice !== undefined) dbPatch.base_price = patch.basePrice;
    if (patch.taxPct !== undefined) dbPatch.tax_pct = patch.taxPct;
    if (patch.discountPct !== undefined) dbPatch.discount_pct = patch.discountPct;
    if (patch.stock !== undefined) dbPatch.stock = patch.stock;
    if (patch.sold !== undefined) dbPatch.sold = patch.sold;
    const { error } = await supabase.from('products').update(dbPatch).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    await logAudit('update', 'product', id, null, dbPatch);
  };

  const deleteProduct: StoreValue['deleteProduct'] = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
    await logAudit('delete', 'product', id, null, null);
  };

  const recordQuizAttempt: StoreValue['recordQuizAttempt'] = async (courseId, score) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const existing = state.progress.find((p) => p.courseId === courseId);
    if (existing) {
      const newBest = Math.max(existing.bestScore, score);
      const { error } = await supabase.from('course_progress').update({
        best_score: newBest,
        attempts: existing.attempts + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', (existing as unknown as Record<string, unknown>).id ?? '');
      if (error) throw error;
      setState((s) => ({
        ...s,
        progress: s.progress.map((p) =>
          p.courseId === courseId ? { ...p, bestScore: newBest, attempts: p.attempts + 1 } : p,
        ),
      }));
    } else {
      const { error } = await supabase.from('course_progress').insert({
        user_id: u?.id,
      org_id: orgId,
        course_id: courseId,
        best_score: score,
        attempts: 1,
      });
      if (error) throw error;
      setState((s) => ({
        ...s,
        progress: [...s.progress, { courseId, completedLessons: [], bestScore: score, attempts: 1 }],
      }));
    }
  };

  const completeLesson: StoreValue['completeLesson'] = async (courseId, lessonId) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const existing = state.progress.find((p) => p.courseId === courseId);
    if (existing) {
      const lessons = existing.completedLessons.includes(lessonId)
        ? existing.completedLessons
        : [...existing.completedLessons, lessonId];
      const { error } = await supabase.from('course_progress').update({
        completed_lessons: lessons,
        updated_at: new Date().toISOString(),
      }).eq('id', (existing as unknown as Record<string, unknown>).id ?? '');
      if (error) throw error;
      setState((s) => ({
        ...s,
        progress: s.progress.map((p) =>
          p.courseId === courseId ? { ...p, completedLessons: lessons } : p,
        ),
      }));
    } else {
      const { error } = await supabase.from('course_progress').insert({
        user_id: u?.id,
      org_id: orgId,
        course_id: courseId,
        completed_lessons: [lessonId],
        best_score: 0,
        attempts: 0,
      });
      if (error) throw error;
      setState((s) => ({
        ...s,
        progress: [...s.progress, { courseId, completedLessons: [lessonId], bestScore: 0, attempts: 0 }],
      }));
    }
  };

  const markNotificationRead: StoreValue['markNotificationRead'] = async (id) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  const markAllNotificationsRead: StoreValue['markAllNotificationsRead'] = async () => {
    const unread = state.notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', unread.map((n) => n.id));
    if (error) throw error;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  };

  // ---- Smart alerts: compute and persist notifications ----
  const refreshAlerts: StoreValue['refreshAlerts'] = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const alerts: { type: string; title: string; body: string; priority: AppNotification['priority']; link: string }[] = [];
    const now = Date.now();

    // Overdue invoices — por fecha, no por el estado guardado (ver src/lib/aging.ts).
    // Las más atrasadas primero: son las que más urge atender.
    state.invoices
      .filter((i) => isOverdue(i))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
      .forEach((i) => alerts.push({
        type: 'overdue',
        title: `Factura vencida: ${i.clientName}`,
        body: `$${i.amount.toFixed(2)} vencida el ${new Date(i.dueDate).toLocaleDateString('es-VE')}`,
        priority: 'alta',
        link: 'facturacion',
      }));

    // Due in 48h
    state.invoices
      .filter((i) => i.status === 'pendiente' && new Date(i.dueDate).getTime() - now <= 2 * 86400000 && new Date(i.dueDate).getTime() >= now)
      .slice(0, 5)
      .forEach((i) => alerts.push({
        type: 'due_soon',
        title: `Vence pronto: ${i.clientName}`,
        body: `$${i.amount.toFixed(2)} vence el ${new Date(i.dueDate).toLocaleDateString('es-VE')}`,
        priority: 'media',
        link: 'facturacion',
      }));

    // High-risk clients
    state.clients
      .filter((c) => c.riskScore < 45 && c.status !== 'rechazado')
      .slice(0, 3)
      .forEach((c) => alerts.push({
        type: 'risk',
        title: `Cliente en riesgo: ${c.fullName}`,
        body: `Score ${c.riskScore} — revisar solicitud`,
        priority: 'alta',
        link: 'crm',
      }));

    // Stock break risk
    state.products
      .filter((p) => {
        const total = p.sold + p.stock;
        const rate = total > 0 ? p.sold / total : 0;
        return rate >= state.settings.stock_alert_threshold / 100 && p.stock <= 5;
      })
      .slice(0, 3)
      .forEach((p) => alerts.push({
        type: 'stock',
        title: `Quiebre de stock: ${p.name}`,
        body: `Stock ${p.stock} · rotación alta`,
        priority: 'media',
        link: 'inventario',
      }));

    // Agents below goal
    state.team
      .filter((m) => m.active && m.goalMonthly > 0 && m.achievedMonthly < m.goalMonthly * 0.7)
      .slice(0, 3)
      .forEach((m) => alerts.push({
        type: 'goal',
        title: `Meta en riesgo: ${m.name}`,
        body: `${((m.achievedMonthly / m.goalMonthly) * 100).toFixed(0)}% de la meta`,
        priority: 'media',
        link: 'equipo',
      }));

    // Insert new alerts (dedup by title)
    const existingTitles = new Set(state.notifications.map((n) => n.title));
    const newAlerts = alerts.filter((a) => !existingTitles.has(a.title));
    if (newAlerts.length > 0) {
      const { error: insErr } = await supabase.from('notifications').insert(newAlerts.map((a) => ({ ...a, user_id: u.id, org_id: orgId })));
      if (insErr) throw insErr;
      const { data, error: selErr } = await supabase.from('notifications').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(50);
      if (selErr) throw selErr;
      setState((s) => ({ ...s, notifications: ((data as Record<string, unknown>[]) ?? []).map(mapNotification) }));
    }
  };

  const updateSettings: StoreValue['updateSettings'] = async (patch) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: existing, error: selErr } = await supabase.from('business_settings').select('id').eq('org_id', orgId).maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      const { error } = await supabase.from('business_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('org_id', orgId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('business_settings').insert({ user_id: u.id,
        org_id: orgId, ...DEFAULT_SETTINGS, ...patch });
      if (error) throw error;
    }
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    await logAudit('update_settings', 'business_settings', u.id, null, patch);
  };

  const setTourCompleted = (v: boolean) => {
    setTourCompletedState(v);
    localStorage.setItem('credinucleo_tour', v ? '1' : '0');
  };

  // ---- Document upload ----
  const uploadDocument: StoreValue['uploadDocument'] = async (clientId, file, type) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) throw new Error('No session');
    if (!orgId) throw new Error('Organización no resuelta todavía. Recarga la página.');

    // La ruta DEBE empezar por el org_id. La migración multiempresa cambió las
    // políticas de storage de `<user_id>/...` a `<org_id>/...`, pero este código
    // seguía usando el user_id — cada subida rebotaba con "no tienes permiso".
    // Ver 004_multi_tenant.sql, sección STORAGE.
    const path = `${orgId}/${clientId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('client-documents').upload(path, file);
    if (upErr) throw upErr;
    const { data, error } = await supabase.from('client_documents').insert({
      user_id: u.id,
        org_id: orgId,
      client_id: clientId,
      name: file.name,
      type,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    }).select('*').single();
    if (error) throw error;
    const doc = mapDocument(data as Record<string, unknown>);
    setState((s) => ({ ...s, documents: [doc, ...s.documents] }));
    await logAudit('upload_doc', 'client_document', doc.id, null, { name: file.name, type });
  };

  const deleteDocument: StoreValue['deleteDocument'] = async (id) => {
    const doc = state.documents.find((d) => d.id === id);
    if (doc) {
      const { error: storageErr } = await supabase.storage.from('client-documents').remove([doc.storagePath]);
      if (storageErr) throw storageErr;
    }
    const { error } = await supabase.from('client_documents').delete().eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
    await logAudit('delete_doc', 'client_document', id, null, null);
  };

  // ---- Message templates ----
  const addTemplate: StoreValue['addTemplate'] = async (t) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('message_templates').insert({
      user_id: u?.id,
      org_id: orgId,
      name: t.name,
      channel: t.channel,
      client_status: t.clientStatus,
      subject: t.subject,
      body: t.body,
    }).select('*').single();
    if (error) throw error;
    const tpl = mapTemplate(data as Record<string, unknown>);
    setState((s) => ({ ...s, templates: [tpl, ...s.templates] }));
    await logAudit('create', 'message_template', tpl.id, null, t);
  };

  const updateTemplate: StoreValue['updateTemplate'] = async (id, patch) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.channel !== undefined) dbPatch.channel = patch.channel;
    if (patch.clientStatus !== undefined) dbPatch.client_status = patch.clientStatus;
    if (patch.subject !== undefined) dbPatch.subject = patch.subject;
    if (patch.body !== undefined) dbPatch.body = patch.body;
    const { error } = await supabase.from('message_templates').update(dbPatch).eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    await logAudit('update', 'message_template', id, null, dbPatch);
  };

  const deleteTemplate: StoreValue['deleteTemplate'] = async (id) => {
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) throw error;
    setState((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) }));
    await logAudit('delete', 'message_template', id, null, null);
  };

  // ---- Partial payments ----
  const addPartialPayment: StoreValue['addPartialPayment'] = async (invoiceId, amount, paymentDate, note) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('partial_payments').insert({
      user_id: u?.id,
      org_id: orgId,
      invoice_id: invoiceId,
      amount,
      payment_date: paymentDate,
      note,
    }).select('*').single();
    if (error) throw error;
    const pp = mapPartialPayment(data as Record<string, unknown>);
    setState((s) => ({ ...s, partialPayments: [pp, ...s.partialPayments] }));
    await logAudit('partial_payment', 'invoice', invoiceId, null, { amount, paymentDate });
  };

  // ---- Renegotiation ----
  const addRenegotiation: StoreValue['addRenegotiation'] = async (clientId, newTermMonths, newInterestRate, newFrequency, reason) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const client = state.clients.find((c) => c.id === clientId);
    if (!client) throw new Error('Cliente no encontrado');
    const outstanding = client.productCost * (1 - client.downPaymentPct / 100);
    const { data, error } = await supabase.from('renegotiations').insert({
      user_id: u?.id,
      org_id: orgId,
      client_id: clientId,
      old_term_months: client.termMonths,
      new_term_months: newTermMonths,
      old_interest_rate: client.interestRate,
      new_interest_rate: newInterestRate,
      old_frequency: client.frequency,
      new_frequency: newFrequency,
      outstanding_balance: outstanding,
      reason,
    }).select('*').single();
    if (error) throw error;
    const ren = mapRenegotiation(data as Record<string, unknown>);
    setState((s) => ({ ...s, renegotiations: [ren, ...s.renegotiations] }));
    await updateClient(clientId, { termMonths: newTermMonths, interestRate: newInterestRate, frequency: newFrequency });
    await logAudit('renegotiate', 'client', clientId, { termMonths: client.termMonths, interestRate: client.interestRate }, { newTermMonths, newInterestRate, newFrequency, reason });
  };

  // ---- Late fees: $4/week after 3 days of grace ----
  const applyLateFees: StoreValue['applyLateFees'] = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const now = Date.now();
    const GRACE_DAYS = 3;
    const WEEKLY_FEE = 4;
    const newFees: LateFee[] = [];
    for (const inv of state.invoices) {
      // Vencida por fecha. Antes filtraba por `status !== 'vencida'`, un estado que
      // el sistema no asigna nunca — por eso NINGÚN cliente recibió jamás un recargo
      // automático, aunque la app dijera que se aplicaban solos.
      if (!isOverdue(inv)) continue;
      const dueMs = parseLocalDate(inv.dueDate).getTime();
      const daysLate = daysOverdue(inv);
      if (daysLate <= GRACE_DAYS) continue;
      const weeksLate = Math.floor((daysLate - GRACE_DAYS) / 7);
      if (weeksLate < 1) continue;
      const existingFees = state.lateFees.filter((f) => f.invoiceId === inv.id);
      const maxWeekApplied = existingFees.length > 0 ? Math.max(...existingFees.map((f) => f.weekNumber)) : 0;
      for (let w = maxWeekApplied + 1; w <= weeksLate; w++) {
        const appliedAt = dueMs + (GRACE_DAYS + w * 7) * 86400000;
        // Corte de activación: solo se cobran las semanas de atraso que caen DESPUÉS
        // de encender el sistema de multas. Sin esto, al activarlo un cliente con 90
        // días de atraso vería aparecer ~$48 de golpe por semanas ya transcurridas,
        // que nunca se le notificaron ni se le cobraron. Decisión de Lucius (2026-08).
        if (appliedAt < LATE_FEE_START_MS) continue;
        const { data, error } = await supabase.from('late_fees').insert({
          user_id: u.id,
        org_id: orgId,
          client_id: inv.clientId,
          invoice_id: inv.id,
          amount: WEEKLY_FEE,
          week_number: w,
          applied_at: new Date(appliedAt).toISOString(),
        }).select('*').single();
        if (!error && data) {
          newFees.push(mapLateFee(data as Record<string, unknown>));
        }
      }
    }
    if (newFees.length > 0) {
      setState((s) => ({ ...s, lateFees: [...newFees, ...s.lateFees] }));
      await logAudit('apply_late_fees', 'late_fees', 'batch', null, { count: newFees.length });
    }
  };

  // ---- WhatsApp send ----
  // Intenta primero la edge function (permite enviar por la API oficial de Meta si algún
  // día se configuran las credenciales, y deja rastro en audit_log). Si la función no está
  // desplegada en este proyecto de Supabase (404) o falla por cualquier otra razón, cae
  // automáticamente a abrir el chat de WhatsApp directo (wa.me) — así el botón funciona
  // hoy mismo sin depender de un despliegue adicional.
  const sendWhatsApp: StoreValue['sendWhatsApp'] = async (phone, message) => {
    const normalized = phone.replace(/[^0-9]/g, '');
    const waLink = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ phone, message }),
      });
      if (!res.ok) throw new Error(`WhatsApp send failed (${res.status})`);
      const data = await res.json().catch(() => null);
      if (data?.link) {
        window.open(data.link, '_blank', 'noopener');
      }
      return;
    } catch {
      // Edge function no disponible — fallback directo.
      window.open(waLink, '_blank', 'noopener');
    }
  };

  // El estado "en mora" de un cliente se deduce de sus facturas, no se guarda.
  // Se corrige aquí, en un solo punto, para que TODAS las pantallas lo vean igual
  // (lista de clientes, dashboard, mapa de calor y el motor de scoring).
  // Internamente `state.clients` sigue crudo, así que nunca se escribe de vuelta
  // a la base un estado que en realidad es calculado. Ver src/lib/aging.ts.
  const derivedClients = useMemo(() => {
    const now = new Date();
    return state.clients.map((c) => {
      const status = effectiveClientStatus(c, state.invoices, now);
      return status === c.status ? c : { ...c, status };
    });
  }, [state.clients, state.invoices]);

  const value: StoreValue = useMemo(() => ({
    ...state,
    clients: derivedClients,
    user,
    loading,
    loadError,
    retryLoad,
    setRole,
    addClient,
    updateClient,
    deleteClient,
    addBitacora,
    toggleTeamActive,
    updateTeamMember,
    addTeamMember,
    markInvoicePaid,
    addInvoice,
    deleteInvoice,
    updateInvoiceDueDate,
    generateSchedule,
    addProduct,
    updateProduct,
    deleteProduct,
    recordQuizAttempt,
    completeLesson,
    markNotificationRead,
    markAllNotificationsRead,
    refreshAlerts,
    updateSettings,
    setTourCompleted,
    uploadDocument,
    deleteDocument,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addPartialPayment,
    addRenegotiation,
    applyLateFees,
    sendWhatsApp,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, user, loading, loadError, retryLoad]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/**
 * Rol efectivo de la interfaz.
 *
 * ANTES leía `useStore().role`, que salía de `localStorage` y era editable por
 * cualquiera desde la consola del navegador. Eso contradecía al servidor: podías
 * ponerte "admin" en la UI y seguir sin permisos reales (manda RLS), o al revés
 * — arrancabas como "vendedor" por defecto y el menú te escondía secciones que
 * sí tenías permitidas.
 *
 * AHORA viene de `OrgContext`, que lo lee de la tabla `memberships`. Una sola
 * fuente de verdad: el servidor.
 *
 * Mientras carga, cae en el rol de menor privilegio a propósito — es preferible
 * que aparezca una sección de más un instante después, a mostrar algo que no
 * corresponde.
 */
export function useCurrentRole() {
  const { role } = useOrg();
  const id: Role = role ?? 'vendedor';
  return ROLES.find((r) => r.id === id) ?? ROLES.find((r) => r.id === 'vendedor')!;
}

// ============================================================
// Amortization calculation
// ============================================================

export function computeAmortization(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  frequency: PaymentFrequency,
): AmortizationRow[] {
  const periodsPerYear =
    frequency === 'semanal' ? 52 : frequency === 'quincenal' ? 24 : 12;
  const totalPeriods = Math.round((termMonths / 12) * periodsPerYear);
  const r = annualRatePct / 100 / periodsPerYear;
  const payment = r === 0 ? principal / totalPeriods : (principal * r) / (1 - Math.pow(1 + r, -totalPeriods));

  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let i = 1; i <= totalPeriods; i++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      number: i,
      payment: round2(payment),
      principal: round2(principalPaid),
      interest: round2(interest),
      balance: round2(balance),
    });
  }
  return rows;
}

export function financedAmount(cost: number, downPct: number) {
  return cost * (1 - downPct / 100);
}

/**
 * Equal-installment plan: every payment is exactly the same amount.
 * Interest is distributed evenly across all periods rather than
 * front-loaded. The final payment is identical to all others by
 * construction (the per-period amount is totalOwed / numInstallments).
 */
export function computeEqualInstallments(
  principal: number,
  annualRatePct: number,
  numInstallments: number,
  frequency: PaymentFrequency,
): AmortizationRow[] {
  const periodsPerYear =
    frequency === 'semanal' ? 52 : frequency === 'quincenal' ? 24 : 12;
  const r = annualRatePct / 100 / periodsPerYear;
  const totalOwed = principal * (1 + r * numInstallments);
  const payment = numInstallments > 0 ? totalOwed / numInstallments : 0;

  const rows: AmortizationRow[] = [];
  let balance = totalOwed;
  for (let i = 1; i <= numInstallments; i++) {
    const interest = balance * r / (1 + r);
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - payment);
    rows.push({
      number: i,
      payment: round2(payment),
      principal: round2(principalPaid),
      interest: round2(interest),
      balance: round2(balance),
    });
  }
  return rows;
}

/**
 * Convert a term expressed as months + extra weeks into a total month count,
 * useful for weekly frequencies where plazos like "1 month and 3 weeks" apply.
 */
export function termFromMonthsWeeks(months: number, weeks: number): number {
  return months + weeks / 4.345;
}

/**
 * Compute the due date for installment `index` (0-based) counting from the
 * anchor (first payment) date, honoring the frequency rules:
 *   - semanal:   exactly +7 days per installment (same weekday)
 *   - quincenal: exactly +15 days per installment
 *   - mensual:   same day-of-month, +1 month per installment
 */
function nextDueDate(anchor: Date, index: number, frequency: PaymentFrequency): Date {
  if (frequency === 'semanal') {
    const d = new Date(anchor);
    d.setDate(d.getDate() + index * 7);
    return d;
  }
  if (frequency === 'quincenal') {
    const d = new Date(anchor);
    d.setDate(d.getDate() + index * 15);
    return d;
  }
  // mensual: advance by months, preserve day-of-month when possible
  const d = new Date(anchor);
  const baseDay = anchor.getDate();
  d.setMonth(d.getMonth() + index);
  // clamp to end-of-month if the target month is shorter (e.g. day 31 in Feb)
  if (d.getDate() !== baseDay) {
    d.setDate(0); // roll back to last day of the previous month
  }
  return d;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
