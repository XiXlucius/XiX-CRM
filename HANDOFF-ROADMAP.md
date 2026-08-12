# Roadmap maestro — orden de ejecución

Este documento no reemplaza a los otros handoffs: los **ordena**. El orden importa más de lo
que parece, porque varias tareas se pisan entre sí si se hacen al revés.

Documentos existentes en la raíz del proyecto:

- `HANDOFF-ERRORES-Y-BACKUP.md` — toasts, manejo de errores, validación de contraseña
- `HANDOFF-RESPONSIVE.md` — sidebar drawer, tablas en móvil, grids
- `HANDOFF-MULTIUSUARIO.md` — organizaciones, membresías, RLS por rol

---

## Reglas de trabajo (aplican a todas las fases)

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No refactorices lo que no forma parte de la fase en curso.
- Al terminar cada fase: `npm run build` debe pasar sin errores de TypeScript.
- **Detente al final de cada fase** y espera revisión antes de seguir.

---

## Fase 0 — Limpieza previa (~30 min, riesgo casi nulo)

Va primero porque reduce el trabajo de todas las fases siguientes.

**0.1 Borrar código muerto — 876 líneas.** Ningún archivo del proyecto los importa; ya se
verificó con un rastreo de imports relativos. Antes de borrar, confírmalo tú también:

```
src/components/Dashboard.tsx     (203 líneas)
src/components/ClientsView.tsx   (267)
src/components/PipelineView.tsx  (181)
src/components/TasksView.tsx     (225)
```

Esto elimina de entrada 2 tablas y 2 grids del alcance de `HANDOFF-RESPONSIVE.md`.

**0.2 Quitar `firebase` de `package.json`.** Cero referencias en `src/`. El proyecto usa
Supabase. Corre `npm install` después para regenerar el lockfile.

**0.3 Confirmar que la app arranca** y que las 10 pestañas siguen funcionando.

---

## Fase 1 — Manejo de errores (`HANDOFF-ERRORES-Y-BACKUP.md`, fases 1 a 3)

**Por qué va segunda:** de las 57 llamadas `await supabase` en `store.tsx`, solo ~10 lanzan
error, y en todo `src/components/` únicamente dos archivos tienen un `catch`. Sin esto, la
migración multiusuario de la Fase 4 se depura a ciegas: RLS rechaza operaciones en silencio y
la interfaz las muestra como exitosas.

Es el prerrequisito de todo lo demás. No lo saltes.

---

## Fase 2 — Validación de contraseña (`HANDOFF-ERRORES-Y-BACKUP.md`, fase 4)

Independiente y acotada. Va aquí porque es corta y toca los mismos archivos de autenticación
que ya estarán frescos.

**Recordatorio crítico:** la validación nueva aplica solo a registro y cambio de contraseña,
**nunca** al inicio de sesión. Los usuarios actuales tienen contraseñas de 6 caracteres.

---

## Fase 3 — Responsive (`HANDOFF-RESPONSIVE.md`)

**Por qué va antes que multiusuario:** es puramente de presentación, no toca `store.tsx` ni el
esquema de base de datos. Si se hace después, compite por los mismos archivos que la migración
y los conflictos se multiplican.

Empieza por la Fase 1 de ese documento (sidebar drawer) — es la que más cambia la experiencia.
La Fase 2 (tablas a tarjetas) ya viene reducida gracias a la limpieza de la Fase 0.

---

## Fase 4 — Tests de lógica financiera (nuevo, ~3 h)

**Por qué aquí:** es la red de seguridad que necesitas *antes* de tocar el esquema de datos.

- Instala Vitest.
- Cubre `src/lib/scoring.ts` (207 líneas) y el cálculo de amortización de
  `src/components/AmortizationCalculator.tsx`.
- Mínimo 15 casos: tasas de interés en los extremos, plazos de 1 mes y del máximo permitido,
  las tres frecuencias de pago (`semanal`, `quincenal`, `mensual`), inicial del 0 % y del 100 %,
  ingreso mensual cero.
- Verifica que las cuotas sumen el capital más los intereses, sin desfases por redondeo.

Es la única parte del sistema donde un error se traduce directo en dinero mal cobrado. Si algo
se rompe en la Fase 5, quieres enterarte por un test y no por un cliente.

---

## Fase 5 — Multiusuario (`HANDOFF-MULTIUSUARIO.md`)

**Va al final a propósito.** Es la tarea más grande y la única irreversible: 14 tablas, ~60
políticas RLS, y un backfill que si falla a medias deja la base en estado inconsistente.

**Antes de empezar, obligatorio:**
1. Backup de Supabase verificado (pasos manuales al final de `HANDOFF-ERRORES-Y-BACKUP.md`).
2. Fases 0 a 4 completas y funcionando.
3. La decisión sobre `team_members` tomada — punto 3.6 de ese documento. Es de producto, no
   técnica: define si tus vendedores van a tener login propio o si alguien los administra.

Ejecuta ese documento fase por fase, sin adelantarte.

---

## Fuera de alcance por ahora

Estas quedaron identificadas pero no entran en este roadmap:

- **Paginación** de la carga inicial (13 queries que traen todo). Hazlo después de multiusuario,
  cuando el volumen por organización lo justifique.
- **Realtime** de Supabase. Solo tiene sentido con varios usuarios en una misma organización.
- **Soft delete** (`deleted_at`). Depende del modelo multiusuario.
- **Partir `CrmTab.tsx` (1324 líneas) y `store.tsx` (1247).** Hacerlo antes de la Fase 5
  duplica el trabajo, porque la migración reescribe buena parte de `store.tsx`.
- **Modo offline.** El trabajo más grande de todos. Va cuando el resto esté estable.

---

## Resumen del orden

```
0. Limpieza            (30 min, sin riesgo)
1. Toasts y errores    (medio día)    ← prerrequisito de todo
2. Contraseñas         (1 h)
3. Responsive          (1-2 días)
4. Tests financieros   (3 h)          ← red de seguridad
5. Multiusuario        (varios días)  ← irreversible, va al final
```
