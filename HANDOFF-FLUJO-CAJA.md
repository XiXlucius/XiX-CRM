# Handoff — Flujo de caja proyectado (próximas 8 semanas)

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Se pidió proyectar cuánto entra en las próximas 8 semanas usando las cuotas ya cargadas en
`invoices`.

**Diagnóstico verificado en el código:**

Ya existe una proyección de flujo de caja en `src/components/ReportesTab.tsx:91-119`
("Proyección de flujo de caja", 6 meses, con bandas optimista/pesimista). Sirve de base, pero
tiene tres problemas concretos que hay que resolver, no solo copiar el patrón:

1. **Las facturas ya vencidas desaparecen de la proyección por completo.** El bucle
   (`ReportesTab.tsx:95-117`) solo recorre meses desde el actual hacia adelante
   (`now.getMonth() + m`, con `m` de 0 a 5). Una factura con `status: 'pendiente'` y fecha de
   vencimiento de hace dos meses no cae en ningún mes del rango — su mes ya pasó y el bucle
   nunca lo revisa. Ese dinero, que el negocio todavía espera cobrar, no aparece en ninguna
   parte del gráfico. Y como ya se documentó en `HANDOFF-CARTERA-VENCIDA.md`, ninguna factura
   pasa nunca a `status: 'vencida'` de forma automática, así que este no es un caso raro: es
   probablemente la mayoría de la cartera atrasada, invisible en la proyección actual.
2. **No descuenta abonos parciales.** Igual que en el aging, suma `inv.amount` completo
   (línea 102), sin restar lo que ya está registrado en `partial_payments` para esa factura. La
   proyección sobreestima lo que falta por cobrar.
3. **Las bandas optimista/pesimista son un multiplicador arbitrario** (`* 1.15` y `* 0.7`,
   líneas 114-115), no basado en ningún dato real del negocio. El propio sistema ya tiene la
   información para calcular una tasa de cobro histórica real (cuántas facturas se pagaron a
   tiempo del total que venció) y usar eso en vez de un porcentaje inventado.

---

## Decisión de arquitectura

**No se reemplaza la proyección mensual existente — se agrega una vista semanal como
complemento**, con un selector de granularidad en la misma tarjeta (`mensual` / `semanal`),
reutilizando el mismo contenedor visual en vez de crear una segunda tarjeta duplicada. La
proyección semanal de 8 semanas es la que se pidió explícitamente porque responde a una
pregunta operativa distinta ("¿tengo para cubrir la nómina de este viernes?") que la mensual no
contesta con suficiente detalle.

**Las tres correcciones del diagnóstico (facturas vencidas visibles, saldo neto de abonos,
tasa de cobro real) aplican a la vista nueva. Corregirlas también en la vista mensual existente
es directo una vez que exista la función compartida — hazlo si el tiempo lo permite, pero no es
obligatorio para este trabajo si genera fricción; documenta si quedó pendiente.**

**Cálculo 100% en el cliente**, igual que el resto de reportes del proyecto — sin tablas ni
funciones nuevas en Supabase.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- Si `HANDOFF-CARTERA-VENCIDA.md` ya se aplicó y existe `src/lib/aging.ts` con `isOverdue` /
  `daysOverdue`, **reutilízalo** en vez de duplicar esa lógica. Si no existe todavía, crea
  únicamente lo mínimo que necesites en el archivo nuevo de esta Fase 1, con nombres
  compatibles para poder consolidar después sin fricción.

---

## Fase 1 — Cálculo de la proyección semanal

### 1.1 Nuevo `src/lib/cashflow.ts`

```ts
export interface WeekBucket {
  weekStart: string;     // ISO, lunes de esa semana
  label: string;         // "11-17 ago"
  isOverdueBucket: boolean; // true solo en la primera posición, agrupa todo lo ya atrasado
  expectedAmount: number;   // saldo neto (descontando abonos parciales) que vence esa semana
  optimisticAmount: number;
  pessimisticAmount: number;
  invoiceCount: number;
}

export function projectWeeklyCashFlow(
  invoices: Invoice[],
  partialPayments: PartialPayment[],
  historicalOnTimeRate: number,  // 0-1, ver 1.3
  weeks: number = 8,
  asOf: Date = new Date(),
): WeekBucket[]
```

Reglas del cálculo:

- **Primer bucket = "atrasado" (todo lo ya vencido, sin importar hace cuánto).** No se reparte
  por semana futura — es dinero que ya debió entrar. Súmalo aparte y márcalo con
  `isOverdueBucket: true`, para que la interfaz lo distinga claramente de lo que vence en el
  futuro (ver Fase 2). Esto es lo que corrige el problema #1 del diagnóstico: nada desaparece.
- Las siguientes `weeks` posiciones son semanas calendario hacia adelante, agrupando por
  `dueDate` dentro de cada rango lunes-domingo.
- Para cada factura, usa el saldo neto: `inv.amount` menos la suma de `partial_payments` de esa
  factura (mismo cálculo que en `HANDOFF-CARTERA-VENCIDA.md`, Fase 2.1 — cópialo si ese archivo
  ya existe, no lo reinventes distinto).
- Excluye facturas `status === 'pagada'`. Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado,
  excluye también las que tengan un comprobante `aprobado` que cubra el saldo completo.

### 1.2 Recalcular semanas, no meses, para las facturas futuras

A diferencia del bucle mensual actual, agrupa por semana ISO (lunes a domingo) usando la fecha
de vencimiento. Ten cuidado con el borde de fin de año y con meses de longitud distinta — usa
aritmética de milisegundos o una librería ya presente en el proyecto si existe, no manipules
`Date` por índice de mes a mano como hace el código actual (fuente de bugs sutiles de fecha).

### 1.3 Tasa de cobro histórica real (corrige el problema #3)

```ts
export function historicalOnTimeRate(invoices: Invoice[]): number
```

Calcula: de las facturas que ya tienen un desenlace conocido (`pagada` o efectivamente vencida
sin pagar), qué proporción se pagó **a tiempo** (`paidDate` no nulo y `paidDate <= dueDate`).
Si no hay suficiente historial (por ejemplo, menos de 10 facturas cerradas — negocio muy nuevo),
usa un valor por defecto conservador (sugerido: 0.75) y dilo explícitamente en la UI ("Tasa
estimada — historial insuficiente"), no lo muestres como si fuera un dato medido.

Usa esta tasa para las bandas:
- `expectedAmount`: el saldo bruto que vence esa semana, sin ajustar — es lo contractualmente
  debido.
- `optimisticAmount`: `expectedAmount * min(1, historicalOnTimeRate + 0.1)` — un escenario algo
  mejor que el promedio histórico, no un número inventado.
- `pessimisticAmount`: `expectedAmount * historicalOnTimeRate` — lo que realmente ha entrado en
  promedio, como piso realista.

Documenta en un comentario que esto sigue siendo una proyección, no una garantía — depende de
que el comportamiento futuro se parezca al pasado.

---

## Fase 2 — Interfaz

### 2.1 Extender la tarjeta existente en `ReportesTab.tsx` (no crear una nueva)

Donde hoy está "Proyección de flujo de caja" (línea ~252-282), agrega un selector
`mensual | semanal` junto al título, siguiendo el mismo patrón visual que ya usa el selector de
rango (`range`, línea 48). Al elegir `semanal`, renderiza `projectWeeklyCashFlow` en vez del
`cashFlow` mensual actual, reutilizando el mismo `ComposedChart` de Recharts que ya está
importado (`ReportesTab.tsx:19-32`) — no importes una librería de gráficos nueva.

### 2.2 El bucket de "atrasado" va visualmente separado

En el gráfico, el bucket `isOverdueBucket: true` debe destacarse (color distinto, o una barra
separada del resto por un espacio) — mezclarlo con "lo que vence esta semana" confunde dos
cosas distintas: deuda ya vencida vs. cobro esperado a futuro.

### 2.3 Resumen numérico arriba del gráfico

Tres cifras destacadas, no solo el gráfico: total atrasado (bucket 1), total esperado en las 8
semanas, y la tasa de cobro histórica usada para las bandas — para que quede claro de dónde
salen los números optimista/pesimista y no parezcan magia.

---

## Fase 3 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Con una factura de prueba `pendiente` con vencimiento de hace 60 días: en la proyección
   mensual actual no aparece en ningún lado (bug confirmado); en la nueva proyección semanal
   **debe** aparecer completa en el bucket "atrasado".
3. Una factura de $100 con $30 de abono parcial aparece en su semana con saldo $70, no $100.
4. La suma de todos los buckets semanales más el de atrasado debe igualar el total de saldo
   pendiente de toda la cartera no pagada — ninguna factura se pierde.
5. Con menos de 10 facturas cerradas en los datos de prueba, la UI muestra el aviso de "tasa
   estimada", no un número que aparente estar medido.
6. Cambiar el selector `mensual` / `semanal` no rompe la vista mensual existente — verifica que
   siga mostrando lo mismo que antes de este cambio.
7. El resumen numérico de la Fase 2.3 coincide con la suma real de los buckets, no con un
   cálculo aparte que pueda desincronizarse.

---

## Orden sugerido

Fase 1 (con datos de prueba en consola o un test rápido antes de tocar UI) → Fase 2 → Fase 3.

---

## Relación con los otros handoffs

- `HANDOFF-CARTERA-VENCIDA.md` comparte la causa raíz del problema #1 (estado `vencida` nunca
  se asigna) y probablemente ya resolvió el cálculo de saldo neto — reutiliza esa lógica en vez
  de duplicarla, como se indicó en las Reglas de trabajo.
- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, la proyección se mantiene en USD (moneda
  funcional) — no la conviertas a Bs, es una herramienta de gestión interna.
- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, sigue el criterio de excluir comprobantes
  `aprobado` ya cubiertos, y considera si vale la pena marcar aparte (no como "atrasado" pleno)
  las facturas con un comprobante `por_conciliar` — ese dinero probablemente sí va a entrar,
  solo falta confirmarlo.
- Si `HANDOFF-SCORING-HISTORIAL.md` ya está aplicado, es una mejora natural de seguimiento (no
  obligatoria en este trabajo) usar el `riskScore` de cada cliente para ponderar la probabilidad
  de cobro por factura en vez de una tasa histórica global única — déjalo anotado como posible
  siguiente paso, no lo implementes aquí sin que Lucius lo pida.
