# Handoff — Generación de contrato en PDF

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Financiamiento de productos a cuotas. Hoy el contrato de cada venta se arma a mano.

**Diagnóstico verificado en el código:**

1. **No hay ninguna librería de generación de PDF instalada.** Cero coincidencias de `pdf`,
   `jspdf`, `docx` o `print` en `package.json`. Hay que agregar una desde cero.
2. `src/lib/export.ts` ya tiene el patrón de descarga de archivos del proyecto: `downloadCSV` y
   `downloadText`, ambos vía `Blob` + `<a download>`, sin backend de por medio. El generador de
   contrato debe seguir ese mismo patrón — client-side, sin Edge Function — para no introducir
   una forma nueva de exportar cuando ya existe una.
3. **La tabla de amortización tiene dos algoritmos distintos**, ambos en `src/store.tsx`:
   `computeAmortization` (línea 1140, sistema francés: cuota fija, interés decreciente) y
   `computeEqualInstallments` (línea ~1172, interés distribuido parejo). Ambos ya están
   exportados. **El contrato debe usar el mismo que usa `generateSchedule`** (línea 650, que
   llama a `computeAmortization`) para que la tabla del PDF coincida exactamente con la tabla de
   cuotas real del cliente en el sistema — no recalcules con el otro algoritmo por error.
4. Todos los datos del contrato ya existen en `Client` (`src/types.ts:47-71`): nombre, cédula,
   teléfono, dirección, producto, costo, inicial, tasa, plazo, frecuencia, fecha de creación.
5. `Product` (`src/types.ts`, sección Inventario) tiene `basePrice`, `taxPct`, `discountPct` —
   útiles si el contrato debe desglosar impuestos.
6. `client_documents` y el bucket `client-documents` ya existen para adjuntar archivos al
   cliente (`src/store.tsx:928-945`, patrón de `uploadDocument`). El contrato generado se
   guarda ahí, no en un lugar nuevo.

---

## Decisión de arquitectura

**Generación 100% en el cliente, sin Edge Function.** Sigue el patrón ya establecido de
`export.ts`. Ventajas concretas para este proyecto: no hay que mandar datos sensibles del
cliente (cédula, dirección) a ningún servidor intermedio, y no depende de que haya una Edge
Function corriendo. El PDF se arma con una librería en el navegador y se descarga directo.

**Librería sugerida: `jsPDF`.** Es la opción liviana y sin dependencias de sistema, compatible
con el flujo `Blob`/descarga que ya usa el proyecto. Si el diseño del contrato termina
necesitando maquetado complejo (columnas, tablas largas con salto de página automático), evalúa
sumar `jspdf-autotable` para la tabla de amortización — no la escribas a mano celda por celda.

Confirma la elección contra lo que ya haya en `node_modules` antes de instalar una segunda
librería que haga lo mismo.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No modifiques `computeAmortization` ni `computeEqualInstallments` — solo consúmelas.
- No inventes campos legales de contrato (cláusulas, jurisdicción, penalidades). Eso lo define
  Lucius, no el agente. Deja el cuerpo legal como una plantilla de texto editable y señalada
  claramente como borrador — ver Fase 2.

---

## Fase 1 — Plantilla y datos del contrato

### 1.1 Nuevo `src/lib/contractTemplate.ts`

Define la estructura de datos que alimenta el PDF, separada del renderizado:

```ts
export interface ContractData {
  client: Client;
  product: Product | null;      // puede ser null si el producto no está en inventario
  schedule: AmortizationRow[];  // salida de computeAmortization
  financedAmount: number;
  downPaymentAmount: number;
  businessName: string;         // desde business_settings o un valor por defecto
  contractNumber: string;
  issueDate: string;
}

export function buildContractData(
  client: Client,
  product: Product | null,
  settings: BusinessSettings,
): ContractData
```

`buildContractData` calcula `financedAmount` con la función ya existente
(`financedAmount(client.productCost, client.downPaymentPct)`, `store.tsx` línea 1180) y genera
`schedule` con `computeAmortization`. No dupliques esa aritmética aquí.

### 1.2 Número de contrato

Necesitas un identificador legible, no el `uuid` del cliente. Dos opciones — elige la más
simple de implementar con lo que ya existe:
- Correlativo simple basado en `created_at` del cliente + un prefijo (`XT-2026-0042`).
- Si se requiere que sea realmente único y secuencial a nivel de negocio, eso implica una
  columna en base de datos con un contador — evalúalo solo si el correlativo derivado no basta.

No implementes un contador en base de datos sin confirmarlo antes: es una migración de esquema,
y este handoff está pensado para no tocar el esquema si se puede evitar.

---

## Fase 2 — Contenido del documento

### 2.1 Estructura del PDF

Encabezado, datos de las partes, condiciones financieras, tabla de amortización completa, y
cierre con espacio para firmas. Concretamente:

1. **Encabezado** — nombre del negocio (de `business_settings` si existe algún campo de nombre;
   si no, un valor configurable en `ConfigTab.tsx`, ver Fase 4), número de contrato, fecha de
   emisión.
2. **Datos del cliente** — nombre completo, cédula, teléfono, dirección, municipio.
3. **Datos del producto** — nombre, costo total, inicial (monto y porcentaje), monto
   financiado, tasa de interés anual, plazo, frecuencia de pago.
4. **Tabla de amortización completa** — todas las cuotas de `schedule`, con número, monto,
   interés, capital y saldo restante. Con `termMonths` largos esto puede ser extenso: maneja el
   salto de página (si usas `jspdf-autotable`, esto viene resuelto; si no, hay que paginar a
   mano — no dejes que el texto se corte a la mitad de una fila).
5. **Cláusulas** — un bloque de texto marcado explícitamente como plantilla editable (ver 2.2).
6. **Firmas** — dos líneas al final, cliente y representante del negocio, con fecha.

### 2.2 Cláusulas legales — plantilla, no texto fijo

No redactes cláusulas legales de mora, penalidades o jurisdicción por tu cuenta. En su lugar:

- Crea un campo de texto largo en `ConfigTab.tsx` (o reutiliza `business_settings` si hay un
  campo de texto libre disponible, si no, agrégalo) donde Lucius pega su propio texto legal.
- Si el campo está vacío, el PDF debe mostrar un párrafo visible que diga literalmente
  "Cláusulas contractuales pendientes de definir — configúrelas en Ajustes", en vez de generar
  un contrato con espacio en blanco que parezca completo y no lo esté.
- Este es el punto de mayor riesgo del documento entero: un contrato mal redactado legalmente es
  peor que no tener contrato. Que quede clarísimo en la UI que ese texto lo define el negocio y
  el sistema no lo valida.

### 2.3 Multi-moneda (si `HANDOFF-MULTIMONEDA.md` ya está aplicado)

Muestra los montos en USD (moneda funcional del sistema) y, si el negocio lo requiere para el
contrato impreso, el equivalente en Bs a la tasa vigente el día de emisión, con la tasa y su
fecha impresas junto al monto — nunca un monto en Bs sin decir a qué tasa corresponde.

---

## Fase 3 — Generación e integración

### 3.1 `src/lib/pdf.ts`

Función principal:

```ts
export function generateContractPDF(data: ContractData): Blob
export function downloadContractPDF(data: ContractData, filename?: string): void
```

`downloadContractPDF` sigue el mismo patrón que `downloadCSV`/`downloadText` en `export.ts`
(URL de objeto + click de ancla + revoke). Nombre de archivo sugerido:
`contrato-<contractNumber>-<cedula>.pdf`.

### 3.2 Botón de generación en `CrmTab.tsx`

En la ficha del cliente, junto a las acciones existentes (cerca de donde está el botón de
WhatsApp, línea ~803), agrega "Generar contrato". Debe:
- Deshabilitarse si al cliente le faltan datos obligatorios (cédula vacía, producto sin costo)
  — con un mensaje de qué falta, no un botón muerto sin explicación.
- Deshabilitarse también si `client.frequency`/`termMonths`/`interestRate` no producen un
  `schedule` válido (por ejemplo plazo 0).

### 3.3 Guardar el contrato generado como documento del cliente

Después de generar el PDF, súbelo automáticamente a `client_documents` reutilizando
`uploadDocument` (`store.tsx:928-945`) con `type: 'contrato'`, además de ofrecer la descarga
inmediata. Así el contrato queda en el historial del cliente sin que el agente tenga que
subirlo a mano una segunda vez — es exactamente el paso manual que se quiere eliminar.

Si `type` en `client_documents` es un campo de texto libre (confírmalo en la migración), usa un
valor consistente (`'contrato'`) para poder filtrarlo después en la UI.

### 3.4 Registro de auditoría

`logAudit('generate_contract', 'client', clientId, null, { contractNumber })` — igual que el
resto de acciones relevantes del store.

---

## Fase 4 — Configuración del negocio

En `ConfigTab.tsx`, agrega los campos que el contrato necesita y que hoy no existen en ningún
lado: nombre legal del negocio, RIF (si aplica), dirección fiscal, y el texto de cláusulas de
la Fase 2.2. Verifica primero si `business_settings` ya tiene alguno de estos campos antes de
agregar columnas nuevas — no dupliques configuración existente.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Generar un contrato con un cliente de datos completos produce un PDF legible, sin texto
   cortado ni tablas desbordadas.
3. La tabla de amortización del PDF coincide número por número con la que muestra
   `AmortizationCalculator.tsx` para el mismo cliente — es la prueba de que se usó el mismo
   algoritmo y no uno duplicado con resultados distintos.
4. Un cliente con plazo largo (24+ cuotas semanales) genera un PDF de varias páginas sin que la
   tabla se corte a la mitad de una fila.
5. Sin cláusulas configuradas, el PDF muestra el aviso de pendiente — no un hueco en blanco.
6. El contrato generado aparece automáticamente en los documentos del cliente en `CrmTab.tsx`.
7. Un cliente con cédula vacía no permite generar el contrato, y el botón explica por qué.
8. Si `HANDOFF-MULTIMONEDA.md` está aplicado, el monto en Bs siempre trae su tasa y fecha al
   lado.

---

## Orden sugerido

Fase 1 → Fase 2.1 y 2.2 (con datos de prueba, generando texto plano antes de maquetar el PDF
real, para validar el contenido con Lucius antes de invertir tiempo en el diseño) → Fase 3 →
Fase 4 → Fase 2.3 si aplica.

---

## Relación con los otros handoffs

- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito: la subida del contrato a `client_documents`
  puede fallar (red, tamaño) y el agente necesita un toast, no un silencio que le haga creer
  que el contrato quedó guardado cuando no.
- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, sigue el punto 2.3 para no imprimir un monto en
  Bs sin su tasa.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, el nombre del negocio y las cláusulas de la
  Fase 4 pasan a ser por organización, no globales — ajusta la consulta a `business_settings`
  en consecuencia.
