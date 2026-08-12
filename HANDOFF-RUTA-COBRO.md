# Handoff — Ruta de cobro del día

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Cobro puerta a puerta en Caracas. La idea: darle a cada cobrador la lista de visitas de hoy,
ordenada por cercanía, en vez de que decida el orden a ojo.

**Diagnóstico verificado en el código — hay cuatro supuestos del pedido original que no son
ciertos tal como está el proyecto hoy. Léelos antes de diseñar nada:**

1. **`CaracasHeatmap.tsx` no es un mapa geográfico real.** Es un SVG estilizado con formas de
   municipio dibujadas a mano (`path` fijo por municipio en `src/data.ts`), coloreado por
   volumen agregado. No hay ninguna librería de mapas en `package.json` (sin Leaflet, sin
   Mapbox, sin Google Maps). No hay nada ahí para "reutilizar" en el sentido de renderizar
   coordenadas — hay que traer una librería nueva si se quiere un mapa visual real.

2. **`Client.latitude` / `Client.longitude` son opcionales y probablemente están vacíos en la
   mayoría de los registros** (`src/types.ts:69-70`, sin `NOT NULL` en la migración). No asumas
   que la base de datos ya tiene coordenadas utilizables — la primera parte del trabajo real es
   de captura de datos, no de ordenamiento.

3. **`assignedAgent` es texto libre, no una relación.** Se guarda como `string` en `clients`
   (`src/store.tsx:128`) y se compara contra `team_members.name` en `ReportesTab.tsx:126`. Si un
   agente se llama distinto en una tabla que en otra, o si el campo quedó vacío (el valor por
   defecto del formulario es literalmente `'Vendedor Particular'`, `CrmTab.tsx:443`), la ruta le
   sale vacía o mal repartida a alguien. No lo arregles a fondo en este trabajo — está fuera de
   alcance — pero la Fase 1 incluye una limpieza mínima para que la ruta no falle en silencio.

4. **Los cobradores no tienen sesión propia todavía.** `team_members` son filas creadas por la
   única cuenta dueña del negocio (`user_id` es el del owner en todas, `src/store.tsx`), no
   usuarios con su propio login — ese cambio es justamente el de `HANDOFF-MULTIUSUARIO.md`, que
   puede no estar aplicado aún. Este handoff **no depende** de esa migración: construye un
   selector de agente para que quien esté logueado (hoy, el dueño) vea la ruta de cualquier
   cobrador. Si más adelante se aplica multiusuario, el selector se reduce automáticamente al
   propio agente. Documentado en la Fase 3.4.

---

## Decisiones de alcance (para no construir de más)

- **Ordenamiento, no navegación turn-by-turn.** No se integra Google Directions ni Mapbox
  Directions — son APIs de pago y no hace falta duplicar lo que ya hace Waze o Google Maps en
  el teléfono del cobrador. La app calcula el **orden** de las visitas y ofrece un enlace para
  abrir cada parada (o la ruta completa) en la app de navegación que el usuario ya tiene.
- **Vecino más cercano, no el problema del viajante resuelto de forma óptima.** Con 15-30
  paradas al día, un algoritmo voraz de vecino más cercano da un resultado razonable en
  milisegundos. Un solver exacto es trabajo desperdiciado para este volumen.
- **El mapa visual (Leaflet) es la Fase 4, no el núcleo.** Lo esencial que pidió Lucius es la
  lista ordenada. Constrúyela primero y que funcione sola.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No toques la lógica de `assignedAgent` como relación formal — está fuera de alcance aquí.
- No integres ninguna API de rutas/geocodificación de pago sin confirmarlo antes. Si hace falta
  geocodificar direcciones (Fase 2), usa un servicio gratuito o de bajo costo (Nominatim/OSM) y
  documenta el límite de uso.

---

## Fase 0 — Definir "las visitas de hoy"

Antes de ordenar nada, hay que decidir qué entra en la lista. Reutiliza el criterio que ya
existe en `src/components/CobrosCalendar.tsx:40-51`: agrupa facturas con `status !== 'pagada'`
por fecha de vencimiento. La ruta del día toma ese mismo conjunto, filtrado a:

- Facturas `pendiente` con `dueDate` de hoy.
- Facturas `vencida` (mora), sin importar hace cuánto vencieron — un cobrador necesita saber
  también a quién visitar por mora atrasada, no solo lo que vence hoy.
- Filtradas por `assignedAgent` igual al agente seleccionado.

No incluyas facturas `pagada` ni, si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado,
`por_conciliar` — ese cliente ya reportó su pago, no hace falta tocarle la puerta.

Deja esta función de filtrado en un lugar reutilizable (ver Fase 2.1), no la repitas dentro del
componente de UI.

---

## Fase 1 — Calidad de datos de ubicación

Este es el paso que decide si la función sirve o no. Sin coordenadas, no hay ruta.

**1.1** En `CrmTab.tsx`, donde se edita un cliente, agrega validación suave: si `latitude`/
`longitude` están vacíos, muestra un aviso ("Sin ubicación — no aparecerá en la ruta del día")
en vez de bloquear el guardado. No lo hagas obligatorio — hay clientes sin coordenadas por
buenas razones (aún no visitados, dirección solo referencial).

**1.2** Agrega una forma rápida de capturar la ubicación al editar un cliente: un botón
"Usar mi ubicación actual" que use `navigator.geolocation.getCurrentPosition` cuando el agente
está parado frente a la casa del cliente. Es la manera más barata de ir llenando el dato con el
uso diario, sin depender de geocodificar direcciones de texto (que en Caracas, con
nomenclatura informal, falla seguido).

**1.3** En la nueva vista de ruta (Fase 3), muestra aparte, en una sección separada, los
clientes de la lista del día que **no tienen coordenadas**, con un enlace directo a editarlos.
No los descartes en silencio — que el cobrador sepa que existen y que puede visitarlos igual,
solo que sin orden calculado.

---

## Fase 2 — Lógica de ordenamiento

### 2.1 Nuevo `src/lib/routing.ts`

```ts
export interface RouteStop {
  clientId: string;
  latitude: number;
  longitude: number;
  distanceFromPrevKm: number;
}

export function haversineKm(a: {lat:number,lng:number}, b: {lat:number,lng:number}): number

export function nearestNeighborRoute(
  origin: { lat: number; lng: number },
  stops: { clientId: string; latitude: number; longitude: number }[],
): RouteStop[]
```

- `haversineKm`: distancia en línea recta entre dos coordenadas. Es una aproximación (no sigue
  calles), suficiente para ordenar; no confundas esto con una distancia de manejo real, y
  déjalo dicho en un comentario para que nadie lo tome como precisión GPS de navegación.
- `nearestNeighborRoute`: desde el punto de partida, en cada paso elige la parada no visitada
  más cercana a la parada actual. Complejidad O(n²), aceptable para las decenas de paradas de
  un día.
- Mueve aquí también el filtro de "visitas de hoy" de la Fase 0 como una función exportada
  separada, para que el componente de UI no tenga lógica de negocio.

### 2.2 Punto de partida de la ruta

El `origin` no puede ser fijo en el código. Opciones, de más simple a más completa — implementa
al menos la primera:

- Una dirección/coordenada configurable por agente en `ConfigTab.tsx` o en su ficha de
  `EquipoTab.tsx` (ej. la oficina, o su punto de partida habitual).
- `navigator.geolocation` en el momento de abrir la ruta, con la dirección de la oficina como
  respaldo si el usuario no da permiso o no hay señal GPS.

---

## Fase 3 — Interfaz

### 3.1 Nuevo componente `src/components/RutaCobroTab.tsx`

Vista de lista, mobile-first — el cobrador la va a usar desde el teléfono en la calle, no desde
un escritorio:

- Selector de agente arriba (ver 3.4).
- Lista numerada de paradas en el orden calculado: nombre del cliente, dirección, monto
  adeudado (usa `fmtMoney` de `ui.tsx`), distancia al punto anterior, y si es mora o vencimiento
  de hoy (reutiliza el estilo visual que ya usa `CobrosCalendar.tsx` para distinguir
  `morosidad` de `regulares`, línea 17-18).
- Cada parada tiene un botón "Abrir en Waze" y otro "Abrir en Google Maps", con deep links:
  ```
  https://waze.com/ul?ll=<lat>,<lng>&navigate=yes
  https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>
  ```
  No hace falta ninguna librería ni API key para esto — son URLs simples.
- Botón para marcar una parada como "visitada" (sin registrar pago — eso ya lo cubre
  `HANDOFF-COMPROBANTES-PAGO.md` si está aplicado). Marcarla solo la mueve visualmente al final
  de la lista o la atenúa, para que el cobrador sepa por dónde va sin perder el conteo.
- Sección aparte para clientes sin coordenadas (Fase 1.3).
- Botón "Registrar visita" en cada parada que abra la bitácora del cliente
  (`addBitacora`, ya existe en el store) con `channel: 'visita'` preseleccionado — cierra el
  ciclo sin que el cobrador tenga que buscar al cliente de nuevo en `CrmTab`.

### 3.2 Registrar la pestaña

Agrega `'ruta'` a `Permission` (`src/types.ts:327-337`) y a `NAV_ITEMS` (`src/data.ts`).
Decide a qué roles se lo das por defecto — como mínimo `vendedor` (son quienes cobran) y
`admin`/`gerente` para supervisar. Sigue el patrón ya existente de los otros roles en
`src/data.ts`.

Móntala en `src/App.tsx` junto a las demás pestañas del `activeTab`.

### 3.3 Ícono e ubicación en el menú

En `Sidebar.tsx`, colócala cerca de `facturacion` — es la pestaña con la que más se relaciona
conceptualmente (ambas giran en torno a cobrar cuotas).

### 3.4 Selector de agente — compatibilidad con y sin multiusuario

```ts
const [selectedAgent, setSelectedAgent] = useState<string>(currentUserAgentName ?? 'all');
```

- Si existe una forma de saber qué `team_member` corresponde al usuario logueado (nombre que
  coincide, o — si `HANDOFF-MULTIUSUARIO.md` ya está aplicado — el `role` de la `membership`
  actual), preselecciona su propia ruta y, para roles no administrativos, **oculta** el
  selector: un `vendedor` ve su ruta, no la de todos.
- `admin`/`gerente` siempre ven el selector completo, para poder revisar la ruta de cualquiera.
- Si no hay forma de identificar al agente actual (caso de hoy, sin multiusuario), muestra el
  selector para todos y no rompas nada — es una limitación conocida, no un bug.

---

## Fase 4 — Mapa visual (opcional, después de que la lista funcione)

Si Lucius confirma que la quiere:

**4.1** Instala `leaflet` y `react-leaflet`, con tiles de OpenStreetMap (gratis, sin API key,
respeta su política de uso — no hagas scraping agresivo de tiles).

**4.2** Un mapa embebido en `RutaCobroTab.tsx` con un marcador numerado por parada, en el mismo
orden de la lista, y una línea recta entre puntos consecutivos (no es una ruta real por calles
— dilo en la UI, por ejemplo con una nota chica, para no generar una falsa sensación de
precisión).

**4.3** No dupliques `CaracasHeatmap.tsx` ni lo modifiques — es un componente distinto con un
propósito distinto (volumen agregado por municipio, no ubicaciones puntuales). El mapa nuevo va
aparte.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Con un cliente sin coordenadas, aparece en la sección "sin ubicación", no se pierde ni
   rompe el cálculo de ruta de los demás.
3. La ruta de un agente con 0 visitas hoy muestra un estado vacío claro, no una pantalla en
   blanco.
4. El orden calculado tiene sentido visualmente: compáralo a mano con las coordenadas en un
   mapa cualquiera para 3-4 clientes de prueba con ubicaciones conocidas.
5. Los enlaces de Waze y Google Maps abren la ubicación correcta.
6. "Registrar visita" crea la entrada en `bitacora_entries` con el `channel` correcto y aparece
   en la ficha del cliente en `CrmTab.tsx`.
7. Un `vendedor` no puede ver la ruta de otro agente si ya hay forma de identificarlo (o el
   selector queda abierto para todos si no la hay — según lo que exista al momento de probar).
8. Probar en una pantalla de 375px de ancho — el consumo real es desde el celular.

---

## Orden sugerido

Fase 0 → Fase 1.1 y 1.3 (sin esto, no hay nada que ordenar) → Fase 2 → Fase 3 →
Fase 1.2 (la captura por geolocalización puede ir en paralelo o después, no bloquea el resto) →
Fase 4 si se confirma que se quiere.

---

## Relación con los otros handoffs

- Si `HANDOFF-RESPONSIVE.md` ya está aplicado, usa el mismo patrón de tarjetas apiladas para
  la lista de paradas en vez de inventar uno nuevo.
- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, excluye facturas `por_conciliar` del
  criterio de la Fase 0, y el botón de cada parada puede enlazar directo al flujo de "reportar
  pago" en vez de solo a la bitácora.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, el selector de agente de la Fase 3.4 se resuelve
  con el `role` real de la `membership` en vez de con la coincidencia de nombre de texto.
- `HANDOFF-ERRORES-Y-BACKUP.md` sigue siendo prerrequisito general: si falla la geolocalización
  o el guardado de coordenadas, el cobrador necesita un toast, no un silencio.
