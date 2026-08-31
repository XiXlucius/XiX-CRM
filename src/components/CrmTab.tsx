import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Users,
  Pencil,
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Calculator,
  StickyNote,
  Send,
  Trash2,
  UserPlus,
  ShieldCheck,
  CalendarClock,
  Loader2,
  FileText,
  Upload,
  MessageSquare,
  Handshake,
  DollarSign,
  AlertCircle,
  Navigation,
  Printer,
} from 'lucide-react';
import { useStore } from '../store';
import type { Client, ClientItem, Product, ClientStatus, PaymentFrequency, Municipality, ClientDocument, MessageTemplate, PartialPayment, Renegotiation, EmploymentTenure, TeamMember } from '../types';
import { CARACAS_MUNICIPALITIES } from '../data';
import { printInvoice, printStatement } from '../lib/export';
import { isOverdue, parseLocalDate } from '../lib/aging';
import {
  Card,
  SectionHeader,
  StatusChip,
  Modal,
  EmptyState,
  fmtMoney,
  fmtDate,
  fmtDateShort,
  NumberInput,
  MoneyInput,
  DatePicker,
} from './ui';
import { AmortizationCalculator } from './AmortizationCalculator';
import { ScoreRing } from './ScoreRing';
import { assessRisk, RISK_BAND_STYLES, RECOMMENDATION_STYLES, TENURE_OPTIONS, type BusinessSettings } from '../lib/scoring';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';

const MUNI_LABELS: Record<Municipality, string> = {
  libertador: 'Libertador',
  chacao: 'Chacao',
  baruta: 'Baruta',
  sucre: 'Sucre',
  hatillo: 'El Hatillo',
};

const MUNI_COORDS: Record<Municipality, { lat: number; lng: number }> = {
  libertador: { lat: 10.506, lng: -66.916 },
  chacao: { lat: 10.485, lng: -66.855 },
  baruta: { lat: 10.43, lng: -66.87 },
  sucre: { lat: 10.49, lng: -66.83 },
  hatillo: { lat: 10.43, lng: -66.82 },
};

const STATUSES: ClientStatus[] = [
  'prospecto',
  'en_revision',
  'aprobado',
  'activo',
  'en_mora',
  'rechazado',
];

export function CrmTab({ initialClientId }: { initialClientId?: string | null }) {
  const { clients, invoices, team, products, markInvoicePaid, addClient, updateClient, addBitacora, generateSchedule, settings, documents, templates, partialPayments, renegotiations, lateFees, sendWhatsApp, uploadDocument, deleteDocument, addPartialPayment, addRenegotiation, applyLateFees } = useStore();
  const toast = useToast();
  const [view, setView] = useState<'grid' | 'list' | 'map'>('grid');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  // Cliente que se está editando en el formulario (null = alta nueva).
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (initialClientId) {
      const c = clients.find((cl) => cl.id === initialClientId);
      if (c) setSelected(c);
    }
  }, [initialClientId, clients]);

  // Auto-apply late fees on tab load
  useEffect(() => {
    applyLateFees();
  }, [applyLateFees]);

  /** Cobrar la cuota que toca, desde la ficha del cliente. Es la acción más
   *  frecuente en la calle y estaba enterrada en la pestaña de Pagos. */
  const [cobrando, setCobrando] = useState(false);
  const handleCobrar = async (invoiceId: string) => {
    setCobrando(true);
    try {
      await markInvoicePaid(invoiceId);
      toast.success('Pago registrado');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setCobrando(false);
    }
  };

  /** Cambiar el estado desde la lista, sin abrir la ficha. */
  const handleStatusChange = async (clientId: string, status: ClientStatus) => {
    try {
      await updateClient(clientId, { status });
      toast.success(`Estado cambiado a ${status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const handleGenerate = async (clientId: string) => {
    setGenerating(clientId);
    try {
      await generateSchedule(clientId);
      const updated = clients.find((c) => c.id === clientId);
      if (updated) setSelected({ ...updated, status: 'activo' });
      toast.success('Plan de pagos generado');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setGenerating(null);
    }
  };

  const agents = useMemo(() => {
    const set = new Set(clients.map((c) => c.assignedAgent).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [clients]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const q = query.toLowerCase();
      const matches =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.cedula.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q);
      const status = statusFilter === 'all' || c.status === statusFilter;
      const agent = agentFilter === 'all' || c.assignedAgent === agentFilter;
      return matches && status && agent;
    });
  }, [clients, query, statusFilter, agentFilter]);

  return (
    <div data-tour="crm" className="space-y-5">
      <SectionHeader
        title="CRM · Clientes a crédito"
        subtitle={`${clients.length} clientes en cartera`}
        icon={<Users size={16} />}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setTemplatesOpen(true)} className="btn-outline">
              <MessageSquare size={15} /> <span className="hidden sm:inline">Plantillas</span>
            </button>
            <button onClick={() => setCalcOpen(true)} className="btn-outline">
              <Calculator size={15} /> <span className="hidden sm:inline">Calculadora</span>
            </button>
            <button onClick={() => setFormOpen(true)} className="btn-primary">
              <Plus size={15} /> <span className="hidden sm:inline">Nuevo cliente</span>
            </button>
          </div>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, cédula o producto..."
              className="input pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClientStatus | 'all')}
            className="input w-auto"
          >
            <option value="all">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="input w-auto"
          >
            {agents.map((a) => (
              <option key={a} value={a}>{a === 'all' ? 'Todos los agentes' : a}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-tint/10 p-0.5">
            <button onClick={() => setView('grid')} className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${view === 'grid' ? 'bg-accent-500/20 text-accent-300' : 'text-slate-400'}`}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setView('list')} className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${view === 'list' ? 'bg-accent-500/20 text-accent-300' : 'text-slate-400'}`}>
              <List size={15} />
            </button>
            <button onClick={() => setView('map')} className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${view === 'map' ? 'bg-accent-500/20 text-accent-300' : 'text-slate-400'}`}>
              <MapPin size={15} />
            </button>
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={<Users size={22} />} title="Sin clientes que coincidan" body="Ajusta el filtro o registra un nuevo cliente." />
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
                <ClientCard
                  client={c}
                  onOpen={() => setSelected(c)}
                  onChangeStatus={(st) => handleStatusChange(c.id, st)}
                  onEdit={() => { setEditingClient(c); setFormOpen(true); }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : view === 'list' ? (
        <>
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-850">
                  <tr className="text-left kicker">
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Municipio</th>
                    <th className="px-4 py-3 font-medium">Agente</th>
                    <th className="px-4 py-3 font-medium">Financiado</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tint/5">
                  {filtered.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="px-4 py-3"><p className="font-medium text-metal-100">{c.fullName}</p><p className="text-xs text-slate-500">{c.cedula}</p></td>
                      <td className="px-4 py-3 text-slate-300">{c.product}</td>
                      <td className="px-4 py-3 text-slate-400">{MUNI_LABELS[c.municipality]}</td>
                      <td className="px-4 py-3 text-slate-400">{c.assignedAgent}</td>
                      <td className="px-4 py-3 num text-slate-300">{fmtMoney(c.productCost * (1 - c.downPaymentPct / 100))}</td>
                      <td className="px-4 py-3"><RiskBadge score={c.riskScore} /></td>
                      <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setSelected(c)} className="btn-ghost px-2.5 py-1.5 text-xs">Ver</button>
                          <button onClick={() => { setEditingClient(c); setFormOpen(true); }} className="btn-ghost px-2.5 py-1.5 text-xs">
                            <Pencil size={12} /> Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {/* Vista de tarjetas en móvil/tablet — mismos datos y acción que la tabla */}
          <div className="lg:hidden space-y-3">
            {filtered.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onOpen={() => setSelected(c)}
                onChangeStatus={(st) => handleStatusChange(c.id, st)}
                onEdit={() => { setEditingClient(c); setFormOpen(true); }}
              />
            ))}
          </div>
        </>
      ) : (
        <ClientMap clients={filtered} onOpen={(c) => setSelected(c)} />
      )}

      <ClientFormModal
        open={formOpen}
        editing={editingClient}
        onClose={() => { setFormOpen(false); setEditingClient(null); }}
        settings={settings}
        team={team}
        products={products}
        onSave={async (data) => {
          // Si falla, el error sube al formulario: el modal se queda abierto
          // con los datos intactos y él muestra el aviso.
          if (editingClient) {
            await updateClient(editingClient.id, data);
            // La ficha abierta debe reflejar los cambios al instante.
            setSelected((sel) => (sel && sel.id === editingClient.id ? { ...sel, ...data } : sel));
            toast.success('Cliente actualizado');
          } else {
            await addClient(data);
            toast.success('Cliente guardado');
          }
          setFormOpen(false);
          setEditingClient(null);
        }}
      />

      <ClientDetailModal
        client={selected}
        onClose={() => setSelected(null)}
        onUpdate={async (patch) => {
          if (!selected) return;
          const previous = selected;
          setSelected({ ...selected, ...patch }); // optimista
          try {
            await updateClient(selected.id, patch);
          } catch (err) {
            setSelected(previous); // revertir
            toast.error(friendlyError(err));
          }
        }}
        onAddNote={async (entry) => {
          if (!selected) return;
          try {
            await addBitacora(selected.id, entry);
            toast.success('Nota agregada');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
        onGenerateSchedule={handleGenerate}
        onEdit={() => {
          if (!selected) return;
          // Hay que cerrar la ficha: si no, se queda encima del formulario y
          // parece que "Editar" no hizo nada hasta cerrarla a mano.
          setEditingClient(selected);
          setSelected(null);
          setFormOpen(true);
        }}
        onCobrar={handleCobrar}
        cobrando={cobrando}
        generating={generating}
        documents={selected ? documents.filter((d) => d.clientId === selected.id) : []}
        partialPayments={selected ? partialPayments.filter((p) => invoices.some((i) => i.id === p.invoiceId && i.clientId === selected.id)) : []}
        renegotiations={selected ? renegotiations.filter((r) => r.clientId === selected.id) : []}
        lateFees={selected ? lateFees.filter((f) => f.clientId === selected.id) : []}
        invoices={selected ? invoices.filter((i) => i.clientId === selected.id) : []}
        templates={templates}
        onUploadDoc={async (clientId, file, type) => {
          try {
            await uploadDocument(clientId, file, type);
            toast.success('Documento subido');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
        onDeleteDoc={async (id) => {
          try {
            await deleteDocument(id);
            toast.success('Documento eliminado');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
        onAddPartialPayment={async (invoiceId, amount, paymentDate, note) => {
          try {
            await addPartialPayment(invoiceId, amount, paymentDate, note);
            toast.success('Abono registrado');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
        onAddRenegotiation={async (clientId, newTermMonths, newInterestRate, newFrequency, reason) => {
          try {
            await addRenegotiation(clientId, newTermMonths, newInterestRate, newFrequency, reason);
            toast.success('Renegociación aplicada');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
        onSendWhatsApp={async (phone, message) => {
          try {
            await sendWhatsApp(phone, message);
            toast.success('Mensaje enviado');
          } catch (err) {
            toast.error(friendlyError(err));
          }
        }}
      />

      <Modal open={calcOpen} onClose={() => setCalcOpen(false)} title="Calculadora de amortización" size="lg">
        <StandaloneCalculator />
      </Modal>

      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        onSave={async () => {}}
      />
    </div>
  );
}

// ---------- Risk badge ----------

function RiskBadge({ score }: { score: number }) {
  const band = score >= 70 ? 'bajo' : score >= 45 ? 'medio' : 'alto';
  const meta = RISK_BAND_STYLES[band];
  return (
    <span className={`chip ${meta.bg} ${meta.color}`}>
      <ShieldCheck size={11} /> {score}
    </span>
  );
}

// ---------- Risk preview (in form) ----------

function RiskPreview({ form, settings }: { form: Record<string, unknown>; settings: BusinessSettings }) {
  const assessment = assessRisk(form as Partial<Client>, settings);
  const bandMeta = RISK_BAND_STYLES[assessment.band];
  return (
    <div className={`rounded-xl border p-4 ${assessment.band === 'bajo' ? 'border-success-500/30 bg-success/5' : assessment.band === 'medio' ? 'border-warning/30 bg-warning/5' : 'border-danger/30 bg-danger/5'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className={bandMeta.color} />
          <span className="text-sm font-semibold text-metal-100">Análisis de riesgo crediticio</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`chip ${bandMeta.bg} ${bandMeta.color}`}>{bandMeta.label}</span>
          <ScoreRing value={assessment.score} size={40} label="Score de riesgo" />
        </div>
      </div>
      {assessment.prohibited && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger-400" />
          <div>
            <p className="text-sm font-semibold text-danger-400">Venta prohibida</p>
            <p className="text-xs text-danger-300/80">
              {assessment.prohibited === 'no_id'
                ? 'El cliente no dispone de cédula física. No se puede proceder con la venta.'
                : 'El cliente tiene menos de 3 meses en la empresa. No se puede proceder con la venta.'}
            </p>
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">Recomendación:</span>
        <span className={`chip ${RECOMMENDATION_STYLES[assessment.recommendation]}`}>{assessment.recommendation}</span>
      </div>
      {assessment.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {assessment.reasons.map((r, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="text-slate-600">•</span> {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Client card ----------

function ClientCard({ client, onOpen, onChangeStatus, onEdit }: {
  client: Client;
  onOpen: () => void;
  /** Cambiar el estado sin abrir la ficha. Antes solo se podía desde el fondo
   *  del modal de detalle, donde nadie lo encontraba, y los clientes se
   *  quedaban en "prospecto" — con lo cual no sumaban a la cartera activa. */
  onChangeStatus?: (status: ClientStatus) => void;
  onEdit?: () => void;
}) {
  const financed = client.productCost * (1 - client.downPaymentPct / 100);
  return (
    <div className="text-left w-full">
      <Card hover className="p-4 h-full">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900/60 ring-1 ring-tint/10 text-accent-300 font-semibold text-sm">
              {client.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-metal-100">{client.fullName}</p>
              <p className="truncate text-xs text-slate-500">{client.cedula}</p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            {onChangeStatus ? (
              <StatusPicker status={client.status} onChange={onChangeStatus} />
            ) : (
              <StatusChip status={client.status} />
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                title="Editar cliente"
                aria-label="Editar cliente"
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-accent-500/10 hover:text-accent-300"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        </div>
        <button onClick={onOpen} className="w-full text-left">
        <div className="mt-3 space-y-1.5 text-xs text-slate-400">
          <p className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-500" /> {MUNI_LABELS[client.municipality]}</p>
          <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-500" /> {client.phone}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <RiskBadge score={client.riskScore} />
          <div className="text-right">
            <p className="kicker">Financiado</p>
            <p className="num text-sm text-metal-100">{fmtMoney(financed)}</p>
          </div>
        </div>
        </button>
      </Card>
    </div>
  );
}

/** Selector de estado en la propia tarjeta. Mantiene el aspecto del chip para
 *  no ensuciar la lista, pero se puede desplegar y cambiar de una vez. */
function StatusPicker({ status, onChange }: { status: ClientStatus; onChange: (s: ClientStatus) => void }) {
  return (
    <div className="relative shrink-0">
      <StatusChip status={status} />
      <select
        aria-label="Cambiar estado del cliente"
        value={status}
        onChange={(e) => onChange(e.target.value as ClientStatus)}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  );
}

// ---------- Client map (geolocation) ----------

function ClientMap({ clients, onOpen }: { clients: Client[]; onOpen: (c: Client) => void }) {
  // Ubicación real si el cliente la tiene (latitude/longitude); si no, centro real del
  // municipio (MUNI_COORDS) con una dispersión pequeña — nunca una geometría inventada.
  const clientsWithCoords = useMemo(() => clients.map((c) => ({
    client: c,
    lat: c.latitude ?? MUNI_COORDS[c.municipality].lat + (Math.random() - 0.5) * 0.02,
    lng: c.longitude ?? MUNI_COORDS[c.municipality].lng + (Math.random() - 0.5) * 0.02,
    approx: c.latitude == null,
  })), [clients]);

  const statusColors: Record<string, string> = {
    prospecto: '#75798c',
    en_revision: '#c9ae7d',
    aprobado: '#b5abfc',
    activo: '#86b298',
    en_mora: '#d09090',
    rechazado: '#595d6c',
  };

  return (
    <Card className="p-4 sm:p-5">
      <SectionHeader title="Mapa de clientes" subtitle={`${clientsWithCoords.length} clientes geolocalizados`} icon={<MapPin size={16} />} />
      <div className="relative h-[320px] sm:h-[400px] lg:h-[480px] rounded-xl overflow-hidden border border-tint/5 [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180 [&_.leaflet-tile-pane]:brightness-90 [&_.leaflet-tile-pane]:contrast-90 [&_.leaflet-tile-pane]:saturate-75 [&_.leaflet-control-attribution]:!bg-ink-900/70 [&_.leaflet-control-attribution]:!text-slate-500">
        <MapContainer center={[10.475, -66.865]} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {clientsWithCoords.map(({ client, lat, lng, approx }) => {
            const color = statusColors[client.status] ?? '#75798c';
            return (
              <CircleMarker
                key={client.id}
                center={[lat, lng]}
                radius={7}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.75, weight: 1.5 }}
                eventHandlers={{ click: () => onOpen(client) }}
              >
                <Popup>
                  <b>{client.fullName}</b><br />
                  {client.product}<br />
                  {approx && <span style={{ opacity: 0.6 }}>Ubicación aproximada (sin coordenadas guardadas)</span>}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap gap-2 bg-ink-900/80 backdrop-blur rounded-xl p-2 border border-tint/5 pointer-events-none">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {status.replace('_', ' ')}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
        <Navigation size={11} /> Click en un pin para ver el detalle del cliente
      </p>
    </Card>
  );
}

// ---------- Artículos del crédito ----------

/** Un artículo vacío listo para llenar. */
function itemNuevo(): ClientItem {
  return { id: crypto.randomUUID(), productId: null, name: '', quantity: 1, unitPrice: 0 };
}

export function totalItems(items: ClientItem[]): number {
  return Math.round(items.reduce((a, i) => a + i.quantity * i.unitPrice, 0) * 100) / 100;
}

/** Resumen legible para listados y buscador: "Nevera LG + 2 artículos más". */
export function resumenItems(items: ClientItem[]): string {
  const conNombre = items.filter((i) => i.name.trim());
  if (conNombre.length === 0) return '';
  const primero = conNombre[0].name.trim();
  const resto = conNombre.length - 1;
  return resto > 0 ? `${primero} + ${resto} artículo${resto > 1 ? 's' : ''} más` : primero;
}

function ItemsEditor({ items, products, onChange }: {
  items: ClientItem[];
  products: Product[];
  onChange: (items: ClientItem[]) => void;
}) {
  const set = (id: string, cambio: Partial<ClientItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...cambio } : i)));

  /** Al elegir del inventario se copian nombre y precio final (con IVA y
   *  descuento aplicados), que es lo que el cliente realmente paga. */
  const elegirProducto = (id: string, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) { set(id, { productId: null }); return; }
    const precioFinal = Math.round(p.basePrice * (1 + p.taxPct / 100) * (1 - p.discountPct / 100) * 100) / 100;
    set(id, { productId: p.id, name: p.name, unitPrice: precioFinal });
  };

  const total = totalItems(items);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="label mb-0">Artículos del crédito</label>
        <button
          type="button"
          onClick={() => onChange([...items, itemNuevo()])}
          className="btn-ghost px-2.5 py-1 text-xs"
        >
          <Plus size={13} /> Agregar artículo
        </button>
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const sinStock = it.productId
            ? (products.find((p) => p.id === it.productId)?.stock ?? 0) < it.quantity
            : false;
          return (
            <div key={it.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
              <div className="flex gap-2">
                <select
                  className="input w-auto shrink-0"
                  value={it.productId ?? ''}
                  onChange={(e) => elegirProducto(it.id, e.target.value)}
                  title="Tomar del inventario"
                >
                  <option value="">Escribir a mano</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  className="input flex-1"
                  placeholder="Nombre del artículo"
                  value={it.name}
                  onChange={(e) => set(it.id, { name: e.target.value, productId: null })}
                />
                <button
                  type="button"
                  onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                  disabled={items.length === 1}
                  title="Quitar artículo"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-danger/10 hover:text-danger-400 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-[10px]">Cantidad</label>
                  <NumberInput
                    value={it.quantity}
                    min={1}
                    onChange={(v) => set(it.id, { quantity: Math.max(1, v) })}
                  />
                </div>
                <div>
                  <label className="label text-[10px]">Precio por unidad</label>
                  <MoneyInput valueUsd={it.unitPrice} onChangeUsd={(v) => set(it.id, { unitPrice: v })} />
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className={sinStock ? 'text-warning-400' : 'text-slate-500'}>
                  {sinStock ? 'Stock insuficiente en inventario' : ''}
                </span>
                <span className="num text-slate-300">
                  {it.quantity} × {fmtMoney(it.unitPrice)} = {fmtMoney(it.quantity * it.unitPrice)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-accent-500/10 px-3 py-2 ring-1 ring-accent-500/20">
        <span className="text-sm text-metal-100">Total financiado</span>
        <span className="num text-lg text-metal-100">{fmtMoney(total)}</span>
      </div>
    </div>
  );
}

// ---------- Client form ----------

function ClientFormModal({ open, onClose, onSave, settings, team, editing, products }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Client, 'id' | 'createdAt' | 'bitacora'>) => void | Promise<void>;
  settings: BusinessSettings;
  team: TeamMember[];
  /** Si viene un cliente, el formulario entra en modo edición: se rellena con
   *  sus datos y al guardar se actualiza en vez de crear uno nuevo. */
  editing?: Client | null;
  /** Catálogo del Inventario, para elegir artículos con su precio ya cargado. */
  products: Product[];
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', cedula: '', phone: '', email: '',
    municipality: 'chacao' as Municipality, address: '', product: '',
    productCost: 1000, downPaymentPct: 20, interestRate: 18,
    frequency: 'quincenal' as PaymentFrequency, termMonths: 12,
    // Registrar a alguien con producto, cuotas y fecha de cobro es registrar una
    // venta cerrada, no un lead: entra como activo y su dinero suma a la cartera
    // desde el primer momento. Si algún día se registra un prospecto de verdad,
    // se cambia el estado en un clic desde la propia tarjeta.
    status: 'activo' as ClientStatus, assignedAgent: 'Administrador',
    monthlyIncome: 1000,
    employmentTenure: '6m-1y' as EmploymentTenure,
    hasPhysicalId: true,
    firstPaymentDate: '',
    latitude: '' as string,
    longitude: '' as string,
  });
  const [items, setItems] = useState<ClientItem[]>([itemNuevo()]);
  const [equalInstallments, setEqualInstallments] = useState(false);
  const [numInstallments, setNumInstallments] = useState(12);
  const [termMonths, setTermMonths] = useState(12);
  const [extraWeeks, setExtraWeeks] = useState(0);

  const set = (k: keyof typeof form, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const effectiveTerm = termMonths + extraWeeks / 4.345;
  const esEdicion = !!editing;

  // Al abrir en modo edición se vuelca el cliente en el formulario. Se hace en
  // un efecto y no en el useState inicial porque el mismo modal se reutiliza:
  // sin esto, abrir un segundo cliente mostraría los datos del primero.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        fullName: editing.fullName, cedula: editing.cedula,
        phone: editing.phone, email: editing.email,
        municipality: editing.municipality, address: editing.address,
        product: editing.product, productCost: editing.productCost,
        downPaymentPct: editing.downPaymentPct, interestRate: editing.interestRate,
        frequency: editing.frequency, termMonths: editing.termMonths,
        status: editing.status, assignedAgent: editing.assignedAgent,
        monthlyIncome: editing.monthlyIncome,
        employmentTenure: editing.employmentTenure ?? '6m-1y',
        hasPhysicalId: editing.hasPhysicalId ?? true,
        firstPaymentDate: editing.firstPaymentDate?.slice(0, 10) ?? '',
        latitude: editing.latitude != null ? String(editing.latitude) : '',
        longitude: editing.longitude != null ? String(editing.longitude) : '',
      });
      // Clientes registrados antes de los artículos no tienen `items`: se
      // reconstruye uno solo a partir del producto y el costo que sí tienen,
      // para que la edición no los deje en blanco.
      setItems(
        editing.items && editing.items.length > 0
          ? editing.items
          : [{ id: crypto.randomUUID(), productId: null, name: editing.product, quantity: 1, unitPrice: editing.productCost }],
      );
      // El plazo se guarda en meses con decimales (meses + semanas extra).
      setTermMonths(Math.floor(editing.termMonths));
      setExtraWeeks(Math.round((editing.termMonths % 1) * 4.345));
    }
  }, [open, editing]);

  const submit = async () => {
    if (saving) return;
    if (!form.fullName || !form.cedula) {
      toast.error('El nombre y la cédula son obligatorios.');
      return;
    }
    const itemsValidos = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (itemsValidos.length === 0) {
      toast.error('Agrega al menos un artículo con nombre.');
      return;
    }
    const lat = form.latitude ? parseFloat(form.latitude) : null;
    const lng = form.longitude ? parseFloat(form.longitude) : null;

    setSaving(true);
    try {
      await onSave({
        ...form,
        // El costo y la descripción ya no se escriben a mano: se derivan de
        // los artículos, así nunca pueden contradecirse entre sí.
        items: itemsValidos,
        product: resumenItems(itemsValidos) || form.product,
        productCost: totalItems(itemsValidos),
        termMonths: effectiveTerm,
        firstPaymentDate: form.firstPaymentDate || null,
        riskScore: 0,
        latitude: lat,
        longitude: lng,
      } as Omit<Client, 'id' | 'createdAt' | 'bitacora'>);

      // Al editar no se limpia: el modal se cierra y el cliente conserva sus
      // datos. Solo el alta vacía el formulario para el siguiente registro.
      if (!esEdicion) {
        setForm({ fullName: '', cedula: '', phone: '', email: '', municipality: 'chacao', address: '', product: '', productCost: 1000, downPaymentPct: 20, interestRate: 18, frequency: 'quincenal', termMonths: 12, status: 'activo', assignedAgent: 'Administrador', monthlyIncome: 1000, employmentTenure: '6m-1y', hasPhysicalId: true, firstPaymentDate: '', latitude: '', longitude: '' });
        setItems([itemNuevo()]);
        setEqualInstallments(false);
        setNumInstallments(12);
        setTermMonths(12);
        setExtraWeeks(0);
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? `Editar a ${editing?.fullName}` : 'Nueva solicitud a crédito'}
      size="lg"
    >
      <div className="space-y-4">
        {esEdicion && (
          <p className="rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs text-warning-400">
            Las cuotas ya creadas <span className="font-medium">no se recalculan</span> al editar.
            Si cambias el costo, la inicial o el plazo, ajusta también las facturas
            en Facturación o bórralas y vuelve a generarlas.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Nombre completo</label><input className="input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} /></div>
          <div><label className="label">Cédula</label><input className="input" value={form.cedula} onChange={(e) => set('cedula', e.target.value)} placeholder="V-12.345.678" /></div>
          <div><label className="label">Teléfono</label><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className="label">Municipio</label><select className="input" value={form.municipality} onChange={(e) => set('municipality', e.target.value)}>{CARACAS_MUNICIPALITIES.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="label">Estado</label><select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
        </div>
        <div><label className="label">Dirección</label><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Latitud (opcional)</label><input className="input" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="10.485" /></div>
          <div><label className="label">Longitud (opcional)</label><input className="input" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="-66.855" /></div>
        </div>

        {/* Risk questions */}
        <div className="pt-2 border-t border-tint/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Evaluación de riesgo</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">¿Tiempo de trabajo en la empresa?</label>
              <select className="input" value={form.employmentTenure} onChange={(e) => set('employmentTenure', e.target.value as EmploymentTenure)}>
                {TENURE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {form.employmentTenure === 'lt-3m' && (
                <p className="mt-1 text-xs text-danger-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Alto riesgo — venta prohibida
                </p>
              )}
              {form.employmentTenure === '4-6m' && (
                <p className="mt-1 text-xs text-warning-400">Riesgo mediano — suma puntos al score</p>
              )}
              {form.employmentTenure === '6m-1y' && (
                <p className="mt-1 text-xs text-success-500">Buena puntuación</p>
              )}
              {form.employmentTenure === '1-2y' && (
                <p className="mt-1 text-xs text-success-500">Excelente puntuación</p>
              )}
              {form.employmentTenure === 'gt-2y' && (
                <p className="mt-1 text-xs text-success-500">La mejor puntuación</p>
              )}
            </div>
            <div>
              <label className="label">¿Dispone de cédula física?</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => set('hasPhysicalId', true)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${form.hasPhysicalId ? 'border-success-500/40 bg-success/10 text-success-500' : 'border-tint/5 bg-ink-900/40 text-slate-400'}`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => set('hasPhysicalId', false)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${!form.hasPhysicalId ? 'border-danger/40 bg-danger/10 text-danger-400' : 'border-tint/5 bg-ink-900/40 text-slate-400'}`}
                >
                  No
                </button>
              </div>
              {!form.hasPhysicalId && (
                <p className="mt-1 text-xs text-danger-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Venta prohibida sin cédula física
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-tint/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Datos del crédito</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <ItemsEditor
                items={items}
                products={products}
                onChange={setItems}
              />
            </div>
            <div><label className="label">Inicial (%)</label><NumberInput value={form.downPaymentPct} onChange={(v) => set('downPaymentPct', v)} /></div>
            <div><label className="label">Tasa interés anual (%)</label><NumberInput value={form.interestRate} onChange={(v) => set('interestRate', v)} /></div>
            <div><label className="label">Frecuencia</label><select className="input" value={form.frequency} onChange={(e) => set('frequency', e.target.value as PaymentFrequency)}><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></div>
            <div><label className="label">Ingreso mensual</label><MoneyInput valueUsd={form.monthlyIncome} onChangeUsd={(v) => set('monthlyIncome', v)} /></div>
            <div>
              <label className="label">Agente asignado</label>
              <select className="input" value={form.assignedAgent} onChange={(e) => set('assignedAgent', e.target.value)}>
                <option value="Administrador">Administrador</option>
                {team.filter((m) => m.active).map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Term input: months + weeks for weekly, months otherwise */}
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Plazo (meses)</label>
              <NumberInput value={termMonths} min={0} onChange={(v) => setTermMonths(Math.max(0, v))} />
            </div>
            {form.frequency === 'semanal' && (
              <div>
                <label className="label">Semanas adicionales</label>
                <NumberInput value={extraWeeks} min={0} max={3} onChange={(v) => setExtraWeeks(Math.min(3, Math.max(0, v)))} />
                <p className="mt-1 text-[11px] text-slate-500">Ej: 1 mes y 3 semanas = 1 mes + 3 semanas</p>
              </div>
            )}
          </div>

          {/* First payment date picker — calendario propio (ver DatePicker en ui.tsx)
              en vez del input nativo, para que se vea con los colores del CRM y no
              con el calendario genérico del navegador. */}
          <div className="mt-3">
            <label className="label">Fecha del primer cobro</label>
            <DatePicker value={form.firstPaymentDate} onChange={(iso) => set('firstPaymentDate', iso)} />
            <p className="mt-1 text-[11px] text-slate-500">
              {form.frequency === 'semanal'
                ? 'Los cobros caerán en este mismo día de la semana, cada 7 días.'
                : form.frequency === 'quincenal'
                ? 'El segundo cobro será exactamente 15 días después de este, y así sucesivamente.'
                : 'Los cobros caerán en este mismo día del mes, mes a mes.'}
            </p>
          </div>

          {/* Equal installments toggle */}
          <div className="mt-3 rounded-xl border border-tint/5 bg-ink-900/40 p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={equalInstallments}
                onChange={(e) => setEqualInstallments(e.target.checked)}
                className="h-4 w-4 rounded border-tint/20 bg-ink-900 text-accent-500 focus:ring-accent-500/40"
              />
              <span className="text-sm text-metal-100">Cuotas exactamente iguales</span>
              <span className="text-[11px] text-slate-500">— divide el total en cuotas del mismo monto</span>
            </label>
            {equalInstallments && (
              <div>
                <label className="label">Número de cuotas</label>
                <NumberInput value={numInstallments} min={1} onChange={(v) => setNumInstallments(Math.max(1, v))} />
              </div>
            )}
          </div>
        </div>

        <RiskPreview form={form as unknown as Record<string, unknown>} settings={settings} />

        <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3">
          <AmortizationCalculator
            cost={form.productCost}
            downPct={form.downPaymentPct}
            rate={form.interestRate}
            termMonths={effectiveTerm}
            frequency={form.frequency}
            equalInstallments={equalInstallments}
            numInstallments={numInstallments}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>Cancelar</button>
          <button onClick={submit} className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Client detail + tabs ----------

function ClientDetailModal({
  client, onClose, onUpdate, onAddNote, onGenerateSchedule, generating, onEdit, onCobrar, cobrando,
  documents, partialPayments, renegotiations, lateFees, invoices, templates,
  onUploadDoc, onDeleteDoc, onAddPartialPayment, onAddRenegotiation, onSendWhatsApp,
}: {
  client: Client | null;
  onClose: () => void;
  onUpdate: (patch: Partial<Client>) => void;
  onAddNote: (entry: { author: string; channel: 'llamada' | 'whatsapp' | 'visita' | 'email'; note: string; outcome: 'contactado' | 'no_responde' | 'compromiso' | 'rechazo' | 'recordatorio' }) => void;
  onGenerateSchedule: (clientId: string) => void;
  /** Abre el formulario completo con los datos del cliente cargados. */
  onEdit?: () => void;
  /** Marca como pagada la cuota que toca cobrar. */
  onCobrar?: (invoiceId: string) => void;
  cobrando?: boolean;
  generating: string | null;
  documents: ClientDocument[];
  partialPayments: PartialPayment[];
  renegotiations: Renegotiation[];
  lateFees: { id: string; amount: number; weekNumber: number; appliedAt: string }[];
  invoices: { id: string; amount: number; dueDate: string; paidDate: string | null; status: string; installmentNumber: number; totalInstallments: number; isDownPayment: boolean }[];
  templates: MessageTemplate[];
  onUploadDoc: (clientId: string, file: File, type: string) => Promise<void>;
  onDeleteDoc: (id: string) => Promise<void>;
  onAddPartialPayment: (invoiceId: string, amount: number, paymentDate: string, note: string) => Promise<void>;
  onAddRenegotiation: (clientId: string, newTermMonths: number, newInterestRate: number, newFrequency: PaymentFrequency, reason: string) => Promise<void>;
  onSendWhatsApp: (phone: string, message: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<'info' | 'amort' | 'bitacora' | 'docs' | 'payments' | 'reneg' | 'late'>('info');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState<'llamada' | 'whatsapp' | 'visita' | 'email'>('whatsapp');
  const [outcome, setOutcome] = useState<'contactado' | 'no_responde' | 'compromiso' | 'rechazo' | 'recordatorio'>('contactado');
  const [uploading, setUploading] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [renegOpen, setRenegOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState<string | null>(null);
  const [waTemplate, setWaTemplate] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // La cuota que toca cobrar: la más próxima sin pagar.
  //
  // OJO: este `useMemo` va ANTES del `return null` de abajo. Los hooks de React
  // deben ejecutarse siempre en el mismo orden; si se llaman después de un
  // return condicional, al cerrar la ficha se rendirizan menos hooks que antes
  // y React tumba la aplicación entera (error #310). Ya pasó una vez.
  const proximaCuota = useMemo(
    () =>
      [...invoices]
        .filter((i) => i.status !== 'pagada')
        .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())[0],
    [invoices],
  );

  if (!client) return null;

  const submitNote = async () => {
    if (!note.trim()) return;
    await onAddNote({ author: 'Vendedor', channel, note: note.trim(), outcome });
    setNote('');
  };

  const canGenerate = client.status === 'aprobado' || client.status === 'prospecto' || client.status === 'en_revision';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client) return;
    setUploading(true);
    try {
      await onUploadDoc(client.id, file, 'documento');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const sendWhatsAppMsg = async (templateBody?: string) => {
    if (!client?.phone) return;
    setWaSending(true);
    try {
      let msg = templateBody ?? waTemplate;
      msg = msg.replace(/\{nombre\}/g, client.fullName.split(' ')[0]);
      msg = msg.replace(/\{producto\}/g, client.product);
      msg = msg.replace(/\{monto\}/g, fmtMoney(client.productCost * (1 - client.downPaymentPct / 100)));
      await onSendWhatsApp(client.phone, msg);
    } finally {
      setWaSending(false);
    }
  };

  const totalLateFees = lateFees.reduce((a, f) => a + f.amount, 0);
  const totalPartial = partialPayments.reduce((a, p) => a + p.amount, 0);

  return (
    <Modal open={!!client} onClose={onClose} title={client.fullName} size="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={client.status} />
          <RiskBadge score={client.riskScore} />
          <span className="text-xs text-slate-500">Cédula: {client.cedula}</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">Registrado {fmtDate(client.createdAt)}</span>
          {onEdit && (
            <button onClick={onEdit} className="btn-ghost ml-auto px-2.5 py-1.5 text-xs">
              <Pencil size={13} /> Editar cliente
            </button>
          )}
          {totalLateFees > 0 && (
            <span className="chip bg-danger/15 text-danger-400">
              <AlertCircle size={11} /> Mora: {fmtMoney(totalLateFees)}
            </span>
          )}
        </div>

        {/* Cobro rápido: la cuota más próxima sin pagar, con su botón. Es lo
            primero que necesita un cobrador al abrir a un cliente en la calle. */}
        {proximaCuota && onCobrar && (
          <div className={`rounded-xl border p-3 ${
            isOverdue(proximaCuota)
              ? 'border-danger/30 bg-danger/5'
              : 'border-success-500/25 bg-success/5'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {isOverdue(proximaCuota) ? 'Cuota vencida' : 'Próxima cuota'}
                </p>
                <p className="num text-xl text-metal-100">{fmtMoney(proximaCuota.amount)}</p>
                <p className="text-[11px] text-slate-500">
                  {proximaCuota.isDownPayment
                    ? 'Inicial'
                    : `Cuota ${proximaCuota.installmentNumber} de ${proximaCuota.totalInstallments}`}
                  {' · vence '}{fmtDate(proximaCuota.dueDate)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCobrar(proximaCuota.id)}
                  disabled={cobrando}
                  className="btn-primary disabled:opacity-50"
                >
                  {cobrando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Registrar pago
                </button>
                <button onClick={() => setPartialOpen(proximaCuota.id)} className="btn-ghost">
                  Abono parcial
                </button>
              </div>
            </div>
          </div>
        )}

        {canGenerate && (
          <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-accent-300" />
              <div>
                <p className="text-sm font-medium text-metal-100">Generar cronograma de cuotas</p>
                <p className="text-xs text-slate-500">Crea automáticamente las facturas según el plan de amortización</p>
              </div>
            </div>
            <button
              onClick={() => onGenerateSchedule(client.id)}
              disabled={generating === client.id}
              className="btn-primary text-xs"
            >
              {generating === client.id ? <><Loader2 size={13} className="animate-spin" /> Generando...</> : <><CalendarClock size={13} /> Generar</>}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1 rounded-xl bg-ink-900/50 p-1">
          {([
            { id: 'info', label: 'Información' },
            { id: 'amort', label: 'Amortización' },
            { id: 'bitacora', label: 'Bitácora' },
            { id: 'docs', label: 'Documentos' },
            { id: 'payments', label: 'Pagos' },
            { id: 'reneg', label: 'Renegociación' },
            { id: 'late', label: 'Mora' },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${tab === t.id ? 'bg-accent-500/20 text-accent-200' : 'text-slate-400 hover:text-metal-100'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'info' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<Phone size={13} />} label="Teléfono" value={client.phone} />
              <InfoRow icon={<Mail size={13} />} label="Email" value={client.email} />
              <InfoRow icon={<MapPin size={13} />} label="Municipio" value={MUNI_LABELS[client.municipality]} />
              <InfoRow icon={<MapPin size={13} />} label="Dirección" value={client.address} />
              {client.items && client.items.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="kicker mb-1.5">Artículos financiados</p>
                  <div className="space-y-1">
                    {client.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between rounded-lg bg-ink-900/40 px-2.5 py-1.5 text-xs">
                        <span className="truncate text-metal-100">
                          {it.quantity > 1 && <span className="text-slate-500">{it.quantity}× </span>}
                          {it.name}
                        </span>
                        <span className="num shrink-0 text-slate-300">{fmtMoney(it.quantity * it.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <InfoRow label="Producto" value={client.product} />
              )}
              <InfoRow label="Costo" value={fmtMoney(client.productCost)} />
              <InfoRow label="Inicial" value={`${client.downPaymentPct}% (${fmtMoney(client.productCost * client.downPaymentPct / 100)})`} />
              <InfoRow label="Tasa anual" value={`${client.interestRate}%`} />
              <InfoRow label="Frecuencia" value={client.frequency} />
              <InfoRow label="Plazo" value={`${client.termMonths} meses`} />
              <InfoRow label="Ingreso mensual" value={fmtMoney(client.monthlyIncome)} />
              <InfoRow label="Tiempo en empresa" value={TENURE_OPTIONS.find((t) => t.value === client.employmentTenure)?.label ?? '—'} />
              <InfoRow label="Cédula física" value={client.hasPhysicalId ? 'Sí' : 'No'} />
              <InfoRow label="Score de riesgo" value={`${client.riskScore}/100`} />
              <InfoRow label="Agente" value={client.assignedAgent} />
              {client.latitude && client.longitude && (
                <InfoRow icon={<Navigation size={13} />} label="Ubicación" value={`${client.latitude.toFixed(4)}, ${client.longitude.toFixed(4)}`} />
              )}
            </div>

            {/* WhatsApp quick send */}
            <div className="rounded-xl border border-success-500/20 bg-success/5 p-3 space-y-2">
              <p className="text-sm font-medium text-metal-100 flex items-center gap-2">
                <MessageSquare size={14} className="text-success-500" /> WhatsApp
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  className="input w-auto flex-1"
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                >
                  <option value="">Mensaje personalizado...</option>
                  {templates.filter((t) => t.channel === 'whatsapp').map((t) => (
                    <option key={t.id} value={t.body}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => sendWhatsAppMsg(waTemplate || `Hola ${client.fullName.split(' ')[0]}, te contactamos de XiX Tech.`)}
                  disabled={waSending || !client.phone}
                  className="btn-primary text-xs"
                >
                  {waSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Cambiar estado</label>
              <select className="input" value={client.status} onChange={(e) => onUpdate({ status: e.target.value as ClientStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        )}

        {tab === 'amort' && (
          <AmortizationCalculator cost={client.productCost} downPct={client.downPaymentPct} rate={client.interestRate} termMonths={client.termMonths} frequency={client.frequency} />
        )}

        {tab === 'bitacora' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
                  <option value="whatsapp">WhatsApp</option><option value="llamada">Llamada</option><option value="visita">Visita</option><option value="email">Email</option>
                </select>
                <select className="input w-auto" value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
                  <option value="contactado">Contactado</option><option value="no_responde">No responde</option><option value="compromiso">Compromiso</option><option value="rechazo">Rechazo</option><option value="recordatorio">Recordatorio</option>
                </select>
              </div>
              <textarea className="input min-h-[72px]" placeholder="Escribe tu nota de contacto..." value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end"><button onClick={submitNote} className="btn-primary"><Send size={14} /> Agregar nota</button></div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {client.bitacora.length === 0 ? (
                <EmptyState icon={<StickyNote size={20} />} title="Sin notas en la bitácora" />
              ) : (
                client.bitacora.map((b) => (
                  <div key={b.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-accent-300">{b.channel} · {b.outcome}</span>
                      <span className="text-[11px] text-slate-500">{fmtDate(b.date)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-200">{b.note}</p>
                    <p className="mt-1 text-[11px] text-slate-500">— {b.author}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'docs' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
              <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-outline w-full"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploading ? 'Subiendo...' : 'Subir documento'}
              </button>
            </div>
            {documents.length === 0 ? (
              <EmptyState icon={<FileText size={20} />} title="Sin documentos" body="Sube cédula, comprobante de ingresos, referencias, etc." />
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-accent-300" />
                      <div>
                        <p className="text-sm text-metal-100">{d.name}</p>
                        <p className="text-[11px] text-slate-500">{d.type} · {(d.sizeBytes / 1024).toFixed(0)} KB · {fmtDate(d.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a
                        href={getDocUrl(d.storagePath)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost px-2.5 py-1.5 text-xs"
                      >
                        Ver
                      </a>
                      <button onClick={() => onDeleteDoc(d.id)} className="btn-ghost px-2.5 py-1.5 text-xs text-danger-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-300">
                <DollarSign size={14} className="inline text-accent-300" /> Total pagado en parcialidades: <span className="num text-metal-100">{fmtMoney(totalPartial)}</span>
              </p>
              {invoices.length > 0 && (
                <button onClick={() => printStatement(client, invoices)} className="btn-ghost text-xs">
                  <Printer size={12} /> Estado de cuenta
                </button>
              )}
            </div>
            {invoices.length === 0 ? (
              <EmptyState icon={<DollarSign size={20} />} title="Sin facturas" body="Genera el cronograma de cuotas primero." />
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const invPartials = partialPayments.filter((p) => p.invoiceId === inv.id);
                  const paid = invPartials.reduce((a, p) => a + p.amount, 0);
                  const remaining = inv.amount - paid;
                  return (
                    <div key={inv.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm text-metal-100">{inv.isDownPayment ? 'Inicial' : `Cuota ${inv.installmentNumber}/${inv.totalInstallments}`}</p>
                          <p className="text-[11px] text-slate-500">Vence {fmtDateShort(inv.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="num text-sm text-metal-100">{fmtMoney(inv.amount)}</p>
                            {paid > 0 && <p className="text-[11px] text-success-500">Pagado: {fmtMoney(paid)}</p>}
                          </div>
                          <button
                            onClick={() => printInvoice({ ...inv, clientName: client.fullName }, client)}
                            className="btn-ghost px-2 py-1.5 text-xs shrink-0"
                            title="Imprimir factura"
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                      </div>
                      {paid > 0 && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                          <div className="h-full rounded-full bg-success-500" style={{ width: `${Math.min((paid / inv.amount) * 100, 100)}%` }} />
                        </div>
                      )}
                      {invPartials.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {invPartials.map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>{fmtDateShort(p.paymentDate)} {p.note && `· ${p.note}`}</span>
                              <span className="num text-success-500">{fmtMoney(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {remaining > 0 && inv.status !== 'pagada' && (
                        <button
                          onClick={() => setPartialOpen(inv.id)}
                          className="btn-ghost mt-2 px-2.5 py-1.5 text-xs"
                        >
                          <Plus size={12} /> Registrar pago parcial
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {partialOpen && (
              <PartialPaymentModal
                invoiceId={partialOpen}
                invoiceAmount={invoices.find((i) => i.id === partialOpen)?.amount ?? 0}
                alreadyPaid={partialPayments.filter((p) => p.invoiceId === partialOpen).reduce((a, p) => a + p.amount, 0)}
                onClose={() => setPartialOpen(null)}
                onSave={async (amount, date, note) => {
                  await onAddPartialPayment(partialOpen, amount, date, note);
                  setPartialOpen(null);
                }}
              />
            )}
          </div>
        )}

        {tab === 'reneg' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-metal-100">Renegociar deuda</p>
                  <p className="text-xs text-slate-500">Reestructura el plan del cliente conservando el historial</p>
                </div>
                <button onClick={() => setRenegOpen(true)} className="btn-primary text-xs">
                  <Handshake size={13} /> Nueva renegociación
                </button>
              </div>
            </div>
            {renegotiations.length === 0 ? (
              <EmptyState icon={<Handshake size={20} />} title="Sin renegociaciones" body="Reestructura plazos o tasas cuando un cliente entra en mora." />
            ) : (
              <div className="space-y-2">
                {renegotiations.map((r) => (
                  <div key={r.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-accent-300">{fmtDate(r.createdAt)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                      <p>Plazo: {r.oldTermMonths} → <span className="text-metal-100">{r.newTermMonths} meses</span></p>
                      <p>Tasa: {r.oldInterestRate}% → <span className="text-metal-100">{r.newInterestRate}%</span></p>
                      <p>Frec: {r.oldFrequency} → <span className="text-metal-100">{r.newFrequency}</span></p>
                      <p>Saldo: <span className="num text-metal-100">{fmtMoney(r.outstandingBalance)}</span></p>
                    </div>
                    {r.reason && <p className="mt-2 text-xs text-slate-500 italic">"{r.reason}"</p>}
                  </div>
                ))}
              </div>
            )}
            {renegOpen && client && (
              <RenegotiationModal
                client={client}
                onClose={() => setRenegOpen(false)}
                onSave={async (term, rate, freq, reason) => {
                  await onAddRenegotiation(client.id, term, rate, freq, reason);
                  setRenegOpen(false);
                }}
              />
            )}
          </div>
        )}

        {tab === 'late' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
              <p className="text-sm text-slate-300">
                <AlertCircle size={14} className="inline text-danger-400" /> Cargo automático: <span className="num text-metal-100">$4/semana</span> tras 3 días de gracia
              </p>
              <p className="mt-1 text-xs text-slate-500">Total acumulado en mora: <span className="num text-danger-400">{fmtMoney(totalLateFees)}</span></p>
            </div>
            {lateFees.length === 0 ? (
              <EmptyState icon={<AlertCircle size={20} />} title="Sin cargos por mora" body="Los cargos se aplican automáticamente a facturas vencidas." />
            ) : (
              <div className="space-y-2">
                {lateFees.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-danger/10 bg-danger/5 p-3">
                    <div>
                      <p className="text-sm text-metal-100">Semana {f.weekNumber}</p>
                      <p className="text-[11px] text-slate-500">Aplicado {fmtDate(f.appliedAt)}</p>
                    </div>
                    <span className="num text-danger-400">+{fmtMoney(f.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function getDocUrl(path: string) {
  const { data } = supabase.storage.from('client-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Partial payment modal ----------

function PartialPaymentModal({
  invoiceId, invoiceAmount, alreadyPaid, onClose, onSave,
}: {
  invoiceId: string;
  invoiceAmount: number;
  alreadyPaid: number;
  onClose: () => void;
  onSave: (amount: number, paymentDate: string, note: string) => Promise<void>;
}) {
  const remaining = invoiceAmount - alreadyPaid;
  const [payments, setPayments] = useState<{ amount: string; date: string; note: string }[]>([
    { amount: '', date: new Date().toISOString().slice(0, 10), note: '' },
  ]);

  const totalEntered = payments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
  const exceeds = totalEntered > remaining;
  const meetsTotal = Math.abs(totalEntered - remaining) < 0.01;

  const update = (i: number, field: 'amount' | 'date' | 'note', val: string) => {
    setPayments((ps) => ps.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));
  };

  const addRow = () => setPayments((ps) => [...ps, { amount: '', date: new Date().toISOString().slice(0, 10), note: '' }]);
  const removeRow = (i: number) => setPayments((ps) => ps.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (exceeds || !meetsTotal) return;
    for (const p of payments) {
      const amt = parseFloat(p.amount);
      if (amt > 0) {
        await onSave(amt, new Date(p.date).toISOString(), p.note);
      }
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="Registrar pagos parciales" size="md">
      <div className="space-y-3">
        <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Monto de la factura:</span><span className="num text-metal-100">{fmtMoney(invoiceAmount)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Ya pagado:</span><span className="num text-success-500">{fmtMoney(alreadyPaid)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Restante:</span><span className="num text-warning-400">{fmtMoney(remaining)}</span></div>
        </div>

        {payments.map((p, i) => (
          <div key={i} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Pago #{i + 1}</span>
              {payments.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-danger-400 hover:text-danger-300">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="label">Monto ($)</label>
                {/* `amount` se guarda como texto para poder quedar vacío; NumberInput
                    trabaja con números, así que se convierte en ambos sentidos. */}
                <NumberInput
                  value={p.amount === '' ? 0 : Number(p.amount)}
                  onChange={(v) => update(i, 'amount', v === 0 ? '' : String(v))}
                  min={0}
                />
              </div>
              <div>
                <label className="label">Fecha de pago</label>
                <DatePicker value={p.date} onChange={(iso) => update(i, 'date', iso)} />
              </div>
            </div>
            <div>
              <label className="label">Nota (opcional)</label>
              <input className="input" value={p.note} onChange={(e) => update(i, 'note', e.target.value)} />
            </div>
          </div>
        ))}

        <button onClick={addRow} className="btn-outline w-full text-xs">
          <Plus size={13} /> Agregar otra fecha de pago
        </button>

        <div className={`rounded-xl border p-3 text-sm ${exceeds ? 'border-danger/30 bg-danger/5 text-danger-400' : meetsTotal ? 'border-success-500/30 bg-success/5 text-success-500' : 'border-warning/30 bg-warning/5 text-warning-400'}`}>
          <div className="flex justify-between">
            <span>Total ingresado:</span>
            <span className="num">{fmtMoney(totalEntered)}</span>
          </div>
          <div className="flex justify-between">
            <span>Restante:</span>
            <span className="num">{fmtMoney(remaining - totalEntered)}</span>
          </div>
          {exceeds && <p className="mt-1 text-xs">El total excede el monto restante. Ajusta los montos.</p>}
          {!exceeds && !meetsTotal && <p className="mt-1 text-xs">Debes cumplir el monto total restante ({fmtMoney(remaining)}). Faltan {fmtMoney(remaining - totalEntered)}.</p>}
          {meetsTotal && <p className="mt-1 text-xs">El monto total se ha cumplido correctamente.</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={submit} disabled={exceeds || !meetsTotal} className="btn-primary">
            <DollarSign size={15} /> Registrar pagos
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Renegotiation modal ----------

function RenegotiationModal({
  client, onClose, onSave,
}: {
  client: Client;
  onClose: () => void;
  onSave: (term: number, rate: number, freq: PaymentFrequency, reason: string) => Promise<void>;
}) {
  const [newTerm, setNewTerm] = useState(client.termMonths);
  const [newRate, setNewRate] = useState(client.interestRate);
  const [newFreq, setNewFreq] = useState<PaymentFrequency>(client.frequency);
  const [reason, setReason] = useState('');

  const outstanding = client.productCost * (1 - client.downPaymentPct / 100);

  return (
    <Modal open={true} onClose={onClose} title="Renegociar deuda" size="md">
      <div className="space-y-3">
        <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Cliente:</span><span className="text-metal-100">{client.fullName}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Saldo pendiente:</span><span className="num text-metal-100">{fmtMoney(outstanding)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Plan actual:</span><span className="text-metal-100">{client.termMonths} meses · {client.interestRate}% · {client.frequency}</span></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className="label">Nuevo plazo (meses)</label><NumberInput value={newTerm} onChange={setNewTerm} min={1} /></div>
          <div><label className="label">Nueva tasa (%)</label><NumberInput value={newRate} onChange={setNewRate} min={0} step={0.5} /></div>
          <div><label className="label">Frecuencia</label><select className="input" value={newFreq} onChange={(e) => setNewFreq(e.target.value as PaymentFrequency)}><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></div>
        </div>
        <div><label className="label">Motivo de la renegociación</label><textarea className="input min-h-[72px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Cliente perdió empleo, acuerdo de pago ampliado..." /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={() => onSave(newTerm, newRate, newFreq, reason)} disabled={!reason.trim()} className="btn-primary">
            <Handshake size={15} /> Aplicar renegociación
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Templates modal ----------

function TemplatesModal({
  open, onClose, templates,
}: {
  open: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  onSave: (t: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const { addTemplate, updateTemplate, deleteTemplate } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'whatsapp' as MessageTemplate['channel'], clientStatus: '', subject: '', body: '' });

  const submit = async () => {
    if (!form.name || !form.body) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateTemplate(editing.id, form);
        toast.success('Plantilla actualizada');
      } else {
        await addTemplate(form);
        toast.success('Plantilla creada');
      }
      setForm({ name: '', channel: 'whatsapp', clientStatus: '', subject: '', body: '' });
      setEditing(null);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast.success('Plantilla eliminada');
    } catch (err) {
      toast.error(friendlyError(err));
    }
  };

  const startEdit = (t: MessageTemplate) => {
    setEditing(t);
    setForm({ name: t.name, channel: t.channel, clientStatus: t.clientStatus, subject: t.subject, body: t.body });
  };

  return (
    <Modal open={open} onClose={onClose} title="Plantillas de mensajes" size="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 space-y-2">
          <p className="text-xs text-slate-500">Variables disponibles: {'{nombre}'}, {'{producto}'}, {'{monto}'}, {'{fecha}'}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input className="input" placeholder="Nombre de plantilla" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <select className="input" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as MessageTemplate['channel'] }))}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="llamada">Llamada</option>
              <option value="visita">Visita</option>
            </select>
          </div>
          <select className="input" value={form.clientStatus} onChange={(e) => setForm((f) => ({ ...f, clientStatus: e.target.value }))}>
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <textarea className="input min-h-[80px]" placeholder="Cuerpo del mensaje..." value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <div className="flex justify-end gap-2">
            {editing && <button onClick={() => { setEditing(null); setForm({ name: '', channel: 'whatsapp', clientStatus: '', subject: '', body: '' }); }} className="btn-ghost text-xs">Cancelar edición</button>}
            <button onClick={submit} disabled={submitting} className="btn-primary text-xs">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : editing ? 'Guardar cambios' : 'Crear plantilla'}
            </button>
          </div>
        </div>

        {templates.length === 0 ? (
          <EmptyState icon={<MessageSquare size={20} />} title="Sin plantillas" body="Crea mensajes predefinidos para WhatsApp y email." />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templates.map((t) => (
              <div key={t.id} className="rounded-xl border border-tint/5 bg-ink-900/40 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-metal-100">{t.name}</p>
                    <p className="text-[11px] text-slate-500">{t.channel} · {t.clientStatus || 'todos'}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{t.body}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button onClick={() => startEdit(t)} className="btn-ghost px-2 py-1 text-xs">Editar</button>
                    <button onClick={() => remove(t.id)} className="btn-ghost px-2 py-1 text-xs text-danger-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-tint/5 bg-ink-900/40 px-3 py-2.5">
      <p className="kicker flex items-center gap-1">{icon} {label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function StandaloneCalculator() {
  const [cost, setCost] = useState(1500);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(18);
  const [term, setTerm] = useState(12);
  const [extraWeeks, setExtraWeeks] = useState(0);
  const [freq, setFreq] = useState<PaymentFrequency>('quincenal');
  const [equalInstallments, setEqualInstallments] = useState(false);
  const [numInstallments, setNumInstallments] = useState(12);
  const effectiveTerm = term + extraWeeks / 4.345;
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className="label">Costo del producto ($)</label><NumberInput value={cost} onChange={setCost} /></div>
        <div><label className="label">Inicial (%)</label><NumberInput value={downPct} onChange={setDownPct} /></div>
        <div><label className="label">Tasa anual (%)</label><NumberInput value={rate} onChange={setRate} /></div>
        <div><label className="label">Plazo (meses)</label><NumberInput value={term} onChange={setTerm} /></div>
        {freq === 'semanal' && (
          <div><label className="label">Semanas adicionales</label><NumberInput value={extraWeeks} min={0} max={3} onChange={(v) => setExtraWeeks(Math.min(3, Math.max(0, v)))} /></div>
        )}
        <div><label className="label">Frecuencia</label><select className="input" value={freq} onChange={(e) => setFreq(e.target.value as PaymentFrequency)}><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></div>
      </div>
      <div className="rounded-xl border border-tint/5 bg-ink-900/40 p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={equalInstallments} onChange={(e) => setEqualInstallments(e.target.checked)} className="h-4 w-4 rounded border-tint/20 bg-ink-900 text-accent-500 focus:ring-accent-500/40" />
          <span className="text-sm text-metal-100">Cuotas exactamente iguales</span>
        </label>
        {equalInstallments && (
          <div><label className="label">Número de cuotas</label><NumberInput value={numInstallments} min={1} onChange={(v) => setNumInstallments(Math.max(1, v))} /></div>
        )}
      </div>
      <AmortizationCalculator cost={cost} downPct={downPct} rate={rate} termMonths={effectiveTerm} frequency={freq} equalInstallments={equalInstallments} numInstallments={numInstallments} />
    </div>
  );
}
