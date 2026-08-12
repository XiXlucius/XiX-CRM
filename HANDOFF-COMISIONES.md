# Handoff — Comisiones automáticas atadas a cobro efectivo

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Se pidió cerrar el ciclo de comisiones: que se calculen solas y que premien el cobro real, no
la venta cerrada.

**Esta es una tarea que afecta directamente cuánto dinero recibe cada vendedor. Dos secciones
más abajo hay decisiones de negocio marcadas explícitamente como "requiere confirmación de
Lucius" — no las asumas ni las inventes. Pídele que las responda antes de escribir la lógica de
cálculo, aunque el resto (base de datos, estructura del ledger) se pueda avanzar en paralelo.**

**Diagnóstico verificado en el código:**

1. **Los tiers de comisión son decorativos, tal como se describió.**
   `commission_tier1/2/3` existen en `business_settings` (`src/lib/scoring.ts:6-8`, con
   etiquetas "Básico / Intermedio / Experto" visibles en `ConfigTab.tsx:98-100`), pero se
   rastreó cada aparición de esas tres claves en `src/` y **ninguna se lee para calcular nada.**
   Son campos que Lucius puede editar sin que cambien un solo número en ningún reporte.

2. **Lo que hoy se llama "comisión" no está atado a cobro real — está atado a un número que se
   escribe a mano.** `TeamMember.achievedMonthly` (`src/types.ts:240`) se edita directamente en
   un `<input type="number">` del formulario de `EquipoTab.tsx:286` ("Logrado"). No se deriva
   de ninguna factura pagada. El único cálculo de comisión que existe en todo el proyecto es
   `ReportesTab.tsx:65-67`:
   ```ts
   const totalCommissions = team.filter(m => m.active)
     .reduce((a, m) => a + (m.achievedMonthly * m.commissionRatePct) / 100, 0);
   ```
   Es literalmente `(número tecleado a mano) × (tasa fija tecleada a mano)`. No hay cobro
   efectivo involucrado en absoluto — ni siquiera venta cerrada, es un campo libre.

3. **Ya existe, en el mismo archivo, un cálculo correcto de lo cobrado de verdad**, sin usarse
   para comisiones: `teamRanking` (`ReportesTab.tsx:122-150`) cruza `assignedAgent` con
   `invoices`, filtra `status === 'pagada'` y suma `amount` real
   (`collected`, línea 130-132). Esa es la base correcta para comisionar — hoy convive en el
   mismo archivo con el cálculo falso de la línea 65-67, sin que se usen entre sí.

4. **`commissionRatePct` es una tasa plana por vendedor**, tecleada a mano en su ficha
   (`EquipoTab.tsx:290`, ej. 4.0%), sin relación con los tres tiers de la configuración. No hay
   ninguna lógica de "si superas tal volumen, subes de tier" en ningún lugar del código.

5. **El vínculo agente↔cliente sigue siendo texto libre** (`assignedAgent` comparado contra
   `team.name`, ya documentado en handoffs anteriores). No lo arregles aquí — es una limitación
   conocida de los datos, no de este trabajo.

---

## Decisiones de negocio que requieren confirmación de Lucius antes de programar la Fase 2

No las decidas por tu cuenta. Si no hay respuesta todavía, avanza con la Fase 1 (base de datos)
y detente ahí.

**A. ¿Qué define que un vendedor esté en Tier 1, 2 o 3?**
Los tres campos actuales (`commission_tier1/2/3`) son solo tasas (%), no hay ningún umbral de
volumen que determine cuál aplica. Sugerencia de default razonable, a confirmar: basarlo en el
porcentaje de la meta mensual alcanzada en cobro efectivo (`achievedMonthly` real, ya no el
campo manual) — por ejemplo, menos del 70% de la meta → Tier 1, 70-100% → Tier 2, más del 100%
→ Tier 3. Los porcentajes de corte concretos los debe fijar Lucius, no el agente.

**B. ¿La tasa por tier reemplaza a `commissionRatePct`, o convive con ella?**
Hoy cada vendedor tiene una tasa individual tecleada a mano. Si se activan los tiers, ¿esa tasa
individual desaparece (todos ganan según su tier de desempeño) o se mantiene como una tasa base
mínima garantizada y el tier solo aplica por encima de cierto monto? Son dos modelos de
compensación distintos con implicaciones reales en el sueldo de cada persona.

**C. ¿Comisión sobre el monto total cobrado, o solo sobre intereses/ganancia?**
`assessRisk` y el resto del sistema manejan `productCost`, `interestRate` y monto financiado
por separado. Comisionar sobre el 100% del monto cobrado (incluyendo el costo del producto que
no es ganancia del negocio) puede no ser lo que Lucius quiere. Confírmalo antes de fijar la
base de cálculo.

Si Lucius no tiene una respuesta clara todavía, implementa con los defaults sugeridos en la
Fase 2, pero dejando **una constante configurable y claramente comentada** para cada uno de
estos tres puntos, no un valor enterrado en medio de la lógica — así se puede ajustar en un
minuto cuando la decisión llegue, sin tener que rehacer el cálculo.

---

## Decisión de arquitectura

**Un ledger de comisiones append-only, no un campo mutable que se recalcula y se pisa.** Es
dinero que alguien va a cobrar; tiene que poder auditarse: qué pago generó qué comisión, a qué
tasa, en qué fecha. Igual que se hizo con `payment_proofs` y `dunning_log` en handoffs
anteriores, nunca se borra una entrada — si algo se revierte, se anota una entrada negativa que
lo explique.

**La comisión se acumula por cobro real, no por factura completa.** Si un cliente abona
parcialmente, esa porción ya cobrada genera su comisión proporcional en el momento, en vez de
esperar a que la factura quede 100% pagada. Es más preciso y evita que alguien "aguante" el
cierre de una factura por razones ajenas al cobro.

**Cálculo en el servidor (dentro de `store.tsx`, en el mismo punto donde ya se registra el
cobro), no en un reporte que se recalcula cada vez que alguien abre la pantalla.** Así la
comisión de una fecha pasada no cambia si después se edita la tasa de un vendedor — igual que
un recibo de sueldo no se reescribe solo porque suba el salario mínimo el mes siguiente.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No borres ni "corrijas" `achievedMonthly` sin decidir antes qué pasa con él (ver Fase 4.3) —
  puede seguir usándose para otra cosa (metas, no comisión).
- No implementes las decisiones A/B/C de la sección anterior sin la marca explícita de
  "default, pendiente de confirmar" en el código.

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_commissions.sql`.
Verifica los nombres de columna reales en `supabase/migrations/` antes de escribirla.

### 1.1 Ledger de comisiones

```sql
commission_accruals
  id uuid pk default gen_random_uuid()
  org_id uuid              -- o user_id si aún no aplicaste HANDOFF-MULTIUSUARIO
  team_member_id uuid not null references team_members(id) on delete cascade
  client_id uuid not null references clients(id) on delete cascade
  invoice_id uuid not null references invoices(id) on delete cascade
  partial_payment_id uuid references partial_payments(id) on delete cascade
  collected_amount numeric(20,2) not null    -- lo efectivamente cobrado que generó esta entrada
  commission_rate_pct numeric(6,3) not null  -- tasa aplicada en el momento, congelada aquí
  tier_applied text                          -- 'tier1' | 'tier2' | 'tier3' | null si tasa plana
  commission_amount numeric(20,2) not null   -- collected_amount * commission_rate_pct / 100
  accrual_type text not null default 'collection'
        check (accrual_type in ('collection','reversal'))
  reversed_accrual_id uuid references commission_accruals(id)
  created_at timestamptz default now()
```

`reversal`: si un cobro se revierte (por ejemplo, un `payment_proof` que pasó de `aprobado` a
`rechazado` tras revisión posterior, si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado), se
inserta una entrada de tipo `reversal` con el mismo monto en negativo, apuntando a la entrada
original vía `reversed_accrual_id`. Nunca se hace `UPDATE` ni `DELETE` sobre una entrada ya
creada.

### 1.2 Umbrales de tier (si la decisión A se confirma con el modelo de porcentaje de meta)

```sql
alter table business_settings
  add column commission_tier1_max_pct numeric(5,2) not null default 70,
  add column commission_tier2_max_pct numeric(5,2) not null default 100;
```

Deja un comentario en la migración explicando la interpretación exacta acordada con Lucius
(punto A), no la des por sobreentendida en el código.

### 1.3 RLS

`commission_accruals`: `SELECT` para `admin`/`gerente` sin restricción, y para cada vendedor
únicamente sus propias entradas (`team_member_id` correspondiente a su propio registro, si hay
forma de vincularlo al usuario logueado — si no la hay todavía, restringe a `admin`/`gerente`
por ahora y déjalo anotado como pendiente de `HANDOFF-MULTIUSUARIO.md`). `INSERT` solo desde
lógica del store con el usuario autenticado, nunca abierto. Sin `UPDATE` ni `DELETE` para nadie,
ni siquiera `admin` — es el mismo principio que ya se aplicó a `payment_proofs`.

---

## Fase 2 — Lógica de cálculo

### 2.1 Nuevo `src/lib/commissions.ts`

```ts
export interface CommissionResult {
  rate: number;
  tier: 'tier1' | 'tier2' | 'tier3' | null;
  amount: number;
}

export function resolveCommissionRate(
  member: TeamMember,
  settings: BusinessSettings,
  monthToDateCollected: number,   // cobrado real del mes en curso por ese agente, antes de este cobro
): CommissionResult
```

Implementa aquí las decisiones A y B con los defaults marcados como pendientes de confirmar
(comentario `// DEFAULT — confirmar con Lucius antes de usar en producción` sobre cada umbral).

### 2.2 Enganchar el cálculo en los puntos donde se registra un cobro real

En `src/store.tsx`:

- Donde se marca una factura como pagada (`markInvoicePaid`, o el flujo de
  `HANDOFF-COMPROBANTES-PAGO.md` si ya está aplicado — usa ese si existe, es la versión
  correcta con evidencia).
- En `addPartialPayment`.

En ambos puntos, después de confirmar el cobro:
1. Busca el `team_member` correspondiente al `assignedAgent` del cliente (mismo criterio de
   coincidencia que ya usa `teamRanking` en `ReportesTab.tsx` — no inventes uno nuevo).
2. Si no hay ningún miembro que calce (agente mal escrito o vacío), no falla la operación de
   cobro — registra la ausencia en consola o en `audit_log` y continúa. El cobro es lo
   importante; la comisión sin agente identificado se pierde y debe quedar visible como
   pendiente de revisión manual, no bloquear el flujo de caja.
3. Calcula `monthToDateCollected` sumando las entradas de `commission_accruals` de ese agente
   en el mes en curso (para poder resolver el tier si aplica).
4. Llama a `resolveCommissionRate`, inserta la entrada en `commission_accruals`.
5. `logAudit('accrue_commission', 'team_member', memberId, null, { amount, rate, tier })`.

### 2.3 Multi-moneda

Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, `collected_amount` se calcula siempre en USD
(moneda funcional), sin importar en qué moneda pagó el cliente — la comisión no debe depender
de la tasa del día que le tocó a ese pago específico.

---

## Fase 3 — Corregir lo que ya existe

### 3.1 `ReportesTab.tsx:65-67`

Reemplaza el cálculo actual (`achievedMonthly * commissionRatePct`) por la suma real de
`commission_accruals` del período seleccionado. Esto corrige el bug concreto del diagnóstico:
hoy ese número no tiene relación con ningún cobro real.

### 3.2 `teamRanking` (`ReportesTab.tsx:122-150`)

Ya calcula `collected` correctamente desde `invoices`. Agrega el total de comisión acumulada de
cada agente desde `commission_accruals` como una columna más de ese mismo ranking — es el lugar
natural, ya cruza agente con cobro real.

---

## Fase 4 — Interfaz

### 4.1 `EquipoTab.tsx`

En la ficha de cada vendedor, agrega una sección "Comisiones" con el detalle de
`commission_accruals`: fecha, cliente, monto cobrado, tasa aplicada, tier (si corresponde),
comisión resultante. Es el desglose que un vendedor va a querer ver si pregunta por qué le
llegó tal monto.

### 4.2 Resumen de período

Filtro por mes con el total acumulado — la cifra que efectivamente se le paga a cada quien.

### 4.3 Decidir el destino de `achievedMonthly`

Con confirmación de Lucius: o pasa a ser un campo **derivado** (se calcula solo, sumando
`invoices` pagadas del agente, ya no editable a mano), o se redefine explícitamente como "meta
personal declarada" separada de la comisión real y se dice así en la etiqueta del campo. Lo que
no puede quedar es como está hoy: pareciendo un dato medido cuando es un número que cualquiera
puede escribir.

### 4.4 `ConfigTab.tsx`

Si se confirma el modelo de tiers por umbral de meta (decisión A), agrega los campos de
`commission_tier1_max_pct` / `tier2_max_pct` junto a las tasas que ya existen, con una
explicación en pantalla de cómo se calculan — no solo tres números sueltos sin contexto como
hoy.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Marcar una factura como pagada genera exactamente una entrada en `commission_accruals`, con
   el monto y la tasa correctos según lo que se haya confirmado en la decisión A/B.
3. Un abono parcial genera una entrada de comisión proporcional al monto abonado, no al total
   de la factura.
4. El total mostrado en `ReportesTab.tsx` coincide, sumado a mano, con las entradas de
   `commission_accruals` del período — ya no depende de `achievedMonthly`.
5. Un cliente sin agente identificable (`assignedAgent` no calza con ningún `team_member`) no
   bloquea el registro del cobro, y queda una traza de que la comisión no se pudo asignar.
6. Ninguna entrada de `commission_accruals` se modifica ni se borra en ningún flujo — solo se
   agregan reversos cuando corresponde.
7. Si `HANDOFF-COMPROBANTES-PAGO.md` está aplicado: rechazar un comprobante que ya había sido
   aprobado genera la entrada de reverso correspondiente, no dejarlo en el ledger como si el
   cobro siguiera vigente.

---

## Orden sugerido

Fase 1 → **detenerse y confirmar A/B/C con Lucius** → Fase 2 → Fase 3 → Fase 4 → Fase 5.

No implementes la Fase 2 con umbrales o modelo de reparto adivinados y sin marcar — es la parte
que decide cuánto gana cada persona, y un supuesto equivocado ahí no es un bug cualquiera.

---

## Relación con los otros handoffs

- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, la comisión debe generarse solo cuando un
  comprobante queda `aprobado`, nunca en `por_conciliar` — comisionar sobre un pago sin
  confirmar es exactamente el tipo de hueco que ese handoff vino a cerrar.
- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, sigue el punto 2.3.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, `commission_accruals` nace con `org_id` y la
  RLS de vendedor sobre sus propias entradas se resuelve con la `membership` real en vez de
  quedar restringida solo a `admin`/`gerente`.
- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito: si el cálculo de comisión falla silenciosamente
  al registrar un cobro, alguien puede terminar cobrando de menos sin que nadie se entere.
