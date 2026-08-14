# Prompt de handoff — Responsive (para pegar en Claude Code)

Implementa el diseño responsive del CRM siguiendo `HANDOFF-RESPONSIVE.md` al pie de la letra.
Ese documento ya tiene el diagnóstico completo (archivos, líneas, breakpoints) y las 5 fases.
No repitas ese diagnóstico ni lo re-investigues — está verificado. Léelo una sola vez al empezar
y trabaja directamente sobre él.

## Reglas de edición (obligatorias, sin excepción)

- Ediciones puntuales únicamente. Nunca reescribas un archivo completo para cambiar unas
  líneas — usa el equivalente a un diff/patch dirigido a la sección exacta que cambia.
- No leas archivos que no vayas a tocar. Si `HANDOFF-RESPONSIVE.md` ya te da el número de línea,
  ve directo ahí en vez de releer el archivo entero para "entender contexto".
- No refactorices nada que no sea parte de la fase en curso. No toques lógica de negocio,
  `store.tsx`, ni nombres de variables/funciones existentes.
- No cambies el diseño de escritorio (≥1024px). Todo lo nuevo va en breakpoints móviles o es
  mobile-first con el estilo de escritorio recuperado en `lg:`.
- Breakpoints: usa solo los de Tailwind por defecto (`sm:640 md:768 lg:1024 xl:1280`). No
  agregues breakpoints nuevos a `tailwind.config.js`.
- Al final de cada fase: compila (`npm run build` o al menos `tsc -b` si el build falla por
  entorno) y **detente a esperar revisión** antes de pasar a la siguiente. No encadenes fases.

## Contexto que ya cambió desde que se escribió HANDOFF-RESPONSIVE.md

Estos archivos que el documento menciona como "código muerto, verificar" **ya fueron
confirmados muertos y borrados** — no existen, ignóralos por completo:

- `src/components/Dashboard.tsx`
- `src/components/ClientsView.tsx`
- `src/components/PipelineView.tsx`
- `src/components/TasksView.tsx`

Es decir: en la Fase 2 (tablas → tarjetas) solo aplica a `CrmTab.tsx`, `EquipoTab.tsx`,
`ReportesTab.tsx`, `ConfigTab.tsx` — el documento ya lo dice, pero confírmalo sin perder tiempo
investigando los archivos borrados.

También ya existen y **no hay que crearlos**, solo usarlos si hace falta un toast durante estos
cambios (no debería, esta tarea es puramente visual):
- `src/context/ToastContext.tsx` (`useToast()`)
- `src/lib/errors.ts` (`friendlyError()`)

El proyecto ya tiene el sistema de diseño "Nocturne" aplicado (`tailwind.config.js`,
`src/index.css`, clases `.card`, `.btn-*`, `.input`, etc.). Úsalas tal cual existen — no
inventes clases nuevas ni cambies tokens de color/espaciado.

## Orden de ejecución

Sigue el orden que ya recomienda el propio documento en su sección final:

1. **Fase 1 — Sidebar como drawer en móvil** (`Sidebar.tsx`, `App.tsx`, `Header.tsx`). Sola,
   verificada, antes de seguir. Es la que más cambia la sensación de uso.
2. **Fase 3 — Grids y espaciado**.
3. **Fase 2 — Tablas a tarjetas** (la más laboriosa, la que más código toca).
4. **Fase 4 — Modales y gráficos**.
5. **Fase 5 — Verificación** en 375px / 768px / 1024px / 1440px, tal como describe el
   documento (incluida la comprobación de `scrollWidth` sin desplazamiento horizontal).

Reporta al final de cada fase qué archivos tocaste y cuántas líneas cambiaron — no un resumen
narrativo, solo la lista.
