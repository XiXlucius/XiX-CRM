// ============================================================
// XiX Tech — Domain Types
// ============================================================

// `nuevo` = cuenta recién registrada, sin ningún permiso, esperando que un
// administrador le asigne un rol real. Ver MIGRACION-USUARIO-NUEVO.sql
export type Role = 'nuevo' | 'admin' | 'gerente' | 'supervisor' | 'vendedor';

export interface RoleProfile {
  id: Role;
  name: string;
  label: string;
  description: string;
  initials: string;
  color: string; // tailwind gradient classes
  permissions: Permission[];
}

export type Municipality =
  | 'libertador'
  | 'chacao'
  | 'baruta'
  | 'sucre'
  | 'hatillo';

/**
 * Referencia geográfica de los municipios — solo nombre y coordenadas.
 *
 * Antes traía además `applications` y `approved` con cifras inventadas, y el
 * mapa de calor del Dashboard las pintaba como si fueran reales. Se eliminaron:
 * esos totales ahora se cuentan de los clientes de verdad (ver CaracasHeatmap).
 */
export interface CaracasMunicipality {
  id: Municipality;
  name: string;
  lat: number;
  lng: number;
}

// ---------------- CRM ----------------

export type ClientStatus =
  | 'prospecto'
  | 'en_revision'
  | 'aprobado'
  | 'activo'
  | 'en_mora'
  | 'rechazado';

export type PaymentFrequency = 'semanal' | 'quincenal' | 'mensual';

export type EmploymentTenure = 'lt-3m' | '4-6m' | '6m-1y' | '1-2y' | 'gt-2y';

export interface Client {
  id: string;
  fullName: string;
  cedula: string;
  phone: string;
  email: string;
  municipality: Municipality;
  address: string;
  /** Resumen legible de lo financiado ("Nevera LG + 2 artículos más").
   *  Se deriva de `items`; se conserva para listados, búsquedas y exportes. */
  product: string;
  /** Total financiado = suma de cantidad × precio de cada artículo. */
  productCost: number;
  /** Artículos del crédito. Puede ser uno solo o varios, cada uno con su
   *  cantidad. Si viene vacío, el crédito es de un solo artículo descrito
   *  en `product` (clientes registrados antes de que existieran los ítems). */
  items?: ClientItem[];
  downPaymentPct: number; // %
  interestRate: number; // annual %
  frequency: PaymentFrequency;
  termMonths: number;
  status: ClientStatus;
  assignedAgent: string;
  createdAt: string;
  bitacora: BitacoraEntry[];
  riskScore: number;
  monthlyIncome: number;
  employmentTenure: EmploymentTenure;
  hasPhysicalId: boolean;
  firstPaymentDate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  type: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'llamada' | 'visita';
  clientStatus: string;
  subject: string;
  body: string;
  createdAt: string;
}

export interface PartialPayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  note: string;
  createdAt: string;
}

export interface Renegotiation {
  id: string;
  clientId: string;
  oldTermMonths: number;
  newTermMonths: number;
  oldInterestRate: number;
  newInterestRate: number;
  oldFrequency: PaymentFrequency;
  newFrequency: PaymentFrequency;
  outstandingBalance: number;
  reason: string;
  createdAt: string;
}

export interface LateFee {
  id: string;
  clientId: string;
  invoiceId: string | null;
  amount: number;
  weekNumber: number;
  appliedAt: string;
  createdAt: string;
}

export interface BitacoraEntry {
  id: string;
  date: string;
  author: string;
  channel: 'llamada' | 'whatsapp' | 'visita' | 'email';
  note: string;
  outcome: 'contactado' | 'no_responde' | 'compromiso' | 'rechazo' | 'recordatorio';
}

export interface AmortizationRow {
  number: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// ---------------- Education ----------------

export interface Course {
  id: string;
  title: string;
  category: 'ventas' | 'cobranza' | 'producto' | 'objeciones' | 'formacion' | 'marketing';
  level: 'inicial' | 'intermedio' | 'avanzado';
  durationMin: number;
  description: string;
  lessons: Lesson[];
  /** Opcional: el currículo importado de Notion no trae evaluaciones. Un curso
   *  sin quiz se completa leyendo sus lecciones. */
  quiz?: Quiz;
  /** De dónde viene el curso: "Educación para Vendedores", "Educación para
   *  Directivos"… Sirve para agrupar en la pantalla. */
  area?: string;
}

export interface Lesson {
  id: string;
  title: string;
  body: string;
  keyTakeaway: string;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  threshold: number; // quiz score required
}

export interface CourseProgress {
  courseId: string;
  completedLessons: string[];
  bestScore: number;
  attempts: number;
  unlockedBadge?: string;
}

// ---------------- Playbook ----------------

export type RESPhase = 'relacion' | 'educacion' | 'solucion';

export interface Objection {
  id: string;
  text: string;
  context: string;
  difficulty: 'frecuente' | 'compleja' | 'agresiva';
  resSteps: ResStep[];
}

export interface ResStep {
  phase: RESPhase;
  label: string;
  technique: string;
  script: string;
}

export interface RoleplayNode {
  id: string;
  speaker: 'cliente' | 'agente';
  text: string;
  options?: RoleplayOption[];
  outcome?: 'win' | 'lose' | 'retry';
  feedback?: string;
}

export interface RoleplayOption {
  id: string;
  text: string;
  next: string;
  resPhase?: RESPhase;
  quality: 'optima' | 'aceptable' | 'pobre';
  feedback: string;
}

// ---------------- Equipo ----------------

export interface TeamMember {
  id: string;
  name: string;
  role: Role;
  email: string;
  phone: string;
  active: boolean;
  goalMonthly: number;
  achievedMonthly: number;
  commissionRatePct: number;
  activePortfolio: number;
  delinquencyPct: number;
  joinedAt: string;
  originLat?: number | null;
  originLng?: number | null;
}

// ---------------- Facturacion ----------------

export type InvoiceStatus = 'pagada' | 'pendiente' | 'vencida';

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: InvoiceStatus;
  isDownPayment: boolean;
  installmentNumber: number;
  totalInstallments: number;
}

// ---------------- Inventario ----------------

/** Una línea del crédito: qué se vendió, cuántas unidades y a qué precio. */
export interface ClientItem {
  id: string;
  /** Id del producto del Inventario, si salió de ahí. Vacío si se escribió a mano. */
  productId?: string | null;
  name: string;
  quantity: number;
  /** Precio por unidad, en dólares (la moneda interna del CRM). */
  unitPrice: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  taxPct: number;
  discountPct: number;
  stock: number;
  sold: number;
}

// ---------------- Navigation ----------------

export interface NavItem {
  id: Permission;
  label: string;
  icon: string; // lucide icon name
  description: string;
}

// ---------------- Onboarding ----------------

export interface TourStep {
  id: string;
  target: string; // selector-ish label used by highlight overlay
  title: string;
  body: string;
  roles: Role[];
}

// ---------------- Notifications ----------------

export type NotificationPriority = 'alta' | 'media' | 'baja';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  read: boolean;
  link: string;
  createdAt: string;
}

// ---------------- Audit ----------------

export interface AuditEntry {
  id: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------- Navigation (extended) ----------------

export type Permission =
  | 'dashboard'
  | 'crm'
  | 'pagados'
  | 'courses'
  | 'playbook'
  | 'equipo'
  | 'facturacion'
  | 'inventario'
  | 'config'
  | 'reportes'
  | 'auditoria'
  | 'ruta';
