# Lo que ya hice y lo que falta

---

## Ya está hecho (no tienes que hacer nada de esto)

- **Respaldo de tu código** → carpeta `_respaldo\` en esta misma carpeta (43 archivos).
- **Todo el código de Claude Design copiado** → `src\`, `supabase\`, `package.json`,
  `tailwind.config.js`, configs. Verificado archivo por archivo.
- **Compilación verificada** → `tsc` sin errores, `vite build` exitoso.
- **Dos protecciones nuevas contra pantallas en blanco** (te explico abajo por qué importan).

Tu archivo `.env` no lo toqué. Tus credenciales siguen igual.

---

## Falta esto — 2 cosas, y las dos requieren tus manos

Te explico **por qué** no las puedo hacer yo, para que no parezca que me estoy zafando:

**La migración SQL** — no tengo acceso a tu cuenta de Supabase. Tu base de datos vive en la nube
detrás de tu login. Yo solo veo archivos de tu computadora.

**El `npm install`** — yo corro en Linux, tu computadora es Windows. Si yo instalo las librerías,
se instalan las versiones de Linux y te rompo el proyecto. Tiene que correr en tu máquina.

---

# PASO 1 — Correr la migración en Supabase

### 1.1 Respalda primero

1. Abre <https://supabase.com> en el navegador e inicia sesión.
2. Clic en tu proyecto (el del CRM).
3. Menú de la izquierda, hasta abajo → ícono de engranaje **Settings**.
4. Dentro de Settings → **Database**.
5. Baja hasta la sección **Backups**. Descarga el más reciente.

> No te saltes esto. El paso 1.2 reescribe los permisos de 14 tablas y no hay Ctrl+Z.

### 1.2 Corre el SQL

1. En el menú de la izquierda, busca el ícono **SQL Editor** (parece una hojita con `>_`).
2. Clic en el botón verde **New query** (arriba a la derecha).
3. Ahora abre el archivo `MIGRACION-SUPABASE.sql` de esta carpeta:
   - Clic derecho sobre él → **Abrir con** → **Bloc de notas**.
4. Dentro del Bloc de notas: **Ctrl + A** (selecciona todo) y luego **Ctrl + C** (copia).
5. Vuelve al navegador, clic dentro del recuadro grande del SQL Editor, y **Ctrl + V** (pega).
6. Clic en el botón **Run** (abajo a la derecha, o presiona Ctrl + Enter).

### 1.3 Cómo saber si funcionó

Espera unos segundos. Abajo aparece un resultado.

**Si funcionó**, ves una tabla con una fila parecida a esto:

| organizacion | rol | email |
|---|---|---|
| Mi organización | admin | tu@correo.com |

Eso significa: tus datos actuales quedaron dentro de una organización y tú eres el administrador.
Sigue al Paso 2.

**Si sale un recuadro rojo con un error**, PARA AHÍ. Copia el texto del error y pásamelo.
No sigas al Paso 2 — la base quedaría a medias.

> El error más probable dice `duplicate key ... business_settings_org_id_key`.
> Solo pasa si tienes dos usuarios con fila de configuración. Se arregla rápido, pero necesito verlo.

---

# PASO 2 — Arrancar la app

1. Ve a la carpeta `Desktop\Lucius\project`.
2. Doble clic en **`INICIAR-CRM.bat`**.

Eso es todo. Ese script ya detecta que faltan las librerías de mapas y las instala solo.

**Qué vas a ver:**

- Una ventana negra. La primera vez tarda **1 a 3 minutos** instalando. Es normal, no la cierres.
- Un recordatorio sobre las migraciones SQL (ya las hiciste en el Paso 1, ignóralo).
- El navegador abre solo en `http://localhost:5173`.

Para apagar el servidor: cierra la ventana negra.

---

## Por qué antes veías una pantalla en blanco y ahora ya no

Esta es la parte importante, y explica por qué te costaba tanto entender qué pasaba.

El proyecto **no tenía ningún ErrorBoundary**. En React, eso significa que si un solo componente
falla, se desmonta la aplicación completa y el navegador queda **totalmente en blanco**. Sin
mensaje. Sin pista. Nada.

O sea: la app *sí* arrancaba. Se caía, y no dejaba rastro. Estabas peleando a ciegas contra algo
que nunca te dijo qué era. No era falta de habilidad tuya — era información que el programa no
te estaba dando.

Agregué dos cosas:

- **`src\components\ErrorBoundary.tsx`** — ahora un error se muestra en pantalla, con el mensaje
  completo y un botón de **"Copiar el error"**.
- **Guarda en `src\lib\supabase.ts`** — si falta o está mal el `.env`, te sale una pantalla que te
  dice exactamente eso y cómo arreglarlo. (Ese caso el ErrorBoundary no lo puede atrapar, porque
  ocurre antes de que React exista.)

De aquí en adelante, cuando algo falle, vas a poder **leer** qué fue.

---

## Si algo sale mal

**Sale una pantalla de error con el mensaje:** perfecto, eso es lo que queremos. Botón
"Copiar el error" → pásamelo.

**Sigue en blanco puro:** F12 → pestaña **Console** → cópiame lo que salga en rojo.

**Falla el `npm install`:** abre la ventana negra y prueba, una línea a la vez:

```
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## Cómo volver atrás

**El código:** borra la carpeta `src`, renombra `_respaldo\src` a `src`, copia
`_respaldo\package.json` encima del actual, y corre `npm install`.

**La base de datos:** restaura el respaldo del Paso 1.1 desde Supabase.

---

## Dos cosas que debes saber

**1. Tu repositorio de git está trabado.** Encontré archivos `.lock` huérfanos en la carpeta
`.git` desde el 12 de agosto — probablemente un `git commit` que se interrumpió. Por eso no pude
hacerte un commit de respaldo (usé la carpeta `_respaldo` en su lugar). Para destrabarlo, borra
estos dos archivos:

```
C:\Users\BCC2-PC1\Desktop\Lucius\project\.git\index.lock
C:\Users\BCC2-PC1\Desktop\Lucius\project\.git\HEAD.lock
```

**2. La migración multi-empresa nunca se probó contra una base real.** Así venía marcada por
Claude Design. La revisé línea por línea y **le corregí un error**: la regla de permisos original
hacía imposible que un usuario nuevo creara su organización — para insertar tu membresía tenías
que ser admin, pero para ser admin necesitabas la membresía. Se mordía la cola. Ya está arreglado.

Lo que **no** trae (queda pendiente para otra pasada):

- **Invitaciones por email** a otros usuarios — no está construida.
- El **selector de rol viejo** del Sidebar/Config sigue existiendo junto al rol real del servidor.
  Ahora son dos fuentes de verdad que pueden contradecirse. Habría que quitar el viejo.
