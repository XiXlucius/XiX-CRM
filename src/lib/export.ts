import type { Client, Invoice, TeamMember, Product } from '../types';

export function toCSV(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const head = headers.map((h) => `"${h.label}"`).join(',');
  const body = rows
    .map((r) =>
      headers
        .map((h) => {
          const v = r[h.key];
          if (v === null || v === undefined) return '""';
          const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n');
  return `${head}\n${body}`;
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Formatters for reports ----------

export function clientsToCSV(clients: Client[]): string {
  return toCSV(
    clients.map((c) => ({
      nombre: c.fullName,
      cedula: c.cedula,
      telefono: c.phone,
      email: c.email,
      municipio: c.municipality,
      producto: c.product,
      costo: c.productCost,
      inicial_pct: c.downPaymentPct,
      tasa: c.interestRate,
      frecuencia: c.frequency,
      plazo: c.termMonths,
      estado: c.status,
      score: c.riskScore,
      agente: c.assignedAgent,
      creado: c.createdAt,
    })),
    [
      { key: 'nombre', label: 'Nombre' },
      { key: 'cedula', label: 'Cédula' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'email', label: 'Email' },
      { key: 'municipio', label: 'Municipio' },
      { key: 'producto', label: 'Producto' },
      { key: 'costo', label: 'Costo' },
      { key: 'inicial_pct', label: 'Inicial %' },
      { key: 'tasa', label: 'Tasa %' },
      { key: 'frecuencia', label: 'Frecuencia' },
      { key: 'plazo', label: 'Plazo (m)' },
      { key: 'estado', label: 'Estado' },
      { key: 'score', label: 'Score' },
      { key: 'agente', label: 'Agente' },
      { key: 'creado', label: 'Creado' },
    ],
  );
}

export function invoicesToCSV(invoices: Invoice[]): string {
  return toCSV(
    invoices.map((i) => ({
      cliente: i.clientName,
      monto: i.amount,
      vencimiento: i.dueDate,
      pago: i.paidDate ?? '',
      estado: i.status,
      tipo: i.isDownPayment ? 'Inicial' : `Cuota ${i.installmentNumber}/${i.totalInstallments}`,
    })),
    [
      { key: 'cliente', label: 'Cliente' },
      { key: 'monto', label: 'Monto' },
      { key: 'vencimiento', label: 'Vencimiento' },
      { key: 'pago', label: 'Fecha Pago' },
      { key: 'estado', label: 'Estado' },
      { key: 'tipo', label: 'Tipo' },
    ],
  );
}

export function teamToCSV(team: TeamMember[]): string {
  return toCSV(
    team.map((m) => ({
      nombre: m.name,
      rol: m.role,
      email: m.email,
      activo: m.active ? 'Sí' : 'No',
      meta: m.goalMonthly,
      logrado: m.achievedMonthly,
      comision_pct: m.commissionRatePct,
      cartera: m.activePortfolio,
      mora_pct: m.delinquencyPct,
    })),
    [
      { key: 'nombre', label: 'Nombre' },
      { key: 'rol', label: 'Rol' },
      { key: 'email', label: 'Email' },
      { key: 'activo', label: 'Activo' },
      { key: 'meta', label: 'Meta Mensual' },
      { key: 'logrado', label: 'Logrado' },
      { key: 'comision_pct', label: 'Comisión %' },
      { key: 'cartera', label: 'Cartera' },
      { key: 'mora_pct', label: 'Mora %' },
    ],
  );
}

export function productsToCSV(products: Product[]): string {
  return toCSV(
    products.map((p) => ({
      sku: p.sku,
      nombre: p.name,
      categoria: p.category,
      precio_base: p.basePrice,
      iva_pct: p.taxPct,
      descuento_pct: p.discountPct,
      stock: p.stock,
      vendido: p.sold,
      rotacion_pct: p.sold + p.stock > 0 ? ((p.sold / (p.sold + p.stock)) * 100).toFixed(1) : '0',
    })),
    [
      { key: 'sku', label: 'SKU' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'precio_base', label: 'Precio Base' },
      { key: 'iva_pct', label: 'IVA %' },
      { key: 'descuento_pct', label: 'Descuento %' },
      { key: 'stock', label: 'Stock' },
      { key: 'vendido', label: 'Vendido' },
      { key: 'rotacion_pct', label: 'Rotación %' },
    ],
  );
}

// ---------- Printable invoice / statement (HTML -> print) ----------

type PrintableInvoice = Omit<
  Pick<Invoice, 'id' | 'clientName' | 'amount' | 'dueDate' | 'paidDate' | 'status' | 'isDownPayment' | 'installmentNumber' | 'totalInstallments'>,
  'status'
> & { status: string };

export function printInvoice(invoice: PrintableInvoice, client: Client | undefined) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  const finalPrice = client
    ? client.productCost * (1 + 0.16) * (1 - 0)
    : invoice.amount;
  w.document.write(`<!doctype html><html><head><title>Factura ${invoice.id.slice(0, 8)}</title>
  <style>
    body{font-family:Inter,sans-serif;color:#0f172a;padding:40px;max-width:700px;margin:auto}
    .h{display:flex;justify-content:space-between;border-bottom:2px solid #6366f1;padding-bottom:16px}
    .h h1{margin:0;font-size:22px}
    .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    td,th{padding:10px 8px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:14px}
    th{font-size:11px;text-transform:uppercase;color:#64748b}
    .tot{font-weight:600;font-size:18px;margin-top:16px;text-align:right}
    .foot{margin-top:40px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px}
  </style></head><body>
  <div class="h">
    <div><h1>XiX Tech</h1><p style="margin:4px 0 0;color:#64748b;font-size:12px">CRM de Ventas a Crédito</p></div>
    <div style="text-align:right">
      <p style="margin:0;font-weight:600">Factura #${invoice.id.slice(0, 8).toUpperCase()}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:12px">${new Date(invoice.dueDate).toLocaleDateString('es-VE')}</p>
      <span class="badge" style="background:${invoice.status === 'pagada' ? '#dcfce7' : invoice.status === 'vencida' ? '#fee2e2' : '#fef9c3'};color:${invoice.status === 'pagada' ? '#166534' : invoice.status === 'vencida' ? '#991b1b' : '#854d0e'}">${invoice.status.toUpperCase()}</span>
    </div>
  </div>
  <div style="margin-top:20px">
    <p style="margin:0;font-size:11px;text-transform:uppercase;color:#64748b">Cliente</p>
    <p style="margin:4px 0 0;font-weight:600;font-size:16px">${invoice.clientName}</p>
    ${client ? `<p style="margin:2px 0 0;color:#64748b;font-size:13px">${client.cedula} · ${client.phone}</p><p style="margin:2px 0 0;color:#64748b;font-size:13px">${client.address}</p>` : ''}
  </div>
  <table>
    <tr><th>Descripción</th><th style="text-align:right">Monto</th></tr>
    <tr><td>${invoice.isDownPayment ? 'Pago de Inicial' : 'Cuota ' + invoice.installmentNumber + ' de ' + invoice.totalInstallments}${client ? ' — ' + client.product : ''}</td><td style="text-align:right">$${invoice.amount.toFixed(2)}</td></tr>
  </table>
  <p class="tot">Total: $${invoice.amount.toFixed(2)}</p>
  ${invoice.paidDate ? `<p style="text-align:right;font-size:12px;color:#166534">Pagada el ${new Date(invoice.paidDate).toLocaleDateString('es-VE')}</p>` : ''}
  <div class="foot">XiX Tech · Documento generado el ${new Date().toLocaleString('es-VE')} · No constituye factura fiscal</div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`);
  w.document.close();
}

type StatementInvoice = Omit<
  Pick<Invoice, 'id' | 'amount' | 'dueDate' | 'status' | 'isDownPayment' | 'installmentNumber'>,
  'status'
> & { status: string; clientId?: string };

// `invoices` puede venir ya filtrado a un solo cliente (p. ej. desde la ficha del
// cliente) — si trae `clientId`, se filtra por seguridad; si no, se usa tal cual.
export function printStatement(client: Client, invoices: StatementInvoice[]) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  const clientInvoices = invoices.filter((i) => i.clientId === undefined || i.clientId === client.id);
  const total = clientInvoices.reduce((a, i) => a + i.amount, 0);
  const paid = clientInvoices.filter((i) => i.status === 'pagada').reduce((a, i) => a + i.amount, 0);
  const pending = total - paid;
  w.document.write(`<!doctype html><html><head><title>Estado de Cuenta ${client.fullName}</title>
  <style>
    body{font-family:Inter,sans-serif;color:#0f172a;padding:40px;max-width:700px;margin:auto}
    .h{display:flex;justify-content:space-between;border-bottom:2px solid #6366f1;padding-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    td,th{padding:10px 8px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:13px}
    th{font-size:11px;text-transform:uppercase;color:#64748b}
    .tot{font-weight:600;font-size:16px;margin-top:16px}
    .sum{display:flex;gap:24px;margin-top:20px}
    .sum div{flex:1;padding:12px;border-radius:8px;background:#f1f5f9}
  </style></head><body>
  <div class="h">
    <div><h1 style="margin:0">Estado de Cuenta</h1><p style="margin:4px 0 0;color:#64748b;font-size:12px">XiX Tech</p></div>
    <div style="text-align:right"><p style="margin:0;font-weight:600">${client.fullName}</p><p style="margin:4px 0 0;color:#64748b;font-size:12px">${client.cedula}</p></div>
  </div>
  <p style="margin-top:16px;color:#64748b;font-size:13px">Producto: ${client.product} · ${client.frequency} · ${client.termMonths} meses · Score: ${client.riskScore}</p>
  <div class="sum">
    <div><p style="margin:0;font-size:11px;text-transform:uppercase;color:#64748b">Total</p><p style="margin:4px 0 0;font-weight:600">$${total.toFixed(2)}</p></div>
    <div><p style="margin:0;font-size:11px;text-transform:uppercase;color:#64748b">Pagado</p><p style="margin:4px 0 0;font-weight:600;color:#166534">$${paid.toFixed(2)}</p></div>
    <div><p style="margin:0;font-size:11px;text-transform:uppercase;color:#64748b">Pendiente</p><p style="margin:4px 0 0;font-weight:600;color:#854d0e">$${pending.toFixed(2)}</p></div>
  </div>
  <table>
    <tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th style="text-align:right">Monto</th></tr>
    ${clientInvoices.map((i) => `<tr><td>${new Date(i.dueDate).toLocaleDateString('es-VE')}</td><td>${i.isDownPayment ? 'Inicial' : 'Cuota ' + i.installmentNumber}</td><td>${i.status}</td><td style="text-align:right">$${i.amount.toFixed(2)}</td></tr>`).join('')}
  </table>
  <div class="foot" style="margin-top:24px;font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:12px">Generado el ${new Date().toLocaleString('es-VE')}</div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`);
  w.document.close();
}
