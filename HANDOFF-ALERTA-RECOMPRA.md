# Handoff — Alerta de recompra (cliente que terminó de pagar)

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Un cliente que acaba de terminar de pagar su financiamiento es el prospecto de menor riesgo y
mayor probabilidad de conversión que existe — ya demostró que paga. Hoy, al terminar, ese
cliente no dispara ninguna señal y simplemente se pierde de vista.

**Diagnóstico verificado en el código — hay un hallazgo previo que hay que resolver primero,
porque el sistema de notificaciones al que esta alerta se conecta está completamente inerte:**

### Hallazgo: el sistema de alertas nunca se ejecuta

`refreshAlerts` (`src/store.tsx:829-905`) es la función que calcula facturas vencidas, próximas
a vencer, clientes de riesgo alto y quiebres de stock, y las inserta en la tabla
`notifications` (única inserción real en esa tabla, línea 903). **Se rastreó cada aparición de
`refreshAlerts(` en `src/` y no hay ninguna llamada a esta función en todo el proyecto** —
ni en un `useEffect` de `App.tsx`, ni en un botón, ni en ningún otro componente. Solo aparece
donde se define y donde se expone en el valor del store (`store.tsx:75,1107`).

Consecuencia: `NotificationBell.tsx` está correctamente construido y lee `state.notifications`
sin problema — pero esa tabla nunca recibe filas de estas categorías porque la única función
que las genera jamás se dispara. La campanita de notificaciones ha estado, en la práctica,
vacía de estas alertas desde que se construyó.

Esto es directamente relevante para este trabajo: la alerta de recompra se apoya en el mismo
sistema. Antes de sumar una categoría más a una tubería que no corre, hay que hacer que corra.
Es un cambio pequeño y de bajo riesgo — no cobra nada ni cambia ningún dato de negocio, solo
hace visible información que ya era cierta (una factura vencida ya estaba vencida; esto solo la
muestra). Se incluye como Fase 0, no como un trabajo aparte.

### Segundo hallazgo: no existe ningún estado de "terminó de pagar"

`ClientStatus` (`src/types.ts:34-40`) tiene seis valores: `prospecto, en_revision, aprobado,
activo, en_mora, rechazado`. **No hay un estado que represente "completó su plan de pago".**
Un cliente que paga su última cuota se queda en `'activo'` para siempre — no hay forma de
distinguir, mirando solo el `status`, entre alguien a mitad de camino y alguien que ya terminó.

---

## Decisión de arquitectura

**No se agrega un valor nuevo a `ClientStatus`.** El enum ya se usa como filtro en media docena
de lugares (bono de score en `scoring.ts:174-177`, segmentación de reportes, dashboards,
permisos). Insertar un séptimo estado ahí implica revisar cada uno de esos sitios para decidir
si un cliente "completado" debe seguir contando como cartera activa, como mora, o aparte — un
cambio de alcance mucho mayor al que se pidió, y con riesgo real de romper un filtro que hoy
funciona.

**En su lugar, se agrega una columna independiente que no interfiere con nada existente**:
`loan_completed_at`. El cliente sigue siendo `'activo'` como hoy (o el estado que ya tenga);
esta columna solo marca, aparte, el momento en que terminó de pagar. Aditivo, no disruptivo.

**La detección es por evento, no por barrido periódico.** Se calcula en el momento exacto en
que se registra el cobro de la última cuota pendiente — no se espera a que alguien abra un
reporte o a que corra un cron. La oportunidad de recompra pierde valor mientras más tiempo pasa
sin que alguien la vea.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No agregues valores a `ClientStatus`.** Usa la columna aditiva de la Fase 1.
- Wire de `refreshAlerts` (Fase 0): solo agrega la llamada que falta, no reescribas la lógica
  interna de esa función salvo que encuentres un bug evidente al probarla por primera vez.

---

## Fase 0 — Hacer que `refreshAlerts` se ejecute

### 0.1 Dispararla al cargar la app

En `src/App.tsx`, dentro de `AppShell` (donde ya vive el resto del estado de la sesión), agrega
un `useEffect` que llame a `refreshAlerts()` una vez que el usuario está autenticado y los datos
iniciales cargaron. Verifica primero con qué frecuencia tiene sentido — llamarla en cada montaje
de la app es razonable; sumar además un intervalo (por ejemplo cada 15-30 minutos mientras la
app sigue abierta) es una mejora simple que puedes incluir si no complica el código existente.

### 0.2 Verificación aislada de este paso

Antes de seguir a la Fase 1, confirma que abrir la app genera notificaciones reales si hay, por
ejemplo, una factura vencida de prueba en los datos — la campanita debe mostrar algo que hoy no
muestra. Este paso por sí solo ya es una mejora visible para Lucius, coméntalo cuando lo
entregues.

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_repurchase.sql`.

```sql
alter table clients
  add column loan_completed_at timestamptz,
  add column repurchase_status text not null default 'none'
        check (repurchase_status in ('none','notified','contacted','converted','dismissed')),
  add column repurchase_note text;
```

- `loan_completed_at`: se llena una sola vez, cuando se detecta la finalización. No se
  sobrescribe después.
- `repurchase_status`: pequeño estado de seguimiento de la oportunidad comercial, independiente
  del `ClientStatus` del crédito. `'none'` mientras no ha terminado de pagar; pasa a
  `'notified'` en el momento de la detección; el equipo comercial lo mueve manualmente a
  `'contacted'`, `'converted'` o `'dismissed'` desde la interfaz (Fase 3).

No hace falta política RLS nueva — son columnas más en una tabla que ya tiene las suyas.

---

## Fase 2 — Detección

### 2.1 Nuevo `src/lib/repurchase.ts`

```ts
export function hasCompletedLoan(clientId: string, invoices: Invoice[]): boolean {
  const clientInvoices = invoices.filter((i) => i.clientId === clientId);
  if (clientInvoices.length === 0) return false;
  return clientInvoices.every((i) => i.status === 'pagada');
}
```

Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, una factura en `'por_conciliar'` **no**
cuenta como pagada para este cálculo — solo lo verdaderamente confirmado dispara la alerta. Un
comprobante sin conciliar puede resultar rechazado, y no quieres felicitar prematuramente a
alguien que en realidad no terminó.

### 2.2 Enganchar la detección en el punto donde se confirma el último cobro

En `src/store.tsx`, en el flujo que marca una factura como pagada (`markInvoicePaid`, o el paso
de aprobación de `HANDOFF-COMPROBANTES-PAGO.md` si ya está aplicado — usa ese si existe):

1. Después de actualizar la factura, llama a `hasCompletedLoan(clientId, updatedInvoices)`.
2. Si es `true` **y** el cliente todavía tiene `loan_completed_at` en `null` (para no repetir
   la alerta si por alguna razón se vuelve a evaluar):
   - `UPDATE clients SET loan_completed_at = now(), repurchase_status = 'notified' WHERE id = ...`
   - Inserta una notificación: `type: 'repurchase'`, prioridad `alta` (es una oportunidad de
     ingreso, no un problema, pero de las que se pierden rápido si nadie actúa), con el nombre
     del cliente y el producto que financió, `link` apuntando a su ficha en `crm`.
   - `logAudit('loan_completed', 'client', clientId, null, { loanCompletedAt })`.

---

## Fase 3 — Interfaz

### 3.1 `NotificationBell.tsx`

Agrega `repurchase` al mapa `TYPE_ICONS` (línea 6-13) con un ícono de `lucide-react` que
comunique oportunidad, no alerta (por ejemplo `Repeat` o `Award` — evita `AlertTriangle`, que
ya se usa para lo negativo). Esto es solo un aviso puntual; la lista persistente de la 3.2 es
donde realmente se trabaja la oportunidad.

### 3.2 Lista persistente de oportunidades de recompra (el entregable principal)

Una notificación se puede marcar como leída y olvidarse — no es suficiente para un embudo de
ventas real. Agrega una sección, dentro de `CrmTab.tsx` o `DashboardTab.tsx` (elige el que ya
tenga el patrón de lista/tarjeta más parecido, para no duplicar estilos), que muestre todos los
clientes con `loan_completed_at` no nulo y `repurchase_status` distinto de `'converted'` y
`'dismissed'`, ordenados por fecha de finalización más reciente primero.

Por cada uno: nombre, producto que financió, cuándo terminó, y tres acciones:
- **Contactar** — marca `repurchase_status = 'contacted'`; si `sendWhatsApp` ya existe en el
  store, ofrece un atajo para escribirle directo.
- **Convertido** — marca `'converted'`, con un campo opcional de nota (qué compró esta vez).
- **Descartar** — marca `'dismissed'`, con nota opcional (por ejemplo "se mudó", "no interesado
  por ahora") — así no vuelve a aparecer en la lista, pero el motivo queda registrado.

### 3.3 Indicador en el dashboard

Un número simple en `DashboardTab.tsx` — "X clientes listos para recompra" — junto a los demás
indicadores que ya existen ahí. Es el tipo de cifra que un gerente quiere ver de un vistazo sin
entrar a ningún detalle.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Con datos de prueba: pagar la última cuota pendiente de un cliente dispara la detección,
   pone `loan_completed_at`, y genera la notificación — verifícalo también con un cliente que
   **no** tenga todas sus facturas pagadas (no debe dispararse a mitad de camino).
3. Volver a marcar cualquier otra factura de ese mismo cliente (si aplica) no genera una
   segunda notificación — `loan_completed_at` ya no está en `null`.
4. Si `HANDOFF-COMPROBANTES-PAGO.md` está aplicado: una factura en `'por_conciliar'` no cuenta
   como pagada para este cálculo — pruébalo explícitamente.
5. La lista de recompra de la Fase 3.2 muestra al cliente recién completado, y las tres
   acciones (contactar / convertido / descartar) actualizan `repurchase_status` correctamente
   y lo sacan de la lista cuando corresponde.
6. Confirma el resultado de la Fase 0: con una factura de prueba vencida en los datos, abrir la
   app genera al menos una notificación de tipo `overdue` que antes de este trabajo nunca
   aparecía.

---

## Orden sugerido

Fase 0 (verificar antes de seguir, es la base de todo lo demás) → Fase 1 → Fase 2 → Fase 3.

---

## Relación con los otros handoffs

- `HANDOFF-COMPROBANTES-PAGO.md`: sigue el punto 2.1 sobre excluir `por_conciliar` del cálculo
  de finalización.
- `HANDOFF-COBRANZA-WHATSAPP.md`: si ya está aplicado, la acción "Contactar" de la Fase 3.2
  puede usar una plantilla dedicada de recompra en vez de mensaje libre — más consistente con
  el resto del sistema de mensajería.
- `HANDOFF-SCORING-HISTORIAL.md`: si ya está aplicado, un cliente que completó su plan de pago
  es exactamente el tipo de historial positivo que ese sistema ya sabe leer por cédula — no
  hace falta ningún cambio adicional para que una recompra futura se beneficie de ese historial.
- `HANDOFF-MULTIUSUARIO.md`: si ya está aplicado, la notificación y la lista de recompra deben
  filtrarse por organización, sin cambios adicionales de lógica — los datos ya llegan scoped.
- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito general: si la actualización de
  `loan_completed_at` falla silenciosamente, la oportunidad se pierde sin que nadie se entere,
  que es justo lo que este trabajo busca evitar.
