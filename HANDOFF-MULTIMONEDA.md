# Handoff — Multi-moneda USD / Bs con tasa del día

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Financiamiento de productos a cuotas en Caracas, Venezuela.

**Diagnóstico verificado en el código:**

1. **No existe ningún concepto de moneda.** Cero coincidencias de `currency`, `moneda`, `tasa`,
   `BCV` o `exchange` en `src/types.ts` y `src/lib/scoring.ts`.
2. `src/components/ui.tsx:213-214` tiene el único formateador:
   ```ts
   export const fmtMoney = (n: number) =>
     '$' + n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
   ```
   Antepone `$` a cualquier número, sin saber qué moneda es. Se usa en 9 componentes
   (76 llamadas en total).
3. `src/components/CobrosCalendar.tsx:384` tiene un segundo formateador,
   `fmtMoneyCompact`, duplicando la lógica.
4. **Campos monetarios sin divisa**, en TypeScript y en SQL (`numeric` pelado):
   - `clients.product_cost`, `clients.monthly_income`
   - `invoices.amount`
   - `products.base_price`
   - `partial_payments.amount`
   - `late_fees.amount`
   - `renegotiations.outstanding_balance`
   - `team_members.goal_monthly`, `achieved_monthly`, `active_portfolio`
   - `AmortizationRow` (`payment`, `principal`, `interest`, `balance`) — calculado, no persistido

**El problema real:** el negocio financia en dólares y cobra en bolívares a una tasa que cambia
a diario. Al no registrar ni la moneda ni la tasa del momento del pago, la cartera vencida, los
ingresos y las comisiones están mal calculados y no hay forma de auditarlos hacia atrás.

---

## Decisión de arquitectura (no la cambies sin avisar)

**El dólar es la moneda funcional.** Todo monto contractual — precio del producto, cuotas,
saldo, mora — se almacena y se calcula en USD. El bolívar es solo **moneda de liquidación**:
aparece cuando el cliente paga.

Consecuencia: el esquema existente en USD queda válido y no hay que reconvertir datos viejos.
Lo que se agrega es el registro de *cómo* se liquidó cada cobro.

Esto evita el error clásico de guardar todo en bolívares y quedarse sin poder comparar dos
períodos entre sí.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **Ningún monto histórico se recalcula ni se reconvierte.** Los datos existentes ya están en USD.
- Usa `numeric` en SQL, nunca `float`. Para tasas usa `numeric(20,6)`; para montos, `numeric(20,2)`.
- Nunca hagas aritmética de dinero con `number` de JavaScript en cálculos encadenados. Redondea
  a 2 decimales en cada paso de conversión y déjalo explícito.

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_multi_currency.sql`.
Antes de escribirla, verifica los nombres de columna reales en `supabase/migrations/`.

**1.1 Tabla de tasas**

```sql
exchange_rates
  id uuid pk default gen_random_uuid()
  org_id uuid            -- solo si ya se aplicó HANDOFF-MULTIUSUARIO; si no, user_id
  rate_date date not null
  source text not null default 'bcv'   -- 'bcv' | 'paralelo' | 'manual'
  usd_to_ves numeric(20,6) not null check (usd_to_ves > 0)
  created_by uuid references auth.users(id)
  created_at timestamptz default now()
  unique (org_id, rate_date, source)
```

Índice por `(org_id, rate_date desc)`.

**1.2 Registro de liquidación en los pagos**

A `partial_payments` y a `invoices` agrega:

```sql
  paid_currency text check (paid_currency in ('USD','VES'))
  paid_amount_original numeric(20,2)   -- lo que el cliente entregó, en su moneda
  exchange_rate_used numeric(20,6)     -- tasa aplicada; null si pagó en USD
  exchange_rate_id uuid references exchange_rates(id)
```

`amount` **sigue siendo USD** y sigue siendo la fuente de verdad contable.
Los campos nuevos son nullable: los pagos históricos se asumen en USD.

**1.3 Configuración**

A `business_settings` agrega:

```sql
  default_rate_source text not null default 'bcv'
  rate_tolerance_pct numeric(5,2) not null default 2   -- alerta si la tasa salta más de esto
  allow_manual_rate boolean not null default true
```

**1.4 RLS**

`exchange_rates` con RLS habilitado, mismo patrón que las demás tablas del proyecto.
Lectura para todos los miembros; escritura solo para `admin` y `gerente`.

---

## Fase 2 — Obtención de la tasa

**2.1 Nueva Edge Function `supabase/functions/fetch-exchange-rate/index.ts`**

**Fuente oficial confirmada por el cliente: `https://www.bcv.org.ve`**

No hay API pública: hay que leer el HTML de la portada. Por eso tiene que correr en una Edge
Function (servidor) y nunca desde el navegador — el sitio no envía cabeceras CORS.

Estructura de la página (verificada): un bloque por divisa con el código y el valor, en el
orden `EUR`, `CNY`, `TRY`, `RUB`, `USD`, seguido de una línea `Fecha Valor: <fecha>`.
El dólar aparece así:

```
USD
761,21670000
```

Implementación:

- **Selector.** El valor del dólar vive en el contenedor con `id="dolar"`, dentro de un
  `<strong>`. Apunta a `#dolar strong`. **Verifica el selector contra la página en vivo antes
  de darlo por bueno** — el marcado del BCV ha cambiado en el pasado. Si el selector falla,
  ten un respaldo que busque el texto `USD` y tome el número que le sigue.
- **Parseo del número.** Formato venezolano: `.` separa miles y `,` separa decimales.
  Convierte con `valor.replace(/\./g, '').replace(',', '.')`. Hoy la tasa es de tres cifras
  (`761,21670000`) y no trae separador de miles, pero cuando lo traiga, un parseo ingenuo la
  divide por mil sin avisar. **No omitas este paso.**
- **Fecha.** Usa la "Fecha Valor" que publica la página, no `now()`. El BCV publica la tasa del
  siguiente día hábil bancario, así que guardarla con la fecha de hoy la deja desfasada un día.
  La fecha suele estar en un elemento con clase `date-display-single`, en su atributo `content`
  en formato ISO. Si no logras leerla, falla — no la asumas.
- **Validación de rango.** Descarta cualquier valor que sea `<= 0`, no numérico, o que difiera
  del último registrado en más de un 20 %. Un cambio de marcado suele producir un número
  absurdo, no un error limpio.
- **Certificado SSL.** El BCV tiene históricamente problemas con su cadena de certificados. Si
  el `fetch` falla por TLS, registra el error y falla de forma visible. **No desactives la
  verificación de certificados** para evitarlo.
- **Idempotente:** si ya existe una fila para esa fecha y fuente, no duplica.
- Si la fuente no responde, **falla de forma visible** y no inventa un valor.
- Si la tasa nueva difiere de la del día anterior en más de `rate_tolerance_pct`, insértala
  igual pero marcándola para revisión — no la descartes ni la apliques en silencio.

Deja en un comentario al inicio del archivo: la URL, el selector usado y la fecha en que se
verificó. Cuando el BCV cambie su HTML, ese comentario es lo que hace la reparación rápida.

**2.2 Carga manual siempre disponible**

Aunque exista la automática, el usuario debe poder registrar la tasa del día a mano. Es el
respaldo cuando la fuente falla, y hace falta desde el primer día.

**2.3 Programación**

Un cron de Supabase que la ejecute cada día laborable por la mañana.

---

## Fase 3 — Capa de aplicación

**3.1 Nuevo `src/lib/currency.ts`**

```ts
export type Currency = 'USD' | 'VES';

export function fmtMoney(n: number, currency?: Currency): string
export function usdToVes(usd: number, rate: number): number
export function vesToUsd(ves: number, rate: number): number
```

- `fmtMoney` por defecto sigue siendo USD, para no romper las 76 llamadas existentes.
  Símbolo `$` para USD, `Bs.` para VES, ambos con `toLocaleString('es-VE')`.
- Mueve aquí el `fmtMoney` de `ui.tsx:213` y **reexpórtalo desde `ui.tsx`** para que los
  9 componentes que lo importan sigan funcionando sin tocarlos.
- Unifica `fmtMoneyCompact` (`CobrosCalendar.tsx:384`) en este archivo. No dejes dos versiones.
- Redondea siempre a 2 decimales al convertir.

**3.2 `src/store.tsx`**

- Carga la tasa vigente junto con el resto del estado inicial y exponla como `currentRate`.
- Nueva acción `setExchangeRate(date, rate, source)`.
- `addPartialPayment` y `markInvoicePaid` reciben moneda y tasa, y persisten los cuatro campos
  nuevos. El `amount` que guardan **siempre** es el equivalente en USD.
- Si no hay tasa cargada para hoy y el usuario intenta registrar un pago en bolívares, la
  operación falla con un mensaje claro. No uses la tasa de ayer en silencio.

**3.3 Formularios de pago** (`CrmTab.tsx`, `FacturacionTab.tsx`)

- Selector de moneda USD / Bs.
- Al elegir Bs, muestra la tasa vigente y el equivalente calculado en vivo, antes de confirmar.
- Deja visible qué tasa se va a aplicar. El usuario tiene que poder verla, no adivinarla.

**3.4 `src/components/ConfigTab.tsx`**

Sección nueva de moneda: tasa de hoy, fuente, botón para cargarla a mano, historial de los
últimos 30 días y los ajustes de `business_settings` de la Fase 1.3.

**3.5 `src/components/Header.tsx`**

Indicador discreto con la tasa del día. Si la tasa es de una fecha anterior a hoy, márcalo en
color de advertencia — es la señal de que hay que actualizarla.

---

## Fase 4 — Reportes y comprobantes

**4.1 `src/components/ReportesTab.tsx`**

- Toggle para ver los montos en USD o en Bs (convertidos a la tasa de hoy, con la fecha indicada).
- Los reportes históricos usan la tasa de **cada transacción**, nunca la de hoy. Un cobro de
  hace tres meses vale lo que valió ese día.

**4.2 `src/lib/export.ts`**

Los exports deben incluir columnas de moneda, monto original y tasa aplicada. Sin eso, el
archivo exportado es ambiguo.

**4.3 Recibos**

Donde se muestre un comprobante de pago, indica ambos montos: lo que entregó el cliente en su
moneda y el equivalente en USD, con la tasa usada.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Los 9 componentes que usan `fmtMoney` siguen mostrando montos en USD igual que antes.
3. Registrar un pago en Bs → `amount` queda en USD, `paid_amount_original` en Bs,
   `exchange_rate_used` poblado.
4. Registrar un pago en USD → `exchange_rate_used` queda en `null`, sin conversión.
5. Intentar un pago en Bs sin tasa del día cargada → error claro, no un valor supuesto.
6. Los pagos anteriores a la migración siguen mostrándose correctamente como USD.
7. Un reporte que abarque un período con dos tasas distintas usa la de cada transacción.
   Compruébalo con datos de prueba a propósito.
8. La Edge Function del BCV devuelve un valor coherente con lo que muestra
   `https://www.bcv.org.ve` en el navegador **en ese momento**. Compáralo a mano.
9. Prueba el parseo con `1.234,56789000` (con separador de miles) y confirma que da `1234.56789`,
   no `1.23456789`.
10. Simula una respuesta con el marcado cambiado y confirma que la función falla de forma
    visible en vez de insertar basura.

---

## Orden sugerido

Fase 1 → Fase 3.1 (el formateador, que desbloquea todo lo visual) → Fase 3.2 y 3.3 →
Fase 2 → Fase 3.4 y 3.5 → Fase 4.

La Fase 2 va después de que el flujo manual funcione: si la fuente automática falla, ya tienes
un sistema utilizable.

---

## Relación con los otros handoffs

Si aún no ejecutaste `HANDOFF-MULTIUSUARIO.md`, **haz las dos migraciones en la misma tanda**.
Ambas tocan el esquema, ambas requieren backup, y hacerlas por separado significa dos ventanas
de riesgo en vez de una. En ese caso, `exchange_rates` nace directamente con `org_id`.

`HANDOFF-ERRORES-Y-BACKUP.md` sigue siendo prerrequisito: sin toasts, un fallo al cargar la
tasa pasa desapercibido y terminas registrando pagos con una tasa vieja sin enterarte.
