# Handoff — Scoring con historial propio de pago

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
`src/lib/scoring.ts` calcula el riesgo crediticio de un cliente para decidir si se le vende a
crédito. Hoy pondera solo datos declarados por el cliente al momento de la solicitud (ingreso,
antigüedad laboral, cédula física, inicial). El mejor predictor disponible — cómo pagó ese mismo
cliente en el pasado — no se usa.

**Diagnóstico verificado en el código — el hallazgo más importante primero:**

1. **La configuración de "peso historial" ya existe en pantalla y no hace nada.**
   `src/components/ConfigTab.tsx:111` tiene un campo editable "Peso historial (%)"
   (`scoring_weight_history`), parte de un set de pesos que se valida que sumen 100
   (línea 298). Pero `assessRisk` recibe ese parámetro como `_settings` — literalmente
   prefijado con guion bajo para marcarlo como no usado (`src/lib/scoring.ts:76`). **Ningún
   peso configurado en Ajustes afecta el cálculo real.** Lucius puede estar años ajustando ese
   slider sin que cambie un solo score. Esto no es parte de lo que pediste arreglar, pero como
   toca exactamente el campo de "historial", corregirlo es parte natural de este trabajo — no
   lo dejes así.

2. **La única señal de historial hoy es `client.status` actual** (`scoring.ts:171-177`):
   `+5` si `'activo'`, `-10` si `'en_mora'`. Es el estado de *esta* solicitud en este momento,
   no un historial de comportamiento: no distingue a alguien que pagó 11 cuotas a tiempo y se
   atrasó una vez, de alguien que se atrasa siempre. No mira `partial_payments` (pagos
   incompletos), `late_fees` (moras aplicadas) ni `renegotiations` (señal de que el cliente no
   pudo sostener los términos originales) — las tres tablas ya existen con datos reales.

3. **Un cliente es una fila; no hay tabla de "préstamos" separada.** Si alguien vuelve a
   comprar después de terminar de pagar (recompra), lo normal sería una fila nueva en `clients`.
   `cedula` **no tiene restricción `UNIQUE`** en la migración — nada impide ni garantiza que
   las cédulas se escriban consistentes entre una fila y otra (`V-12345678` vs `12345678`). Para
   juntar el historial de una misma persona hay que normalizar la cédula al comparar, y aun así
   puede haber casos que no calcen por error de tipeo. Es una limitación de los datos, no del
   código nuevo — documéntala, no intentes resolverla con una migración de identidad en este
   trabajo.

4. **`RiskPreview` (`CrmTab.tsx:294-297`) es una vista previa en vivo dentro del formulario**,
   que llama a `assessRisk` solo con los campos del formulario — no tiene acceso a la lista de
   clientes ni de facturas. Para que el historial entre en esa vista previa, hay que pasarle
   datos adicionales desde el componente padre, que sí los tiene cargados en el store.

---

## Decisión de arquitectura

**El historial se calcula en el cliente (JavaScript), a partir de lo que ya está cargado en el
store — no se crea una vista SQL ni una función nueva.** `state.clients` y `state.invoices` ya
se cargan completos al iniciar sesión (`store.tsx:275-289`). Con el volumen de un negocio de
cobranza puerta a puerta, agregarlos en memoria es instantáneo y evita sumar una pieza más de
infraestructura para un cálculo que no lo necesita.

**El historial es siempre de la propia persona.** Se agrega únicamente sobre las filas de
`clients` e `invoices` que compartan la cédula normalizada del cliente evaluado, y — si
`HANDOFF-MULTIUSUARIO.md` ya está aplicado — dentro de la misma organización. Nunca debe
influir en el score de un cliente el comportamiento de otro.

**No se reescribe todo `assessRisk` a un modelo lineal ponderado por los seis pesos de
`BusinessSettings`.** Sería un cambio de mucho mayor alcance que lo pedido, y arriesga romper
el comportamiento ya calibrado en producción para ingreso, antigüedad e inicial. El arreglo es
puntual: el componente de historial pasa a calcularse de verdad, y su peso relativo dentro del
score final se controla con `scoring_weight_history` — que es exactamente lo que la pantalla de
Ajustes ya promete y hoy no cumple.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No toques las prohibiciones duras** (sin cédula física, antigüedad menor a 3 meses,
  `scoring.ts:84-102`). Son reglas de cumplimiento del negocio, no de cálculo de riesgo.
- No cambies las fórmulas de ingreso, antigüedad, inicial ni la relación cuota/ingreso — solo
  el componente de historial y cómo se combina con el resto.
- Un cliente sin historial previo (primera compra) **debe quedar neutral**, nunca penalizado
  por no tener historial. Historial ausente no es lo mismo que mal historial.

---

## Fase 0 — Tests de caracterización (antes de cambiar nada)

Si `HANDOFF-ROADMAP.md` ya llegó a su Fase 4 (tests de `scoring.ts`), sáltate este paso y usa
esos tests como base. Si no:

Instala Vitest y escribe al menos 10 casos que capturen el comportamiento **actual** de
`assessRisk` con datos de ejemplo conocidos (los mismos umbrales documentados en el comentario
de cabecera del archivo: ingreso > $400 con 6m+ de antigüedad → 80, etc.). Esto es lo que te
permite comprobar, después del cambio, que el ingreso/antigüedad/inicial siguen dando el mismo
resultado que antes y que solo cambió el historial.

---

## Fase 1 — Cálculo del historial propio

### 1.1 Nuevo `src/lib/paymentHistory.ts`

```ts
export interface PaymentHistorySummary {
  hasHistory: boolean;
  totalInvoicesClosed: number;   // pagadas + vencidas, de préstamos de esta misma persona
  paidOnTimeCount: number;
  paidLateCount: number;
  currentlyOverdueCount: number;
  partialPaymentCount: number;
  lateFeeCount: number;
  renegotiationCount: number;
  priorLoansCompleted: number;   // préstamos anteriores (filas distintas de clients) ya cerrados
}

export function normalizeCedula(raw: string): string
  // quita espacios, guiones, prefijos 'V-'/'E-'/'J-', pasa a mayúsculas.
  // Documenta en un comentario que es una normalización best-effort, no infalible.

export function summarizePaymentHistory(
  cedula: string,
  excludeClientId: string | null,   // no contar contra sí mismo al editar un cliente existente
  allClients: Client[],
  allInvoices: Invoice[],
  allPartialPayments: PartialPayment[],
  allLateFees: LateFee[],
  allRenegotiations: Renegotiation[],
): PaymentHistorySummary
```

- Encuentra todas las filas de `clients` con la misma `normalizeCedula`, excluyendo la que se
  está evaluando si ya existe.
- Si no encuentra ninguna, devuelve `hasHistory: false` con todo en cero — caso de cliente
  nuevo, tratado aparte en la Fase 2.
- Sobre las facturas de esas filas: cuenta pagadas a tiempo (`paidDate <= dueDate`) vs pagadas
  tarde (`paidDate > dueDate`) vs actualmente vencidas.
- Cuenta abonos parciales, moras aplicadas y renegociaciones asociadas a esas mismas facturas o
  clientes.

### 1.2 Puntaje del componente de historial

```ts
export function historyScore(summary: PaymentHistorySummary): { score: number; reasons: string[] }
```

Devuelve un valor en el mismo rango 0-100 que ya usa el resto del sistema (no una escala nueva),
para que se pueda mezclar con el peso configurado. Lineamiento sugerido, ajustable:

- Sin historial (`hasHistory: false`): `score = 50` (neutral, ni castiga ni premia) y una razón
  explícita: `'Sin historial de crédito previo'`.
- Con historial: parte de una base y suma/resta según la proporción de cuotas a tiempo vs
  tarde, penaliza cada renegociación (es la señal más fuerte de que no pudo sostener el plan
  original) y cada mora aplicada, y premia una racha larga de cuotas a tiempo.
- Dejar razones legibles (`reasons`) igual que el resto de `scoring.ts` — el negocio necesita
  poder explicarle a alguien por qué se le negó o aprobó, no solo un número.

---

## Fase 2 — Integrar el historial en `assessRisk`

### 2.1 Cambiar la firma

```ts
export function assessRisk(
  client: Partial<Client>,
  settings: BusinessSettings,
  history?: PaymentHistorySummary,   // opcional: si no se pasa, se trata como sin historial
): RiskAssessment
```

Mantenerlo opcional evita romper cualquier otro lugar del código que llame a `assessRisk` sin
pasar historial todavía — se degrada a neutral, no a error.

### 2.2 Reemplazar el bloque 5 actual (`scoring.ts:170-177`)

Hoy:
```ts
if (client.status === 'en_mora') { score -= 10; ... }
else if (client.status === 'activo') { score += 5; ... }
```

Pasa a combinar el score base con el componente de historial, ponderado por
`settings.scoring_weight_history` — este es el punto exacto donde el peso de Ajustes empieza a
importar de verdad:

```ts
const hist = historyScore(history ?? { hasHistory: false, ...ceros });
const historyWeight = settings.scoring_weight_history / 100; // ej. 20 -> 0.20
score = score * (1 - historyWeight) + hist.score * historyWeight;
reasons.push(...hist.reasons);
```

Ajusta la mecánica exacta a lo que dé mejor resultado en los tests de caracterización de la
Fase 0 — lo importante es que el peso configurado deje de ser decorativo y que el resultado
para un cliente sin historial (`historyScore = 50`, neutral) no se aleje mucho del score que
ese mismo cliente ya obtenía antes del cambio, para no invalidar de golpe la calibración
existente.

### 2.3 `client.status === 'en_mora'` actual

No lo borres del todo: sigue siendo una señal válida y más inmediata que el historial agregado
(un cliente puede estar en mora ahora mismo sin que su historial largo lo refleje todavía).
Consérvalo como un modificador adicional pequeño, separado del componente de historial, o
intégralo dentro de `PaymentHistorySummary.currentlyOverdueCount` si prefieres unificarlo — pero
no dejes que el estado actual de mora deje de pesar en el score.

---

## Fase 3 — Conectar los llamadores

### 3.1 `src/store.tsx:468` — dentro de `addClient`

Antes de calcular `assessment`, arma el `history` con `summarizePaymentHistory` usando
`state.clients`, `state.invoices`, `state.partialPayments`, `state.lateFees`,
`state.renegotiations` ya disponibles en el store, y la cédula del nuevo cliente.
`excludeClientId: null` porque todavía no existe.

### 3.2 `src/components/CrmTab.tsx:294-297` — `RiskPreview`

Este es el cambio de mayor cuidado: `RiskPreview` hoy solo recibe `form` y `settings`. Hay que
pasarle también los datos del store (clientes, facturas, pagos parciales, moras,
renegociaciones) desde el componente padre que ya los tiene vía `useStore()`, para construir el
`history` en vivo mientras el usuario escribe la cédula en el formulario. Si la cédula del
formulario está vacía o incompleta, trata el historial como ausente — no calcules con una
cédula parcial que podría calzar por accidente con otra persona.

Si se está **editando** un cliente existente, pasa su propio `id` como `excludeClientId` para
no contar sus propias facturas actuales como si fueran "historial" de otra fila.

### 3.3 Recalcular cuando cambia el comportamiento de pago

Hoy el `riskScore` se calcula una vez, al crear o editar el cliente, y no se actualiza solo
(confirmado: no hay ningún trigger ni llamada a `assessRisk` fuera de esos dos puntos). Con un
componente de historial real, tiene sentido que el score se refresque cuando el comportamiento
cambia. No construyas un cron para esto — es más simple y más correcto engancharlo a las
acciones que ya existen en el store:

- Al ejecutar `markInvoicePaid` (o el flujo equivalente de `HANDOFF-COMPROBANTES-PAGO.md` si ya
  está aplicado) y al `applyLateFees`, recalcula el `riskScore` del cliente afectado y
  persístelo, igual que ya hace `addClient` con `assessment.score` (`store.tsx:485`).
- No lo hagas para las 13 queries de carga inicial — sería recalcular todo el negocio cada vez
  que alguien abre la app. Solo en las acciones puntuales que cambian historial de pago.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Los tests de la Fase 0 siguen pasando para los casos que no involucran historial — confirma
   que ingreso/antigüedad/inicial no se movieron.
3. Un cliente nuevo, sin ninguna cédula repetida en el sistema, obtiene el mismo tratamiento
   neutral de antes (ni bonus ni penalización por "historial ausente").
4. Dos clientes con cédulas escritas distinto (`V-12345678` y `12345678`) para la misma persona
   se reconocen como el mismo historial gracias a `normalizeCedula`.
5. Un cliente con varias cuotas pagadas tarde y una renegociación obtiene un score
   perceptiblemente menor que uno con historial impecable, con las mismas cifras de ingreso y
   antigüedad — es la prueba de que el historial ahora pesa.
6. Cambiar `scoring_weight_history` en `ConfigTab.tsx` de 20 a 0 dos veces (una prueba manual)
   y confirmar que en 0 el historial deja de influir el resultado, y en un valor alto lo domina
   — es la prueba de que el peso configurado ya no es decorativo.
7. Editar un cliente existente no cuenta sus propias facturas como su propio historial
   (verifica `excludeClientId`).
8. Marcar una factura como pagada actualiza el `riskScore` del cliente correspondiente sin
   necesidad de reabrir su ficha.

---

## Orden sugerido

Fase 0 → Fase 1 → Fase 2 (verificar contra los tests antes de seguir) → Fase 3.1 → Fase 3.2 →
Fase 3.3.

No conectes `RiskPreview` (3.2) hasta que `assessRisk` con historial ya esté probado de forma
aislada — es la pieza más visible para Lucius y la que más rápido revela un error de cálculo.

---

## Relación con los otros handoffs

- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, cuenta como "pagada a tiempo" solo lo que
  quedó `aprobado` en conciliación, nunca lo que sigue `por_conciliar` — de lo contrario un
  comprobante falso o rechazado infla el historial de alguien de forma indebida.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, el historial debe agregarse dentro de la misma
  organización — nunca cruzar datos de un cliente de una organización con otro de otra, aunque
  compartan cédula por coincidencia.
- `HANDOFF-ERRORES-Y-BACKUP.md` sigue siendo prerrequisito general para el resto del sistema,
  pero el cálculo de historial en sí es una función pura sin llamadas a red — no depende de él.
