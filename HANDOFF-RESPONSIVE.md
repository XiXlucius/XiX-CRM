# Handoff — Diseño responsive (móvil y tablet)

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
La app está diseñada para escritorio. En pantallas menores a ~900 px se rompe.

**Diagnóstico verificado en el código:**

1. **Sidebar sin versión móvil.** `src/components/Sidebar.tsx:46` alterna entre `w-[220px]` y
   `w-[60px]` con un estado `collapsed` local (línea 33). Siempre ocupa espacio horizontal,
   incluso en pantallas de 375 px. No hay drawer, no hay overlay, y el estado no se persiste.
2. **Cobertura de breakpoints muy despareja.** En todo `src/` hay 46 usos de `sm:`, 16 de `lg:`,
   9 de `xl:` y solo **2** de `md:`. La franja de tablet (768–1024 px) es la peor tratada.
3. **Grids con columnas fijas** que no colapsan en móvil:
   - `CobrosCalendar.tsx:141,150` → `grid-cols-7` (calendario; caso especial, ver abajo)
   - `CrmTab.tsx:996,1111` → `grid-cols-2`
   - `InventarioTab.tsx:233` → `grid-cols-2`
   - `TasksView.tsx:105,193` → `grid-cols-3` y `grid-cols-2` (**ojo:** este archivo es código
     muerto, nadie lo importa; confirma antes de gastar tiempo en él)
4. **Tablas en 6 componentes** dependen de `overflow-x-auto`: `ClientsView`, `ConfigTab`,
   `CrmTab`, `EquipoTab`, `PipelineView`, `ReportesTab`. En móvil eso obliga a desplazamiento
   horizontal, que es mala experiencia para la tarea principal del usuario.
   (`ClientsView` y `PipelineView` también son código muerto — verifica.)
5. **Modales** (`src/components/ui.tsx:113-122`) usan `max-w-md/lg/2xl/4xl` con `p-4` y centrado
   vertical. En pantallas bajas el contenido se sale sin poder desplazarse.
6. **Gráficos de Recharts** en `DashboardTab` y `ReportesTab` — revisa si usan alturas fijas.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No cambies el diseño de escritorio.** Es el caso de uso principal. Todo lo nuevo debe ir
  en breakpoints móviles, o ser `mobile-first` con el estilo de escritorio recuperado en `lg:`.
- No refactorices lógica de negocio: esta tarea es puramente de presentación.
- Los breakpoints por defecto de Tailwind ya sirven: `sm:640` `md:768` `lg:1024` `xl:1280`.
  No inventes breakpoints nuevos en `tailwind.config.js`.

---

## Fase 1 — Sidebar como drawer en móvil

Es el cambio de mayor impacto. Hazlo primero y por separado.

**1.1 `src/components/Sidebar.tsx`**

- Menor a `lg` (< 1024 px): el sidebar pasa a `fixed inset-y-0 left-0 z-40`, se desplaza fuera
  de pantalla con `-translate-x-full` y entra al abrirse. Ancho fijo `w-[260px]` (en móvil no
  aplica el modo colapsado).
- `lg` en adelante: comportamiento actual sin cambios, incluido el toggle de `collapsed`.
- Añade un overlay de fondo (`fixed inset-0 bg-black/60 z-30`) visible solo cuando el drawer
  está abierto en móvil. Al hacer clic, cierra.
- Al navegar a una pestaña, el drawer se cierra solo en móvil.
- Cerrar con la tecla `Escape`.
- Bloquea el scroll del `body` mientras el drawer está abierto.

**1.2 Elevar el estado**

El estado de apertura del drawer tiene que vivir en `AppShell` (`src/App.tsx`), no dentro de
`Sidebar`, porque el botón hamburguesa va en el `Header`. Pasa `open` y `onClose` como props.
Deja el estado `collapsed` de escritorio donde está.

**1.3 `src/components/Header.tsx`**

Agrega un botón hamburguesa (icono `Menu` de `lucide-react`) a la izquierda del todo, visible
solo con `lg:hidden`. El header ya es `sticky top-0 z-30` (línea 49) — verifica que el z-index
quede por debajo del drawer (z-40) y del overlay.

**1.4 Persistencia**

Guarda `collapsed` en `localStorage` para que no se reinicie en cada recarga. Es una mejora
chica pero muy notoria.

---

## Fase 2 — Tablas a tarjetas en móvil

Para cada uno de estos componentes (confirma primero cuáles están vivos):
`CrmTab`, `EquipoTab`, `ReportesTab`, `ConfigTab`.

Patrón: mantén la `<table>` con `hidden lg:table`, y añade una lista de tarjetas apiladas con
`lg:hidden` que muestre los mismos datos.

Cada tarjeta debe incluir:
- El campo identificador como título (nombre del cliente, del producto, etc.)
- 3 o 4 campos clave como pares etiqueta/valor
- Las mismas acciones que la fila de la tabla

**No dupliques la lógica de datos.** Extrae el mapeo de filas a una variable o a un subcomponente
pequeño en el mismo archivo, y renderiza las dos vistas a partir de él.

Prioridad si hay que recortar: `CrmTab` primero (es la pantalla más usada), luego `EquipoTab`.

---

## Fase 3 — Grids y espaciado

**3.1** Convierte los `grid-cols-*` fijos a mobile-first:
- `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

Excepción: `CobrosCalendar.tsx` — un calendario **tiene** que ser `grid-cols-7`. Ahí en vez de
colapsar, reduce el tamaño de celda y de tipografía en móvil, o envuélvelo en `overflow-x-auto`
con un ancho mínimo. Nunca lo conviertas a una sola columna.

**3.2** Rellena la franja de tablet. Donde hoy hay un salto de `sm:` directo a `lg:`, agrega
`md:` en las rejillas de tarjetas del dashboard y de inventario.

**3.3** Revisa los paddings de contenedor: `px-4 sm:px-6` es el patrón que ya usa el Header.
Aplícalo de forma consistente en los contenedores raíz de las pestañas.

---

## Fase 4 — Modales y gráficos

**4.1 `src/components/ui.tsx`** (componente `Modal`, líneas 90-122)
- Añade `max-h-[90vh] overflow-y-auto` al panel del modal.
- En móvil, considera anclarlo abajo (estilo hoja) en vez de centrarlo: `items-end sm:items-center`
  con esquinas redondeadas solo arriba.
- Asegura que el botón de cerrar quede siempre visible aunque el contenido sea largo.

**4.2 Recharts** en `DashboardTab` y `ReportesTab`
- Todo gráfico debe ir dentro de `<ResponsiveContainer>`. Verifica cuáles no lo están.
- Alturas: `h-[220px] sm:h-[300px]` en vez de un valor fijo.
- En móvil, oculta o rota las etiquetas de los ejes si se encabalgan.

**4.3 `CaracasHeatmap.tsx`** usa un SVG con `viewBox` — confirma que tenga
`preserveAspectRatio` y `w-full h-auto` para que escale bien.

---

## Fase 5 — Verificación

Prueba en las herramientas de desarrollo del navegador en estos anchos:

1. **375 px** (iPhone SE) — el drawer abre y cierra, no hay desplazamiento horizontal en
   ninguna pestaña, las tarjetas se leen bien.
2. **768 px** (iPad vertical) — nada se ve estirado ni con huecos raros.
3. **1024 px** — punto exacto donde el drawer se convierte en sidebar fijo. Revisa que no
   haya parpadeo ni estado intermedio roto.
4. **1440 px** — **el diseño de escritorio debe verse idéntico a como está hoy.** Si cambió
   algo, es un error.

Además:
- `npm run build` sin errores de TypeScript.
- Recorre las 10 pestañas en 375 px: `dashboard`, `crm`, `courses`, `playbook`, `equipo`,
  `facturacion`, `inventario`, `config`, `reportes`, `auditoria`.
- Comprueba que ningún elemento provoque desplazamiento horizontal del documento
  (en la consola: `document.documentElement.scrollWidth > window.innerWidth` debe dar `false`).

---

## Orden sugerido

Fase 1 sola, y verifícala antes de seguir — es la que más cambia la sensación de uso.
Luego 3, luego 2, luego 4. La Fase 2 es la más laboriosa y la que más código toca.

Cada fase debe compilar antes de pasar a la siguiente.
