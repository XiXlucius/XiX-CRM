# Handoff — El calendario de cobros muestra a la gente el día equivocado

## Síntoma

En Facturación, el calendario no lista a las personas que de verdad pagan cada
día. Los clientes aparecen **un día antes** del que se les asignó.

**Evidencia reproducible:** se registró a un cliente con "Fecha del primer
cobro = 10 de septiembre de 2026". En el cronograma su cuota 1 aparece como
**"Vence 09-sept."**. Nadie tocó esa fecha en el medio.

---

## Causa raíz (verificada en el código, no es una hipótesis)

`new Date('2026-09-10')` en JavaScript **no** devuelve el 10 de septiembre a
medianoche local: devuelve el 10 de septiembre a medianoche **UTC**. Venezuela
es UTC−4, así que ese instante, visto en local, es el **9 de septiembre a las
20:00**.

El dato entra bien y sale mal. La cadena del fallo:

1. `clients.first_payment_date` es una columna `date` → PostgREST la devuelve
   como `'2026-09-10'`.
2. `store.tsx:852` — `new Date(client.firstPaymentDate)` → 09-sept 20:00 local.
3. `nextDueDate()` suma días sobre ese ancla ya corrido → todas las cuotas
   heredan el desfase.
4. Se guardan con `.toISOString()`, congelando el error en la base.
5. `CobrosCalendar.tsx:64` — `new Date(inv.dueDate)` y luego
   `getFullYear/getMonth/getDate` en local → cae en la casilla del día 9.

**No es un problema de presentación: los datos guardados ya están corridos.**

### Sitios afectados (todos comparten el mismo error)

| Archivo | Línea | Qué hace mal |
|---|---|---|
| `src/store.tsx` | 852 | Ancla del plan de cuotas |
| `src/components/FacturacionTab.tsx` | 410 | Fecha al crear factura a mano |
| `src/components/CobrosCalendar.tsx` | 64 | Casilla del calendario |
| `src/lib/routing.ts` | 64 | Ruta de cobro del día |
| `src/components/ReportesTab.tsx` | 114 | Reporte de antigüedad |
| `src/store.tsx` | 1289 | Cálculo de días para la mora |

Ya existe la solución correcta en `src/lib/aging.ts` (`parseDueDate`), escrita
para este mismo problema, **pero es privada del módulo** y nadie más la usa.

---

## Reglas de trabajo

- **Edición quirúrgica.** No reescribas archivos completos: cambia solo las
  líneas afectadas.
- **No leas archivos que no necesites** para el cambio.
- No toques el diseño ni la lógica de negocio: esto es un fallo de fechas.
- Español en comentarios y textos de interfaz.

---

## Fase 1 — Una sola fuente de verdad para las fechas

En `src/lib/aging.ts`:

1. **Exporta** `parseDueDate` (hoy es privada). Renómbrala a `parseLocalDate`
   si prefieres, pero actualiza los usos internos.
2. Añade un ayudante para **guardar**:

```ts
/** Ancla una fecha a las 12:00 locales antes de guardarla. A mediodía ningún
 *  huso horario (±12h) puede correrla de día, ni con horario de verano. */
export function toStoredDueDate(fecha: Date): string {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0);
  return d.toISOString();
}

/** Clave estable de día ("2026-9-10") para agrupar en el calendario. */
export function dayKey(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
```

## Fase 2 — Corregir la escritura

- `store.tsx:852` → `const anchor = client.firstPaymentDate ? parseLocalDate(client.firstPaymentDate) : today;`
- En `generateSchedule`, cambia los dos `.toISOString()` de `due_date` por
  `toStoredDueDate(...)` (el de la inicial también).
- `FacturacionTab.tsx:410` → `dueDate: toStoredDueDate(parseLocalDate(form.dueDate))`.

## Fase 3 — Corregir la lectura

Sustituye `new Date(inv.dueDate)` por `parseLocalDate(inv.dueDate)` en
`CobrosCalendar.tsx:64` (usa `dayKey`), `routing.ts:64`, `ReportesTab.tsx:114`
y `store.tsx:1289`.

## Fase 4 — Reparar los datos ya guardados

Las cuotas existentes están corridas. Script SQL, **con verificación previa**:

```sql
-- 1. MIRAR primero: cuántas están ancladas de madrugada (síntoma del desfase).
SELECT id, client_name, due_date, due_date AT TIME ZONE 'America/Caracas' AS local
FROM invoices
ORDER BY due_date
LIMIT 20;

-- 2. Solo si el paso 1 confirma el corrimiento, re-anclar a mediodía local.
UPDATE invoices
SET due_date = (date_trunc('day', due_date AT TIME ZONE 'America/Caracas')
                + interval '12 hours') AT TIME ZONE 'America/Caracas'
WHERE due_date IS NOT NULL;
```

> No corras el UPDATE a ciegas. Si el SELECT muestra las fechas correctas en
> local, el desfase ya está arreglado y volver a mover las fechas las rompería.

---

## Fase 5 — Verificación

1. Registra un cliente con primer cobro el **10 de septiembre**, 2 cuotas
   quincenales. En el calendario deben caer el **10 y el 25 de septiembre**.
2. En el modal del día, el encabezado dice cuántas **personas** pagan (no
   cuántas cuotas): un cliente con dos cuotas el mismo día cuenta como una.
3. Prueba con el reloj del sistema en otro huso (Madrid, UTC+2, y México,
   UTC−6): el día no debe cambiar.
4. `npx tsc --noEmit` sin errores y `npm run build` limpio.
