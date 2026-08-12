# Handoff — Toasts de error + validación de contraseña

> **Nota:** el backup de Supabase es una tarea manual para Lucius (última sección de este
> documento). No es parte del trabajo del agente y no debe automatizarse: implica credenciales.

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.

**Diagnóstico verificado en el código:**

1. `src/store.tsx` tiene 57 llamadas `await supabase`, pero solo ~10 hacen `if (error) throw error`.
   Las demás descartan el error por completo.
2. De los errores que sí se lanzan, casi ninguno se atrapa: en todo `src/components/` solo
   `AuthScreen.tsx` y `ResetPasswordScreen.tsx` tienen un `catch`. Todas las operaciones CRUD
   se llaman en modo fire-and-forget:
   - `InventarioTab.tsx:290-291` → `updateProduct` / `addProduct` sin `await` ni `catch`
   - `FacturacionTab.tsx:128` → `markInvoicePaid`
   - `EquipoTab.tsx:171` → `addTeamMember`
   - `CrmTab.tsx:251` → `updateClient`
   - `InventarioTab.tsx:225` → `deleteProduct`

   Resultado: si una operación falla, se produce una promesa rechazada sin manejar y el usuario
   no ve absolutamente nada. La UI incluso muestra el cambio como si hubiera funcionado.
3. No existe ningún sistema de notificaciones: cero `toast`, cero `alert` en todo el proyecto.
4. `PasswordRequirements.tsx` muestra 4 reglas (6+ caracteres, mayúscula, minúscula, número),
   pero la única validación real es `minLength={6}` en el input. Las otras 3 son decorativas.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No refactorices lo que no forma parte de esta tarea.
- No cambies la lógica de negocio: este trabajo es sobre *reportar* fallos, no sobre alterar
  cómo funcionan las operaciones.

---

## Fase 1 — Sistema de toasts

**1.1 Nuevo `src/context/ToastContext.tsx`**

```
type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: string; kind: ToastKind; message: string; }
```

Expone un hook `useToast()` que devuelve:
- `toast.success(msg)`
- `toast.error(msg)`
- `toast.info(msg)`
- `dismiss(id)`

Detalles:
- Auto-descarte a los 5 s para `success` e `info`; los de tipo `error` **no** se auto-descartan
  (el usuario los cierra), porque son los que necesita leer con calma.
- Máximo 4 toasts visibles a la vez; si entra uno más, descarta el más viejo.
- El contenedor va en la esquina inferior derecha, `position: fixed`, con `z-index` por encima
  de los modales existentes. Verifica el z-index que usan los modales actuales antes de elegirlo.
- Usa `framer-motion` (ya está en las dependencias) para entrada y salida.
- Iconos de `lucide-react`: `CheckCircle2`, `AlertCircle`, `Info`, y `X` para cerrar.
- Sigue el estilo visual existente: revisa `src/components/ui.tsx` y `tailwind.config.js` para
  usar la paleta del proyecto (`metal-*`, acentos cian/rosa) en vez de inventar colores.
- Accesibilidad: `role="status"` y `aria-live="polite"` en el contenedor.

**1.2 Montar el provider en `src/App.tsx`**

Envuelve por fuera de `AuthProvider`, para que las pantallas de autenticación también
puedan emitir toasts.

**1.3 Nuevo `src/lib/errors.ts`**

Una función `friendlyError(err: unknown): string` que traduzca errores de Supabase a español
claro. Mapea al menos:
- códigos Postgres `23505` (duplicado), `23503` (llave foránea), `42501` (permiso denegado / RLS)
- errores de red / fetch fallido
- fallback genérico que **nunca** exponga detalles internos de la base de datos al usuario

`AuthScreen.tsx` ya tiene una función `friendlyError` local (línea 57). Muévela a este archivo,
fusiónala con lo nuevo y actualiza el import en `AuthScreen.tsx`. No dejes dos versiones.

---

## Fase 2 — Cerrar los huecos en `store.tsx`

**2.1** Recorre las 57 llamadas `await supabase` y agrega `if (error) throw error;` donde falte.
Sé exhaustivo: es el punto central de esta tarea.

**2.2** No pongas toasts dentro de `store.tsx`. El store lanza; los componentes atrapan y
muestran. Así se mantiene testeable y sin dependencias de UI.

**2.3** Excepción: la carga inicial (las 13 queries en paralelo, ~línea 277). Si alguna falla,
el store debe exponer un estado `loadError` para que la app pueda mostrar una pantalla de
"no se pudieron cargar los datos" con botón de reintentar, en vez de renderizar un CRM vacío
que parece que perdiste todo.

---

## Fase 3 — Atrapar en los componentes

Para cada llamada mutante en `src/components/`, aplica este patrón:

```tsx
try {
  await accion(...);
  toast.success('Cliente guardado');
} catch (err) {
  toast.error(friendlyError(err));
}
```

Sitios confirmados que hay que corregir (busca también los que se me hayan escapado —
revisa cada componente que use `useStore()`):

- `CrmTab.tsx` → `addClient`, `updateClient`, `deleteClient`, `generateSchedule`, `addBitacora`
- `InventarioTab.tsx` → `addProduct`, `updateProduct`, `deleteProduct`
- `FacturacionTab.tsx` → `markInvoicePaid`, `addInvoice`, `addPartialPayment`
- `EquipoTab.tsx` → `addTeamMember`, `updateTeamMember`, `toggleTeamActive`
- `ConfigTab.tsx` → `updateSettings`, plantillas de mensajes
- Subida de documentos → `uploadDocument`, `deleteDocument`
- `sendWhatsApp` (lanza en un `!res.ok`, ~línea 1082)

Requisitos:
- Toda llamada mutante debe tener `await`. Varias hoy no lo tienen (`InventarioTab.tsx:290-291`,
  `EquipoTab.tsx:171`, `FacturacionTab.tsx:128`).
- Deshabilita el botón que dispara la acción mientras está en vuelo, para evitar dobles envíos.
- Si el componente hace una actualización optimista de la UI (por ejemplo `CrmTab.tsx:251`,
  que llama a `setSelected` inmediatamente), revierte ese estado en el `catch`.

---

## Fase 4 — Validación real de contraseña

**4.1 En `src/lib/errors.ts` o en un nuevo `src/lib/validation.ts`**, exporta:

```ts
export const PASSWORD_RULES = [...]        // la misma lista que usa PasswordRequirements.tsx
export function validatePassword(v: string): string[]   // devuelve las reglas incumplidas
```

**4.2** `src/components/PasswordRequirements.tsx` debe importar `PASSWORD_RULES` en vez de
tener su propia copia. Una sola fuente de verdad.

**4.3** En el `submit` de `AuthScreen.tsx` (solo en modo `signup`) y en el de
`ResetPasswordScreen.tsx` (~línea 34), bloquea el envío si `validatePassword` devuelve algo.
Muestra qué falta.

`ResetPasswordScreen.tsx` ya valida largo mínimo y coincidencia (líneas 35-36) — extiende esa
lógica, no la dupliques.

**4.4** Sube `minLength` de 6 a 8 en ambos inputs y actualiza el `placeholder`
("Mínimo 6 caracteres") y la primera regla de `PASSWORD_RULES` para que coincidan.

**Cuidado:** los usuarios existentes tienen contraseñas de 6 caracteres. La validación nueva
aplica solo a registro y cambio de contraseña, nunca al inicio de sesión. Si la aplicas al login,
dejas gente afuera de su propia cuenta.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Desconecta la red y prueba guardar un cliente → debe aparecer un toast de error, no un fallo
   silencioso.
3. Intenta crear dos productos con datos duplicados → el toast debe decir algo legible en
   español, no un mensaje crudo de Postgres.
4. Registro con contraseña `abc123` → debe rechazarse indicando qué falta.
5. Inicio de sesión con una cuenta vieja de 6 caracteres → **debe seguir funcionando**.
6. Confirma que no quedan promesas rechazadas sin manejar en la consola del navegador durante
   un recorrido normal por la app.

---

## Orden sugerido

Fase 1 → Fase 2 → Fase 3 → Fase 4. Cada fase debe compilar antes de pasar a la siguiente.
La Fase 4 es independiente de las otras tres; si algo se complica, se puede hacer aparte.

---

# Backup de Supabase — pasos manuales para Lucius

Esto lo haces tú, no el agente. Antes de cualquier migración de esquema:

1. Entra a tu proyecto en el panel de Supabase.
2. **Database → Backups.** En plan Pro tienes backups automáticos diarios; verifica que haya uno
   reciente y anota la fecha. En plan Free **no hay backups automáticos** — tienes que hacerlo tú.
3. Backup manual, desde tu terminal:
   ```
   npx supabase db dump --db-url "<TU_CONNECTION_STRING>" -f backup-esquema.sql
   npx supabase db dump --db-url "<TU_CONNECTION_STRING>" --data-only -f backup-datos.sql
   ```
   El connection string está en **Project Settings → Database → Connection string (URI)**.
4. Guarda ambos archivos **fuera** de la carpeta del proyecto. Contienen todos tus datos y no
   deben terminar en git por accidente.
5. Verifica que los archivos no estén vacíos y que `backup-datos.sql` incluya tus tablas
   (`clients`, `invoices`, etc.) antes de darlo por bueno.

Un backup que no verificaste no es un backup.
